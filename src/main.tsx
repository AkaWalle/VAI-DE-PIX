import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import { attachAuthDebugHooks } from "./lib/auth-debug";
import { hydrateAuthMetricsFromStorage, startAuthMetricsExportSchedule } from "./lib/metrics/auth-metrics";
import { logger } from "./lib/logger";
import App from "./App.tsx";
import "./index.css";

if (import.meta.env.DEV) {
  attachAuthDebugHooks();
}
// Restaura métricas entre sessões antes de iniciar export; não bloqueia render.
hydrateAuthMetricsFromStorage().then(() => startAuthMetricsExportSchedule());

// Sentry (opcional): só inicializa se VITE_SENTRY_DSN estiver definido; não envia dados sensíveis
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn && typeof sentryDsn === "string") {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE ?? "development",
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    sendDefaultPii: false,
  });
  
  // Expor Sentry globalmente para logger
  (window as any).Sentry = Sentry;
}

// Error boundary para capturar erros globais
window.addEventListener("error", (event) => {
  logger.error("Erro global capturado", event.error, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  logger.error("Promise rejeitada sem handler", event.reason);
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Elemento root não encontrado!");
}

createRoot(rootElement).render(<App />);
