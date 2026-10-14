/**
 * Access token não pode permanecer em storage (OWASP Top 10 A07:2021).
 * Ambiente node: stub de Storage, sem jsdom.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { tokenManager, clearAllTokensStoragesOnly } from "@/lib/token-manager";

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => (data.has(key) ? data.get(key)! : null),
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    removeItem: (key: string) => {
      data.delete(key);
    },
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

describe("tokenManager", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", memoryStorage());
    vi.stubGlobal("sessionStorage", memoryStorage());
    tokenManager.remove();
  });

  it("guarda o access token só em memória", () => {
    tokenManager.set("header.payload.sig");
    expect(tokenManager.get()).toBe("header.payload.sig");
    expect(localStorage.getItem("vai-de-pix-token")).toBeNull();
    expect(sessionStorage.getItem("token")).toBeNull();
  });

  it("remove leftovers de storage legado ao setar", () => {
    localStorage.setItem("vai-de-pix-token", "legado");
    sessionStorage.setItem("token", "legado-session");
    tokenManager.set("novo");
    expect(localStorage.getItem("vai-de-pix-token")).toBeNull();
    expect(sessionStorage.getItem("token")).toBeNull();
    expect(tokenManager.get()).toBe("novo");
  });

  it("clearAllTokensStoragesOnly zera memória e storage", () => {
    tokenManager.set("x");
    localStorage.setItem("token", "y");
    clearAllTokensStoragesOnly();
    expect(tokenManager.get()).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
  });
});
