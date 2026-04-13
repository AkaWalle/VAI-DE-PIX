import { useState } from "react";
import { useFinancialStore } from "@/stores/financial-store";
import { envelopesService } from "@/services/envelopes.service";
import { ActionButton } from "@/components/ui/action-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EnvelopeForm } from "@/components/forms/EnvelopeForm";
import { EnvelopeValueForm } from "@/components/forms/EnvelopeValueForm";
import { formatCurrency } from "@/utils/format";
import { useToast } from "@/hooks/use-toast";
import { Plus, Wallet, ArrowLeftRight, TrendingUp, Trash2, AlertTriangle, RefreshCw } from "lucide-react";

export default function Envelopes() {
  const {
    envelopes,
    deleteEnvelope,
    transferBetweenEnvelopes,
    setEnvelopes,
    envelopesLoading,
    envelopesError,
    setEnvelopesLoading,
    setEnvelopesError,
  } = useFinancialStore();
  const { toast } = useToast();

  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

  const handleDelete = async (id: string, name: string) => {
    try {
      await envelopesService.deleteEnvelope(id);
      deleteEnvelope(id);
      toast({ title: "Caixinha removida!", description: `"${name}" removida.` });
    } catch {
      toast({ title: "Erro ao remover caixinha", variant: "destructive" });
    }
  };

  const handleTransfer = async () => {
    if (!transferFrom || !transferTo || !transferAmount) {
      toast({
        title: "Preencha todos os campos",
        description: "Selecione a origem, destino e o valor da transferência.",
        variant: "destructive",
      });
      return;
    }
    if (transferFrom === transferTo) {
      toast({
        title: "Caixinhas iguais",
        description: "A origem e o destino devem ser caixinhas diferentes.",
        variant: "destructive",
      });
      return;
    }
    const amount = parseFloat(transferAmount.replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Valor inválido",
        description: "Insira um valor maior que zero.",
        variant: "destructive",
      });
      return;
    }
    const fromEnvelope = envelopes.find((e) => e.id === transferFrom);
    if (fromEnvelope && amount > fromEnvelope.balance) {
      toast({
        title: "Saldo insuficiente",
        description: `Saldo disponível em "${fromEnvelope.name}": ${formatCurrency(fromEnvelope.balance)}.`,
        variant: "destructive",
      });
      return;
    }

    setIsTransferring(true);
    try {
      const [withdrawResult, addResult] = await Promise.all([
        envelopesService.withdrawValueFromEnvelope(transferFrom, amount),
        envelopesService.addValueToEnvelope(transferTo, amount),
      ]);
      transferBetweenEnvelopes(transferFrom, transferTo, amount);
      // Sync exact balances returned by the API
      setEnvelopes(
        envelopes.map((e) => {
          if (e.id === transferFrom) return { ...e, balance: withdrawResult.new_balance };
          if (e.id === transferTo)   return { ...e, balance: addResult.new_balance };
          return e;
        }),
      );
      setTransferFrom("");
      setTransferTo("");
      setTransferAmount("");
      toast({
        title: "Transferência realizada!",
        description: `${formatCurrency(amount)} transferido com sucesso.`,
      });
    } catch {
      toast({
        title: "Erro na transferência",
        description: "Ocorreu um erro ao transferir. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsTransferring(false);
    }
  };

  const handleRetryLoad = async () => {
    setEnvelopesLoading(true);
    setEnvelopesError(null);
    try {
      const loaded = await envelopesService.getEnvelopes();
      setEnvelopes(
        loaded.map((e) => ({
          id: e.id,
          name: e.name,
          balance: e.balance,
          targetAmount: e.target_amount ?? undefined,
          color: e.color,
          description: e.description ?? undefined,
        })),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar caixinhas";
      setEnvelopesError(msg);
      toast({ title: "Erro ao carregar caixinhas", description: msg, variant: "destructive" });
    } finally {
      setEnvelopesLoading(false);
    }
  };

  const totalBalance = envelopes.reduce((s, e) => s + e.balance, 0);
  const totalTarget  = envelopes.reduce((s, e) => s + (e.targetAmount || 0), 0);
  const overallPct   = totalTarget > 0 ? (totalBalance / totalTarget) * 100 : 0;

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (envelopesLoading) {
    return (
      <div className="space-y-7 animate-fade-in">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[#128c7e] mb-1">Orçamento</p>
            <h1 className="text-2xl font-bold text-foreground">Caixinhas</h1>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-white/8 bg-white/3 p-5 animate-pulse">
              <div className="h-3 w-24 bg-white/10 rounded mb-3" />
              <div className="h-8 w-32 bg-white/10 rounded mb-2" />
              <div className="h-3 w-20 bg-white/10 rounded" />
            </div>
          ))}
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-white/8 bg-card p-5 h-52 animate-pulse">
              <div className="h-4 w-32 bg-white/10 rounded mb-4" />
              <div className="h-10 w-24 bg-white/10 rounded mx-auto mb-4" />
              <div className="h-2 w-full bg-white/10 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────────
  if (envelopesError) {
    return (
      <div className="space-y-7 animate-fade-in">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-[#128c7e] mb-1">Orçamento</p>
          <h1 className="text-2xl font-bold text-foreground">Caixinhas</h1>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/5 py-16 px-8 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10">
            <AlertTriangle className="h-7 w-7 text-rose-400" />
          </div>
          <p className="text-base font-semibold text-white mb-1">Erro ao carregar caixinhas</p>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">{envelopesError}</p>
          <ActionButton icon={RefreshCw} onClick={handleRetryLoad}>
            Tentar Novamente
          </ActionButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-[#128c7e] mb-1">Orçamento</p>
          <h1 className="text-2xl font-bold text-foreground">Caixinhas</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Envelopes para organizar seu orçamento</p>
        </div>
        <div className="flex gap-2">
          <EnvelopeForm />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">Total Alocado</p>
          <p className="text-3xl font-bold text-[#128c7e] tabular-nums">{formatCurrency(totalBalance)}</p>
          <p className="text-xs text-muted-foreground mt-1">{envelopes.length} caixinha{envelopes.length !== 1 ? "s" : ""} ativa{envelopes.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-2xl border border-[rgba(18,140,126,0.2)] bg-[rgba(18,140,126,0.06)] p-5">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">Meta Total</p>
          <p className="text-3xl font-bold text-[#128c7e] tabular-nums">{formatCurrency(totalTarget)}</p>
          <p className="text-xs text-muted-foreground mt-1">Objetivo das caixinhas</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-5">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">Progresso Geral</p>
          <p className="text-3xl font-bold text-emerald-400 tabular-nums">{overallPct.toFixed(1)}%</p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full bg-emerald-400 transition-all duration-700" style={{ width: `${Math.min(overallPct, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Empty state */}
      {envelopes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-card py-20">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
            <Wallet className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="text-lg font-semibold text-white mb-2">Nenhuma caixinha criada</p>
          <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">Organize seu orçamento criando caixinhas por categoria</p>
          <EnvelopeForm trigger={<ActionButton icon={Plus}>Criar Primeira Caixinha</ActionButton>} />
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {envelopes.map((env) => {
            const pct = env.targetAmount ? Math.min((env.balance / env.targetAmount) * 100, 100) : 0;
            const isOver = !!(env.targetAmount && env.balance > env.targetAmount);
            const statusLabel = !env.targetAmount ? "Sem meta"
              : isOver            ? "Acima da Meta"
              : pct >= 100        ? "Meta Atingida"
              : pct >= 75         ? "Quase Lá"
              : pct >= 50         ? "No Caminho"
              :                    "Precisa de Mais";
            const statusColor = !env.targetAmount ? "text-muted-foreground border-white/10"
              : isOver || pct >= 100 ? "text-emerald-400 border-emerald-500/30"
              : pct >= 75            ? "text-[#128c7e] border-[rgba(18,140,126,0.3)]"
              : pct >= 50            ? "text-amber-400 border-amber-500/30"
              :                       "text-rose-400 border-rose-500/30";

            return (
              <div key={env.id}
                className="relative flex flex-col rounded-2xl border border-white/8 bg-card p-5 transition-all duration-200 hover:scale-[1.01] hover:border-white/12"
                style={{ borderTopColor: env.color, borderTopWidth: "3px" }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-semibold text-white truncate">{env.name}</p>
                    {env.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{env.description}</p>}
                  </div>
                  <div className="h-3 w-3 shrink-0 rounded-full mt-1" style={{ backgroundColor: env.color }} />
                </div>

                {/* Balance */}
                <div className="text-center mb-4">
                  <p className="text-3xl font-bold text-white tabular-nums">{formatCurrency(env.balance)}</p>
                  {env.targetAmount && (
                    <p className="text-xs text-muted-foreground mt-1">de {formatCurrency(env.targetAmount)}</p>
                  )}
                </div>

                {/* Progress */}
                {env.targetAmount && (
                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progresso</span>
                      <span className={isOver ? "text-amber-400" : "text-white"}>{pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${isOver ? "bg-[#f59e0b]" : pct >= 100 ? "bg-[#25d366]" : "bg-[#128c7e]"}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    {isOver && (
                      <div className="flex items-center gap-1 text-xs text-amber-400">
                        <TrendingUp className="h-3 w-3" />
                        Acima da meta em {formatCurrency(env.balance - (env.targetAmount ?? 0))}
                      </div>
                    )}
                  </div>
                )}

                {/* Status badge */}
                <div className="flex justify-center mb-4">
                  <span className={`rounded-full border px-3 py-1 text-[11px] font-medium ${statusColor}`}>{statusLabel}</span>
                </div>

                {/* Actions */}
                <div className="mt-auto flex gap-2">
                  <EnvelopeValueForm envelopeId={env.id} envelopeName={env.name} currentBalance={env.balance} type="add" />
                  <EnvelopeValueForm envelopeId={env.id} envelopeName={env.name} currentBalance={env.balance} type="withdraw" />
                  <ConfirmDialog
                    trigger={
                      <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/8 text-muted-foreground transition-colors hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    }
                    title="Remover Caixinha"
                    description={`Remover "${env.name}"? Ação irreversível.`}
                    confirmText="Remover"
                    onConfirm={() => handleDelete(env.id, env.name)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Transfer section */}
      {envelopes.length > 1 && (
        <div className="rounded-2xl border border-white/8 bg-card p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[rgba(18,140,126,0.12)]">
              <ArrowLeftRight className="h-4 w-4 text-[#128c7e]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Transferência entre Caixinhas</h2>
              <p className="text-xs text-muted-foreground">Mova valores facilmente</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">De:</label>
              <select
                value={transferFrom}
                onChange={(e) => setTransferFrom(e.target.value)}
                className="w-full h-10 rounded-xl border border-border bg-secondary px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                <option value="">Selecione uma caixinha</option>
                {envelopes.map((e) => (
                  <option key={e.id} value={e.id} disabled={e.id === transferTo}>
                    {e.name} ({formatCurrency(e.balance)})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Para:</label>
              <select
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                className="w-full h-10 rounded-xl border border-border bg-secondary px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                <option value="">Selecione uma caixinha</option>
                {envelopes.map((e) => (
                  <option key={e.id} value={e.id} disabled={e.id === transferFrom}>
                    {e.name} ({formatCurrency(e.balance)})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <input
              type="number"
              placeholder="Valor"
              min="0.01"
              step="0.01"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              className="h-10 flex-1 rounded-xl border border-border bg-secondary px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
            />
            <ActionButton
              icon={ArrowLeftRight}
              className="bg-primary hover:bg-[#075e54] text-white"
              loading={isTransferring}
              loadingText="Transferindo..."
              onClick={handleTransfer}
            >
              Transferir
            </ActionButton>
          </div>
        </div>
      )}
    </div>
  );
}
