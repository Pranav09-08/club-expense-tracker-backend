import db from "../config/db.js";

async function getRoleId(roleCode, connection = db) {
  const [rows] = await connection.execute(
    `SELECT id FROM roles WHERE role_code = ? LIMIT 1`,
    [roleCode]
  );

  return rows[0]?.id || null;
}

export async function createExpense({ clubId, submittedBy, title, description, expenseDate, categoryCode, amount, lineItems = [] }) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [categoryRows] = await connection.execute(
      `SELECT id FROM expense_categories WHERE category_code = ? AND is_active = TRUE LIMIT 1`,
      [categoryCode]
    );

    const categoryId = categoryRows[0]?.id;
    if (!categoryId) {
      throw new Error("Invalid expense category");
    }

    const [expenseResult] = await connection.execute(
      `INSERT INTO expenses (club_id, submitted_by, title, description, expense_date, category_id, amount, currency, status, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'INR', 'SUBMITTED', NOW())`,
      [clubId, submittedBy, title, description || null, expenseDate, categoryId, amount]
    );

    if (Array.isArray(lineItems) && lineItems.length > 0) {
      for (const item of lineItems) {
        const quantity = Number(item.quantity || 1);
        const unitPrice = Number(item.unitPrice || 0);
        const totalPrice = Number(item.totalPrice || quantity * unitPrice);

        await connection.execute(
          `INSERT INTO expense_line_items (expense_id, item_name, quantity, unit_price, total_price, note)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [expenseResult.insertId, item.itemName, quantity, unitPrice, totalPrice, item.note || null]
        );
      }
    }

    await connection.execute(
      `INSERT INTO activity_logs (actor_user_id, entity_type, entity_id, action, metadata_json)
       VALUES (?, 'expenses', ?, 'CREATE_EXPENSE', JSON_OBJECT('clubId', ?, 'amount', ?))`,
      [submittedBy, expenseResult.insertId, clubId, amount]
    );

    await connection.commit();
    return expenseResult.insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listExpensesByClub(clubId) {
  const [rows] = await db.execute(
    `SELECT e.id, e.title, e.description, e.expense_date, e.amount, e.currency, e.status,
            e.submitted_at, e.approved_at, e.rejected_at, e.rejection_reason,
            u.full_name AS submitted_by_name, u.email AS submitted_by_email,
            c.category_code, c.category_name
     FROM expenses e
     INNER JOIN users u ON u.id = e.submitted_by
     INNER JOIN expense_categories c ON c.id = e.category_id
     WHERE e.club_id = ?
     ORDER BY e.created_at DESC`,
    [clubId]
  );

  return rows;
}

export async function listExpensesBySubmitter(userId) {
  const [rows] = await db.execute(
    `SELECT e.id, e.title, e.description, e.expense_date, e.amount, e.currency, e.status,
            e.submitted_at, e.approved_at, e.rejected_at, e.rejection_reason,
            c.category_code, c.category_name
     FROM expenses e
     INNER JOIN expense_categories c ON c.id = e.category_id
     WHERE e.submitted_by = ?
     ORDER BY e.created_at DESC`,
    [userId]
  );

  return rows;
}

export async function getExpenseById(expenseId) {
  const [rows] = await db.execute(
    `SELECT e.id, e.club_id, e.submitted_by, e.title, e.description, e.expense_date, e.amount,
            e.currency, e.status, e.rejection_reason, e.approved_at, e.rejected_at,
            c.category_code, c.category_name
     FROM expenses e
     INNER JOIN expense_categories c ON c.id = e.category_id
     WHERE e.id = ?
     LIMIT 1`,
    [expenseId]
  );

  return rows[0] || null;
}

export async function updateExpenseDecision({ expenseId, actionBy, actionRoleCode, decision, comment }) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const expense = await getExpenseById(expenseId);
    if (!expense) {
      throw new Error("Expense not found");
    }

    const [roleRows] = await connection.execute(
      `SELECT id FROM roles WHERE role_code = ? LIMIT 1`,
      [actionRoleCode]
    );
    const roleId = roleRows[0]?.id;
    if (!roleId) {
      throw new Error("Invalid action role");
    }

    if (!["APPROVED", "REJECTED"].includes(decision)) {
      throw new Error("Invalid decision");
    }

    const status = decision;
    const statusColumn = decision === "APPROVED" ? "approved_at" : "rejected_at";

    await connection.execute(
      `UPDATE expenses
       SET status = ?, ${statusColumn} = NOW(), rejection_reason = ?
       WHERE id = ?`,
      [status, decision === "REJECTED" ? comment || null : null, expenseId]
    );

    await connection.execute(
      `INSERT INTO expense_approvals (expense_id, action_by, action_role_id, action, comment, acted_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [expenseId, actionBy, roleId, decision, comment || null]
    );

    await connection.execute(
      `INSERT INTO activity_logs (actor_user_id, entity_type, entity_id, action, metadata_json)
       VALUES (?, 'expenses', ?, ?, JSON_OBJECT('decision', ?, 'comment', ?))`,
      [actionBy, expenseId, decision === "APPROVED" ? 'APPROVE_EXPENSE' : 'REJECT_EXPENSE', decision, comment || null]
    );

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function createStationeryRequest({ clubId, requestedBy, requestTitle, requestReason, requiredByDate, items = [] }) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [requestResult] = await connection.execute(
      `INSERT INTO stationary_requests (club_id, requested_by, request_title, request_reason, required_by_date, status)
       VALUES (?, ?, ?, ?, ?, 'SUBMITTED')`,
      [clubId, requestedBy, requestTitle, requestReason || null, requiredByDate || null]
    );

    for (const item of items) {
      await connection.execute(
        `INSERT INTO stationary_request_items (stationary_request_id, item_name, quantity, estimated_unit_price, estimated_total_price, note)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          requestResult.insertId,
          item.itemName,
          Number(item.quantity || 1),
          item.estimatedUnitPrice || null,
          item.estimatedTotalPrice || null,
          item.note || null,
        ]
      );
    }

    await connection.execute(
      `INSERT INTO activity_logs (actor_user_id, entity_type, entity_id, action, metadata_json)
       VALUES (?, 'stationary_requests', ?, 'CREATE_STATIONERY_REQUEST', JSON_OBJECT('clubId', ?, 'title', ?))`,
      [requestedBy, requestResult.insertId, clubId, requestTitle]
    );

    await connection.commit();
    return requestResult.insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listStationeryRequestsByClub(clubId) {
  const [rows] = await db.execute(
    `SELECT sr.id, sr.request_title, sr.request_reason, sr.required_by_date, sr.status,
            sr.approved_at, sr.rejected_at, sr.rejection_reason, sr.invoice_number, sr.invoice_url, sr.final_amount,
            u.full_name AS requested_by_name, u.email AS requested_by_email
     FROM stationary_requests sr
     INNER JOIN users u ON u.id = sr.requested_by
     WHERE sr.club_id = ?
     ORDER BY sr.created_at DESC`,
    [clubId]
  );

  return rows;
}

export async function getStationeryRequestById(requestId) {
  const [rows] = await db.execute(
    `SELECT id, club_id, requested_by, request_title, request_reason, required_by_date, status,
            approved_at, rejected_at, rejection_reason, invoice_number, invoice_url, final_amount
     FROM stationary_requests
     WHERE id = ?
     LIMIT 1`,
    [requestId]
  );

  return rows[0] || null;
}

export async function updateStationeryDecision({ requestId, actionBy, actionRoleCode, decision, comment, invoiceNumber, invoiceUrl, finalAmount }) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const request = await getStationeryRequestById(requestId);
    if (!request) {
      throw new Error("Stationery request not found");
    }

    const [roleRows] = await connection.execute(
      `SELECT id FROM roles WHERE role_code = ? LIMIT 1`,
      [actionRoleCode]
    );
    const roleId = roleRows[0]?.id;
    if (!roleId) {
      throw new Error("Invalid action role");
    }

    if (!["APPROVED", "REJECTED"].includes(decision)) {
      throw new Error("Invalid decision");
    }

    await connection.execute(
      `UPDATE stationary_requests
       SET status = ?, approved_at = CASE WHEN ? = 'APPROVED' THEN NOW() ELSE approved_at END,
           rejected_at = CASE WHEN ? = 'REJECTED' THEN NOW() ELSE rejected_at END,
           rejection_reason = CASE WHEN ? = 'REJECTED' THEN ? ELSE NULL END,
           invoice_number = COALESCE(?, invoice_number),
           invoice_url = COALESCE(?, invoice_url),
           final_amount = COALESCE(?, final_amount)
       WHERE id = ?`,
      [decision, decision, decision, decision, comment || null, invoiceNumber || null, invoiceUrl || null, finalAmount || null, requestId]
    );

    await connection.execute(
      `INSERT INTO stationary_approvals (stationary_request_id, action_by, action_role_id, action, comment, acted_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [requestId, actionBy, roleId, decision, comment || null]
    );

    await connection.execute(
      `INSERT INTO activity_logs (actor_user_id, entity_type, entity_id, action, metadata_json)
       VALUES (?, 'stationary_requests', ?, ?, JSON_OBJECT('decision', ?, 'comment', ?))`,
      [actionBy, requestId, decision === 'APPROVED' ? 'APPROVE_STATIONERY_REQUEST' : 'REJECT_STATIONERY_REQUEST', decision, comment || null]
    );

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
