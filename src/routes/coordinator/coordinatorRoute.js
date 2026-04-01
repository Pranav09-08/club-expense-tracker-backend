import { Router } from "express";
import authMiddleware from "../../middleware/Auth.js";
import {
  createLeadHandler,
  listLeadsHandler,
} from "../../controllers/coordinator/coordinatorController.js";

const router = Router();

router.post("/leads", authMiddleware, createLeadHandler);
router.get("/leads", authMiddleware, listLeadsHandler);

export default router;
