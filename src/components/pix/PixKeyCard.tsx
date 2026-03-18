import * as React from "react";
import {
  AtSign,
  Hash,
  IdCard,
  Mail,
  Phone,
  KeyRound,
  Copy,
  Trash2,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PixKeyType = "cpf" | "cnpj" | "email" | "phone" | "random";

export interface PixKeyCardProps {
  keyType: PixKeyType;
  keyValue: string;
  isDefault?: boolean;
  onCopy: (value: string) => void;
  onRemove?: () => void;
  className?: string;
}

function getKeyTypeIcon(type: PixKeyType) {
  switch (type) {
    case "cpf":
    case "cnpj":
      return IdCard;
    case "email":
      return Mail;
    case "phone":
      return Phone;
    case "random":
      return KeyRound;
    default:
      return AtSign;
  }
}

function getKeyTypeLabel(type: PixKeyType): string {
  switch (type) {
    case "cpf":
      return "CPF";
    case "cnpj":
      return "CNPJ";
    case "email":
      return "E-mail";
    case "phone":
      return "Telefone";
    case "random":
      return "Chave aleatória";
    default:
      return "Chave PIX";
  }
}

export const PixKeyCard: React.FC<PixKeyCardProps> = ({
  keyType,
  keyValue,
  isDefault = false,
  onCopy,
  onRemove,
  className,
}) => {
  const Icon = getKeyTypeIcon(keyType);

  return (
    <Card
      className={cn(
        "border border-border/60 bg-card/80 shadow-sm",
        className,
      )}
    >
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">
              {getKeyTypeLabel(keyType)}
            </span>
            {isDefault && (
              <Badge className="bg-success text-success-foreground border-success/40">
                Principal
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground break-all">{keyValue}</p>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Copiar chave PIX"
            onClick={() => onCopy(keyValue)}
          >
            <Copy className="h-4 w-4" />
          </Button>
          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remover chave PIX"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

