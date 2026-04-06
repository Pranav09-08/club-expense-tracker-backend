import { hasActiveClubRole } from "../../models/userProvisionModel.js";
import {
  listExpensesByClub,
  updateExpenseDecision,
} from "../../models/workflowModel.js";

function getClubId(req) {
  return Number(req.auth.activeClubId);
}

export async function listClubExpensesHandler(req, res) {
  try {
    const clubId = getClubId(req);
    if (!clubId) {
      return res.status(400).json({ message: "Finance lead token must include active club" });
    }

    const isFinanceLead = await hasActiveClubRole(req.auth.userId, clubId, "FINANCE_LEAD");
    if (!isFinanceLead) {
      return res.status(403).json({ message: "Only finance lead can view expenses for this club" });
    }

    const expenses = await listExpensesByClub(clubId);
    return res.status(200).json({
      message: "Expenses fetched successfully",
      expenses,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
}

export async function decideExpenseHandler(req, res) {
  try {
    const clubId = getClubId(req);
    if (!clubId) {
      return res.status(400).json({ message: "Finance lead token must include active club" });
    }

    const isFinanceLead = await hasActiveClubRole(req.auth.userId, clubId, "FINANCE_LEAD");
    if (!isFinanceLead) {
      return res.status(403).json({ message: "Only finance lead can decide expenses for this club" });
    }

    const { expenseId } = req.params;
    const { decision, comment } = req.body;

    if (!expenseId || !decision) {
      return res.status(400).json({ message: "expenseId and decision are required" });
    }

    await updateExpenseDecision({
      expenseId: Number(expenseId),
      actionBy: req.auth.userId,
      actionRoleCode: "FINANCE_LEAD",
      decision: String(decision).toUpperCase(),
      comment,
    });

    return res.status(200).json({
      message: "Expense decision saved successfully",
      expenseId: Number(expenseId),
      decision: String(decision).toUpperCase(),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
}
