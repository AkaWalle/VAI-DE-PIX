import { httpClient, apiHelpers } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/lib/api";

export interface EnvelopeApi {
  id: string;
  name: string;
  balance: number;
  target_amount: number | null;
  color: string;
  description: string | null;
  progress_percentage: number | null;
  created_at?: string;
}

export interface EnvelopeCreateApi {
  name: string;
  balance?: number;
  target_amount?: number | null;
  color: string;
  description?: string | null;
}

export const envelopesService = {
  async getEnvelopes(): Promise<EnvelopeApi[]> {
    const response = await httpClient.get<EnvelopeApi[]>(API_ENDPOINTS.envelopes.list);
    return apiHelpers.handleResponse(response);
  },

  async createEnvelope(data: EnvelopeCreateApi): Promise<EnvelopeApi> {
    const response = await httpClient.post<EnvelopeApi>(API_ENDPOINTS.envelopes.create, data);
    return apiHelpers.handleResponse(response);
  },

  async updateEnvelope(
    id: string,
    updates: Partial<EnvelopeCreateApi>,
  ): Promise<EnvelopeApi> {
    const response = await httpClient.put<EnvelopeApi>(
      API_ENDPOINTS.envelopes.update(id),
      updates,
    );
    return apiHelpers.handleResponse(response);
  },

  async deleteEnvelope(id: string): Promise<void> {
    await httpClient.delete(API_ENDPOINTS.envelopes.delete(id));
  },

  async addValueToEnvelope(
    envelopeId: string,
    amount: number,
  ): Promise<{ new_balance: number }> {
    const response = await httpClient.post<{ new_balance: number }>(
      API_ENDPOINTS.envelopes.addValue(envelopeId),
      null,
      { params: { amount } },
    );
    return apiHelpers.handleResponse(response);
  },

  async withdrawValueFromEnvelope(
    envelopeId: string,
    amount: number,
  ): Promise<{ new_balance: number }> {
    const response = await httpClient.post<{ new_balance: number }>(
      API_ENDPOINTS.envelopes.withdrawValue(envelopeId),
      null,
      { params: { amount } },
    );
    return apiHelpers.handleResponse(response);
  },
};
