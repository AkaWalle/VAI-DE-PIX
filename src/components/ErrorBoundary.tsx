import React, { Component, ErrorInfo, ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log do erro para monitoramento
    console.error("❌ ErrorBoundary capturou um erro:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Aqui você pode enviar o erro para um serviço de monitoramento
    // Ex: Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      // Se houver um fallback customizado, use-o
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI padrão de erro
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <CardTitle>Ops! Algo deu errado</CardTitle>
              </div>
              <CardDescription>
                Ocorreu um erro inesperado na aplicação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-destructive">
                    {this.state.error.name}: {this.state.error.message}
                  </p>
                  {process.env.NODE_ENV === "development" &&
                    this.state.errorInfo && (
                      <details className="mt-4">
                        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                          Detalhes técnicos (modo desenvolvimento)
                        </summary>
                        <pre className="mt-2 p-4 bg-muted rounded-md text-xs overflow-auto max-h-64">
                          {this.state.error.stack}
                          {"\n\n"}
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={this.handleReset} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar Novamente
                </Button>
                <Button onClick={this.handleReload} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recarregar Página
                </Button>
                <Button onClick={this.handleGoHome}>
                  <Home className="h-4 w-4 mr-2" />
                  Ir para Início
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mt-4">
                Se o problema persistir, entre em contato com o suporte.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
