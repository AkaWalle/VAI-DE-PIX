import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store-index";
import { useFinancialStore } from "@/stores/financial-store";
import {
  getInsightPreferences,
  patchInsightPreferences,
  type InsightPreferences,
} from "@/services/insights.service";
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/ui/action-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";
import { formatCurrency } from "@/utils/format";
import {
  User,
  Palette,
  Database,
  Shield,
  Download,
  Trash2,
  Plus,
  Save,
  Lightbulb,
} from "lucide-react";
import { accountsService } from "@/services/accounts.service";
import { Switch } from "@/components/ui/switch";

export default function Settings() {
  const { user, updateProfile } = useAuthStore();
  const { categories, accounts, addAccount, addCategory, setAccounts } =
    useFinancialStore();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });

  const [newAccount, setNewAccount] = useState({
    name: "",
    type: "checking" as const,
    balanceCents: 0,
  });

  const [newCategory, setNewCategory] = useState({
    name: "",
    type: "expense" as const,
    color: "#3b82f6",
  });

  const [showNewAccount, setShowNewAccount] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);

  const [insightPrefs, setInsightPrefs] = useState<InsightPreferences | null>(
    null
  );
  const [insightPrefsLoading, setInsightPrefsLoading] = useState(false);

  useEffect(() => {
    getInsightPreferences()
      .then(setInsightPrefs)
      .catch(() => setInsightPrefs(null));
  }, []);

  const handleInsightPrefChange = async (
    key: keyof InsightPreferences,
    value: boolean
  ) => {
    if (insightPrefsLoading || insightPrefs === null) return;
    setInsightPrefsLoading(true);
    try {
      const updated = await patchInsightPreferences({ [key]: value });
      setInsightPrefs(updated);
      toast({
        title: "Preferências salvas",
        description: "As preferências de insights foram atualizadas.",
      });
    } catch {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar as preferências.",
        variant: "destructive",
      });
    } finally {
      setInsightPrefsLoading(false);
    }
  };

  const categoryColors = [
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
  ];

  const accountTypeLabels: Record<
    "checking" | "savings" | "investment" | "credit" | "cash" | "refeicao" | "alimentacao",
    string
  > = {
    checking: "Conta Corrente",
    savings: "Poupança",
    investment: "Investimento",
    credit: "Cartão de Crédito",
    cash: "Dinheiro",
    refeicao: "Refeição",
    alimentacao: "Alimentação",
  };

  const storeAccountTypeLabels: Record<
    "bank" | "cash" | "card" | "refeicao" | "alimentacao",
    string
  > = {
    bank: "Conta bancária",
    cash: "Dinheiro",
    card: "Cartão de Crédito",
    refeicao: "Refeição",
    alimentacao: "Alimentação",
  };

  const handleUpdateProfile = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      updateProfile({
        name: profileForm.name,
        email: profileForm.email,
      });
      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso.",
      });
    } catch {
      toast({
        title: "Erro ao atualizar perfil",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const apiTypeToStoreType = (
    t: "checking" | "savings" | "investment" | "credit" | "cash" | "refeicao" | "alimentacao"
  ): "bank" | "cash" | "card" | "refeicao" | "alimentacao" => {
    if (t === "credit") return "card";
    if (t === "cash" || t === "refeicao" || t === "alimentacao") return t;
    return "bank";
  };

  const handleAddAccount = () => {
    if (!newAccount.name) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira o nome da conta.",
        variant: "destructive",
      });
      return;
    }

    // Store/API de contas ainda esperam saldo em reais (float)
    const balanceReais = newAccount.balanceCents / 100;

    addAccount({
      name: newAccount.name,
      type: apiTypeToStoreType(newAccount.type),
      balance: balanceReais,
    });

    toast({
      title: "Conta adicionada!",
      description: `A conta "${newAccount.name}" foi criada com sucesso.`,
    });

    setNewAccount({ name: "", type: "checking", balanceCents: 0 });
    setShowNewAccount(false);
  };

  const handleDeleteAccount = async (accountId: string, accountName: string) => {
    try {
      await accountsService.deleteAccount(accountId);
      const loaded = await accountsService.getAccounts();
      setAccounts(accountsService.mapApiAccountsToStore(loaded));
      toast({
        title: "Conta excluída",
        description: `"${accountName}" foi removida da lista.`,
      });
    } catch {
      toast({
        title: "Erro ao excluir conta",
        description: "Não foi possível excluir a conta. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleAddCategory = () => {
    if (!newCategory.name) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira o nome da categoria.",
        variant: "destructive",
      });
      return;
    }

    addCategory({
      name: newCategory.name,
      type: newCategory.type,
      color: newCategory.color,
      icon: "💰", // Ícone padrão
    });

    toast({
      title: "Categoria adicionada!",
      description: `A categoria "${newCategory.name}" foi criada com sucesso.`,
    });

    setNewCategory({ name: "", type: "expense", color: "#3b82f6" });
    setShowNewCategory(false);
  };

  const handleExportData = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const exportData = {
        user: user,
        accounts: accounts,
        categories: categories,
        exportDate: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `backup-vai-de-pix-${new Date().toISOString().split("T")[0]}.json`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Backup criado!",
        description: "Seus dados foram exportados com sucesso.",
      });
    } catch {
      toast({
        title: "Erro no backup",
        description: "Ocorreu um erro ao exportar os dados.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie suas preferências e configurações do sistema
        </p>
      </div>

      {/* Profile Settings */}
      <Card className="bg-gradient-card shadow-card-custom">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Perfil do Usuário
          </CardTitle>
          <CardDescription>Atualize suas informações pessoais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                value={profileForm.name}
                onChange={(e) =>
                  setProfileForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Seu nome"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profileForm.email}
                onChange={(e) =>
                  setProfileForm((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="seu@email.com"
              />
            </div>
          </div>
          <ActionButton
            onClick={handleUpdateProfile}
            loading={isLoading}
            loadingText="Salvando..."
            icon={Save}
            className="h-9 px-3 text-sm"
          >
            Salvar Alterações
          </ActionButton>
        </CardContent>
      </Card>

      {/* Insight Preferences */}
      {insightPrefs !== null && (
        <Card className="bg-gradient-card shadow-card-custom">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Insights no Dashboard
            </CardTitle>
            <CardDescription>
              Escolha quais insights exibir no dashboard (variação por categoria
              e metas em risco)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Variação por categoria</Label>
                <p className="text-sm text-muted-foreground">
                  Este mês vs mês anterior (despesas por categoria)
                </p>
              </div>
              <Switch
                checked={insightPrefs.enable_category_variation}
                onCheckedChange={(checked) =>
                  handleInsightPrefChange("enable_category_variation", checked)
                }
                disabled={insightPrefsLoading}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Metas em risco</Label>
                <p className="text-sm text-muted-foreground">
                  Metas que podem não ser atingidas no prazo
                </p>
              </div>
              <Switch
                checked={insightPrefs.enable_goals_at_risk}
                onCheckedChange={(checked) =>
                  handleInsightPrefChange("enable_goals_at_risk", checked)
                }
                disabled={insightPrefsLoading}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Appearance Settings */}
      <Card className="bg-gradient-card shadow-card-custom">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Aparência
          </CardTitle>
          <CardDescription>Personalize a aparência do sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Tema</Label>
              <p className="text-sm text-muted-foreground">
                Escolha entre tema claro ou escuro
              </p>
            </div>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">🌞 Claro</SelectItem>
                <SelectItem value="dark">🌙 Escuro</SelectItem>
                <SelectItem value="system">💻 Sistema</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Management */}
      <Card className="bg-gradient-card shadow-card-custom">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Gerenciar Contas
          </CardTitle>
          <CardDescription>
            Configure suas contas bancárias e cartões
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {accounts.length} conta(s) configurada(s)
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewAccount(!showNewAccount)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta
            </Button>
          </div>

          {showNewAccount && (
            <Card className="border-dashed">
              <CardContent className="pt-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Nome da Conta</Label>
                    <Input
                      value={newAccount.name}
                      onChange={(e) =>
                        setNewAccount((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Ex: Conta Corrente"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={newAccount.type}
                      onValueChange={(value: string) =>
                        setNewAccount((prev) => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checking">Conta Corrente</SelectItem>
                        <SelectItem value="savings">Poupança</SelectItem>
                        <SelectItem value="investment">Investimento</SelectItem>
                        <SelectItem value="credit">
                          Cartão de Crédito
                        </SelectItem>
                        <SelectItem value="cash">Dinheiro</SelectItem>
                        <SelectItem value="refeicao">Refeição</SelectItem>
                        <SelectItem value="alimentacao">Alimentação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Saldo Inicial</Label>
                    <CurrencyInput
                      value={newAccount.balanceCents}
                      onChange={(v) =>
                        setNewAccount((prev) => ({
                          ...prev,
                          balanceCents: v,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <Button
                    onClick={handleAddAccount}
                    size="sm"
                    className="h-9 px-4 text-sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewAccount(false)}
                    className="h-9 px-3 text-sm"
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {account.type === "bank"
                      ? "🏦"
                      : account.type === "cash"
                        ? "💰"
                        : account.type === "card"
                          ? "💳"
                          : account.type === "refeicao"
                            ? "🍽️"
                            : account.type === "alimentacao"
                              ? "🛒"
                              : "🏦"}
                  </div>
                  <div>
                    <p className="font-medium">{account.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {
                        storeAccountTypeLabels[
                          account.type as keyof typeof storeAccountTypeLabels
                        ]
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(account.balance)}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {account.type}
                    </Badge>
                  </div>
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    }
                    title="Excluir conta"
                    description={`Tem certeza que deseja excluir a conta "${account.name}"? Ela não aparecerá mais na lista, mas os dados permanecerão no sistema.`}
                    confirmText="Excluir"
                    onConfirm={() => handleDeleteAccount(account.id, account.name)}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Categories Management */}
      <Card className="bg-gradient-card shadow-card-custom">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Gerenciar Categorias
          </CardTitle>
          <CardDescription>
            Configure as categorias de receitas e despesas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {categories.length} categoria(s) configurada(s)
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewCategory(!showNewCategory)}
              className="h-9 px-3 text-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          </div>

          {showNewCategory && (
            <Card className="border-dashed">
              <CardContent className="pt-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input
                      value={newCategory.name}
                      onChange={(e) =>
                        setNewCategory((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Ex: Alimentação"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={newCategory.type}
                      onValueChange={(value: string) =>
                        setNewCategory((prev) => ({ ...prev, type: value }))
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
                    <Label>Cor</Label>
                    <div className="flex gap-1">
                      {categoryColors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 ${
                            newCategory.color === color
                              ? "border-primary"
                              : "border-transparent"
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() =>
                            setNewCategory((prev) => ({ ...prev, color }))
                          }
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <Button
                    onClick={handleAddCategory}
                    size="sm"
                    className="h-9 px-4 text-sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewCategory(false)}
                    className="h-9 px-3 text-sm"
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-2 md:grid-cols-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="text-xl">{category.icon}</div>
                  <div>
                    <p className="font-medium">{category.name}</p>
                    <Badge
                      variant={
                        category.type === "income" ? "default" : "secondary"
                      }
                      className="text-xs"
                    >
                      {category.type === "income" ? "Receita" : "Despesa"}
                    </Badge>
                  </div>
                </div>
                <div
                  className="w-4 h-4 rounded-full border"
                  style={{ backgroundColor: category.color }}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="bg-gradient-card shadow-card-custom">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Dados e Segurança
          </CardTitle>
          <CardDescription>
            Gerencie seus dados e configurações de segurança
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Backup dos Dados</Label>
              <p className="text-sm text-muted-foreground">
                Exporte todos os seus dados financeiros
              </p>
            </div>
            <ActionButton
              variant="outline"
              onClick={handleExportData}
              loading={isLoading}
              loadingText="Exportando..."
              icon={Download}
              className="h-9 px-3 text-sm"
            >
              Fazer Backup
            </ActionButton>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-destructive">Zona de Perigo</Label>
              <p className="text-sm text-muted-foreground">
                Ações irreversíveis que afetam seus dados
              </p>
            </div>
            <ConfirmDialog
              trigger={
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-9 px-3 text-sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar Dados
                </Button>
              }
              title="Limpar todos os dados"
              description="Esta ação irá remover TODOS os seus dados financeiros permanentemente. Esta ação não pode ser desfeita."
              confirmText="Limpar Tudo"
              onConfirm={() => {
                toast({
                  title: "Funcionalidade protegida",
                  description:
                    "Esta funcionalidade está desabilitada para proteger seus dados.",
                  variant: "destructive",
                });
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
