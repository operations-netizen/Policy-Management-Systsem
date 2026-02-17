import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "..", ".env");
const envResult = dotenv.config({
    path: envPath,
    override: process.env.NODE_ENV !== "production",
});

if (envResult.error) {
    dotenv.config();
}
  
const jwtSecret = process.env.JWT_SECRET?.trim();
const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;

if (process.env.NODE_ENV !== "production") {
    logger.info(`[Env] Loaded ${envPath} (JWT_SECRET set: ${Boolean(jwtSecret)}, MONGODB_URI set: ${Boolean(mongoUri)})`);
}

if (!jwtSecret) {
    logger.error("[Env] JWT_SECRET is missing. Set it in backend/.env or your environment.");
    process.exit(1);
}

if (!mongoUri) {
    logger.warn("[Env] MONGODB_URI is missing. Database connection will fail until it is set.");
}
