import { COOKIE_NAME } from "../shared/const.js";
import { ForbiddenError } from "../shared/_core/errors.js";
import { parse as parseCookieHeader } from "cookie";
import { jwtVerify } from "jose";
import * as db from "../db.js";
import { ENV } from "./env.js";
import { logger } from "./logger.js";
  
const parseCookies = (cookieHeader) => {
    if (!cookieHeader) {
        return new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
};

const getSessionSecret = () => {
    const secret = ENV.cookieSecret;
    if (!secret) {
        throw new Error("JWT_SECRET is missing. Set it in backend/.env or your environment.");
    }
    return new TextEncoder().encode(secret);
};

export async function authenticateRequest(req) {
    const cookies = parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    let sessionToken = sessionCookie;
    if (!sessionToken) {
        const authHeader = req.headers.authorization;
        if (typeof authHeader === "string" && authHeader.toLowerCase().startsWith("bearer ")) {
            sessionToken = authHeader.slice(7).trim();
        }
    }
    if (!sessionToken) {
        throw ForbiddenError("No session token");
    }
    let payload;
    try {
        const secretKey = getSessionSecret();
        ({ payload } = await jwtVerify(sessionToken, secretKey, {
            algorithms: ["HS256"],
        }));
    }
    catch (error) {
        logger.debug("[Auth] Session verification failed", String(error));
        throw ForbiddenError("Invalid session cookie");
    }
    const userId = payload?.userId;
    if (!userId || typeof userId !== "string") {
        throw ForbiddenError("Invalid session cookie");
    }
    const user = await Promise.race([
        db.getUserById(userId),
        new Promise((_, reject) => setTimeout(() => reject(new Error("getUserById timeout")), 5000)),
    ]);
    if (!user) {
        logger.warn("[Auth] User not found in DB:", userId);
        throw ForbiddenError("User not found");
    }
    const { password, ...safeUser } = user;
    return { ...safeUser, id: user._id?.toString() ?? userId };
}
