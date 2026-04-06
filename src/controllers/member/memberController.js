import { hasActiveClubRole } from "../../models/userProvisionModel.js";
import {
  createExpense,
  createStationeryRequest,
  listExpensesBySubmitter,
} from "../../models/workflowModel.js";

function getClubId(req) {
  return Number(req.auth.activeClubId);
}

export async function createExpenseHandler(req, res) {
  try {
    const clubId = getClubId(req);
    if (!clubId) {
      return res.status(400).json({ message: "Member token must include active club" });
    }

    const isMember = await hasActiveClubRole(req.auth.userId, clubId, "MEMBER");
    if (!isMember) {
      return res.status(403).json({ message: "Only club member can create expenses" });
    }

    const { title, description, expenseDate, categoryCode, amount, lineItems } = req.body;
    if (!title || !expenseDate || !categoryCode || amount === undefined) {
      return res.status(400).json({ message: "title, expenseDate, categoryCode and amount are required" });
    }

    const expenseId = await createExpense({
      clubId,
      submittedBy: req.auth.userId,
      title: String(title).trim(),
      description,
      expenseDate,
      categoryCode,
      amount: Number(amount),
      lineItems: Array.isArray(lineItems) ? lineItems : [],
    });

    return res.status(201).json({
      message: "Expense created successfully",
      expense: {
        id: expenseId,
        clubId,
        title: String(title).trim(),
        status: "SUBMITTED",
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
}

export async function listMyExpensesHandler(req, res) {
  try {
    const expenses = await listExpensesBySubmitter(req.auth.userId);
    return res.status(200).json({
      message: "Expenses fetched successfully",
      expenses,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
}

export async function createStationeryRequestHandler(req, res) {
  try {
    const clubId = getClubId(req);
    if (!clubId) {
      return res.status(400).json({ message: "Member token must include active club" });
    }

    const isMember = await hasActiveClubRole(req.auth.userId, clubId, "MEMBER");
    if (!isMember) {
      return res.status(403).json({ message: "Only club member can create stationery requests" });
    }

    const { requestTitle, requestReason, requiredByDate, items } = req.body;
    if (!requestTitle) {
      return res.status(400).json({ message: "requestTitle is required" });
    }

    const requestId = await createStationeryRequest({
      clubId,
      requestedBy: req.auth.userId,
      requestTitle: String(requestTitle).trim(),
      requestReason,
      requiredByDate,
      items: Array.isArray(items) ? items : [],
    });

    return res.status(201).json({
      message: "Stationery request created successfully",
      request: {
        id: requestId,
        clubId,
        requestTitle: String(requestTitle).trim(),
        status: "SUBMITTED",
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
}
