import { createRoot } from "react-dom/client";
import { attachAuthDebugHooks } from "./lib/auth-debug";
import { hydrateAuthMetricsFromStorage, startAuthMetricsExportSchedule } from "./lib/metrics/auth-metrics";
import * as Sentry from "@sentry/react";
import { logError } from "./lib/logger";
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
}

// Error boundary para capturar erros
window.addEventListener("error", (event) => {
  logError(event.error ?? event.message ?? "Unknown window error", {
    feature: "global-listener",
    action: "window.error",
  });
});

window.addEventListener("unhandledrejection", (event) => {
  logError(event.reason ?? "Unhandled promise rejection", {
    feature: "global-listener",
    action: "unhandledrejection",
  });
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Elemento root não encontrado!");
}

createRoot(rootElement).render(<App />);
