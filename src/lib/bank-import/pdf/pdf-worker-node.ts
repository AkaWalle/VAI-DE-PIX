import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import type { PdfJsModule } from "./pdf-types";

export function configureNodePdfWorker(pdfjsLib: PdfJsModule): void {
  const require = createRequire(import.meta.url);
  const workerPath = require.resolve(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  );
  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
}
