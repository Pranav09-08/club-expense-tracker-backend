import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import db from "../src/config/db.js";

dotenv.config();

async function seedAdmin() {
  const adminName = process.env.SEED_ADMIN_NAME || "System Admin";
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@club.in").toLowerCase();
  const adminPassword = "admin123";

  if (!adminPassword) {
    throw new Error("SEED_ADMIN_PASSWORD is required");
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [roleRows] = await connection.execute(
      "SELECT id FROM roles WHERE role_code = 'ADMIN' LIMIT 1"
    );

    if (!roleRows[0]) {
      throw new Error("ADMIN role not found. Please run schema.sql first.");
    }

    const adminRoleId = roleRows[0].id;
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    await connection.execute(
      `INSERT INTO users (full_name, email, password_hash, account_status, password_changed_at)
       VALUES (?, ?, ?, 'ACTIVE', NOW())
       ON DUPLICATE KEY UPDATE
         full_name = VALUES(full_name),
         password_hash = VALUES(password_hash),
         account_status = 'ACTIVE',
         failed_login_attempts = 0,
         password_changed_at = NOW(),
         deleted_at = NULL`,
      [adminName, adminEmail, passwordHash]
    );

    const [userRows] = await connection.execute(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [adminEmail]
    );

    if (!userRows[0]) {
      throw new Error("Failed to create or fetch admin user");
    }

    const adminUserId = userRows[0].id;

    await connection.execute(
      `INSERT IGNORE INTO user_global_roles (user_id, role_id, assigned_by)
       VALUES (?, ?, ?)`,
      [adminUserId, adminRoleId, adminUserId]
    );

    await connection.commit();

    console.log("Admin seed successful");
    console.log(`Email: ${adminEmail}`);
    console.log("Password: (the value in SEED_ADMIN_PASSWORD)");
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await db.end();
  }
}

seedAdmin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Admin seed failed:", error.message);
    process.exit(1);
  });
