import { Router } from "express";
import authMiddleware from "../../middleware/Auth.js";
import {
  decideStationeryRequestHandler,
  listStationeryRequestsHandler,
} from "../../controllers/stationaryAdmin/stationaryAdminController.js";

const router = Router();

router.get("/requests", authMiddleware, listStationeryRequestsHandler);
router.patch("/requests/:requestId/decision", authMiddleware, decideStationeryRequestHandler);

export default router;
