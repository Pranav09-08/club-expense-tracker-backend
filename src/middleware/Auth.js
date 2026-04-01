import { isAccessTokenBlacklisted } from "../models/authModel.js";
import { hashToken, verifyAccessToken } from "../utils/authJWT.js";

export default async function authMiddleware(req, res, next) {
	try {
		const authHeader = req.headers.authorization || "";
		const [scheme, token] = authHeader.split(" ");

		if (scheme !== "Bearer" || !token) {
			return res.status(401).json({ message: "Unauthorized" });
		}

		const blacklisted = await isAccessTokenBlacklisted(hashToken(token));
		if (blacklisted) {
			return res.status(401).json({ message: "Access token has been logged out" });
		}

		const decoded = verifyAccessToken(token);
		req.auth = {
			userId: Number(decoded.sub),
			email: decoded.email,
			activeRole: decoded.activeRole,
			activeRoleScope: decoded.activeRoleScope,
			activeClubId: decoded.activeClubId,
			expiresAt: decoded.exp ? new Date(decoded.exp * 1000) : null,
		};
		req.accessToken = token;

		return next();
	} catch (error) {
		return res.status(401).json({ message: "Invalid or expired access token" });
	}
}
