import { useState, useEffect } from "react";
import { useFinancialStore } from "@/stores/financial-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { automationsService } from "@/services/automations.service";
import {
  Zap,
  Plus,
  Calendar,
  Target,
  Webhook,
  Play,
  Pause,
  Trash2,
  Settings,
  AlertCircle,
  Wallet,
  PieChart,
  Mail,
  PiggyBank,
  Bell,
} from "lucide-react";

type AutomationRuleTypeOption =
  | "recurring_transaction"
  | "budget_alert"
  | "goal_reminder"
  | "webhook"
  | "low_balance_alert"
  | "category_limit"
  | "weekly_report"
  | "round_up"
  | "payment_reminder";

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  type: AutomationRuleTypeOption;
  isActive: boolean;
  conditions: {
    trigger?: string;
    frequency?: string;
    amount?: number;
    amount_cents?: number;
    category?: string;
    category_id?: string;
    account?: string;
    account_id?: string;
    start_date?: string;
    end_date?: string;
    day_of_week?: number;
    destination_email?: string;
    envelope_id?: string;
    round_to_cents?: number;
    days_after_creation?: number;
  };
  actions: {
    type: string;
    value: string;
    account_id?: string;
    category_id?: string;
    amount?: number;
    amount_cents?: number;
  };
  lastRun?: string;
  nextRun?: string;
}

export default function Automations() {
  const { categories, accounts, envelopes } = useFinancialStore();
  const { toast } = useToast();

  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showNewRule, setShowNewRule] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [newRule, setNewRule] = useState({
    name: "",
    description: "",
    type: "recurring_transaction" as AutomationRuleTypeOption,
    trigger: "monthly",
    frequency: "",
    startDate: "",
    endDate: "",
    amountCents: 0,
    category: "",
    account: "",
    actionType: "add_transaction",
    actionValue: "income",
    destinationEmail: "",
    dayOfWeek: 1,
    envelopeId: "",
    roundToCents: 100,
    daysAfterCreation: 3,
  });

  // Carregar automações da API
  useEffect(() => {
    const loadAutomations = async () => {
      try {
        setIsLoading(true);
        const loadedRules = await automationsService.getAutomations();
        // Converter formato da API para formato do componente
        setAutomationRules(
          loadedRules.map((rule) => ({
            id: rule.id,
            name: rule.name,
            description: rule.description || "",
            type: rule.type,
            isActive: rule.is_active,
            conditions: rule.conditions,
            actions: rule.actions,
            lastRun: rule.last_run,
            nextRun: rule.next_run,
          })),
        );
      } catch (error) {
        console.error("Erro ao carregar automações:", error);
        toast({
          title: "Erro ao carregar automações",
          description:
            "Não foi possível carregar as automações. Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAutomations();
  }, [toast]);

  const handleToggleRule = async (ruleId: string) => {
    try {
      const rule = automationRules.find((r) => r.id === ruleId);
      if (!rule) return;

      const updatedRule = await automationsService.updateAutomation(ruleId, {
        is_active: !rule.isActive,
      });

      setAutomationRules((prev) =>
        prev.map((r) =>
          r.id === ruleId ? { ...r, isActive: updatedRule.is_active } : r,
        ),
      );

      toast({
        title: updatedRule.is_active
          ? "Automação ativada"
          : "Automação desativada",
        description: `A regra "${rule.name}" foi ${updatedRule.is_active ? "ativada" : "desativada"}.`,
      });
    } catch (error) {
      console.error("Erro ao atualizar automação:", error);
      toast({
        title: "Erro ao atualizar automação",
        description: "Não foi possível atualizar a automação. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const rule = automationRules.find((r) => r.id === ruleId);
      await automationsService.deleteAutomation(ruleId);
      setAutomationRules((prev) => prev.filter((r) => r.id !== ruleId));

      toast({
        title: "Automação removida",
        description: `A regra "${rule?.name}" foi removida com sucesso.`,
      });
    } catch (error) {
      console.error("Erro ao remover automação:", error);
      toast({
        title: "Erro ao remover automação",
        description: "Não foi possível remover a automação. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const buildConditionsAndActions = () => {
    if (newRule.type === "low_balance_alert") {
      return {
        conditions: {
          account_id: newRule.account || undefined,
          amount_cents: newRule.amountCents || undefined,
        },
        actions: {},
      };
    }
    if (newRule.type === "category_limit") {
      return {
        conditions: {
          category_id: newRule.category || undefined,
          amount_cents: newRule.amountCents || undefined,
        },
        actions: {},
      };
    }
    if (newRule.type === "weekly_report") {
      return {
        conditions: {
          day_of_week: newRule.dayOfWeek,
          destination_email: newRule.destinationEmail || undefined,
        },
        actions: {},
      };
    }
    if (newRule.type === "round_up") {
      return {
        conditions: {
          envelope_id: newRule.envelopeId || undefined,
          round_to_cents: newRule.roundToCents || 100,
        },
        actions: {},
      };
    }
    if (newRule.type === "payment_reminder") {
      return {
        conditions: {
          days_after_creation: newRule.daysAfterCreation ?? 3,
        },
        actions: {},
      };
    }
    if (newRule.type === "recurring_transaction") {
      return {
        conditions: {
          trigger: newRule.trigger,
          frequency: newRule.trigger,
          start_date: newRule.startDate || undefined,
          end_date: newRule.endDate || undefined,
        },
        actions: {
          type: newRule.actionType,
          value: newRule.actionValue,
          account_id: newRule.account || undefined,
          category_id: newRule.category || undefined,
          amount_cents: newRule.amountCents || undefined,
          amount: newRule.amountCents ? newRule.amountCents / 100 : undefined,
        },
      };
    }
    return {
      conditions: {
        trigger: newRule.trigger,
        frequency: newRule.frequency || undefined,
        amount: newRule.amountCents ? newRule.amountCents / 100 : undefined,
        category: newRule.category || undefined,
        account: newRule.account || undefined,
      },
      actions: {
        type: newRule.actionType,
        value: newRule.actionValue,
      },
    };
  };

  const handleCreateRule = async () => {
    if (!newRule.name || !newRule.description) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha nome e descrição.",
        variant: "destructive",
      });
      return;
    }
    if (newRule.type === "low_balance_alert" && !newRule.account) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione a conta para o alerta de saldo baixo.",
        variant: "destructive",
      });
      return;
    }
    if (newRule.type === "category_limit" && !newRule.category) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione a categoria para o limite mensal.",
        variant: "destructive",
      });
      return;
    }
    if (newRule.type === "weekly_report" && !newRule.destinationEmail?.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Informe o e-mail de destino do relatório.",
        variant: "destructive",
      });
      return;
    }
    if (newRule.type === "round_up" && !newRule.envelopeId) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione a caixinha de destino.",
        variant: "destructive",
      });
      return;
    }
    if (newRule.type === "payment_reminder" && (newRule.daysAfterCreation == null || newRule.daysAfterCreation < 1)) {
      toast({
        title: "Campo obrigatório",
        description: "Informe quantos dias após a criação (mín. 1).",
        variant: "destructive",
      });
      return;
    }

    try {
      const { conditions, actions } = buildConditionsAndActions();
      const createdRule = await automationsService.createAutomation({
        name: newRule.name,
        description: newRule.description,
        type: newRule.type,
        is_active: false,
        conditions,
        actions,
      });

      setAutomationRules((prev) => [
        ...prev,
        {
          id: createdRule.id,
          name: createdRule.name,
          description: createdRule.description || "",
          type: createdRule.type,
          isActive: createdRule.is_active,
          conditions: createdRule.conditions,
          actions: createdRule.actions,
          lastRun: createdRule.last_run,
          nextRun: createdRule.next_run,
        },
      ]);

      toast({
        title: "Automação criada!",
        description: `A regra "${createdRule.name}" foi criada com sucesso.`,
      });

      setNewRule({
        name: "",
        description: "",
        type: "recurring_transaction",
        trigger: "monthly",
        frequency: "",
        startDate: "",
        endDate: "",
        amountCents: 0,
        category: "",
        account: "",
        actionType: "add_transaction",
        actionValue: "income",
        destinationEmail: "",
        dayOfWeek: 1,
        envelopeId: "",
        roundToCents: 100,
        daysAfterCreation: 3,
      });
      setShowNewRule(false);
    } catch (error) {
      console.error("Erro ao criar automação:", error);
      toast({
        title: "Erro ao criar automação",
        description: "Não foi possível criar a automação. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleEditRule = (ruleId: string) => {
    const rule = automationRules.find((r) => r.id === ruleId);
    if (!rule) return;

    const amountCents =
      rule.conditions.amount_cents != null
        ? Number(rule.conditions.amount_cents)
        : rule.conditions.amount != null
          ? Math.round(rule.conditions.amount * 100)
          : 0;

    setEditingRuleId(ruleId);
    setNewRule({
      name: rule.name,
      description: rule.description,
      type: rule.type,
      trigger: rule.conditions.trigger || "monthly",
      frequency: rule.conditions.frequency || "",
      startDate: rule.conditions.start_date?.slice(0, 10) || "",
      endDate: rule.conditions.end_date?.slice(0, 10) || "",
      amountCents,
      category: rule.conditions.category_id || rule.conditions.category || "",
      account: rule.conditions.account_id || rule.conditions.account || "",
      actionType: rule.actions.type,
      actionValue: rule.actions.value,
      destinationEmail:
        rule.conditions.destination_email || rule.conditions.email || "",
      dayOfWeek:
        rule.conditions.day_of_week !== undefined
          ? Number(rule.conditions.day_of_week)
          : 1,
      envelopeId: rule.conditions.envelope_id || rule.actions.envelope_id || "",
      roundToCents:
        rule.conditions.round_to_cents ?? rule.actions.round_to_cents ?? 100,
      daysAfterCreation:
        rule.conditions.days_after_creation ?? 3,
    });
    setShowNewRule(true);
  };

  const handleUpdateRule = async () => {
    if (!editingRuleId) return;
    if (!newRule.name || !newRule.description) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha nome e descrição.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { conditions, actions } = buildConditionsAndActions();
      const updatedRule = await automationsService.updateAutomation(
        editingRuleId,
        {
          name: newRule.name,
          description: newRule.description,
          type: newRule.type,
          conditions,
          actions,
        },
      );

      setAutomationRules((prev) =>
        prev.map((r) =>
          r.id === editingRuleId
            ? {
                id: updatedRule.id,
                name: updatedRule.name,
                description: updatedRule.description || "",
                type: updatedRule.type,
                isActive: updatedRule.is_active,
                conditions: updatedRule.conditions,
                actions: updatedRule.actions,
                lastRun: updatedRule.last_run,
                nextRun: updatedRule.next_run,
              }
            : r,
        ),
      );

      toast({
        title: "Automação atualizada!",
        description: `A regra "${updatedRule.name}" foi atualizada com sucesso.`,
      });

      setEditingRuleId(null);
      setNewRule({
        name: "",
        description: "",
        type: "recurring_transaction",
        trigger: "monthly",
        frequency: "",
        startDate: "",
        endDate: "",
        amountCents: 0,
        category: "",
        account: "",
        actionType: "add_transaction",
        actionValue: "income",
        destinationEmail: "",
        dayOfWeek: 1,
        envelopeId: "",
        roundToCents: 100,
        daysAfterCreation: 3,
      });
      setShowNewRule(false);
    } catch (error) {
      console.error("Erro ao atualizar automação:", error);
      toast({
        title: "Erro ao atualizar automação",
        description: "Não foi possível atualizar a automação. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingRuleId(null);
    setShowNewRule(false);
    setNewRule({
      name: "",
      description: "",
      type: "recurring_transaction",
      trigger: "monthly",
      frequency: "",
      startDate: "",
      endDate: "",
      amountCents: 0,
      category: "",
      account: "",
      actionType: "add_transaction",
      actionValue: "income",
      destinationEmail: "",
      dayOfWeek: 1,
      envelopeId: "",
      roundToCents: 100,
      daysAfterCreation: 3,
    });
  };

  const getRuleTypeIcon = (type: string) => {
    switch (type) {
      case "recurring_transaction":
        return Calendar;
      case "budget_alert":
        return AlertCircle;
      case "goal_reminder":
        return Target;
      case "webhook":
        return Webhook;
      case "low_balance_alert":
        return Wallet;
      case "category_limit":
        return PieChart;
      case "weekly_report":
        return Mail;
      case "round_up":
        return PiggyBank;
      case "payment_reminder":
        return Bell;
      default:
        return Zap;
    }
  };

  const getRuleTypeLabel = (type: string) => {
    switch (type) {
      case "recurring_transaction":
        return "Transação Recorrente";
      case "budget_alert":
        return "Alerta de Orçamento";
      case "goal_reminder":
        return "Lembrete de Meta";
      case "webhook":
        return "Webhook";
      case "low_balance_alert":
        return "Alerta de Saldo Baixo";
      case "category_limit":
        return "Limite por Categoria";
      case "weekly_report":
        return "Relatório Semanal";
      case "round_up":
        return "Arredondamento para Caixinha";
      case "payment_reminder":
        return "Lembrete de Cobrança";
      default:
        return "Automação";
    }
  };

  const activeRules = automationRules.filter((rule) => rule.isActive).length;
  const totalRules = automationRules.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Automações</h1>
          <p className="text-muted-foreground">
            Configure regras automáticas para seus dados financeiros
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setShowNewRule(!showNewRule)}
            className="h-9 px-4 text-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Automação
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-card shadow-card-custom">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Total de Regras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRules}</div>
            <p className="text-xs text-muted-foreground">Regras configuradas</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card-custom border-income/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Play className="h-4 w-4 text-income" />
              Regras Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-income">{activeRules}</div>
            <p className="text-xs text-muted-foreground">
              Executando automaticamente
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card-custom border-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Pause className="h-4 w-4 text-muted-foreground" />
              Regras Inativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {totalRules - activeRules}
            </div>
            <p className="text-xs text-muted-foreground">
              Pausadas ou desabilitadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* New/Edit Rule Form */}
      {showNewRule && (
        <Card className="bg-gradient-card shadow-card-custom border-dashed">
          <CardHeader>
            <CardTitle>
              {editingRuleId ? "Editar Automação" : "Nova Automação"}
            </CardTitle>
            <CardDescription>
              {editingRuleId
                ? "Edite os dados da regra de automação"
                : "Configure uma nova regra de automação"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome da Regra</Label>
                <Input
                  value={newRule.name}
                  onChange={(e) =>
                    setNewRule((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ex: Salário Mensal"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={newRule.type}
                  onValueChange={(value: string) =>
                    setNewRule((prev) => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recurring_transaction">
                      📅 Transação Recorrente
                    </SelectItem>
                    <SelectItem value="budget_alert">
                      ⚠️ Alerta de Orçamento
                    </SelectItem>
                    <SelectItem value="goal_reminder">
                      🎯 Lembrete de Meta
                    </SelectItem>
                    <SelectItem value="webhook">🔗 Webhook</SelectItem>
                    <SelectItem value="low_balance_alert">
                      💳 Alerta de Saldo Baixo
                    </SelectItem>
                    <SelectItem value="category_limit">
                      📊 Limite por Categoria
                    </SelectItem>
                    <SelectItem value="weekly_report">
                      📧 Relatório Semanal
                    </SelectItem>
                    <SelectItem value="round_up">
                      🐷 Arredondamento para Caixinha
                    </SelectItem>
                    <SelectItem value="payment_reminder">
                      🔔 Lembrete de Cobrança
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={newRule.description}
                onChange={(e) =>
                  setNewRule((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Descreva o que esta automação faz"
              />
            </div>

            {newRule.type === "recurring_transaction" && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select
                    value={newRule.trigger}
                    onValueChange={(value) =>
                      setNewRule((prev) => ({ ...prev, trigger: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data início</Label>
                  <Input
                    type="date"
                    value={newRule.startDate}
                    onChange={(e) =>
                      setNewRule((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data fim (opcional)</Label>
                  <Input
                    type="date"
                    value={newRule.endDate}
                    onChange={(e) =>
                      setNewRule((prev) => ({
                        ...prev,
                        endDate: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor</Label>
                  <CurrencyInput
                    value={newRule.amountCents}
                    onChange={(v) =>
                      setNewRule((prev) => ({
                        ...prev,
                        amountCents: v,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={newRule.actionValue}
                    onValueChange={(value) =>
                      setNewRule((prev) => ({ ...prev, actionValue: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">💰 Receita</SelectItem>
                      <SelectItem value="expense">💸 Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={newRule.category}
                    onValueChange={(value) =>
                      setNewRule((prev) => ({ ...prev, category: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.icon} {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Conta</Label>
                  <Select
                    value={newRule.account}
                    onValueChange={(value) =>
                      setNewRule((prev) => ({ ...prev, account: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {newRule.type === "low_balance_alert" && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Conta</Label>
                  <Select
                    value={newRule.account}
                    onValueChange={(value) =>
                      setNewRule((prev) => ({ ...prev, account: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor mínimo (alerta quando saldo ficar abaixo)</Label>
                  <CurrencyInput
                    value={newRule.amountCents}
                    onChange={(v) =>
                      setNewRule((prev) => ({
                        ...prev,
                        amountCents: v,
                      }))
                    }
                  />
                </div>
              </div>
            )}

            {newRule.type === "category_limit" && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={newRule.category}
                    onValueChange={(value) =>
                      setNewRule((prev) => ({ ...prev, category: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter((c) => c.type === "expense")
                        .map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.icon} {category.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Limite mensal (toast ao ultrapassar)</Label>
                  <CurrencyInput
                    value={newRule.amountCents}
                    onChange={(v) =>
                      setNewRule((prev) => ({
                        ...prev,
                        amountCents: v,
                      }))
                    }
                  />
                </div>
              </div>
            )}

            {newRule.type === "weekly_report" && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Dia da semana para enviar</Label>
                  <Select
                    value={String(newRule.dayOfWeek)}
                    onValueChange={(value) =>
                      setNewRule((prev) => ({
                        ...prev,
                        dayOfWeek: parseInt(value, 10),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Segunda-feira</SelectItem>
                      <SelectItem value="1">Terça-feira</SelectItem>
                      <SelectItem value="2">Quarta-feira</SelectItem>
                      <SelectItem value="3">Quinta-feira</SelectItem>
                      <SelectItem value="4">Sexta-feira</SelectItem>
                      <SelectItem value="5">Sábado</SelectItem>
                      <SelectItem value="6">Domingo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>E-mail de destino</Label>
                  <Input
                    type="email"
                    value={newRule.destinationEmail}
                    onChange={(e) =>
                      setNewRule((prev) => ({
                        ...prev,
                        destinationEmail: e.target.value,
                      }))
                    }
                    placeholder="seu@email.com"
                  />
                </div>
              </div>
            )}

            {newRule.type === "payment_reminder" && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Lembrar após (dias)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={newRule.daysAfterCreation}
                    onChange={(e) =>
                      setNewRule((prev) => ({
                        ...prev,
                        daysAfterCreation: parseInt(e.target.value, 10) || 1,
                      }))
                    }
                    placeholder="Ex: 3, 7, 15"
                  />
                  <p className="text-xs text-muted-foreground">
                    Criar notificação para você cobrar participantes X dias após criar a despesa.
                  </p>
                </div>
              </div>
            )}

            {newRule.type === "round_up" && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Caixinha destino</Label>
                  <Select
                    value={newRule.envelopeId}
                    onValueChange={(value) =>
                      setNewRule((prev) => ({ ...prev, envelopeId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a caixinha" />
                    </SelectTrigger>
                    <SelectContent>
                      {envelopes.map((env) => (
                        <SelectItem key={env.id} value={env.id}>
                          {env.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Arredondar para</Label>
                  <Select
                    value={String(newRule.roundToCents)}
                    onValueChange={(value) =>
                      setNewRule((prev) => ({
                        ...prev,
                        roundToCents: parseInt(value, 10),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">R$ 1</SelectItem>
                      <SelectItem value="500">R$ 5</SelectItem>
                      <SelectItem value="1000">R$ 10</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {(newRule.type === "budget_alert" ||
              newRule.type === "goal_reminder") && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={newRule.category}
                    onValueChange={(value) =>
                      setNewRule((prev) => ({ ...prev, category: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.icon} {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Limite</Label>
                  <CurrencyInput
                    value={newRule.amountCents}
                    onChange={(v) =>
                      setNewRule((prev) => ({
                        ...prev,
                        amountCents: v,
                      }))
                    }
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={editingRuleId ? handleUpdateRule : handleCreateRule}
                className="h-9 px-4 text-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                {editingRuleId ? "Salvar Alterações" : "Criar Automação"}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                className="h-9 px-3 text-sm"
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Automation Rules */}
      {isLoading ? (
        <Card className="bg-gradient-card shadow-card-custom">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Zap className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4 animate-pulse" />
              <p className="text-muted-foreground">Carregando automações...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {automationRules.map((rule) => {
            const Icon = getRuleTypeIcon(rule.type);

            return (
              <Card
                key={rule.id}
                className="bg-gradient-card shadow-card-custom"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-2 rounded-lg ${rule.isActive ? "bg-primary/10" : "bg-muted/50"}`}
                      >
                        <Icon
                          className={`h-5 w-5 ${rule.isActive ? "text-primary" : "text-muted-foreground"}`}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{rule.name}</h3>
                          <Badge
                            variant={rule.isActive ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {rule.isActive ? "Ativa" : "Inativa"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {getRuleTypeLabel(rule.type)}
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground">
                          {rule.description}
                        </p>

                        {rule.nextRun && (
                          <p className="text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            Próxima execução:{" "}
                            {new Date(rule.nextRun).toLocaleDateString("pt-BR")}
                          </p>
                        )}

                        {rule.lastRun && (
                          <p className="text-xs text-muted-foreground">
                            Última execução:{" "}
                            {new Date(rule.lastRun).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={() => handleToggleRule(rule.id)}
                      />

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditRule(rule.id)}
                        className="h-9 px-3 text-sm"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>

                      <ConfirmDialog
                        trigger={
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 px-3 text-sm"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        }
                        title="Remover Automação"
                        description={`Tem certeza que deseja remover a automação "${rule.name}"? Esta ação não pode ser desfeita.`}
                        confirmText="Remover"
                        onConfirm={() => handleDeleteRule(rule.id)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading && automationRules.length === 0 && (
        <Card className="bg-gradient-card shadow-card-custom">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Zap className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              Nenhuma automação configurada
            </h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              Crie regras automáticas para facilitar o gerenciamento das suas
              finanças
            </p>
            <Button
              onClick={() => setShowNewRule(true)}
              className="h-9 px-4 text-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Automação
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
