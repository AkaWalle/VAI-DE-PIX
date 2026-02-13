import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authService, User } from "@/services/auth.service";

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  checkAuth: () => Promise<void>;
}

export type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      isAuthenticated: false,
      isLoading: false,

      // Actions
      login: async (email: string, password: string) => {
        set({ isLoading: true });

        try {
          const response = await authService.login({ email, password });

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
        if (!authService.isAuthenticated()) {
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
          // Token invalid or expired
          authService.logout();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },
    }),
    {
      name: "vai-de-pix-auth",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
