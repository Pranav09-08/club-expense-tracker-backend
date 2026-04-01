-- Club Expense Tracker - Full Database Schema
-- Compatible with MySQL 8+ and TiDB

CREATE DATABASE IF NOT EXISTS club_expense_tracker
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE club_expense_tracker;

-- =========================================================
-- 1) MASTER TABLES
-- =========================================================

CREATE TABLE IF NOT EXISTS roles (
  id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role_code VARCHAR(40) NOT NULL UNIQUE,
  role_name VARCHAR(80) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO roles (role_code, role_name)
VALUES
  ('ADMIN', 'Admin'),
  ('COORDINATOR', 'Coordinator'),
  ('STUDENT_LEAD', 'Student Lead'),
  ('FINANCE_LEAD', 'Finance Lead'),
  ('MEMBER', 'Member'),
  ('STATIONARY_ADMIN', 'Stationary Admin')
ON DUPLICATE KEY UPDATE role_name = VALUES(role_name);

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  phone VARCHAR(20) NULL,
  password_hash VARCHAR(255) NOT NULL,
  account_status ENUM('ACTIVE','INACTIVE','LOCKED') NOT NULL DEFAULT 'ACTIVE',
  failed_login_attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  last_login_at DATETIME NULL,
  password_changed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  INDEX idx_users_status (account_status),
  INDEX idx_users_name (full_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS clubs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  club_code VARCHAR(50) NOT NULL UNIQUE,
  club_name VARCHAR(150) NOT NULL UNIQUE,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_clubs_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS club_memberships (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  club_id BIGINT UNSIGNED NOT NULL,
  role_id TINYINT UNSIGNED NOT NULL,
  membership_status ENUM('PENDING','ACTIVE','REJECTED','LEFT') NOT NULL DEFAULT 'PENDING',
  joined_at DATETIME NULL,
  left_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_membership_user_club_role (user_id, club_id, role_id),
  INDEX idx_membership_club_role (club_id, role_id),
  INDEX idx_membership_user (user_id),
  CONSTRAINT fk_membership_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_membership_club FOREIGN KEY (club_id) REFERENCES clubs(id),
  CONSTRAINT fk_membership_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_global_roles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  role_id TINYINT UNSIGNED NOT NULL,
  assigned_by BIGINT UNSIGNED NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_global_role (user_id, role_id),
  CONSTRAINT fk_user_global_role_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_user_global_role_role FOREIGN KEY (role_id) REFERENCES roles(id),
  CONSTRAINT fk_user_global_role_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- 2) AUTH TABLES
-- =========================================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  issued_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  replaced_by_token_hash CHAR(64) NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(300) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_refresh_user_expiry (user_id, expires_at),
  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS login_audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  email VARCHAR(191) NOT NULL,
  success BOOLEAN NOT NULL,
  reason VARCHAR(120) NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(300) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_login_email_created (email, created_at),
  INDEX idx_login_user_created (user_id, created_at),
  CONSTRAINT fk_login_audit_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- 3) EVENTS
-- =========================================================

CREATE TABLE IF NOT EXISTS events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  club_id BIGINT UNSIGNED NOT NULL,
  event_title VARCHAR(180) NOT NULL,
  event_description TEXT NULL,
  event_start DATETIME NOT NULL,
  event_end DATETIME NULL,
  location VARCHAR(200) NULL,
  budget_allocated DECIMAL(12,2) NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  status ENUM('DRAFT','PUBLISHED','COMPLETED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_events_club_start (club_id, event_start),
  INDEX idx_events_status (status),
  CONSTRAINT fk_events_club FOREIGN KEY (club_id) REFERENCES clubs(id),
  CONSTRAINT fk_events_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS event_members (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  participation_role VARCHAR(80) NULL,
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_event_user (event_id, user_id),
  INDEX idx_event_members_user (user_id),
  CONSTRAINT fk_event_members_event FOREIGN KEY (event_id) REFERENCES events(id),
  CONSTRAINT fk_event_members_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- 4) EXPENSES + APPROVAL FLOW
-- =========================================================

CREATE TABLE IF NOT EXISTS expense_categories (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_code VARCHAR(50) NOT NULL UNIQUE,
  category_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO expense_categories (category_code, category_name)
VALUES
  ('TRAVEL', 'Travel'),
  ('FOOD', 'Food'),
  ('DECORATION', 'Decoration'),
  ('STATIONARY', 'Stationary'),
  ('EQUIPMENT', 'Equipment'),
  ('OTHER', 'Other')
ON DUPLICATE KEY UPDATE category_name = VALUES(category_name);

CREATE TABLE IF NOT EXISTS expenses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  club_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NULL,
  submitted_by BIGINT UNSIGNED NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  expense_date DATE NOT NULL,
  category_id SMALLINT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  status ENUM('DRAFT','SUBMITTED','APPROVED','REJECTED') NOT NULL DEFAULT 'SUBMITTED',
  submitted_at DATETIME NULL,
  approved_at DATETIME NULL,
  rejected_at DATETIME NULL,
  rejection_reason VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_expenses_club_status_date (club_id, status, expense_date),
  INDEX idx_expenses_submitter (submitted_by),
  INDEX idx_expenses_event (event_id),
  CONSTRAINT fk_expenses_club FOREIGN KEY (club_id) REFERENCES clubs(id),
  CONSTRAINT fk_expenses_event FOREIGN KEY (event_id) REFERENCES events(id),
  CONSTRAINT fk_expenses_submitted_by FOREIGN KEY (submitted_by) REFERENCES users(id),
  CONSTRAINT fk_expenses_category FOREIGN KEY (category_id) REFERENCES expense_categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS expense_line_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  expense_id BIGINT UNSIGNED NOT NULL,
  item_name VARCHAR(180) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  note VARCHAR(250) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_expense_line_items_expense (expense_id),
  CONSTRAINT fk_expense_line_items_expense FOREIGN KEY (expense_id) REFERENCES expenses(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS expense_attachments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  expense_id BIGINT UNSIGNED NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(80) NULL,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_expense_attachments_expense (expense_id),
  CONSTRAINT fk_expense_attachments_expense FOREIGN KEY (expense_id) REFERENCES expenses(id),
  CONSTRAINT fk_expense_attachments_user FOREIGN KEY (uploaded_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS expense_approvals (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  expense_id BIGINT UNSIGNED NOT NULL,
  action_by BIGINT UNSIGNED NOT NULL,
  action_role_id TINYINT UNSIGNED NOT NULL,
  action ENUM('APPROVED','REJECTED','COMMENTED') NOT NULL,
  comment VARCHAR(500) NULL,
  acted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_expense_approvals_expense (expense_id),
  INDEX idx_expense_approvals_actor (action_by),
  CONSTRAINT fk_expense_approvals_expense FOREIGN KEY (expense_id) REFERENCES expenses(id),
  CONSTRAINT fk_expense_approvals_user FOREIGN KEY (action_by) REFERENCES users(id),
  CONSTRAINT fk_expense_approvals_role FOREIGN KEY (action_role_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- 5) STATIONARY PURCHASE WORKFLOW
-- =========================================================

CREATE TABLE IF NOT EXISTS stationary_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  club_id BIGINT UNSIGNED NOT NULL,
  requested_by BIGINT UNSIGNED NOT NULL,
  request_title VARCHAR(180) NOT NULL,
  request_reason TEXT NULL,
  required_by_date DATE NULL,
  status ENUM('SUBMITTED','APPROVED','REJECTED','ORDERED','RECEIVED') NOT NULL DEFAULT 'SUBMITTED',
  approved_at DATETIME NULL,
  rejected_at DATETIME NULL,
  rejection_reason VARCHAR(500) NULL,
  invoice_number VARCHAR(80) NULL,
  invoice_url VARCHAR(500) NULL,
  final_amount DECIMAL(12,2) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_stationary_requests_club_status (club_id, status),
  INDEX idx_stationary_requests_requested_by (requested_by),
  CONSTRAINT fk_stationary_requests_club FOREIGN KEY (club_id) REFERENCES clubs(id),
  CONSTRAINT fk_stationary_requests_user FOREIGN KEY (requested_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS stationary_request_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  stationary_request_id BIGINT UNSIGNED NOT NULL,
  item_name VARCHAR(180) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  estimated_unit_price DECIMAL(12,2) NULL,
  estimated_total_price DECIMAL(12,2) NULL,
  approved_quantity INT UNSIGNED NULL,
  approved_unit_price DECIMAL(12,2) NULL,
  approved_total_price DECIMAL(12,2) NULL,
  note VARCHAR(250) NULL,
  INDEX idx_stationary_request_items_req (stationary_request_id),
  CONSTRAINT fk_stationary_request_items_req FOREIGN KEY (stationary_request_id) REFERENCES stationary_requests(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS stationary_approvals (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  stationary_request_id BIGINT UNSIGNED NOT NULL,
  action_by BIGINT UNSIGNED NOT NULL,
  action_role_id TINYINT UNSIGNED NOT NULL,
  action ENUM('APPROVED','REJECTED','COMMENTED') NOT NULL,
  comment VARCHAR(500) NULL,
  acted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stationary_approvals_req (stationary_request_id),
  CONSTRAINT fk_stationary_approvals_req FOREIGN KEY (stationary_request_id) REFERENCES stationary_requests(id),
  CONSTRAINT fk_stationary_approvals_user FOREIGN KEY (action_by) REFERENCES users(id),
  CONSTRAINT fk_stationary_approvals_role FOREIGN KEY (action_role_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- 6) CHAT TABLES
-- =========================================================

CREATE TABLE IF NOT EXISTS chat_threads (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  thread_type ENUM('DIRECT','GROUP','CLUB_SUPPORT') NOT NULL DEFAULT 'DIRECT',
  club_id BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  title VARCHAR(180) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_chat_threads_club (club_id),
  CONSTRAINT fk_chat_threads_club FOREIGN KEY (club_id) REFERENCES clubs(id),
  CONSTRAINT fk_chat_threads_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_thread_participants (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  thread_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  left_at DATETIME NULL,
  UNIQUE KEY uq_thread_participant (thread_id, user_id),
  INDEX idx_thread_participant_user (user_id),
  CONSTRAINT fk_chat_participants_thread FOREIGN KEY (thread_id) REFERENCES chat_threads(id),
  CONSTRAINT fk_chat_participants_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  thread_id BIGINT UNSIGNED NOT NULL,
  sender_user_id BIGINT UNSIGNED NOT NULL,
  message_text TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_chat_messages_thread_time (thread_id, sent_at),
  INDEX idx_chat_messages_sender (sender_user_id),
  CONSTRAINT fk_chat_messages_thread FOREIGN KEY (thread_id) REFERENCES chat_threads(id),
  CONSTRAINT fk_chat_messages_sender FOREIGN KEY (sender_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- 7) ACTIVITY / AUDIT LOGS
-- =========================================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_user_id BIGINT UNSIGNED NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id BIGINT UNSIGNED NULL,
  action VARCHAR(80) NOT NULL,
  metadata_json JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(300) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_entity (entity_type, entity_id),
  INDEX idx_activity_actor_date (actor_user_id, created_at),
  CONSTRAINT fk_activity_actor FOREIGN KEY (actor_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- 8) OPTIONAL DEFAULT ADMIN SEED
-- Replace password hash before production use.
-- =========================================================

INSERT INTO users (full_name, email, password_hash, account_status, password_changed_at)
VALUES ('System Admin', 'admin@club.local', '$2b$10$7QGfNQ2W8mYvE1R6eQ1k2Os9vXG2LQPlZ1fD2QG3o7g9t4y1zNwQK', 'ACTIVE', NOW())
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);

INSERT IGNORE INTO user_global_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, u.id
FROM users u
JOIN roles r ON r.role_code = 'ADMIN'
WHERE u.email = 'admin@club.local';
