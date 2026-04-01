import { Router } from "express";
import authMiddleware from "../../middleware/Auth.js";
import {
  createClubHandler,
  createCoordinatorHandler,
  listClubsHandler,
  listCoordinatorsHandler,
} from "../../controllers/admin/adminController.js";

const router = Router();

router.post("/clubs", authMiddleware, createClubHandler);
router.get("/clubs", authMiddleware, listClubsHandler);
router.post("/coordinators", authMiddleware, createCoordinatorHandler);
router.get("/clubs/:clubId/coordinators", authMiddleware, listCoordinatorsHandler);

export default router;
