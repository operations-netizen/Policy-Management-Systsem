const getOptionalEnv = (key) => {
    const value = process.env[key];
    return typeof value === "string" ? value.trim() : "";
};
export const ENV = {
    get cookieSecret() {
        return getOptionalEnv("JWT_SECRET");
    },
    get databaseUrl() {
        return getOptionalEnv("DATABASE_URL");
    },
    get mongodbUri() {
        return getOptionalEnv("MONGODB_URI");
    },
    get isProduction() {
        return process.env.NODE_ENV === "production";
    },
};
  