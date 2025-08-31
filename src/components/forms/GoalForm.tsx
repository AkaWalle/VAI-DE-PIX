import { useState } from 'react';
import { useFinancialStore } from '@/stores/financial-store';
import { FormDialog } from '@/components/ui/form-dialog';
import { ActionButton } from '@/components/ui/action-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Target } from 'lucide-react';

interface GoalFormData {
  name: string;
  targetAmount: string;
  targetDate: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
}

interface GoalFormProps {
  trigger?: React.ReactNode;
}

export function GoalForm({ trigger }: GoalFormProps) {
  const { addGoal } = useFinancialStore();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<GoalFormData>({
    name: '',
    targetAmount: '',
    targetDate: '',
    description: '',
    category: 'savings',
    priority: 'medium'
  });

  const defaultTrigger = (
    <ActionButton icon={Target} variant="default">
      Nova Meta
    </ActionButton>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validações
      if (!formData.name || !formData.targetAmount || !formData.targetDate) {
        toast({
          title: "Campos obrigatórios",
          description: "Por favor, preencha todos os campos obrigatórios.",
          variant: "destructive",
        });
        return;
      }

      const targetAmount = parseFloat(formData.targetAmount.replace(',', '.'));
      if (isNaN(targetAmount) || targetAmount <= 0) {
        toast({
          title: "Valor inválido",
          description: "Por favor, insira um valor válido maior que zero.",
          variant: "destructive",
        });
        return;
      }

      const targetDate = new Date(formData.targetDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (targetDate <= today) {
        toast({
          title: "Data inválida",
          description: "A data da meta deve ser posterior à data atual.",
          variant: "destructive",
        });
        return;
      }

      // Adicionar meta
      addGoal({
        name: formData.name,
        targetAmount,
        targetDate: formData.targetDate,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        status: 'active'
      });

      toast({
        title: "Meta criada!",
        description: `Meta "${formData.name}" de ${targetAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} criada com sucesso.`,
      });

      // Reset form
      setFormData({
        name: '',
        targetAmount: '',
        targetDate: '',
        description: '',
        category: 'savings',
        priority: 'medium'
      });
      
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Erro ao criar meta",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof GoalFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <FormDialog
      trigger={trigger || defaultTrigger}
      title="Nova Meta Financeira"
      description="Defina um objetivo financeiro para acompanhar seu progresso."
      onSubmit={handleSubmit}
      isLoading={isLoading}
      open={isOpen}
      onOpenChange={setIsOpen}
      submitLabel="Criar Meta"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Nome da Meta *</Label>
        <Input
          id="name"
          placeholder="Ex: Viagem para Europa"
          value={formData.name}
          onChange={(e) => updateFormData('name', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="targetAmount">Valor da Meta *</Label>
          <Input
            id="targetAmount"
            type="text"
            placeholder="0,00"
            value={formData.targetAmount}
            onChange={(e) => updateFormData('targetAmount', e.target.value)}
            className="text-right"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetDate">Data Objetivo *</Label>
          <Input
            id="targetDate"
            type="date"
            value={formData.targetDate}
            onChange={(e) => updateFormData('targetDate', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Categoria</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => updateFormData('category', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="savings">💰 Poupança</SelectItem>
              <SelectItem value="investment">📈 Investimento</SelectItem>
              <SelectItem value="travel">✈️ Viagem</SelectItem>
              <SelectItem value="house">🏠 Casa</SelectItem>
              <SelectItem value="car">🚗 Veículo</SelectItem>
              <SelectItem value="education">🎓 Educação</SelectItem>
              <SelectItem value="health">🏥 Saúde</SelectItem>
              <SelectItem value="emergency">🚨 Emergência</SelectItem>
              <SelectItem value="other">📦 Outros</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Prioridade</Label>
          <Select
            value={formData.priority}
            onValueChange={(value: 'low' | 'medium' | 'high') => updateFormData('priority', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">🟢 Baixa</SelectItem>
              <SelectItem value="medium">🟡 Média</SelectItem>
              <SelectItem value="high">🔴 Alta</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição (opcional)</Label>
        <Textarea
          id="description"
          placeholder="Descreva sua meta e como pretende alcançá-la..."
          value={formData.description}
          onChange={(e) => updateFormData('description', e.target.value)}
          rows={3}
        />
      </div>
    </FormDialog>
  );
}
