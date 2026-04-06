import { Router } from "express";
import authMiddleware from "../../middleware/Auth.js";
import {
  decideExpenseHandler,
  listClubExpensesHandler,
} from "../../controllers/financeLead/financeLeadController.js";

const router = Router();

router.get("/expenses", authMiddleware, listClubExpensesHandler);
router.patch("/expenses/:expenseId/decision", authMiddleware, decideExpenseHandler);

export default router;
