import { httpClient, apiHelpers, tokenManager } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/lib/api";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export const authService = {
  // Login user
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      apiHelpers.logRequest("POST", API_ENDPOINTS.auth.login, credentials);

      const response = await httpClient.post<AuthResponse>(
        API_ENDPOINTS.auth.login,
        credentials,
      );

      const data = apiHelpers.handleResponse(response);

      // Store token
      tokenManager.set(data.access_token);

      return data;
    } catch (error: any) {
      throw new Error(apiHelpers.handleError(error));
    }
  },

  // Register new user
  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      apiHelpers.logRequest("POST", API_ENDPOINTS.auth.register, userData);

      const response = await httpClient.post<AuthResponse>(
        API_ENDPOINTS.auth.register,
        userData,
      );

      const data = apiHelpers.handleResponse(response);

      // Store token
      tokenManager.set(data.access_token);

      return data;
    } catch (error: any) {
      throw new Error(apiHelpers.handleError(error));
    }
  },

  // Get current user profile
  async getProfile(): Promise<User> {
    try {
      apiHelpers.logRequest("GET", API_ENDPOINTS.auth.me);

      const response = await httpClient.get<User>(API_ENDPOINTS.auth.me);

      return apiHelpers.handleResponse(response);
    } catch (error: any) {
      throw new Error(apiHelpers.handleError(error));
    }
  },

  // Update user profile
  async updateProfile(updates: Partial<User>): Promise<User> {
    try {
      apiHelpers.logRequest("PUT", API_ENDPOINTS.auth.me, updates);

      const response = await httpClient.put<User>(
        API_ENDPOINTS.auth.me,
        updates,
      );

      return apiHelpers.handleResponse(response);
    } catch (error: any) {
      throw new Error(apiHelpers.handleError(error));
    }
  },

  // Logout user
  logout(): void {
    tokenManager.remove();

    // Clear any cached data
    if (typeof window !== "undefined") {
      // Clear React Query cache if needed
      window.location.reload();
    }
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return tokenManager.isValid();
  },

  // Get stored token
  getToken(): string | null {
    return tokenManager.get();
  },
};
