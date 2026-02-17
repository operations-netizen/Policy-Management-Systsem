import { describe, it, expect, beforeAll } from "vitest";
import { createRestRouter } from "./rest.js";
import { connectDB } from "./models.js";
import * as db from "./db.js";
describe("Custom Email/Password Login", () => {
    const hasRoute = (router, path, method) => {
        const routes = router.stack
            .filter((layer) => layer.route)
            .map((layer) => ({
            path: layer.route.path,
            methods: layer.route.methods,
        }));
        return routes.some((route) => route.path === path && route.methods?.[method]);
    };
    beforeAll(async () => {
        // Ensure MongoDB connection
        await connectDB();
    });
    it("should verify MongoDB connection string is set", () => {
        const mongoUri = process.env.MONGODB_URI;
        expect(mongoUri).toBeDefined();
        expect(mongoUri).toContain("mongodb");
    });
    it("should verify default admin account exists and has correct data", async () => {
        const user = await db.getUserByEmail("suraj@wytlabs.com");
        expect(user).toBeDefined();
        expect(user?.email).toBe("suraj@wytlabs.com");
        expect(user?.name).toBe("Suraj Kumar");
        expect(user?.role).toBe("admin");
    }, 15000);
    it("should have login endpoint available", () => {
        const router = createRestRouter();
        expect(hasRoute(router, "/auth/login", "post")).toBe(true);
    });
    it("should have me endpoint available", () => {
        const router = createRestRouter();
        expect(hasRoute(router, "/auth/me", "get")).toBe(true);
    });
    it("should have logout endpoint available", () => {
        const router = createRestRouter();
        expect(hasRoute(router, "/auth/logout", "post")).toBe(true);
    });
    it("should verify database helper functions exist", () => {
        expect(db.getUserByEmail).toBeDefined();
        expect(db.getUserById).toBeDefined();
        expect(db.updateUser).toBeDefined();
    });
});
