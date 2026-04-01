import {
  createClub,
  createUserWithClubRole,
  getUserBasic,
  hasGlobalRole,
  listAllClubs,
  listCoordinatorsInClub,
} from "../../models/userProvisionModel.js";

function normalizeCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

export async function createClubHandler(req, res) {
  try {
    const isAdmin = await hasGlobalRole(req.auth.userId, "ADMIN");
    if (!isAdmin) {
      return res.status(403).json({ message: "Only admin can create clubs" });
    }

    const { clubCode, clubName, description } = req.body;
    if (!clubCode || !clubName) {
      return res.status(400).json({ message: "clubCode and clubName are required" });
    }

    const clubId = await createClub({
      clubCode: normalizeCode(clubCode),
      clubName: String(clubName).trim(),
      description,
      createdBy: req.auth.userId,
    });

    return res.status(201).json({
      message: "Club created successfully",
      club: {
        id: clubId,
        clubCode: normalizeCode(clubCode),
        clubName: String(clubName).trim(),
      },
    });
  } catch (error) {
    const statusCode = error.message?.includes("Duplicate") ? 409 : 500;
    return res.status(statusCode).json({ message: error.message || "Internal server error" });
  }
}

export async function createCoordinatorHandler(req, res) {
  try {
    const isAdmin = await hasGlobalRole(req.auth.userId, "ADMIN");
    if (!isAdmin) {
      return res.status(403).json({ message: "Only admin can create coordinator" });
    }

    const { fullName, email, password, clubId } = req.body;
    if (!fullName || !email || !password || !clubId) {
      return res.status(400).json({ message: "fullName, email, password and clubId are required" });
    }

    const userId = await createUserWithClubRole({
      fullName: String(fullName).trim(),
      email: String(email).trim(),
      password,
      roleCode: "COORDINATOR",
      clubId: Number(clubId),
      createdBy: req.auth.userId,
    });

    const user = await getUserBasic(userId);

    return res.status(201).json({
      message: "Coordinator created successfully",
      user,
      assignedRole: {
        roleCode: "COORDINATOR",
        clubId: Number(clubId),
      },
    });
  } catch (error) {
    const statusCode = error.message === "Email already exists" ? 409 : 500;
    return res.status(statusCode).json({ message: error.message || "Internal server error" });
  }
}

export async function listClubsHandler(req, res) {
  try {
    const isAdmin = await hasGlobalRole(req.auth.userId, "ADMIN");
    if (!isAdmin) {
      return res.status(403).json({ message: "Only admin can list clubs" });
    }

    const clubs = await listAllClubs();
    return res.status(200).json({
      message: "Clubs fetched successfully",
      clubs,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
}

export async function listCoordinatorsHandler(req, res) {
  try {
    const isAdmin = await hasGlobalRole(req.auth.userId, "ADMIN");
    if (!isAdmin) {
      return res.status(403).json({ message: "Only admin can list coordinators" });
    }

    const { clubId } = req.params;
    if (!clubId) {
      return res.status(400).json({ message: "clubId is required" });
    }

    const coordinators = await listCoordinatorsInClub(Number(clubId));
    return res.status(200).json({
      message: "Coordinators fetched successfully",
      coordinators,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
}
