import { Router } from "express";
import authMiddleware from "../../middleware/Auth.js";
import {
  createExpenseHandler,
  createStationeryRequestHandler,
  listMyExpensesHandler,
} from "../../controllers/member/memberController.js";

const router = Router();

router.post("/expenses", authMiddleware, createExpenseHandler);
router.get("/expenses", authMiddleware, listMyExpensesHandler);
router.post("/stationery-requests", authMiddleware, createStationeryRequestHandler);

export default router;
