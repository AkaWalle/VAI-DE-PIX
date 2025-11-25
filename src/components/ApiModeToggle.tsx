import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Database, Wifi, WifiOff, Server } from "lucide-react";

const API_MODE_KEY = "vai-de-pix-api-mode";

export function ApiModeToggle() {
  const { toast } = useToast();
  const [apiMode, setApiMode] = useState(() => {
    return localStorage.getItem(API_MODE_KEY) === "true";
  });
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">(
    "checking",
  );

  // Check API status
  useEffect(() => {
    const checkApiStatus = async () => {
      if (!apiMode) {
        setApiStatus("offline");
        return;
      }

      try {
        // Usar VITE_API_URL ou URL relativa em produção
        const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api" : "http://localhost:8000/api");
        const healthUrl = apiUrl.endsWith("/api") ? `${apiUrl}/health` : `${apiUrl}/api/health`;
        const response = await fetch(healthUrl);
        if (response.ok) {
          setApiStatus("online");
        } else {
          setApiStatus("offline");
        }
      } catch (error) {
        setApiStatus("offline");
      }
    };

    checkApiStatus();

    // Check periodically if in API mode
    if (apiMode) {
      const interval = setInterval(checkApiStatus, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [apiMode]);

  const handleToggle = (enabled: boolean) => {
    setApiMode(enabled);
    localStorage.setItem(API_MODE_KEY, enabled.toString());

    toast({
      title: enabled ? "Modo API ativado" : "Modo Local ativado",
      description: enabled
        ? "Agora usando backend FastAPI (requer servidor rodando)"
        : "Usando dados locais no navegador",
    });

    // Reload page to apply changes
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const getStatusColor = () => {
    switch (apiStatus) {
      case "online":
        return "text-green-500";
      case "offline":
        return "text-red-500";
      default:
        return "text-yellow-500";
    }
  };

  const getStatusIcon = () => {
    switch (apiStatus) {
      case "online":
        return <Wifi className="h-4 w-4" />;
      case "offline":
        return <WifiOff className="h-4 w-4" />;
      default:
        return <Server className="h-4 w-4" />;
    }
  };

  return (
    <Card className="bg-gradient-card shadow-card-custom">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Modo de Dados
        </CardTitle>
        <CardDescription>
          Escolha entre dados locais ou backend API
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="api-mode">Usar Backend API</Label>
            <p className="text-sm text-muted-foreground">
              {apiMode
                ? "Dados salvos no servidor (requer backend rodando)"
                : "Dados salvos localmente no navegador"}
            </p>
          </div>
          <Switch
            id="api-mode"
            checked={apiMode}
            onCheckedChange={handleToggle}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">Status da API:</span>
            <div className={`flex items-center gap-1 ${getStatusColor()}`}>
              {getStatusIcon()}
              <span className="text-sm font-medium">
                {apiStatus === "online"
                  ? "Online"
                  : apiStatus === "offline"
                    ? "Offline"
                    : "Verificando..."}
              </span>
            </div>
          </div>

          <Badge variant={apiMode ? "default" : "secondary"}>
            {apiMode ? "API Mode" : "Local Mode"}
          </Badge>
        </div>

        {apiMode && apiStatus === "offline" && (
          <Alert variant="destructive">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              Backend API não está disponível. Execute{" "}
              <code>python backend/simple_main.py</code>
              ou mude para modo local.
            </AlertDescription>
          </Alert>
        )}

        {!apiMode && (
          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              Usando dados locais. Seus dados ficam salvos apenas no navegador.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

// Hook to get current API mode
export function useApiMode() {
  const [apiMode] = useState(() => {
    return localStorage.getItem(API_MODE_KEY) === "true";
  });

  return {
    isApiMode: apiMode,
    isLocalMode: !apiMode,
  };
}
