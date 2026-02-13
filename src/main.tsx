import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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
  console.error("❌ Erro capturado:", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("❌ Promise rejeitada:", event.reason);
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Elemento root não encontrado!");
}

createRoot(rootElement).render(<App />);
