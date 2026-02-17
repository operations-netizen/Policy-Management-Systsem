import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig, loadEnv } from "vite";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const plugins = [
    react({ babel: { compact: true } }),
    tailwindcss(),
];
const cacheDir = (() => {
    const base = process.env.LOCALAPPDATA || process.env.TEMP;
    if (base) {
        return path.resolve(base, "freelance-management-vite-cache");
    }
    return path.resolve(__dirname, "vite-cache");
})();
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, __dirname, "");
    const apiTarget = env.VITE_API_URL || "http://localhost:3001";
    if (!env.VITE_API_URL) {
        console.warn("VITE_API_URL is not set. Falling back to http://localhost:3001 for dev proxy.");
    }
    const allowedHosts = env.VITE_ALLOWED_HOSTS
        ? env.VITE_ALLOWED_HOSTS.split(",").map((host) => host.trim()).filter(Boolean)
        : true;
    return {
        plugins,
        cacheDir,
        optimizeDeps: {
            holdUntilCrawlEnd: false,
        },
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "src"),
                "@shared": path.resolve(__dirname, "..", "backend", "shared"),
                "@assets": path.resolve(__dirname, "public"),
            },
        },
        envDir: path.resolve(__dirname),
        root: path.resolve(__dirname),
        publicDir: path.resolve(__dirname, "public"),
        build: {
            outDir: path.resolve(__dirname, "dist"),
            emptyOutDir: true,
        },
        server: {
            host: true,
            allowedHosts,
            proxy: {
                "/api": {
                    target: apiTarget,
                    changeOrigin: true,
                },
                "/uploads": {
                    target: apiTarget,
                    changeOrigin: true,
                },
            },
            fs: {
                strict: true,
                allow: [
                    path.resolve(__dirname),
                    path.resolve(__dirname, "..", "backend", "shared"),
                    cacheDir,
                ],
                deny: ["**/.env", "**/.env.*", "**/*.pem", "**/*.crt"],
            },
        },
    };
});
