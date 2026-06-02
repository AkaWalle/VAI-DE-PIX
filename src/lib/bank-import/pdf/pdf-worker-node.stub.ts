import type { PdfJsModule } from "./pdf-types";

export function configureNodePdfWorker(_pdfjsLib: PdfJsModule): void {
  throw new Error("Worker Node não disponível no browser.");
}
