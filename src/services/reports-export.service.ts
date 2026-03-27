import { httpClient } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/lib/api";

/**
 * Download do CSV gerado pelo backend (GET /reports/export).
 * Autenticação via interceptor do httpClient.
 */
export async function downloadReportsCsv(months: number): Promise<void> {
  const res = await httpClient.get(API_ENDPOINTS.reports.export, {
    params: { format: "csv", months },
    responseType: "blob",
  });
  const blob = new Blob([res.data as BlobPart], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vai-de-pix-relatorio-${months}m-${new Date().toISOString().slice(0, 10)}.csv`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
