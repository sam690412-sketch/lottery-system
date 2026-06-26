// ============================================================
// V18.2.5 AUDIT C: Storage Adapters
// LocalStorageAdapter: 當前 production 使用
// MemoryAdapter: 測試環境使用
// SupabaseAdapter: V19.0 預留
// ============================================================

import type { StorageAdapter } from './interfaces';

// ---- LocalStorage Adapter (當前使用) ----

export class LocalStorageAdapter implements StorageAdapter {
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // quota exceeded - ignore
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  clear(): void {
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
  }

  keys(): string[] {
    try {
      const result: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) result.push(k);
      }
      return result;
    } catch {
      return [];
    }
  }
}

// ---- Memory Adapter (測試環境 / SSR fallback) ----

export class MemoryAdapter implements StorageAdapter {
  private store = new Map<string, string>();

  get<T>(key: string): T | null {
    try {
      const raw = this.store.get(key);
      if (raw === undefined) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    try {
      this.store.set(key, JSON.stringify(value));
    } catch {
      // ignore
    }
  }

  remove(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  keys(): string[] {
    return Array.from(this.store.keys());
  }

  /** 測試用：取得原始 Map */
  getRawStore(): Map<string, string> {
    return this.store;
  }
}

// ---- Supabase Adapter (V19.0 預留) ----
// 實作時需要：
// 1. @supabase/supabase-js 套件
// 2. SUPABASE_URL / SUPABASE_ANON_KEY 環境變數
// 3. RLS (Row Level Security) 設定
// 4. 對應的 table schema

/*
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class SupabaseAdapter implements StorageAdapter {
  private client: SupabaseClient;

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey);
  }

  async get<T>(key: string): Promise<T | null> {
    const { data } = await this.client
      .from('user_data')
      .select('value')
      .eq('key', key)
      .single();
    return data?.value ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.client
      .from('user_data')
      .upsert({ key, value, updated_at: new Date().toISOString() });
  }

  async remove(key: string): Promise<void> {
    await this.client.from('user_data').delete().eq('key', key);
  }

  async clear(): Promise<void> {
    // 只清除當前用戶的資料
  }

  async keys(): Promise<string[]> {
    const { data } = await this.client
      .from('user_data')
      .select('key');
    return data?.map(d => d.key) ?? [];
  }
}
*/

// ---- Adapter Factory ----

export type AdapterType = 'localStorage' | 'memory' | 'supabase';

export function createAdapter(type: AdapterType): StorageAdapter {
  switch (type) {
    case 'localStorage':
      return new LocalStorageAdapter();
    case 'memory':
      return new MemoryAdapter();
    case 'supabase':
      throw new Error('SupabaseAdapter not yet implemented. Planned for V19.0.');
    default:
      throw new Error(`Unknown adapter type: ${type}`);
  }
}

/** 預設使用 localStorage (當前 production 行為) */
export const defaultAdapter: StorageAdapter = new LocalStorageAdapter();
