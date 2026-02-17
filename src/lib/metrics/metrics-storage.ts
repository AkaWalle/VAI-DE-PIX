/**
 * Persistência de métricas auth entre sessões.
 * Prioridade: IndexedDB → localStorage. Schema versionado; migração segura; reset em corrupção.
 * Não bloqueia UI; operações assíncronas.
 */

const DB_NAME = "vdp_auth_metrics";
const DB_VERSION = 1;
const STORE = "metrics";
const KEY_CURRENT = "current";
const LOCALSTORAGE_KEY = "vdp_auth_metrics";
const SCHEMA_VERSION = 1;

export type StoredMetricsPayload = {
  schemaVersion: number;
  metrics: {
    refresh_calls_total: number;
    refresh_success_total: number;
    refresh_timeout_total: number;
    refresh_session_mismatch_total: number;
    refresh_skip_max_retry_total: number;
    request_retry_after_refresh_total: number;
    request_without_token_total: number;
  };
  updatedAt: number;
};

function defaultMetrics(): StoredMetricsPayload["metrics"] {
  return {
    refresh_calls_total: 0,
    refresh_success_total: 0,
    refresh_timeout_total: 0,
    refresh_session_mismatch_total: 0,
    refresh_skip_max_retry_total: 0,
    request_retry_after_refresh_total: 0,
    request_without_token_total: 0,
  };
}

function isValidPayload(data: unknown): data is StoredMetricsPayload {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (d.schemaVersion !== SCHEMA_VERSION) return false;
  if (typeof d.updatedAt !== "number") return false;
  const m = d.metrics;
  if (!m || typeof m !== "object") return false;
  const keys = [
    "refresh_calls_total",
    "refresh_success_total",
    "refresh_timeout_total",
    "refresh_session_mismatch_total",
    "refresh_skip_max_retry_total",
    "request_retry_after_refresh_total",
    "request_without_token_total",
  ] as const;
  for (const k of keys) {
    if (typeof (m as Record<string, unknown>)[k] !== "number") return false;
  }
  return true;
}

let idb: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") return Promise.resolve(null);
  if (idb) return Promise.resolve(idb);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => resolve(null);
      req.onsuccess = () => {
        idb = req.result;
        resolve(idb);
      };
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * Lê métricas do storage. Retorna null se indisponível ou corrompido (seguro reset).
 */
export async function getStoredMetrics(): Promise<StoredMetricsPayload | null> {
  const db = await openDB();
  if (db) {
    try {
      const payload = await new Promise<unknown>((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const store = tx.objectStore(STORE);
        const req = store.get(KEY_CURRENT);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      if (isValidPayload(payload)) return payload;
      return null;
    } catch {
      return null;
    }
  }
  try {
    const raw = localStorage.getItem(LOCALSTORAGE_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw) as unknown;
    if (isValidPayload(payload)) return payload;
    localStorage.removeItem(LOCALSTORAGE_KEY);
    return null;
  } catch {
    try {
      localStorage.removeItem(LOCALSTORAGE_KEY);
    } catch {
      // ignore
    }
    return null;
  }
}

/**
 * Persiste métricas. Falha silenciosa se storage indisponível.
 */
export async function setStoredMetrics(metrics: StoredMetricsPayload["metrics"]): Promise<void> {
  const payload: StoredMetricsPayload = {
    schemaVersion: SCHEMA_VERSION,
    metrics: { ...metrics },
    updatedAt: Date.now(),
  };
  const db = await openDB();
  if (db) {
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        const store = tx.objectStore(STORE);
        store.put(payload, KEY_CURRENT);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      return;
    } catch {
      // fallback to localStorage
    }
  }
  try {
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(payload));
  } catch {
    // storage full or private mode
  }
}

export { defaultMetrics, SCHEMA_VERSION };
