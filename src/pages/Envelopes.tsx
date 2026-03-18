import { useState, useMemo } from "react";
import { useFinancialStore } from "@/stores/financial-store";
import { useSyncStore } from "@/stores/sync-store";
import { envelopesService } from "@/services/envelopes.service";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/ui/action-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EnvelopeForm } from "@/components/forms/EnvelopeForm";
import { EnvelopeValueForm } from "@/components/forms/EnvelopeValueForm";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { formatCurrencyFromCents } from "@/utils/currency";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Wallet,
  ArrowLeftRight,
  TrendingUp,
  Trash2,
} from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { EmptyState } from "@/components/ui/empty-state";

export default function Envelopes() {
  const { envelopes, deleteEnvelope, transferBetweenEnvelopes } = useFinancialStore();
  const { toast } = useToast();

  const [transferFromId, setTransferFromId] = useState("");
  const [transferToId, setTransferToId] = useState("");
  const [transferAmountCents, setTransferAmountCents] = useState(0);

  const handleTransfer = async () => {
    if (!transferFromId || !transferToId || transferFromId === transferToId) {
      toast({
        title: "Selecione as caixinhas",
        description: "Escolha caixinhas diferentes para origem e destino.",
        variant: "destructive",
      });
      return;
    }
    if (transferAmountCents <= 0) {
      toast({
        title: "Valor inválido",
        description: "Informe um valor maior que zero.",
        variant: "destructive",
      });
      return;
    }
    const from = envelopes.find((e) => e.id === transferFromId);
    if (from && transferAmountCents > from.balance) {
      toast({
        title: "Saldo insuficiente",
        description: `Saldo em "${from.name}" é ${formatCurrencyFromCents(from.balance)}.`,
        variant: "destructive",
      });
      return;
    }
    try {
      await envelopesService.withdrawValueFromEnvelope(transferFromId, transferAmountCents);
      await envelopesService.addValueToEnvelope(transferToId, transferAmountCents);
      transferBetweenEnvelopes(transferFromId, transferToId, transferAmountCents);
      useSyncStore.getState().setSynced();
      const fromName = envelopes.find((e) => e.id === transferFromId)?.name ?? "origem";
      const toName = envelopes.find((e) => e.id === transferToId)?.name ?? "destino";
      toast({
        title: "Transferência entre caixinhas feita!",
        description: `${formatCurrencyFromCents(transferAmountCents)} de "${fromName}" para "${toName}".`,
      });
      setTransferAmountCents(0);
    } catch {
      useSyncStore.getState().setError("Não foi possível sincronizar a transferência.");
      toast({
        title: "Erro ao transferir entre caixinhas",
        description: "Verifique sua conexão e tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEnvelope = async (envelopeId: string, envelopeName: string) => {
    try {
      await envelopesService.deleteEnvelope(envelopeId);
      deleteEnvelope(envelopeId);
      useSyncStore.getState().setSynced();
      toast({
        title: "Caixinha removida!",
        description: `A caixinha "${envelopeName}" foi removida com sucesso.`,
      });
    } catch {
      useSyncStore.getState().setError("Não foi possível remover a caixinha.");
      toast({
        title: "Erro ao remover caixinha",
        description: "Não foi possível remover a caixinha. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Valores no store estão em centavos (number) — memoizado
  const { totalBalance, totalTarget } = useMemo(() => ({
    totalBalance: envelopes.reduce((sum, env) => sum + env.balance, 0),
    totalTarget: envelopes.reduce(
      (sum, env) => sum + (env.targetAmount ?? 0),
      0,
    ),
  }), [envelopes]);

  return (
    <PageLayout
      title="Caixinhas"
      subtitle="Sistema de envelopes para organizar seu orçamento"
      action={
        <>
          <ActionButton
            variant="outline"
            icon={ArrowLeftRight}
            size="sm"
          >
            Transferir entre caixinhas
          </ActionButton>
          <EnvelopeForm />
        </>
      }
    >

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="bg-gradient-card shadow-card-custom p-3 sm:p-6 transition-all hover:shadow-financial">
          <CardHeader className="pb-2 p-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Total Alocado
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <div className="text-lg sm:text-2xl font-bold">
              {formatCurrencyFromCents(totalBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              {envelopes.length} caixinhas ativas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20 shadow-card-custom p-3 sm:p-6 transition-all hover:shadow-financial">
          <CardHeader className="pb-2 p-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-primary">
              Meta Total
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <div className="text-lg sm:text-2xl font-bold">
              {formatCurrencyFromCents(totalTarget)}
            </div>
            <p className="text-xs text-muted-foreground">
              Objetivos das caixinhas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-success/5 border-success/20 shadow-card-custom p-3 sm:p-6 transition-all hover:shadow-financial">
          <CardHeader className="pb-2 p-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-success">
              Progresso Geral
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <div className="text-lg sm:text-2xl font-bold">
              {(totalTarget ?? 0) > 0
                ? (((totalBalance ?? 0) / (totalTarget ?? 1)) * 100).toFixed(1)
                : "0"}
              %
            </div>
            <p className="text-xs text-muted-foreground">Das metas atingidas</p>
          </CardContent>
        </Card>
      </div>

      {/* Envelopes Grid */}
      {envelopes.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Nenhuma caixinha criada"
          description="Crie caixinhas para organizar seu orçamento por categoria ou objetivo."
          action={
            <EnvelopeForm
              trigger={
                <ActionButton variant="default" icon={Plus}>
                  Criar Primeira Caixinha
                </ActionButton>
              }
            />
          }
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {envelopes.map((envelope) => {
            const meta = envelope.targetAmount ?? 0;
            const progressPercentage =
              meta > 0 ? Math.min((envelope.balance / meta) * 100, 100) : 0;
            const isOverTarget = meta > 0 && envelope.balance > meta;

            return (
              <Card
                key={envelope.id}
                className="bg-gradient-card shadow-card-custom transition-all hover:shadow-financial"
                style={{
                  borderTopColor: envelope.color,
                  borderTopWidth: "4px",
                }}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">
                      {envelope.name}
                    </CardTitle>
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: envelope.color }}
                    />
                  </div>
                  {envelope.description && (
                    <CardDescription className="text-sm">
                      {envelope.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Balance (valores em centavos no store) */}
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-1">
                      {formatCurrencyFromCents(envelope.balance)}
                    </div>
                    {envelope.targetAmount != null && envelope.targetAmount > 0 && (
                      <div className="text-sm text-muted-foreground">
                        de {formatCurrencyFromCents(envelope.targetAmount)}
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {envelope.targetAmount != null && envelope.targetAmount > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progresso</span>
                        <span
                          className={`font-medium ${isOverTarget ? "text-warning" : ""}`}
                        >
                          {(progressPercentage ?? 0).toFixed(1)}%
                        </span>
                      </div>
                      <Progress
                        value={Math.min(progressPercentage, 100)}
                        className="h-2"
                      />
                      {isOverTarget && (
                        <div className="text-xs text-warning flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Acima da meta em{" "}
                          {formatCurrencyFromCents(
                            envelope.balance - (envelope.targetAmount ?? 0),
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="flex justify-center">
                    {envelope.targetAmount != null && envelope.targetAmount > 0 ? (
                      <Badge
                        variant={
                          isOverTarget
                            ? "default"
                            : progressPercentage >= 100
                              ? "default"
                              : progressPercentage >= 75
                                ? "secondary"
                                : progressPercentage >= 50
                                  ? "outline"
                                  : "destructive"
                        }
                        className="text-xs"
                      >
                        {isOverTarget
                          ? "Acima da Meta"
                          : progressPercentage >= 100
                            ? "Meta Atingida"
                            : progressPercentage >= 75
                              ? "Quase Lá"
                              : progressPercentage >= 50
                                ? "No Caminho"
                                : "Precisa de Mais"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Sem Meta Definida
                      </Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <EnvelopeValueForm
                      envelopeId={envelope.id}
                      envelopeName={envelope.name}
                      currentBalance={envelope.balance}
                      type="add"
                    />
                    <EnvelopeValueForm
                      envelopeId={envelope.id}
                      envelopeName={envelope.name}
                      currentBalance={envelope.balance}
                      type="withdraw"
                    />
                    <ConfirmDialog
                      trigger={
                        <ActionButton
                          variant="outline"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </ActionButton>
                      }
                      title="Remover Caixinha"
                      description={`Tem certeza que deseja remover a caixinha "${envelope.name}"? Esta ação não pode ser desfeita.`}
                      confirmText="Remover"
                      onConfirm={() =>
                        handleDeleteEnvelope(envelope.id, envelope.name)
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Transfer Section */}
      {envelopes.length > 1 && (
        <Card className="bg-gradient-card shadow-card-custom">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-primary" />
              Transferir entre caixinhas
            </CardTitle>
            <CardDescription>
              Mova valores entre suas caixinhas (não é transferência bancária)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="transfer-from" className="text-sm font-medium">De:</label>
                <select
                  id="transfer-from"
                  className="w-full p-2 border border-input rounded-md bg-background"
                  value={transferFromId}
                  onChange={(e) => setTransferFromId(e.target.value)}
                >
                  <option value="">Selecione uma caixinha</option>
                  {envelopes.map((env) => (
                    <option key={env.id} value={env.id}>
                      {env.name} ({formatCurrencyFromCents(env.balance)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="transfer-to" className="text-sm font-medium">Para:</label>
                <select
                  id="transfer-to"
                  className="w-full p-2 border border-input rounded-md bg-background"
                  value={transferToId}
                  onChange={(e) => setTransferToId(e.target.value)}
                >
                  <option value="">Selecione uma caixinha</option>
                  {envelopes.map((env) => (
                    <option key={env.id} value={env.id}>
                      {env.name} ({formatCurrencyFromCents(env.balance)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <CurrencyInput
                value={transferAmountCents}
                onChange={setTransferAmountCents}
                className="flex-1"
              />
              <ActionButton
                icon={ArrowLeftRight}
                onClick={handleTransfer}
                size="sm"
              >
                Transferir entre caixinhas
              </ActionButton>
            </div>
          </CardContent>
        </Card>
      )}
    </PageLayout>
  );
}
