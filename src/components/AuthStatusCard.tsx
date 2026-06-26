// ============================================================
// T03c-1 / T04c / T04f-1 — AuthStatusCard（純顯示）
// 顯示後端 /api/auth/me 身份 + 後端 VIP 權威 + localStorage↔後端 差異觀察。
// ⚠️ 僅供「資訊顯示與觀察」：不得用於功能解鎖 / VIP 判斷 / Admin 判斷 / 任何條件渲染分支。
// 本元件不含任何 disabled / navigate / role-gating / VIP-gating 邏輯。
// T04f-1：localStorage role 僅供「顯示與差異比對」，絕不用於授權。
// ============================================================

import { useSyncExternalStore } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { trpc } from "@/providers/trpc";
import { getCurrentRole } from "@/utils/auth"; // 唯讀，僅供差異比對顯示（不修改 auth.ts）
import {
  getBackendAuthSnapshot,
  subscribeBackendAuthSnapshot,
} from "@/utils/backendAuthSnapshot"; // 3d-2：純顯示讀取，不做任何 gating
import { computeSnapshotHealth } from "@/utils/snapshotHealth"; // 3d-2b：純統計顯示
import { getAuthCoverageStats, getAuthCoverageGate } from "@/utils/authCoverageSink"; // 3d-2d：覆蓋率觀察（純顯示）

type Role = string;

export interface AuthDiff {
  status: "consistent" | "mismatch" | "fake_vip" | "fake_admin" | "vip_valid";
  message: string;
}

/** 純函式：比較 localStorage role 與後端權威，產生觀察用差異訊息（不影響任何功能）。 */
export function computeAuthDiff(localRole: Role, backendRole: Role, backendVip: boolean): AuthDiff {
  if (localRole === "admin" && backendRole !== "admin") {
    return { status: "fake_admin", message: "本機顯示 Admin，但後端未認定 Admin" };
  }
  if (localRole === "vip" && backendVip === false) {
    return { status: "fake_vip", message: "本機顯示 VIP，但後端未認定 VIP" };
  }
  if (localRole !== backendRole) {
    return { status: "mismatch", message: "身份來源不一致" };
  }
  if (backendVip === true) {
    return { status: "vip_valid", message: "後端 VIP 有效" };
  }
  return { status: "consistent", message: "身份來源一致" };
}

export default function AuthStatusCard() {
  const { user, role, authenticated, loading, error } = useAuth();
  // 3d-2: 訂閱後端權威快照（純顯示）。useSyncExternalStore 確保快照變更時重繪。
  const snapshot = useSyncExternalStore(subscribeBackendAuthSnapshot, getBackendAuthSnapshot, getBackendAuthSnapshot);
  const health = computeSnapshotHealth(snapshot); // 3d-2b：純統計，不參與 gating
  // 3d-2d: 覆蓋率觀察（純顯示；記憶體樣本聚合）
  const coverage = getAuthCoverageStats();
  const gate = getAuthCoverageGate();
  const vip = trpc.payment.getMyVipAuthority.useQuery(undefined, {
    enabled: authenticated,
    retry: false,
  });

  const localRole = getCurrentRole(); // 唯讀顯示用
  const backendVip = vip.data?.isVip ?? false;
  const diff = computeAuthDiff(localRole, role, backendVip);

  const diffColor =
    diff.status === "fake_admin" || diff.status === "fake_vip"
      ? "text-red-400"
      : diff.status === "mismatch"
        ? "text-amber-400"
        : "text-emerald-400";

  const row = (label: string, value: string) => (
    <div className="flex justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-300 font-mono">{value}</span>
    </div>
  );

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/40 p-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-300">後端身份狀態</span>
        <span className="text-[10px] text-gray-500">/api/auth/me</span>
      </div>

      {loading ? (
        row("狀態", "驗證中…")
      ) : (
        <>
          {row("登入狀態", authenticated ? "已登入" : "未登入（訪客）")}
          {row("角色 (role)", role)}
          {row("使用者 ID", user?.id ?? "—")}
          {row("帳號 (username)", user?.username ?? "—")}
          {error ? row("錯誤", error) : null}
        </>
      )}

      {/* T04c: 後端 VIP 權威狀態（純顯示） */}
      <div className="pt-2 mt-1 border-t border-gray-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-300">後端 VIP 權威</span>
          <span className="text-[10px] text-gray-500">payment.getMyVipAuthority</span>
        </div>
        {!authenticated ? (
          row("狀態", "未登入，無法查詢後端 VIP 狀態")
        ) : vip.isLoading ? (
          row("狀態", "查詢中…")
        ) : vip.error ? (
          row("錯誤", "查詢失敗")
        ) : vip.data ? (
          <>
            {row("後端認定 VIP", vip.data.isVip ? "是" : "否")}
            {row("來源 (source)", String(vip.data.source))}
            {row("方案 (plan)", vip.data.plan ?? "—")}
            {row("到期 (expiresAt)", vip.data.expiresAt ?? "—")}
            {row("查詢時間", vip.data.checkedAt ?? "—")}
          </>
        ) : (
          row("狀態", "—")
        )}
      </div>

      {/* T04f-1: localStorage ↔ 後端 差異觀察（純顯示，不參與任何 gating） */}
      <div className="pt-2 mt-1 border-t border-gray-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-300">權威差異觀察</span>
          <span className="text-[10px] text-gray-500">localStorage ↔ backend</span>
        </div>
        {row("localStorage role", localRole)}
        {row("後端 role", role)}
        {row("後端 VIP", authenticated ? (backendVip ? "是" : "否") : "—（未登入）")}
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">差異狀態</span>
          <span className={`font-mono ${diffColor}`}>{diff.message}</span>
        </div>
      </div>

      {/* 3d-2: BackendAuthSnapshot 純顯示（觀察 3d-1 注入是否正確；不參與任何 gating） */}
      <div className="pt-2 mt-1 border-t border-gray-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-300">後端權威快照</span>
          <span className="text-[10px] text-gray-500">BackendAuthSnapshot</span>
        </div>
        {row("ready", String(snapshot.ready))}
        {row("authenticated", String(snapshot.authenticated))}
        {row("backendRole", snapshot.backendRole)}
        {row("backendIsAdmin", String(snapshot.backendIsAdmin))}
        {row("backendIsTester", String(snapshot.backendIsTester))}
        {row("backendIsVip", String(snapshot.backendIsVip))}
        {row("vipSource", snapshot.vipSource)}
        {row("vipPlan", snapshot.vipPlan ?? "—")}
        {row("vipExpiresAt", snapshot.vipExpiresAt ?? "—")}
        {row("error", snapshot.error ?? "—")}
        {row("checkedAt", snapshot.checkedAt ?? "—")}
      </div>

      {/* 3d-2b: Snapshot Health（純統計顯示，不參與 gating） */}
      <div className="pt-2 mt-1 border-t border-gray-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-300">快照健康度</span>
          <span className="text-[10px] text-gray-500">Snapshot Health</span>
        </div>
        {row("ready", String(snapshot.ready))}
        {row("authenticated", String(snapshot.authenticated))}
        {row("backendRole", snapshot.backendRole)}
        {row("backendIsVip", String(snapshot.backendIsVip))}
        {row("vipSource", snapshot.vipSource)}
        {row("error", snapshot.error ?? "—")}
        {row("checkedAt", snapshot.checkedAt ?? "—")}
        {row("snapshotAgeSeconds", health.snapshotAgeSeconds === null ? "—" : String(health.snapshotAgeSeconds))}
        {row("snapshotHealthy", String(health.snapshotHealthy))}
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Role Source</span>
          <span className="text-gray-300 font-mono">{health.roleSource}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">VIP Source</span>
          <span className="text-gray-300 font-mono">{health.vipSource}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Status</span>
          <span
            className={`font-mono ${
              health.status === "Healthy"
                ? "text-emerald-400"
                : health.status === "Loading"
                  ? "text-gray-400"
                  : "text-amber-400"
            }`}
          >
            {health.status}
          </span>
        </div>
      </div>

      {/* 3d-2d: 覆蓋率觀察（純顯示，不參與 gating；資料來自記憶體樣本，重新整理即清空） */}
      <div className="pt-2 mt-1 border-t border-gray-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-300">覆蓋率觀察</span>
          <span className="text-[10px] text-gray-500">Coverage (in-memory)</span>
        </div>
        {coverage.sampleCount === 0 ? (
          <p className="text-[11px] text-gray-500 py-1">待收集（尚無樣本；登入/權限變更後累積）</p>
        ) : (
          <>
            {row("sampleCount", String(coverage.sampleCount))}
            {row("ready rate", `${(coverage.readyRate * 100).toFixed(1)}%`)}
            {row("error rate", `${(coverage.errorRate * 100).toFixed(1)}%`)}
            {row("loading ratio", `${(coverage.loadingRate * 100).toFixed(1)}%`)}
            {row("role dist", Object.entries(coverage.roleDistribution).map(([k, v]) => `${k}:${v}`).join(" "))}
            {row("vipSource dist", Object.entries(coverage.vipSourceDistribution).map(([k, v]) => `${k}:${v}`).join(" "))}
            {row("gate", `${gate.canGray ? "canGray" : "blocked"}（${gate.reason}）`)}
          </>
        )}
      </div>

      <p className="text-[10px] text-gray-600 pt-1 border-t border-gray-800">
        僅顯示與觀察身份／VIP 權威差異；不用於功能解鎖 / VIP / Admin 判斷。
      </p>
    </div>
  );
}
