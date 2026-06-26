# DB Migrations — 版本軌跡

本目錄開始建立版本化遷移（取代過去僅用 `drizzle-kit push` 的做法）。

| 版本 | 檔案 | 性質 | 影響表 | 備註 |
|---|---|---|---|---|
| 0000 | `0000_add_users.sql` | ADDITIVE | `users`（新增） | T01 / P0-A。未動既有 8 張表 |

## 如何套用

### A) 即時套用（手動，最小變更）
`0000_add_users.sql` 為冪等 DDL（`CREATE TABLE IF NOT EXISTS`），可直接在目標 MySQL 執行：
```bash
mysql --defaults-extra-file=... < db/migrations/0000_add_users.sql
```
既有 DB 安全（不重建任何既有表）；乾淨 DB 亦可單獨建立 `users`。

### B) 納入 Drizzle 追蹤歷史（建議，需有 node_modules + DATABASE_URL）
本沙盒無網路、無法執行 drizzle-kit。請於開發/CI 環境執行以產生官方 snapshot 與 `meta/_journal.json`：
```bash
npm install
npx drizzle-kit generate   # 讀取更新後的 db/schema.ts，產生對應 migration + 快照
npx drizzle-kit migrate    # 套用（取代 db:push）
```
> 註：若採用 B，drizzle-kit 會依 `db/schema.ts` 自行產生遷移檔；屆時可比對本目錄手寫的 `0000_add_users.sql` 內容應一致（僅 users 表）。

## 規則（自 T01 起）
1. schema 變更一律新增遷移檔，**禁止再用 `db:push` 改正式環境**。
2. 既有已驗證表（payments/subscriptions/webhook 等）非經明確工單不得變更。
3. 每個遷移需在「乾淨 DB」與「既有 DB」各驗證一次。
