import type { Hono, MiddlewareHandler } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";

type App = Hono<{ Bindings: HttpBindings }>;

export function serveStaticFiles(app: App) {
  const distPath = path.resolve(import.meta.dirname, "../dist/public");

  // Serve static files from dist/public/assets/*
  // Only match actual asset files — all other routes go to SPA fallback
  app.use("/assets/*", serveStatic({ root: distPath }));

  // SPA fallback: for non-API routes that don't match static files,
  // return index.html so React Router can handle client-side routing
  app.get("*", async (c, next) => {
    const pathname = new URL(c.req.url).pathname;

    // Skip API routes
    if (pathname.startsWith("/api/")) {
      return await next();
    }

    // Skip if a static file was already served (response has content)
    // The serveStatic middleware would have already responded for existing files
    // For non-existing paths, we serve index.html
    const accept = c.req.header("accept") ?? "";
    if (!accept.includes("text/html")) {
      return await next();
    }

    // Serve index.html for SPA routes
    const indexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath, "utf-8");
      return c.html(content);
    }

    return await next();
  });
}
