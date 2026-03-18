import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useSharedExpensesStore } from "@/stores/shared-expenses-store";
import { SharedExpenseRespondModal } from "@/components/shared-expenses/SharedExpenseRespondModal";
import { soundService } from "@/services/soundService";
import { formatCurrency } from "@/utils/format";
import { CheckCircle, XCircle, Loader2, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SharedExpensePendingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const shareIdFromUrl = searchParams.get("shareId");
  const {
    pendingShares,
    loading,
    error,
    respondingShareId,
    fetchPendingShares,
    respondShare,
    clearError,
  } = useSharedExpensesStore();

  const [modalShare, setModalShare] = useState<typeof pendingShares[0] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingShares();
  }, [fetchPendingShares]);

  useEffect(() => {
    if (shareIdFromUrl && pendingShares.length > 0) {
      const share = pendingShares.find((s) => s.id === shareIdFromUrl);
      if (share) {
        setModalShare(share);
        setModalOpen(true);
        setSearchParams({}, { replace: true });
      }
    }
  }, [shareIdFromUrl, pendingShares, setSearchParams]);

  const handleRespond = async (shareId: string, action: "accept" | "reject") => {
    try {
      await respondShare(shareId, action);
      setModalOpen(false);
      setModalShare(null);
      soundService.playSuccessActionSound();
      toast({
        title: action === "accept" ? "Despesa aceita" : "Despesa recusada",
        description:
          action === "accept"
            ? "A despesa foi adicionada à sua lista."
            : "A despesa foi recusada.",
      });
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível processar. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const openModal = (share: typeof pendingShares[0]) => {
    setModalShare(share);
    setModalOpen(true);
  };

  const isSubmitting = respondingShareId !== null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pendências</h1>
        <p className="text-muted-foreground">
          Convites de despesa que você ainda não aceitou ou recusou.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
          <Button variant="ghost" size="sm" className="ml-2 h-auto p-0" onClick={clearError}>
            Fechar
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : pendingShares.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Nenhuma pendência no momento.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {pendingShares.map((share) => {
            const isResponding = respondingShareId === share.id;
            return (
              <Card key={share.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs font-normal">
                      <UserPlus className="h-3 w-3 mr-1" />
                      Convite de despesa
                    </Badge>
                  </div>
                  <CardTitle className="text-base">{share.expense_description}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Criado por <span className="font-medium text-foreground">{share.creator_name}</span>
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-lg font-semibold">
                    {formatCurrency(share.expense_amount, { showSign: false })}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="default"
                          className="min-h-[44px] min-w-[44px] touch-manipulation px-4"
                          onClick={() => openModal(share)}
                          disabled={isSubmitting}
                        >
                          {isResponding ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Aceitar
                            </>
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isSubmitting ? "Processando sua resposta..." : "Aceitar e adicionar à sua lista"}
                      </TooltipContent>
                    </Tooltip>
                    <span className="h-6 w-px bg-border flex-shrink-0" aria-hidden />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="default"
                          variant="outline"
                          className="min-h-[44px] min-w-[44px] touch-manipulation px-4 text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => openModal(share)}
                          disabled={isSubmitting}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Recusar
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isSubmitting ? "Processando sua resposta..." : "Recusar e não adicionar à sua lista"}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <SharedExpenseRespondModal
        share={modalShare}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onConfirm={handleRespond}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
