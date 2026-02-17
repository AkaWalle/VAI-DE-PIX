/**
 * Cross-tab refresh coordinator — garante que apenas UMA aba execute o refresh.
 * Usa localStorage (lock com TTL) + BroadcastChannel (resultado).
 * Sem alterar fluxo de auth; apenas coordena quem executa.
 * Lock recovery: TTL expira se a aba travar; outras abas podem assumir.
 */

const STORAGE_KEY = "vdp_refresh_lock";
const CHANNEL_NAME = "vdp_auth_refresh";
const LOCK_TTL_MS = 15_000; // maior que REFRESH_TIMEOUT_MS (10s); unlock seguro se tab crashar
const WAIT_RESULT_MS = 14_000;

type LockPayload = { tabId: string; ts: number };
type ChannelMessage = { type: "refresh_started"; tabId: string } | { type: "refresh_done"; success: boolean; tabId: string };

let bc: BroadcastChannel | null = null;
let tabId: string | null = null;

function getTabId(): string {
  if (tabId) return tabId;
  try {
    if (typeof sessionStorage !== "undefined") {
      const existing = sessionStorage.getItem("vdp_tab_id");
      if (existing) {
        tabId = existing;
        return existing;
      }
    }
    const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `tab_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    tabId = id;
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem("vdp_tab_id", id);
    return id;
  } catch {
    tabId = `tab_${Date.now()}`;
    return tabId;
  }
}

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  try {
    if (!bc && typeof BroadcastChannel !== "undefined") bc = new BroadcastChannel(CHANNEL_NAME);
    return bc;
  } catch {
    return null;
  }
}

function readLock(): LockPayload | null {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return null;
    const p = JSON.parse(raw) as LockPayload;
    return typeof p.tabId === "string" && typeof p.ts === "number" ? p : null;
  } catch {
    return null;
  }
}

function writeLock(payload: LockPayload): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // storage full ou privado
  }
}

function clearLock(): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Tenta adquirir o lock cross-tab. Retorna true se esta aba for a líder (deve executar refresh).
 * Lock com TTL: se expirado ou ausente, qualquer aba pode adquirir.
 */
export function tryAcquireCrossTabLock(): boolean {
  if (typeof window === "undefined") return true;
  const now = Date.now();
  const current = readLock();
  if (current && current.tabId !== getTabId() && now - current.ts < LOCK_TTL_MS) {
    return false; // outra aba tem o lock e não expirou
  }
  writeLock({ tabId: getTabId(), ts: now });
  // Best-effort: re-lemos para reduzir race (duas abas escrevendo ao mesmo tempo)
  const after = readLock();
  const weWon = after?.tabId === getTabId();
  if (!weWon) clearLock();
  return weWon;
}

/**
 * Libera o lock. Chamar no finally do refresh (sucesso ou falha).
 */
export function releaseCrossTabLock(): void {
  const current = readLock();
  if (current?.tabId === getTabId()) clearLock();
}

/**
 * Notifica outras abas que o refresh começou (opcional; para debug).
 */
export function broadcastRefreshStarted(): void {
  const ch = getChannel();
  if (ch) {
    try {
      ch.postMessage({ type: "refresh_started", tabId: getTabId() } satisfies ChannelMessage);
    } catch {
      // ignore
    }
  }
}

/**
 * Notifica outras abas do resultado do refresh. Chamar após runRefreshWithLock interno terminar.
 */
export function broadcastRefreshDone(success: boolean): void {
  const ch = getChannel();
  if (ch) {
    try {
      ch.postMessage({ type: "refresh_done", success, tabId: getTabId() } satisfies ChannelMessage);
    } catch {
      // ignore
    }
  }
}

/**
 * Aguarda resultado de refresh de outra aba. Retorna Promise<boolean> ou timeout (resolve false).
 * Não bloqueia UI: é async.
 */
export function waitForRefreshResultFromOtherTab(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    const ch = getChannel();
    if (!ch) {
      resolve(false);
      return;
    }
    const timeoutId = setTimeout(() => {
      ch.removeEventListener("message", onMessage);
      resolve(false);
    }, WAIT_RESULT_MS);

    const onMessage = (e: MessageEvent) => {
      const msg = e.data as ChannelMessage | undefined;
      if (msg?.type === "refresh_done" && msg.tabId !== getTabId()) {
        clearTimeout(timeoutId);
        ch.removeEventListener("message", onMessage);
        resolve(msg.success);
      }
    };
    ch.addEventListener("message", onMessage);
  });
}
