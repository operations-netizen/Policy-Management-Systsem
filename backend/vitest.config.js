import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";
const templateRoot = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
    root: templateRoot,
    resolve: {
        alias: {
            "@": path.resolve(templateRoot, "..", "frontend", "src"),
            "@shared": path.resolve(templateRoot, "shared"),
            "@assets": path.resolve(templateRoot, "..", "frontend", "public"),
        },
    },
    test: {
        environment: "node",
        include: ["**/*.test.js", "**/*.spec.js"],
    },
});
