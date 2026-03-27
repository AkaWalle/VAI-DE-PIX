import { httpClient } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/lib/api";

export type BankImportValidateResponse = {
  ok: boolean;
  size_bytes: number;
  max_bytes: number;
};

/**
 * Valida extrato no servidor (tipo/tamanho) sem persistir conteúdo.
 * Usa multipart; não loga o corpo do arquivo no cliente.
 */
export async function validateBankImportFile(
  file: File,
): Promise<BankImportValidateResponse> {
  const body = new FormData();
  body.append("file", file, file.name);
  const { data } = await httpClient.post<BankImportValidateResponse>(
    API_ENDPOINTS.transactions.importValidate,
    body,
    {
      // FormData: axios deve definir boundary; remover default json do instance
      transformRequest: [
        (reqData, headers) => {
          if (reqData instanceof FormData) {
            delete headers["Content-Type"];
          }
          return reqData;
        },
      ],
      maxBodyLength: 6 * 1024 * 1024,
      maxContentLength: 6 * 1024 * 1024,
    },
  );
  return data;
}
