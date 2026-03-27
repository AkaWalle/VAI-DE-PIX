import { useMemo } from "react";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CategoryVisualPicker } from "./CategoryVisualPicker";

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
    color?: string;
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
  const parsedDate = useMemo(() => {
    if (!date?.trim()) return undefined;
    const d = parseISO(date);
    return isValid(d) ? d : undefined;
  }, [date]);

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:gap-8 lg:items-start">
      {/* Coluna esquerda — tipo, valor em destaque, data, descrição */}
      <div className="space-y-4">
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
              <SelectItem value="income">Receita</SelectItem>
              <SelectItem value="expense">Despesa</SelectItem>
            </SelectContent>
          </Select>
          {errors?.type && (
            <p className="text-xs text-destructive" role="alert">
              {errors.type}
            </p>
          )}
        </div>

        <div
          className={cn(
            "rounded-xl border-2 border-primary/35 bg-gradient-to-br from-primary/10 via-card to-card p-4 shadow-sm",
            type === "expense" && "border-expense/30 from-expense/5",
            type === "income" && "border-income/30 from-income/5",
          )}
        >
          <Label htmlFor="amount" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Valor *
          </Label>
          <CurrencyInput
            id="amount"
            value={amountCents}
            onChange={onAmountChange}
            placeholder="0,00"
            className="mt-2 min-h-[52px] w-full border-2 bg-background/80 text-xl font-bold tracking-tight sm:text-2xl"
            aria-invalid={Boolean(errors?.amountCents)}
          />
          {errors?.amountCents && (
            <p className="mt-1 text-xs text-destructive" role="alert">
              {errors.amountCents}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Data *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "min-h-[44px] w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground",
                )}
                aria-invalid={Boolean(errors?.date)}
              >
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                {parsedDate ? (
                  format(parsedDate, "PPP", { locale: ptBR })
                ) : (
                  <span>Escolher data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={parsedDate}
                onSelect={(d) => {
                  if (d) onDateChange(format(d, "yyyy-MM-dd"));
                }}
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {errors?.date && (
            <p className="text-xs text-destructive" role="alert">
              {errors.date}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição *</Label>
          <Input
            id="description"
            placeholder="Ex.: Compra no supermercado"
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
      </div>

      {/* Coluna direita — categoria visual, conta, tags */}
      <div className="space-y-4">
        <CategoryVisualPicker
          type={type}
          value={category}
          categories={categories}
          onChange={onCategoryChange}
          error={errors?.category}
        />

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

        <div className="space-y-2">
          <Label htmlFor="tags">Tags (opcional)</Label>
          <Input
            id="tags"
            placeholder="Ex.: supermercado, alimentação"
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
      </div>
    </div>
  );
}
