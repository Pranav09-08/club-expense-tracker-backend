import { Router } from "express";
import authMiddleware from "../../middleware/Auth.js";
import {
  createMemberHandler,
  listMembersHandler,
} from "../../controllers/studentLead/studentLeadController.js";

const router = Router();

router.post("/members", authMiddleware, createMemberHandler);
router.get("/members", authMiddleware, listMembersHandler);

export default router;
