import { useFinancialStore } from "@/stores/financial-store";
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
import { formatCurrencyFromCents } from "@/utils/currency";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Wallet,
  ArrowLeftRight,
  TrendingUp,
  Trash2,
} from "lucide-react";

export default function Envelopes() {
  const { envelopes, deleteEnvelope } = useFinancialStore();
  const { toast } = useToast();

  const handleDeleteEnvelope = async (envelopeId: string, envelopeName: string) => {
    try {
      await envelopesService.deleteEnvelope(envelopeId);
      deleteEnvelope(envelopeId);
      toast({
        title: "Caixinha removida!",
        description: `A caixinha "${envelopeName}" foi removida com sucesso.`,
      });
    } catch {
      toast({
        title: "Erro ao remover caixinha",
        description: "Não foi possível remover a caixinha. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Valores no store estão em centavos (number)
  const totalBalance = envelopes.reduce((sum, env) => sum + env.balance, 0);
  const totalTarget = envelopes.reduce(
    (sum, env) => sum + (env.targetAmount ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Caixinhas</h1>
          <p className="text-muted-foreground">
            Sistema de envelopes para organizar seu orçamento
          </p>
        </div>
        <div className="flex gap-2">
          <ActionButton variant="outline" icon={ArrowLeftRight}>
            Transferir
          </ActionButton>
          <EnvelopeForm />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-card shadow-card-custom">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Alocado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrencyFromCents(totalBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              {envelopes.length} caixinhas ativas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary">
              Meta Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrencyFromCents(totalTarget)}
            </div>
            <p className="text-xs text-muted-foreground">
              Objetivos das caixinhas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-success/5 border-success/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-success">
              Progresso Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalTarget > 0
                ? ((totalBalance / totalTarget) * 100).toFixed(1)
                : "0"}
              %
            </div>
            <p className="text-xs text-muted-foreground">Das metas atingidas</p>
          </CardContent>
        </Card>
      </div>

      {/* Envelopes Grid */}
      {envelopes.length === 0 ? (
        <Card className="bg-gradient-card shadow-card-custom">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Wallet className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              Nenhuma caixinha criada
            </h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              Crie caixinhas para organizar seu orçamento por categoria ou
              objetivo
            </p>
            <EnvelopeForm
              trigger={
                <ActionButton icon={Plus}>Criar Primeira Caixinha</ActionButton>
              }
            />
          </CardContent>
        </Card>
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
                          {progressPercentage.toFixed(1)}%
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
                  <div className="flex gap-2 pt-2">
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
                          className="px-2"
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
              Transferências Rápidas
            </CardTitle>
            <CardDescription>
              Mova valores entre suas caixinhas facilmente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">De:</label>
                <select className="w-full p-2 border border-input rounded-md bg-background">
                  <option value="">Selecione uma caixinha</option>
                  {envelopes.map((env) => (
                    <option key={env.id} value={env.id}>
                      {env.name} ({formatCurrencyFromCents(env.balance)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Para:</label>
                <select className="w-full p-2 border border-input rounded-md bg-background">
                  <option value="">Selecione uma caixinha</option>
                  {envelopes.map((env) => (
                    <option key={env.id} value={env.id}>
                      {env.name} ({formatCurrencyFromCents(env.balance)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <input
                type="number"
                placeholder="Valor da transferência"
                className="flex-1 p-2 border border-input rounded-md bg-background"
              />
              <ActionButton icon={ArrowLeftRight}>Transferir</ActionButton>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
