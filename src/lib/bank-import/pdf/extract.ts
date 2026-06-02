import type { PdfJsModule } from "./pdf-types";

let workerConfigured = false;

async function configurePdfWorker(
  pdfjsLib: PdfJsModule,
  env: "browser" | "node",
): Promise<void> {
  if (workerConfigured) return;

  if (env === "browser") {
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjsLib.GlobalWorkerOptions.workerSrc = worker.default;
  } else {
    const { configureNodePdfWorker } = await import(
      "@bank-import/pdf-worker-node"
    );
    configureNodePdfWorker(pdfjsLib);
  }

  workerConfigured = true;
}

async function loadPdfJs(): Promise<PdfJsModule> {
  if (typeof globalThis.DOMMatrix === "undefined") {
    globalThis.DOMMatrix = class DOMMatrix {
      a = 1;
      b = 0;
      c = 0;
      d = 1;
      e = 0;
      f = 0;
      multiply() {
        return this;
      }
      translate() {
        return this;
      }
      scale() {
        return this;
      }
      inverse() {
        return this;
      }
    } as unknown as typeof DOMMatrix;
  }

  const env = typeof window !== "undefined" ? "browser" : "node";
  const pdfjsLib =
    env === "browser"
      ? await import("pdfjs-dist")
      : await import("pdfjs-dist/legacy/build/pdf.mjs");

  await configurePdfWorker(pdfjsLib, env);

  return pdfjsLib;
}

export async function extractPdfText(data: ArrayBuffer): Promise<string> {
  const pdfjsLib = await loadPdfJs();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(data),
    useWorkerFetch: false,
    isEvalSupported: false,
  });

  const pdf = await loadingTask.promise;
  const pages: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    let pageText = "";
    for (const item of content.items) {
      if (!("str" in item)) continue;
      pageText += item.str;
      if ("hasEOL" in item && item.hasEOL) {
        pageText += "\n";
      } else {
        pageText += " ";
      }
    }
    pages.push(pageText);
  }

  const text = pages.join("\n").trim();

  if (!text || text.replace(/\s/g, "").length < 20) {
    throw new Error(
      "Não foi possível extrair texto.\n\nEste PDF parece ser uma digitalização ou imagem.\n\nExporte em CSV ou PDF pesquisável.",
    );
  }

  return text;
}

export function isPdfLikelyScanned(text: string): boolean {
  const meaningful = text.replace(/\s/g, "");
  return meaningful.length < 20;
}
