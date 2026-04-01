import db from "../config/db.js";

let blacklistTableReady = false;

async function ensureAccessTokenBlacklistTable() {
  if (blacklistTableReady) return;

  await db.execute(
    `CREATE TABLE IF NOT EXISTS access_token_blacklist (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      token_hash CHAR(64) NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_access_token_blacklist_expiry (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  );

  blacklistTableReady = true;
}

export async function findUserByEmail(email) {
  const [rows] = await db.execute(
    `SELECT id, full_name, email, password_hash, account_status, failed_login_attempts
     FROM users
     WHERE email = ? AND deleted_at IS NULL
     LIMIT 1`,
    [email.toLowerCase()]
  );

  return rows[0] || null;
}

export async function findUserById(userId) {
  const [rows] = await db.execute(
    `SELECT id, full_name, email, account_status, last_login_at, created_at
     FROM users
     WHERE id = ? AND deleted_at IS NULL
     LIMIT 1`,
    [userId]
  );

  return rows[0] || null;
}

export async function getUserRoles(userId) {
  const [rows] = await db.execute(
    `SELECT DISTINCT r.role_code, NULL AS club_id, 'GLOBAL' AS scope_type
     FROM user_global_roles ugr
     INNER JOIN roles r ON r.id = ugr.role_id
     WHERE ugr.user_id = ?

     UNION

     SELECT DISTINCT r.role_code, cm.club_id, 'CLUB' AS scope_type
     FROM club_memberships cm
     INNER JOIN roles r ON r.id = cm.role_id
     WHERE cm.user_id = ?
       AND cm.membership_status = 'ACTIVE'`,
    [userId, userId]
  );

  return rows;
}

export async function increaseFailedAttempts(userId) {
  await db.execute(
    `UPDATE users
     SET failed_login_attempts = failed_login_attempts + 1
     WHERE id = ?`,
    [userId]
  );
}

export async function resetFailedAttemptsAndSetLoginTime(userId) {
  await db.execute(
    `UPDATE users
     SET failed_login_attempts = 0,
         last_login_at = NOW()
     WHERE id = ?`,
    [userId]
  );
}

export async function lockUser(userId) {
  await db.execute(
    `UPDATE users
     SET account_status = 'LOCKED'
     WHERE id = ?`,
    [userId]
  );
}

export async function createLoginAuditLog({ userId, email, success, reason, ipAddress, userAgent }) {
  await db.execute(
    `INSERT INTO login_audit_logs (user_id, email, success, reason, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userId || null,
      (email || "").toLowerCase(),
      success,
      reason || null,
      ipAddress || null,
      userAgent || null,
    ]
  );
}

export async function blacklistAccessToken(tokenHash, expiresAt) {
  await ensureAccessTokenBlacklistTable();
  await db.execute(
    `INSERT IGNORE INTO access_token_blacklist (token_hash, expires_at)
     VALUES (?, ?)`,
    [tokenHash, expiresAt]
  );
}

export async function isAccessTokenBlacklisted(tokenHash) {
  await ensureAccessTokenBlacklistTable();
  const [rows] = await db.execute(
    `SELECT id
     FROM access_token_blacklist
     WHERE token_hash = ?
       AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );

  return rows.length > 0;
}
