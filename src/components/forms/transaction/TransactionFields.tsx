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

type TransactionFieldsProps = {
  type: "income" | "expense";
  amountCents: number;
  description: string;
  category: string;
  account: string;
  date: string;
  tags: string;
  categories: Array<{
    id: string;
    name: string;
    type: "income" | "expense";
    icon: string;
  }>;
  accounts: Array<{
    id: string;
    name: string;
  }>;
  onTypeChange: (value: "income" | "expense") => void;
  onAmountChange: (value: number) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onAccountChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onTagsChange: (value: string) => void;
  errors?: {
    type?: string;
    amountCents?: string;
    description?: string;
    category?: string;
    account?: string;
    date?: string;
    tags?: string;
  };
};

export function TransactionFields({
  type,
  amountCents,
  description,
  category,
  account,
  date,
  tags,
  categories,
  accounts,
  onTypeChange,
  onAmountChange,
  onDescriptionChange,
  onCategoryChange,
  onAccountChange,
  onDateChange,
  onTagsChange,
  errors,
}: TransactionFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="type">Tipo *</Label>
          <Select value={type} onValueChange={onTypeChange}>
            <SelectTrigger
              id="type"
              className="min-h-[44px] w-full"
              aria-invalid={Boolean(errors?.type)}
            >
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="income">💰 Receita</SelectItem>
              <SelectItem value="expense">💸 Despesa</SelectItem>
            </SelectContent>
          </Select>
          {errors?.type && (
            <p className="text-xs text-destructive" role="alert">
              {errors.type}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Valor *</Label>
          <CurrencyInput
            id="amount"
            value={amountCents}
            onChange={onAmountChange}
            placeholder="0,00"
            className="min-h-[44px] w-full"
            aria-invalid={Boolean(errors?.amountCents)}
          />
          {errors?.amountCents && (
            <p className="text-xs text-destructive" role="alert">
              {errors.amountCents}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição *</Label>
        <Input
          id="description"
          placeholder="Ex: Compra no supermercado"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className="min-h-[44px] w-full"
          aria-invalid={Boolean(errors?.description)}
        />
        {errors?.description && (
          <p className="text-xs text-destructive" role="alert">
            {errors.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Categoria *</Label>
          <Select value={category} onValueChange={onCategoryChange}>
            <SelectTrigger
              id="category"
              className="min-h-[44px] w-full"
              aria-invalid={Boolean(errors?.category)}
            >
              <SelectValue placeholder="Selecione a categoria" />
            </SelectTrigger>
            <SelectContent>
              {categories
                .filter((item) => item.type === type)
                .map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.icon} {item.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {errors?.category && (
            <p className="text-xs text-destructive" role="alert">
              {errors.category}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="account">Conta *</Label>
          <Select value={account} onValueChange={onAccountChange}>
            <SelectTrigger
              id="account"
              className="min-h-[44px] w-full"
              aria-invalid={Boolean(errors?.account)}
            >
              <SelectValue placeholder="Selecione a conta" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors?.account && (
            <p className="text-xs text-destructive" role="alert">
              {errors.account}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Data *</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="min-h-[44px] w-full"
          aria-invalid={Boolean(errors?.date)}
        />
        {errors?.date && (
          <p className="text-xs text-destructive" role="alert">
            {errors.date}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags (opcional)</Label>
        <Input
          id="tags"
          placeholder="Ex: supermercado, alimentação, casa"
          value={tags}
          onChange={(e) => onTagsChange(e.target.value)}
          className="min-h-[44px] w-full"
          aria-invalid={Boolean(errors?.tags)}
        />
        {errors?.tags && (
          <p className="text-xs text-destructive" role="alert">
            {errors.tags}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Separe as tags por vírgula
        </p>
      </div>
    </>
  );
}
