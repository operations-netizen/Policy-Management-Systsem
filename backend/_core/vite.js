import express from "express";
import fs from "fs";
import { nanoid } from "nanoid";
import path from "path";
import { fileURLToPath } from "url";
export async function setupVite(app, server) {
    const { createServer: createViteServer } = await import("vite");
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const cacheBase = process.env.LOCALAPPDATA || process.env.TEMP;
    const cacheDir = cacheBase
        ? path.resolve(cacheBase, "freelance-management-vite-cache-backend")
        : path.resolve(__dirname, "../..", "frontend", "vite-cache-backend");
    const serverOptions = {
        middlewareMode: true,
        hmr: { server },
        allowedHosts: true,
    }; 
    const vite = await createViteServer({
        configFile: path.resolve(__dirname, "../..", "frontend", "vite.config.js"),
        cacheDir,
        server: serverOptions,
        appType: "custom",
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
        const url = req.originalUrl;
        try {
        const clientTemplate = path.resolve(__dirname, "../..", "frontend", "index.html");
            // always reload the index.html file from disk incase it changes
            let template = await fs.promises.readFile(clientTemplate, "utf-8");
            template = template.replace(`src="/src/main.jsx"`, `src="/src/main.jsx?v=${nanoid()}"`);
            const page = await vite.transformIndexHtml(url, template);
            res.status(200).set({ "Content-Type": "text/html" }).end(page);
        }
        catch (e) {
            vite.ssrFixStacktrace(e);
            next(e);
        }
    });
}
export function serveStatic(app) {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const distPath = path.resolve(__dirname, "../..", "frontend", "dist");
    if (!fs.existsSync(distPath)) {
        console.error(`Could not find the build directory: ${distPath}, make sure to build the frontend first`);
    }
    app.use(express.static(distPath));
    // fall through to index.html if the file doesn't exist
    app.use("*", (_req, res) => {
        res.sendFile(path.resolve(distPath, "index.html"));
    });
}
 