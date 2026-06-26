import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { getCurrentUser, extractToken } from "./auth/session";
import type { AuthContext } from "./auth/types";

// T02: TrpcContext 升級為分層 AuthContext（req/resHeaders + sessionToken + user）。
// 為 additive：既有 publicQuery 仍可運作（忽略 user）；user 僅供未來 authed/admin/tester 使用。
export type TrpcContext = AuthContext;

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const req = opts.req;
  // 解析（未必有效）的 token，並嘗試驗證取得可信使用者。
  const sessionToken = extractToken(req);
  const user = getCurrentUser(req); // 無 token / 無效 → null（不丟錯，不影響 public 流程）
  return {
    req,
    resHeaders: opts.resHeaders,
    sessionToken,
    user,
  };
}
