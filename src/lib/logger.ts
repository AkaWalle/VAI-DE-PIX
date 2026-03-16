import * as Sentry from "@sentry/react";

type Primitive = string | number | boolean | null | undefined;

export interface LoggerContext {
  feature?: string;
  action?: string;
  [key: string]: unknown;
}

const isDev = import.meta.env.DEV;

const SENSITIVE_KEYS = [
  "password",
  "senha",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "cpf",
  "document",
  "card",
  "cc",
  "email",
];

const EMAIL_REGEX = /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

function maskEmail(value: string): string {
  return value.replace(EMAIL_REGEX, (_match, user, domain) => {
    if (typeof user !== "string" || user.length <= 2) {
      return "***@" + String(domain);
    }
    const first = user[0];
    const last = user[user.length - 1];
    return `${first}***${last}@${String(domain)}`;
  });
}

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEYS.some((k) => lower.includes(k.toLowerCase()));
}

function sanitizeValue(value: unknown): Primitive | Record<string, unknown> | unknown[] {
  if (value == null) return value as null | undefined;
  if (typeof value === "string") {
    return maskEmail(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      if (isSensitiveKey(key)) {
        result[key] = "[REDACTED]";
      } else {
        result[key] = sanitizeValue(v);
      }
    }
    return result;
  }
  return String(value);
}

function sanitizeContext(context?: LoggerContext): LoggerContext | undefined {
  if (!context) return undefined;
  const safe: LoggerContext = {};
  for (const [key, value] of Object.entries(context)) {
    safe[key] = sanitizeValue(value);
  }
  return safe;
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === "string") return new Error(error);
  try {
    return new Error(JSON.stringify(error));
  } catch {
    return new Error("Unknown error");
  }
}

export function logError(error: unknown, context?: LoggerContext): void {
  const err = normalizeError(error);
  const safeContext = sanitizeContext(context);

  if (!isDev) {
    try {
      Sentry.captureException(err, (scope) => {
        if (safeContext) {
          scope.setContext("context", safeContext);
        }
        return scope;
      });
    } catch {
      // Não deixar logging quebrar fluxo principal
    }
  } else {
    // Em desenvolvimento, manter visibilidade no console
    console.error("[logError]", err, safeContext);
  }
}

export function logWarning(message: string, context?: LoggerContext): void {
  const safeContext = sanitizeContext(context);

  if (!isDev) {
    try {
      Sentry.captureMessage(message, "warning");
    } catch {
      // ignore
    }
  } else {
    console.warn("[logWarning]", message, safeContext);
  }
}

export function logInfo(message: string, context?: LoggerContext): void {
  const safeContext = sanitizeContext(context);

  if (isDev) {
    console.info("[logInfo]", message, safeContext);
  } else {
    // Em produção, por padrão não envia infos para Sentry para evitar ruído.
    // Mantido para possível futura extensão (ex.: breadcrumbs customizados).
    void safeContext;
  }
}

