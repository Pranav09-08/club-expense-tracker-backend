import bcrypt from "bcryptjs";
import {
  blacklistAccessToken,
  createLoginAuditLog,
  findUserByEmail,
  findUserById,
  getUserRoles,
  increaseFailedAttempts,
  lockUser,
  resetFailedAttemptsAndSetLoginTime,
} from "../models/authModel.js";
import { hashToken, signAccessToken } from "../utils/authJWT.js";

const MAX_FAILED_LOGIN_ATTEMPTS = 5;

function getRequestMeta(req) {
  return {
    ipAddress: req.ip,
    userAgent: req.get("user-agent") || "",
  };
}

function normalizeRole(roleCode) {
  return String(roleCode || "").trim().toUpperCase();
}

function pickActiveRole(roles, requestedRoleCode, requestedClubId) {
  if (roles.length === 0) {
    return null;
  }

  if (!requestedRoleCode) {
    return roles[0];
  }

  const code = normalizeRole(requestedRoleCode);
  const clubId = requestedClubId ? Number(requestedClubId) : null;

  return (
    roles.find((role) => {
      if (role.role_code !== code) return false;
      if (clubId && role.club_id && Number(role.club_id) !== clubId) return false;
      return true;
    }) || null
  );
}

function buildJwtPayload(user, roles, activeRole) {
  return {
    sub: String(user.id),
    email: user.email,
    fullName: user.full_name,
    activeRole: activeRole.role_code,
    activeRoleScope: activeRole.scope_type,
    activeClubId: activeRole.club_id,
    roles: roles.map((item) => ({
      roleCode: item.role_code,
      scopeType: item.scope_type,
      clubId: item.club_id,
    })),
  };
}

export async function login(req, res) {
  try {
    const { email, password, roleCode, clubId } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const meta = getRequestMeta(req);
    const user = await findUserByEmail(email);

    if (!user) {
      await createLoginAuditLog({
        userId: null,
        email,
        success: false,
        reason: "USER_NOT_FOUND",
        ...meta,
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.account_status !== "ACTIVE") {
      await createLoginAuditLog({
        userId: user.id,
        email,
        success: false,
        reason: `ACCOUNT_${user.account_status}`,
        ...meta,
      });
      return res.status(403).json({ message: `Account is ${user.account_status.toLowerCase()}` });
    }

    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) {
      await increaseFailedAttempts(user.id);

      const nextAttemptCount = Number(user.failed_login_attempts || 0) + 1;
      if (nextAttemptCount >= MAX_FAILED_LOGIN_ATTEMPTS) {
        await lockUser(user.id);
      }

      await createLoginAuditLog({
        userId: user.id,
        email,
        success: false,
        reason: "INVALID_PASSWORD",
        ...meta,
      });

      return res.status(401).json({ message: "Invalid credentials" });
    }

    const roles = await getUserRoles(user.id);
    const activeRole = pickActiveRole(roles, roleCode, clubId);

    if (!activeRole) {
      await createLoginAuditLog({
        userId: user.id,
        email,
        success: false,
        reason: "ROLE_NOT_ASSIGNED",
        ...meta,
      });
      return res.status(403).json({ message: "Requested role is not assigned to this user" });
    }

    const payload = buildJwtPayload(user, roles, activeRole);
    const accessToken = signAccessToken(payload);

    await resetFailedAttemptsAndSetLoginTime(user.id);
    await createLoginAuditLog({
      userId: user.id,
      email,
      success: true,
      reason: null,
      ...meta,
    });

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
      },
      activeRole: {
        roleCode: activeRole.role_code,
        scopeType: activeRole.scope_type,
        clubId: activeRole.club_id,
      },
      availableRoles: roles.map((item) => ({
        roleCode: item.role_code,
        scopeType: item.scope_type,
        clubId: item.club_id,
      })),
      accessToken,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
}

export async function me(req, res) {
  try {
    const user = await findUserById(req.auth.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const roles = await getUserRoles(user.id);

    return res.status(200).json({
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        status: user.account_status,
      },
      roles: roles.map((item) => ({
        roleCode: item.role_code,
        scopeType: item.scope_type,
        clubId: item.club_id,
      })),
      tokenContext: {
        activeRole: req.auth.activeRole,
        activeRoleScope: req.auth.activeRoleScope,
        activeClubId: req.auth.activeClubId,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
}

export async function logout(req, res) {
  try {
    if (!req.accessToken || !req.auth?.expiresAt) {
      return res.status(400).json({ message: "No active session token found" });
    }

    await blacklistAccessToken(hashToken(req.accessToken), req.auth.expiresAt);
    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
}
