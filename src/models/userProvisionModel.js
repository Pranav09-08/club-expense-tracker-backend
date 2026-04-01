import bcrypt from "bcryptjs";
import db from "../config/db.js";

export async function hasGlobalRole(userId, roleCode) {
  const [rows] = await db.execute(
    `SELECT 1
     FROM user_global_roles ugr
     INNER JOIN roles r ON r.id = ugr.role_id
     WHERE ugr.user_id = ? AND r.role_code = ?
     LIMIT 1`,
    [userId, roleCode]
  );

  return rows.length > 0;
}

export async function hasActiveClubRole(userId, clubId, roleCode) {
  const [rows] = await db.execute(
    `SELECT 1
     FROM club_memberships cm
     INNER JOIN roles r ON r.id = cm.role_id
     WHERE cm.user_id = ?
       AND cm.club_id = ?
       AND r.role_code = ?
       AND cm.membership_status = 'ACTIVE'
     LIMIT 1`,
    [userId, clubId, roleCode]
  );

  return rows.length > 0;
}

export async function createClub({ clubCode, clubName, description, createdBy }) {
  const [result] = await db.execute(
    `INSERT INTO clubs (club_code, club_name, description, created_by)
     VALUES (?, ?, ?, ?)`,
    [clubCode, clubName, description || null, createdBy]
  );

  return result.insertId;
}

async function getRoleId(roleCode, connection) {
  const [rows] = await connection.execute(
    `SELECT id FROM roles WHERE role_code = ? LIMIT 1`,
    [roleCode]
  );

  return rows[0]?.id || null;
}

export async function createUserWithClubRole({ fullName, email, password, roleCode, clubId, createdBy }) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [existingUsers] = await connection.execute(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [email.toLowerCase()]
    );

    if (existingUsers.length > 0) {
      throw new Error("Email already exists");
    }

    const roleId = await getRoleId(roleCode, connection);
    if (!roleId) {
      throw new Error("Invalid role code");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [userInsert] = await connection.execute(
      `INSERT INTO users (full_name, email, password_hash, account_status, password_changed_at)
       VALUES (?, ?, ?, 'ACTIVE', NOW())`,
      [fullName, email.toLowerCase(), passwordHash]
    );

    await connection.execute(
      `INSERT INTO club_memberships (user_id, club_id, role_id, membership_status, joined_at)
       VALUES (?, ?, ?, 'ACTIVE', NOW())`,
      [userInsert.insertId, clubId, roleId]
    );

    await connection.execute(
      `INSERT INTO activity_logs (actor_user_id, entity_type, entity_id, action, metadata_json)
       VALUES (?, 'users', ?, 'CREATE_USER_WITH_ROLE', JSON_OBJECT('roleCode', ?, 'clubId', ?))`,
      [createdBy, userInsert.insertId, roleCode, clubId]
    );

    await connection.commit();
    return userInsert.insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getUserBasic(userId) {
  const [rows] = await db.execute(
    `SELECT id, full_name, email
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId]
  );

  return rows[0] || null;
}

export async function listAllClubs() {
  const [rows] = await db.execute(
    `SELECT id, club_code, club_name, description, is_active, created_at
     FROM clubs
     WHERE is_active = TRUE
     ORDER BY created_at DESC`
  );

  return rows;
}

export async function getClubInfo(clubId) {
  const [rows] = await db.execute(
    `SELECT id, club_code, club_name, description, is_active, created_at
     FROM clubs
     WHERE id = ? AND is_active = TRUE
     LIMIT 1`,
    [clubId]
  );

  return rows[0] || null;
}

export async function listCoordinatorsInClub(clubId) {
  const [rows] = await db.execute(
    `SELECT DISTINCT u.id, u.full_name, u.email, cm.joined_at
     FROM users u
     INNER JOIN club_memberships cm ON cm.user_id = u.id
     INNER JOIN roles r ON r.id = cm.role_id
     WHERE cm.club_id = ?
       AND r.role_code = 'COORDINATOR'
       AND cm.membership_status = 'ACTIVE'
     ORDER BY cm.joined_at DESC`,
    [clubId]
  );

  return rows;
}

export async function listLeadsInClub(clubId, roleCode = null) {
  let query = `SELECT DISTINCT u.id, u.full_name, u.email, r.role_code, cm.joined_at
     FROM users u
     INNER JOIN club_memberships cm ON cm.user_id = u.id
     INNER JOIN roles r ON r.id = cm.role_id
     WHERE cm.club_id = ?
       AND r.role_code IN ('FINANCE_LEAD', 'STUDENT_LEAD')
       AND cm.membership_status = 'ACTIVE'`;
  const params = [clubId];

  if (roleCode) {
    query += ` AND r.role_code = ?`;
    params.push(roleCode);
  }

  query += ` ORDER BY cm.joined_at DESC`;
  const [rows] = await db.execute(query, params);

  return rows;
}

export async function listMembersInClub(clubId) {
  const [rows] = await db.execute(
    `SELECT DISTINCT u.id, u.full_name, u.email, cm.joined_at
     FROM users u
     INNER JOIN club_memberships cm ON cm.user_id = u.id
     INNER JOIN roles r ON r.id = cm.role_id
     WHERE cm.club_id = ?
       AND r.role_code = 'MEMBER'
       AND cm.membership_status = 'ACTIVE'
     ORDER BY cm.joined_at DESC`,
    [clubId]
  );

  return rows;
}
