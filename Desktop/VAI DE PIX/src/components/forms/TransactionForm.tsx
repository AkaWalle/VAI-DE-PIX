import { useState } from 'react';
import { useFinancialStore } from '@/stores/financial-store';
import { FormDialog } from '@/components/ui/form-dialog';
import { ActionButton } from '@/components/ui/action-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

interface TransactionFormData {
  type: 'income' | 'expense';
  amount: string;
  description: string;
  category: string;
  account: string;
  date: string;
  tags: string;
}

interface TransactionFormProps {
  trigger?: React.ReactNode;
}

export function TransactionForm({ trigger }: TransactionFormProps) {
  const { addTransaction, categories, accounts } = useFinancialStore();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<TransactionFormData>({
    type: 'expense',
    amount: '',
    description: '',
    category: '',
    account: '',
    date: new Date().toISOString().split('T')[0],
    tags: ''
  });

  const defaultTrigger = (
    <ActionButton icon={Plus} variant="default">
      Nova Transação
    </ActionButton>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validações
      if (!formData.amount || !formData.description || !formData.category || !formData.account) {
        toast({
          title: "Campos obrigatórios",
          description: "Por favor, preencha todos os campos obrigatórios.",
          variant: "destructive",
        });
        return;
      }

      const amount = parseFloat(formData.amount.replace(',', '.'));
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Valor inválido",
          description: "Por favor, insira um valor válido maior que zero.",
          variant: "destructive",
        });
        return;
      }

      // Adicionar transação
      addTransaction({
        type: formData.type,
        amount: formData.type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
        description: formData.description,
        category: formData.category,
        account: formData.account,
        date: formData.date,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
      });

      toast({
        title: "Transação criada!",
        description: `${formData.type === 'income' ? 'Receita' : 'Despesa'} de ${amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} adicionada com sucesso.`,
      });

      // Reset form
      setFormData({
        type: 'expense',
        amount: '',
        description: '',
        category: '',
        account: '',
        date: new Date().toISOString().split('T')[0],
        tags: ''
      });
      
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Erro ao criar transação",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof TransactionFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <FormDialog
      trigger={trigger || defaultTrigger}
      title="Nova Transação"
      description="Adicione uma nova receita ou despesa ao seu controle financeiro."
      onSubmit={handleSubmit}
      isLoading={isLoading}
      open={isOpen}
      onOpenChange={setIsOpen}
      submitLabel="Criar Transação"
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Tipo *</Label>
          <Select
            value={formData.type}
            onValueChange={(value: 'income' | 'expense') => updateFormData('type', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="income">💰 Receita</SelectItem>
              <SelectItem value="expense">💸 Despesa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Valor *</Label>
          <Input
            id="amount"
            type="text"
            placeholder="0,00"
            value={formData.amount}
            onChange={(e) => updateFormData('amount', e.target.value)}
            className="text-right"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição *</Label>
        <Input
          id="description"
          placeholder="Ex: Compra no supermercado"
          value={formData.description}
          onChange={(e) => updateFormData('description', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Categoria *</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => updateFormData('category', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a categoria" />
            </SelectTrigger>
            <SelectContent>
              {categories
                .filter(cat => cat.type === formData.type)
                .map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="account">Conta *</Label>
          <Select
            value={formData.account}
            onValueChange={(value) => updateFormData('account', value)}
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

      <div className="space-y-2">
        <Label htmlFor="date">Data</Label>
        <Input
          id="date"
          type="date"
          value={formData.date}
          onChange={(e) => updateFormData('date', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags (opcional)</Label>
        <Input
          id="tags"
          placeholder="Ex: supermercado, alimentação, casa"
          value={formData.tags}
          onChange={(e) => updateFormData('tags', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Separe as tags por vírgula
        </p>
      </div>
    </FormDialog>
  );
}
