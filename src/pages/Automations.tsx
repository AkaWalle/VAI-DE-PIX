import { useState } from 'react';
import { useFinancialStore } from '@/stores/financial-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ActionButton } from '@/components/ui/action-button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Zap, 
  Plus, 
  Calendar, 
  DollarSign,
  Target,
  Bell,
  Webhook,
  Play,
  Pause,
  Trash2,
  Settings,
  AlertCircle
} from 'lucide-react';

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  type: 'recurring_transaction' | 'budget_alert' | 'goal_reminder' | 'webhook';
  isActive: boolean;
  conditions: {
    trigger: string;
    frequency?: string;
    amount?: number;
    category?: string;
    account?: string;
  };
  actions: {
    type: string;
    value: string;
  };
  lastRun?: string;
  nextRun?: string;
}

export default function Automations() {
  const { categories, accounts } = useFinancialStore();
  const { toast } = useToast();
  
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([
    {
      id: '1',
      name: 'Salário Mensal',
      description: 'Adiciona automaticamente o salário todo dia 5',
      type: 'recurring_transaction',
      isActive: true,
      conditions: {
        trigger: 'monthly',
        frequency: '5',
        amount: 5000,
        category: '1',
        account: '1'
      },
      actions: {
        type: 'add_transaction',
        value: 'income'
      },
      lastRun: '2024-01-05',
      nextRun: '2024-02-05'
    },
    {
      id: '2',
      name: 'Alerta de Orçamento',
      description: 'Notifica quando gastos em alimentação excedem R$ 800',
      type: 'budget_alert',
      isActive: true,
      conditions: {
        trigger: 'budget_exceeded',
        amount: 800,
        category: '3'
      },
      actions: {
        type: 'notification',
        value: 'push'
      }
    },
    {
      id: '3',
      name: 'Lembrete de Meta',
      description: 'Lembra de contribuir para a meta de viagem semanalmente',
      type: 'goal_reminder',
      isActive: false,
      conditions: {
        trigger: 'weekly',
        frequency: 'monday'
      },
      actions: {
        type: 'reminder',
        value: 'goal_contribution'
      },
      nextRun: '2024-02-12'
    }
  ]);

  const [showNewRule, setShowNewRule] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    type: 'recurring_transaction' as const,
    trigger: 'monthly',
    frequency: '',
    amount: '',
    category: '',
    account: '',
    actionType: 'add_transaction',
    actionValue: 'income'
  });

  const handleToggleRule = (ruleId: string) => {
    setAutomationRules(prev => 
      prev.map(rule => 
        rule.id === ruleId 
          ? { ...rule, isActive: !rule.isActive }
          : rule
      )
    );
    
    const rule = automationRules.find(r => r.id === ruleId);
    toast({
      title: rule?.isActive ? "Automação desativada" : "Automação ativada",
      description: `A regra "${rule?.name}" foi ${rule?.isActive ? 'desativada' : 'ativada'}.`,
    });
  };

  const handleDeleteRule = (ruleId: string) => {
    const rule = automationRules.find(r => r.id === ruleId);
    setAutomationRules(prev => prev.filter(r => r.id !== ruleId));
    
    toast({
      title: "Automação removida",
      description: `A regra "${rule?.name}" foi removida com sucesso.`,
    });
  };

  const handleCreateRule = () => {
    if (!newRule.name || !newRule.description) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha nome e descrição.",
        variant: "destructive",
      });
      return;
    }

    const rule: AutomationRule = {
      id: Date.now().toString(),
      name: newRule.name,
      description: newRule.description,
      type: newRule.type,
      isActive: false,
      conditions: {
        trigger: newRule.trigger,
        frequency: newRule.frequency || undefined,
        amount: newRule.amount ? parseFloat(newRule.amount) : undefined,
        category: newRule.category || undefined,
        account: newRule.account || undefined
      },
      actions: {
        type: newRule.actionType,
        value: newRule.actionValue
      }
    };

    setAutomationRules(prev => [...prev, rule]);
    
    toast({
      title: "Automação criada!",
      description: `A regra "${rule.name}" foi criada com sucesso.`,
    });

    setNewRule({
      name: '',
      description: '',
      type: 'recurring_transaction',
      trigger: 'monthly',
      frequency: '',
      amount: '',
      category: '',
      account: '',
      actionType: 'add_transaction',
      actionValue: 'income'
    });
    setShowNewRule(false);
  };

  const getRuleTypeIcon = (type: string) => {
    switch (type) {
      case 'recurring_transaction': return Calendar;
      case 'budget_alert': return AlertCircle;
      case 'goal_reminder': return Target;
      case 'webhook': return Webhook;
      default: return Zap;
    }
  };

  const getRuleTypeLabel = (type: string) => {
    switch (type) {
      case 'recurring_transaction': return 'Transação Recorrente';
      case 'budget_alert': return 'Alerta de Orçamento';
      case 'goal_reminder': return 'Lembrete de Meta';
      case 'webhook': return 'Webhook';
      default: return 'Automação';
    }
  };

  const activeRules = automationRules.filter(rule => rule.isActive).length;
  const totalRules = automationRules.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Automações</h1>
          <p className="text-muted-foreground">
            Configure regras automáticas para seus dados financeiros
          </p>
        </div>
        <Button onClick={() => setShowNewRule(!showNewRule)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Automação
        </Button>
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
            <p className="text-xs text-muted-foreground">Executando automaticamente</p>
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
            <div className="text-2xl font-bold text-muted-foreground">{totalRules - activeRules}</div>
            <p className="text-xs text-muted-foreground">Pausadas ou desabilitadas</p>
          </CardContent>
        </Card>
      </div>

      {/* New Rule Form */}
      {showNewRule && (
        <Card className="bg-gradient-card shadow-card-custom border-dashed">
          <CardHeader>
            <CardTitle>Nova Automação</CardTitle>
            <CardDescription>
              Configure uma nova regra de automação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome da Regra</Label>
                <Input
                  value={newRule.name}
                  onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Salário Mensal"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={newRule.type}
                  onValueChange={(value: any) => setNewRule(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recurring_transaction">📅 Transação Recorrente</SelectItem>
                    <SelectItem value="budget_alert">⚠️ Alerta de Orçamento</SelectItem>
                    <SelectItem value="goal_reminder">🎯 Lembrete de Meta</SelectItem>
                    <SelectItem value="webhook">🔗 Webhook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={newRule.description}
                onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva o que esta automação faz"
              />
            </div>

            {newRule.type === 'recurring_transaction' && (
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select
                    value={newRule.trigger}
                    onValueChange={(value) => setNewRule(prev => ({ ...prev, trigger: value }))}
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
                  <Label>Dia/Data</Label>
                  <Input
                    value={newRule.frequency}
                    onChange={(e) => setNewRule(prev => ({ ...prev, frequency: e.target.value }))}
                    placeholder="Ex: 5 (dia 5)"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input
                    value={newRule.amount}
                    onChange={(e) => setNewRule(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0,00"
                    className="text-right"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={newRule.actionValue}
                    onValueChange={(value) => setNewRule(prev => ({ ...prev, actionValue: value }))}
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
              </div>
            )}

            {(newRule.type === 'budget_alert' || newRule.type === 'goal_reminder') && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={newRule.category}
                    onValueChange={(value) => setNewRule(prev => ({ ...prev, category: value }))}
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
                  <Input
                    value={newRule.amount}
                    onChange={(e) => setNewRule(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="800,00"
                    className="text-right"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleCreateRule}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Automação
              </Button>
              <Button variant="outline" onClick={() => setShowNewRule(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Automation Rules */}
      <div className="space-y-4">
        {automationRules.map((rule) => {
          const Icon = getRuleTypeIcon(rule.type);
          
          return (
            <Card key={rule.id} className="bg-gradient-card shadow-card-custom">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${rule.isActive ? 'bg-primary/10' : 'bg-muted/50'}`}>
                      <Icon className={`h-5 w-5 ${rule.isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{rule.name}</h3>
                        <Badge variant={rule.isActive ? 'default' : 'secondary'} className="text-xs">
                          {rule.isActive ? 'Ativa' : 'Inativa'}
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
                          Próxima execução: {new Date(rule.nextRun).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                      
                      {rule.lastRun && (
                        <p className="text-xs text-muted-foreground">
                          Última execução: {new Date(rule.lastRun).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={() => handleToggleRule(rule.id)}
                    />
                    
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                    
                    <ConfirmDialog
                      trigger={
                        <Button variant="outline" size="sm">
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

      {automationRules.length === 0 && (
        <Card className="bg-gradient-card shadow-card-custom">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Zap className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma automação configurada</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              Crie regras automáticas para facilitar o gerenciamento das suas finanças
            </p>
            <Button onClick={() => setShowNewRule(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Automação
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}