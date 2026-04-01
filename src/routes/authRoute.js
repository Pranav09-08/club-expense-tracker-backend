import { Router } from "express";
import { login, logout, me } from "../controllers/authController.js";
import authMiddleware from "../middleware/Auth.js";

const router = Router();

router.post("/login", login);
router.post("/logout", authMiddleware, logout);
router.get("/me", authMiddleware, me);

export default router;
