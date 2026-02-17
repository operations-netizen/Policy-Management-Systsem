import { describe, expect, it } from "vitest";
import { createRestRouter } from "./rest.js";
describe("auth.logout", () => {
    it("registers the logout endpoint", () => {
        const router = createRestRouter();
        const routes = router.stack
            .filter((layer) => layer.route)
            .map((layer) => ({
            path: layer.route.path,
            methods: layer.route.methods,
        }));
        const hasLogout = routes.some(
            (route) => route.path === "/auth/logout" && route.methods?.post,
        );
        expect(hasLogout).toBe(true);
    });
});
