import { createRouter, publicQuery } from "./middleware";
import { paymentRouter } from "./routes/payment";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  payment: paymentRouter,
});

export type AppRouter = typeof appRouter;
