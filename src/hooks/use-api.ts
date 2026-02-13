import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiOptions {
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
}

export function useApi<T = unknown>(
  apiFunction: (...args: unknown[]) => Promise<T>,
  options: UseApiOptions = {},
) {
  const { toast } = useToast();
  const {
    showSuccessToast = false,
    showErrorToast = true,
    successMessage = "Operação realizada com sucesso!",
  } = options;

  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: unknown[]): Promise<T | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const result = await apiFunction(...args);

        setState({
          data: result,
          loading: false,
          error: null,
        });

        if (showSuccessToast) {
          toast({
            title: "Sucesso!",
            description: successMessage,
          });
        }

        return result;
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Erro inesperado";

        setState({
          data: null,
          loading: false,
          error: errorMessage,
        });

        if (showErrorToast) {
          toast({
            title: "Erro",
            description: errorMessage,
            variant: "destructive",
          });
        }

        return null;
      }
    },
    [apiFunction, showSuccessToast, showErrorToast, successMessage, toast],
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
    isLoading: state.loading,
    hasError: !!state.error,
    hasData: !!state.data,
  };
}

// Specialized hooks for common patterns
export function useApiMutation<T = unknown>(
  apiFunction: (...args: unknown[]) => Promise<T>,
  options: UseApiOptions = {},
) {
  return useApi(apiFunction, {
    showSuccessToast: true,
    showErrorToast: true,
    ...options,
  });
}

export function useApiQuery<T = unknown>(
  apiFunction: (...args: unknown[]) => Promise<T>,
  options: UseApiOptions = {},
) {
  return useApi(apiFunction, {
    showSuccessToast: false,
    showErrorToast: true,
    ...options,
  });
}
