import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { logger } from "@/lib/logger";

interface Props {
  children: ReactNode;
  pageName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class PageErrorBoundaryClass extends Component<Props & { navigate: (path: string) => void }, State> {
  constructor(props: Props & { navigate: (path: string) => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error(
      `Erro capturado na página ${this.props.pageName || "desconhecida"}`,
      error,
      {
        page: this.props.pageName,
        componentStack: errorInfo.componentStack,
      }
    );

    // TODO: Enviar para Sentry ou serviço de monitoramento
    // Sentry.captureException(error, {
    //   tags: { page: this.props.pageName },
    //   contexts: { react: { componentStack: errorInfo.componentStack } },
    // });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    this.props.navigate("/");
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="container mx-auto p-6">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
                <CardTitle>Erro ao carregar {this.props.pageName || "página"}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ocorreu um erro inesperado ao carregar esta página. Você pode tentar recarregar ou voltar para a página inicial.
              </p>

              {import.meta.env.DEV && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    Detalhes técnicos (dev only)
                  </summary>
                  <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-40">
                    {this.state.error.toString()}
                    {"\n"}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={this.handleReset} variant="default">
                  <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                  Tentar Novamente
                </Button>
                <Button onClick={this.handleReload} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                  Recarregar Página
                </Button>
                <Button onClick={this.handleGoHome} variant="outline">
                  <Home className="h-4 w-4 mr-2" aria-hidden="true" />
                  Voltar ao Início
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export function PageErrorBoundary({ children, pageName }: Props) {
  const navigate = useNavigate();
  return (
    <PageErrorBoundaryClass navigate={navigate} pageName={pageName}>
      {children}
    </PageErrorBoundaryClass>
  );
}
