import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/utils/format";
import { parseCurrencyInput } from "@/utils/currency";
import { DollarSign, Plus, Trash2, UserPlus, Users } from "lucide-react";
import type {
  Participant,
  SharedExpenseSplitType,
} from "./sharedExpense.types";

type ParticipantsListProps = {
  participants: Participant[];
  splitType: SharedExpenseSplitType;
  onAddParticipant: (participant: Participant) => void;
  onRemoveParticipant: (index: number) => void;
  onUpdateParticipantAmount: (index: number, amount: number) => void;
  error?: string;
};

export function ParticipantsList({
  participants,
  splitType,
  onAddParticipant,
  onRemoveParticipant,
  onUpdateParticipantAmount,
  error,
}: ParticipantsListProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleAdd = () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) return;

    onAddParticipant({
      userName: trimmedName,
      userEmail: trimmedEmail,
      amount: 0,
      paid: false,
    });

    setName("");
    setEmail("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <UserPlus className="h-4 w-4" />
        <Label>Participantes</Label>
      </div>

      {participants.length > 1 && (
        <p className="text-xs text-muted-foreground">
          O e-mail identifica a pessoa. A despesa sera criada com os mesmos
          contratos atuais do backend.
        </p>
      )}

      <div className="grid gap-2 md:grid-cols-3">
        <Input
          aria-label="Nome do participante"
          placeholder="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-h-[44px] w-full"
        />
        <Input
          aria-label="Email do participante"
          placeholder="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-h-[44px] w-full"
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleAdd}
          className="min-h-[44px] touch-manipulation"
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar
        </Button>
      </div>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <Label>Lista de participantes ({participants.length})</Label>
        </div>

        {participants.map((participant, index) => (
          <div
            key={`${participant.userEmail}-${index}`}
            className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center"
          >
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">{participant.userName}</p>
              <p className="truncate text-sm text-muted-foreground">
                {participant.userEmail}
              </p>
            </div>

            <div className="flex w-full items-center gap-2 md:w-auto">
              <div className="relative flex-1 md:flex-none">
                <DollarSign className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  inputMode="decimal"
                  value={
                    participant.amount === 0
                      ? ""
                      : formatCurrency(participant.amount, {
                          showSign: false,
                        })
                  }
                  onChange={(e) =>
                    onUpdateParticipantAmount(
                      index,
                      parseCurrencyInput(e.target.value),
                    )
                  }
                  className="min-h-[44px] w-full pl-6 text-sm md:w-28"
                  disabled={splitType === "equal"}
                  aria-label={`Valor do participante ${participant.userName}`}
                />
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemoveParticipant(index)}
                aria-label={`Remover participante ${participant.userName}`}
                className="min-h-[44px] shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
