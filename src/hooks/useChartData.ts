/**
 * useChartData.ts
 *
 * 通用「圖表資料取得」hook(V23 / Chart Engine)。
 *
 * 設計重點:
 * - 與資料來源完全解耦。它「不知道」HistoryProvider 的存在,
 *   只接受兩種輸入:已備妥的資料,或一個回傳資料(可為 Promise)的 fetcher。
 * - 統一輸出 loading / empty / error / reload,讓所有圖表頁的狀態邏輯一致。
 * - 未來要接 HistoryProvider 時,只要在呼叫端把 provider 的資料或方法
 *   當成 source 傳進來即可,本 hook 不需改動。
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/** 資料來源:可以是現成資料,或一個(可能非同步的)取得函式。 */
export type ChartDataSource<T> = T | (() => T | Promise<T>);

export interface UseChartDataOptions<T> {
  /** 依賴變動時重新取得(類似 useEffect deps)。 */
  deps?: ReadonlyArray<unknown>;
  /** 判斷是否為空。預設:undefined/null,或長度為 0 的陣列。 */
  isEmpty?: (data: T | undefined) => boolean;
  /** 初始資料(在第一次取得完成前先顯示)。 */
  initialData?: T;
}

export interface UseChartDataResult<T> {
  data: T | undefined;
  loading: boolean;
  empty: boolean;
  error: Error | null;
  /** 手動重新取得。 */
  reload: () => void;
}

function defaultIsEmpty<T>(data: T | undefined): boolean {
  if (data === undefined || data === null) return true;
  if (Array.isArray(data)) return data.length === 0;
  return false;
}

function isFetcher<T>(source: ChartDataSource<T>): source is () => T | Promise<T> {
  return typeof source === 'function';
}

export function useChartData<T>(
  source: ChartDataSource<T>,
  options: UseChartDataOptions<T> = {},
): UseChartDataResult<T> {
  const { deps = [], isEmpty = defaultIsEmpty, initialData } = options;

  const [data, setData] = useState<T | undefined>(initialData);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // 用 ref 持有最新 source,避免把函式放進 deps 造成無限迴圈。
  const sourceRef = useRef(source);
  sourceRef.current = source;

  const isEmptyRef = useRef(isEmpty);
  isEmptyRef.current = isEmpty;

  // 防止已卸載後 setState。
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [reloadTick, setReloadTick] = useState(0);
  const reload = useCallback(() => setReloadTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    const current = sourceRef.current;

    // 同步資料:直接設定,不進 loading 抖動。
    if (!isFetcher(current)) {
      setData(current);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    Promise.resolve()
      .then(() => (current as () => T | Promise<T>)())
      .then((result) => {
        if (cancelled || !mountedRef.current) return;
        setData(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled || !mountedRef.current) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadTick, ...deps]);

  const empty = !loading && isEmptyRef.current(data);

  return { data, loading, empty, error, reload };
}

export default useChartData;
