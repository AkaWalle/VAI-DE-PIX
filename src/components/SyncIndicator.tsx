/**
 * Indicador de estado de sincronização (Story 3.3).
 * Exibe ícone no header: sincronizado / sincronizando / offline / erro.
 */

import { useSyncStore, type SyncStatus } from "@/stores/sync-store";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Check, Loader2, AlertCircle, WifiOff } from "lucide-react";

const statusConfig: Record<
  SyncStatus,
  { icon: typeof Check; label: string; className?: string }
> = {
  idle: { icon: Check, label: "Dados locais" },
  syncing: {
    icon: Loader2,
    label: "Sincronizando...",
    className: "animate-spin",
  },
  synced: { icon: Check, label: "Sincronizado com a nuvem" },
  error: {
    icon: AlertCircle,
    label: "Erro ao sincronizar",
    className: "text-destructive",
  },
  offline: {
    icon: WifiOff,
    label: "Sem conexão",
    className: "text-muted-foreground",
  },
};

export function SyncIndicator() {
  const { status, lastError } = useSyncStore();
  const config = statusConfig[status];
  const Icon = config.icon;

  const tooltipText = status === "error" && lastError
    ? `${config.label}: ${lastError}`
    : config.label;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex items-center justify-center h-9 w-9 min-w-[44px] min-h-[44px] rounded-md text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={tooltipText}
          >
            <Icon
              className={`h-4 w-4 ${config.className ?? ""}`}
              aria-hidden
            />
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
