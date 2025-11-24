import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useFinancialStore } from "./financial-store";

// Função para gerar ID único compatível com todos os navegadores
function generateUniqueId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
}

export type AuthStore = AuthState & AuthActions;

// Simulação de usuários para desenvolvimento
const mockUsers = [
  {
    id: "1",
    name: "João da Silva",
    email: "joao@exemplo.com",
    password: "123456",
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Maria Santos",
    email: "maria@exemplo.com",
    password: "123456",
    createdAt: new Date().toISOString(),
  },
];

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
          // Simular delay da API
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Verificar credenciais
          const mockUser = mockUsers.find(
            (u) => u.email === email && u.password === password,
          );

          if (!mockUser) {
            throw new Error("Email ou senha inválidos");
          }

          const user: User = {
            id: mockUser.id,
            name: mockUser.name,
            email: mockUser.email,
            createdAt: mockUser.createdAt,
          };

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });

          // Inicializar dados financeiros do usuário
          useFinancialStore.getState().initializeUserData(user.id);

          // Forçar persistência dos dados
          useFinancialStore.persist.rehydrate();
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (name: string, email: string, password: string) => {
        set({ isLoading: true });

        try {
          // Simular delay da API
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Verificar se email já existe
          const existingUser = mockUsers.find((u) => u.email === email);
          if (existingUser) {
            throw new Error("Este email já está em uso");
          }

          // Criar novo usuário
          const newUser = {
            id: generateUniqueId(),
            name,
            email,
            password,
            createdAt: new Date().toISOString(),
          };

          mockUsers.push(newUser);

          const user: User = {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            createdAt: newUser.createdAt,
          };

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });

          // Inicializar dados financeiros do usuário (novos usuários têm dados zerados)
          useFinancialStore.getState().initializeUserData(user.id);

          // Forçar persistência dos dados
          useFinancialStore.persist.rehydrate();
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });

        // Limpar dados financeiros
        useFinancialStore.getState().clearUserData();
      },

      updateProfile: (updates: Partial<User>) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...updates } });
        }
      },
    }),
    {
      name: "vai-de-pix-auth",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          return JSON.parse(str);
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    },
  ),
);
