import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authService, User } from "@/services/auth.service";
import { hasSessionToken } from "@/lib/auth-session";
import { useFinancialStore } from "@/stores/financial-store";

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** true até o primeiro bootstrap (verificação de sessão) terminar */
  isAuthChecking: boolean;
}

export interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  checkAuth: () => Promise<void>;
  /** Roda 1x no app init: token? /me : limpa estado. Nunca confiar só no token. */
  bootstrapAuth: () => Promise<void>;
}

export type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State — isAuthChecking não é persistido (sempre true até bootstrap rodar)
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isAuthChecking: true,

      // Actions
      login: async (email: string, password: string) => {
        set({ isLoading: true });

        try {
          const response = await authService.login({ email, password });

          // Clear any stale financial data from a previous user before setting
          // the new session, so the UI never shows another user's data.
          useFinancialStore.getState().clearUserData();

          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (name: string, email: string, password: string) => {
        set({ isLoading: true });

        try {
          const response = await authService.register({
            name,
            email,
            password,
          });

          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        authService.logout();
        // Clear all financial data so the next user starts with a clean store.
        useFinancialStore.getState().clearUserData();
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      updateProfile: async (updates: Partial<User>) => {
        const { user } = get();
        if (!user) return;

        set({ isLoading: true });

        try {
          const updatedUser = await authService.updateProfile(updates);
          set({
            user: updatedUser,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      checkAuth: async () => {
        if (!hasSessionToken()) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        set({ isLoading: true });

        try {
          const user = await authService.getProfile();
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          // Token inválido ou expirado
          authService.logout();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      bootstrapAuth: async () => {
        if (!hasSessionToken()) {
          set({ user: null, isAuthenticated: false, isAuthChecking: false });
          return;
        }
        await get().checkAuth();
        set({ isAuthChecking: false });
      },
    }),
    {
      name: "vai-de-pix-auth",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        // isAuthChecking NÃO persistido — sempre true até bootstrap
      }),
    },
  ),
);
