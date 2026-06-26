import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import webhook from "./routes/webhook";
import syncRouter from "./routes/sync";
import authRouter from "./routes/auth";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

// ECPay Webhook - 必須在 tRPC 之前註冊
app.route("/", webhook);

// V19.3.6: Draw sync routes (for CRON and manual sync)
app.route("/api/sync", syncRouter);

// V19.1: Auth routes (login / me / logout) — token issuance
app.route("/api/auth", authRouter);

// Health check for Render and monitoring
app.get("/api/health", (c) => c.json({
  status: "ok",
  version: "19.3.6",
  timestamp: new Date().toISOString(),
  env: env.isProduction ? "production" : "development",
}));

// tRPC
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
