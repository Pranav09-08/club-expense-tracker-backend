import jwt from "jsonwebtoken";
import crypto from "crypto";

const ACCESS_TOKEN_TTL = process.env.JWT_ACCESS_EXPIRES_IN || "15m";

function getRequiredEnv(name) {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

export function signAccessToken(payload) {
	return jwt.sign(payload, getRequiredEnv("JWT_ACCESS_SECRET"), {
		expiresIn: ACCESS_TOKEN_TTL,
		issuer: "club-expense-backend",
	});
}

export function verifyAccessToken(token) {
	return jwt.verify(token, getRequiredEnv("JWT_ACCESS_SECRET"), {
		issuer: "club-expense-backend",
	});
}

export function hashToken(token) {
	return crypto.createHash("sha256").update(token).digest("hex");
}
