import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { compress } from "hono/compress";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "node:fs";
import path from "node:path";

type App = Hono<{ Bindings: HttpBindings }>;

export function serveStaticFiles(app: App) {
  const root = path.resolve(import.meta.dirname, "../dist/public");
  const files = serveStatic({
    root,
    onFound: (_, c) => {
      const url = c.req.path;
      if (url === "/manifest.webmanifest") c.header("Content-Type", "application/manifest+json; charset=utf-8");
      if (url === "/sw.js" || url === "/manifest.webmanifest" || url === "/index.html") {
        c.header("Cache-Control", "no-cache");
      }
    },
  });

  const compressPublicFiles = compress();
  app.use("*", (c, next) => {
    const pathname = c.req.path;
    const isPublicText = /\.(?:css|js|html|svg|webmanifest)$/.test(pathname) ||
      (c.req.header("accept") ?? "").includes("text/html");
    return !pathname.startsWith("/api/") && isPublicText ? compressPublicFiles(c, next) : next();
  });
  app.use("/assets/*", files);
  app.use("/pwa/*", files);
  app.use("/data/*", files);
  for (const file of ["/sw.js", "/manifest.webmanifest", "/index.html"]) {
    app.use(file, files);
  }

  app.get("*", async (c, next) => {
    const pathname = c.req.path;
    if (pathname.startsWith("/api/") ||
        /\.[a-z\d]+$/i.test(pathname) ||
        !(c.req.header("accept") ?? "").includes("text/html")) return next();

    const indexPath = path.resolve(root, "index.html");
    if (!fs.existsSync(indexPath)) return next();
    c.header("Cache-Control", "no-cache");
    return c.html(fs.readFileSync(indexPath, "utf8"));
  });
}
