import {
  createUserWithClubRole,
  getUserBasic,
  hasActiveClubRole,
  listLeadsInClub,
} from "../../models/userProvisionModel.js";

const ALLOWED_ROLE_CODES = new Set(["FINANCE_LEAD", "STUDENT_LEAD"]);

function normalizeRoleCode(roleCode) {
  return String(roleCode || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

export async function createLeadHandler(req, res) {
  try {
    const clubId = Number(req.auth.activeClubId);
    if (!clubId) {
      return res.status(400).json({ message: "Coordinator token must include active club" });
    }

    const isCoordinator = await hasActiveClubRole(req.auth.userId, clubId, "COORDINATOR");
    if (!isCoordinator) {
      return res.status(403).json({ message: "Only coordinator can create leads for this club" });
    }

    const { fullName, email, password, roleCode } = req.body;
    const normalizedRoleCode = normalizeRoleCode(roleCode);

    if (!fullName || !email || !password || !normalizedRoleCode) {
      return res.status(400).json({ message: "fullName, email, password and roleCode are required" });
    }

    if (!ALLOWED_ROLE_CODES.has(normalizedRoleCode)) {
      return res.status(400).json({ message: "roleCode must be FINANCE_LEAD or STUDENT_LEAD" });
    }

    const userId = await createUserWithClubRole({
      fullName: String(fullName).trim(),
      email: String(email).trim(),
      password,
      roleCode: normalizedRoleCode,
      clubId,
      createdBy: req.auth.userId,
    });

    const user = await getUserBasic(userId);

    return res.status(201).json({
      message: "Lead created successfully",
      user,
      assignedRole: {
        roleCode: normalizedRoleCode,
        clubId,
      },
    });
  } catch (error) {
    const statusCode = error.message === "Email already exists" ? 409 : 500;
    return res.status(statusCode).json({ message: error.message || "Internal server error" });
  }
}

export async function listLeadsHandler(req, res) {
  try {
    const clubId = Number(req.auth.activeClubId);
    if (!clubId) {
      return res.status(400).json({ message: "Coordinator token must include active club" });
    }

    const isCoordinator = await hasActiveClubRole(req.auth.userId, clubId, "COORDINATOR");
    if (!isCoordinator) {
      return res.status(403).json({ message: "Only coordinator can view leads for this club" });
    }

    const leads = await listLeadsInClub(clubId);
    return res.status(200).json({
      message: "Leads fetched successfully",
      leads,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
}
