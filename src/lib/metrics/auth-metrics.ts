/**
 * Métricas de auth em memória: contadores de refresh e request.
 * Persistência via metrics-storage (IndexedDB/localStorage); export opcional via VITE_AUTH_METRICS_ENDPOINT.
 * Não altera fluxo de auth/refresh; apenas observabilidade.
 */

import {
  getStoredMetrics,
  setStoredMetrics,
  defaultMetrics,
  type StoredMetricsPayload,
} from "./metrics-storage";

export type AuthMetricsSnapshot = StoredMetricsPayload["metrics"];

let metrics: AuthMetricsSnapshot = defaultMetrics();

let persistTimer: ReturnType<typeof setTimeout> | null = null;
const PERSIST_DEBOUNCE_MS = 500;

function schedulePersist(): void {
  if (typeof window === "undefined") return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    setStoredMetrics(metrics).catch(() => {});
  }, PERSIST_DEBOUNCE_MS);
}

function isAllZeros(m: AuthMetricsSnapshot): boolean {
  return (
    m.refresh_calls_total === 0 &&
    m.refresh_success_total === 0 &&
    m.refresh_timeout_total === 0 &&
    m.refresh_session_mismatch_total === 0 &&
    m.refresh_skip_max_retry_total === 0 &&
    m.request_retry_after_refresh_total === 0 &&
    m.request_without_token_total === 0
  );
}

/**
 * Restaura métricas do storage para memória. Só sobrescreve se contadores atuais forem todos zero (início de sessão).
 */
export async function hydrateAuthMetricsFromStorage(): Promise<void> {
  if (!isAllZeros(metrics)) return;
  const payload = await getStoredMetrics();
  if (payload) metrics = { ...payload.metrics };
}

/**
 * Retorna cópia do snapshot atual (para debug e export).
 */
export function getAuthMetricsSnapshot(): AuthMetricsSnapshot {
  return { ...metrics };
}

export function incrementRefreshCalls(): void {
  metrics.refresh_calls_total += 1;
  schedulePersist();
}

export function incrementRefreshSuccess(): void {
  metrics.refresh_success_total += 1;
  schedulePersist();
}

export function incrementRefreshTimeout(): void {
  metrics.refresh_timeout_total += 1;
  schedulePersist();
}

export function incrementRefreshSessionMismatch(): void {
  metrics.refresh_session_mismatch_total += 1;
  schedulePersist();
}

export function incrementRefreshSkipMaxRetry(): void {
  metrics.refresh_skip_max_retry_total += 1;
  schedulePersist();
}

export function incrementRequestRetryAfterRefresh(): void {
  metrics.request_retry_after_refresh_total += 1;
  schedulePersist();
}

export function incrementRequestWithoutToken(): void {
  metrics.request_without_token_total += 1;
  schedulePersist();
}

const EXPORT_INTERVAL_MS = 60_000;
let exportIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Inicia o agendamento de export periódico. Chamar após hydrate no main.
 */
export function startAuthMetricsExportSchedule(): void {
  if (typeof window === "undefined" || exportIntervalId) return;
  exportIntervalId = setInterval(() => {
    exportAuthMetricsToBackend(false);
  }, EXPORT_INTERVAL_MS);
}

const MAX_RETRY_QUEUE = 100;
const retryQueue: AuthMetricsSnapshot[] = [];

function getExportBlob(): string {
  return JSON.stringify({
    ...getAuthMetricsSnapshot(),
    ts: Date.now(),
  });
}

/**
 * Envia métricas ao backend se VITE_AUTH_METRICS_ENDPOINT estiver definido.
 * immediate: true = flush agora (ex.: no logout); false = envio agendado.
 * Em falha, enfileira para próximo ciclo (até MAX_RETRY_QUEUE).
 */
export function exportAuthMetricsToBackend(immediate: boolean): void {
  if (typeof window === "undefined") return;

  const endpoint = import.meta.env.VITE_AUTH_METRICS_ENDPOINT as string | undefined;
  if (!endpoint || typeof endpoint !== "string") {
    schedulePersist();
    return;
  }

  const blob = getExportBlob();
  const url = endpoint.startsWith("http") ? endpoint : `${window.location.origin}${endpoint}`;

  const send = (payload: string) => {
    fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: payload,
    }).catch(() => {
      if (retryQueue.length < MAX_RETRY_QUEUE) retryQueue.push(getAuthMetricsSnapshot());
    });
  };

  if (retryQueue.length > 0) {
    retryQueue.splice(0, retryQueue.length).forEach((snap) => {
      send(JSON.stringify({ ...snap, ts: Date.now() }));
    });
  }
  send(blob);

  if (immediate) schedulePersist();
}
