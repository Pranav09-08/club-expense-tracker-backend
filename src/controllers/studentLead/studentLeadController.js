import {
  createUserWithClubRole,
  getUserBasic,
  hasActiveClubRole,
  listMembersInClub,
} from "../../models/userProvisionModel.js";

export async function createMemberHandler(req, res) {
  try {
    const clubId = Number(req.auth.activeClubId);
    if (!clubId) {
      return res.status(400).json({ message: "Student lead token must include active club" });
    }

    const isStudentLead = await hasActiveClubRole(req.auth.userId, clubId, "STUDENT_LEAD");
    if (!isStudentLead) {
      return res.status(403).json({ message: "Only student lead can create members for this club" });
    }

    const { fullName, email, password } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "fullName, email and password are required" });
    }

    const userId = await createUserWithClubRole({
      fullName: String(fullName).trim(),
      email: String(email).trim(),
      password,
      roleCode: "MEMBER",
      clubId,
      createdBy: req.auth.userId,
    });

    const user = await getUserBasic(userId);

    return res.status(201).json({
      message: "Member created successfully",
      user,
      assignedRole: {
        roleCode: "MEMBER",
        clubId,
      },
    });
  } catch (error) {
    const statusCode = error.message === "Email already exists" ? 409 : 500;
    return res.status(statusCode).json({ message: error.message || "Internal server error" });
  }
}

export async function listMembersHandler(req, res) {
  try {
    const clubId = Number(req.auth.activeClubId);
    if (!clubId) {
      return res.status(400).json({ message: "Student lead token must include active club" });
    }

    const isStudentLead = await hasActiveClubRole(req.auth.userId, clubId, "STUDENT_LEAD");
    if (!isStudentLead) {
      return res.status(403).json({ message: "Only student lead can view members for this club" });
    }

    const members = await listMembersInClub(clubId);
    return res.status(200).json({
      message: "Members fetched successfully",
      members,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
}
