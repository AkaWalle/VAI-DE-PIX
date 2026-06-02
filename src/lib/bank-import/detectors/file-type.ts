import type { FileType, FileTypeDetection } from "../types";

const OFX_MARKERS = ["<OFX>", "<STMTTRN>", "<TRNAMT>"] as const;

export function detectFileTypeFromName(fileName: string): FileType | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".ofx")) return "ofx";
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".csv") || lower.endsWith(".txt")) return "csv";
  return null;
}

export function detectFileTypeFromContent(
  content: string,
  mimeType?: string,
): FileType | null {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType?.includes("ofx") || mimeType?.includes("qfx")) return "ofx";
  if (mimeType?.includes("csv") || mimeType?.includes("text/plain")) {
    return "csv";
  }

  const trimmed = content.trimStart();
  const upper = trimmed.slice(0, 2000).toUpperCase();

  if (OFX_MARKERS.every((m) => upper.includes(m))) return "ofx";
  if (trimmed.startsWith("%PDF-")) return "pdf";

  return null;
}

export function detectFileType(
  fileName: string,
  content?: string,
  mimeType?: string,
): FileTypeDetection {
  const fromMime =
    mimeType === "application/pdf"
      ? "pdf"
      : mimeType?.includes("ofx")
        ? "ofx"
        : mimeType?.includes("csv")
          ? "csv"
          : null;

  if (fromMime) return { fileType: fromMime };

  const fromName = detectFileTypeFromName(fileName);
  if (fromName) return { fileType: fromName };

  if (content) {
    const fromContent = detectFileTypeFromContent(content, mimeType);
    if (fromContent) return { fileType: fromContent };
  }

  return { fileType: "csv" };
}

export function detectFileTypeFromBuffer(
  data: ArrayBuffer,
  fileName: string,
): FileTypeDetection {
  const bytes = new Uint8Array(data.slice(0, 8));
  const header = String.fromCharCode(...bytes);
  if (header.startsWith("%PDF-")) return { fileType: "pdf" };

  const text = new TextDecoder("utf-8", { fatal: false }).decode(
    data.slice(0, 4096),
  );
  const fromContent = detectFileTypeFromContent(text);
  if (fromContent) return { fileType: fromContent };

  const fromName = detectFileTypeFromName(fileName);
  return { fileType: fromName ?? "csv" };
}
