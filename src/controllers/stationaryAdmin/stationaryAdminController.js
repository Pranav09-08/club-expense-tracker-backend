import { hasActiveClubRole } from "../../models/userProvisionModel.js";
import {
  listStationeryRequestsByClub,
  updateStationeryDecision,
} from "../../models/workflowModel.js";

function getClubId(req) {
  return Number(req.auth.activeClubId);
}

export async function listStationeryRequestsHandler(req, res) {
  try {
    const clubId = getClubId(req);
    if (!clubId) {
      return res.status(400).json({ message: "Stationary admin token must include active club" });
    }

    const isStationaryAdmin = await hasActiveClubRole(req.auth.userId, clubId, "STATIONARY_ADMIN");
    if (!isStationaryAdmin) {
      return res.status(403).json({ message: "Only stationary admin can view stationery requests for this club" });
    }

    const requests = await listStationeryRequestsByClub(clubId);
    return res.status(200).json({
      message: "Stationery requests fetched successfully",
      requests,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
}

export async function decideStationeryRequestHandler(req, res) {
  try {
    const clubId = getClubId(req);
    if (!clubId) {
      return res.status(400).json({ message: "Stationary admin token must include active club" });
    }

    const isStationaryAdmin = await hasActiveClubRole(req.auth.userId, clubId, "STATIONARY_ADMIN");
    if (!isStationaryAdmin) {
      return res.status(403).json({ message: "Only stationary admin can decide stationery requests for this club" });
    }

    const { requestId } = req.params;
    const { decision, comment, invoiceNumber, invoiceUrl, finalAmount } = req.body;

    if (!requestId || !decision) {
      return res.status(400).json({ message: "requestId and decision are required" });
    }

    await updateStationeryDecision({
      requestId: Number(requestId),
      actionBy: req.auth.userId,
      actionRoleCode: "STATIONARY_ADMIN",
      decision: String(decision).toUpperCase(),
      comment,
      invoiceNumber,
      invoiceUrl,
      finalAmount: finalAmount !== undefined ? Number(finalAmount) : null,
    });

    return res.status(200).json({
      message: "Stationery request decision saved successfully",
      requestId: Number(requestId),
      decision: String(decision).toUpperCase(),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
}
