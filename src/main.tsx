import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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
