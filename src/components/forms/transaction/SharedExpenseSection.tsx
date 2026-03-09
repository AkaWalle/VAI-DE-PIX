import { SplitTypeSelector } from "./SplitTypeSelector";
import { ParticipantsList } from "./ParticipantsList";
import { SplitSummary } from "./SplitSummary";
import type {
  Participant,
  SharedExpenseSplitType,
  SplitValidation,
} from "./sharedExpense.types";

type SharedExpenseSectionProps = {
  totalCents: number;
  splitType: SharedExpenseSplitType;
  participants: Participant[];
  validation: SplitValidation;
  splitTypeError?: string;
  participantsError?: string;
  onSplitTypeChange: (value: SharedExpenseSplitType) => void;
  onAddParticipant: (participant: Participant) => void;
  onRemoveParticipant: (index: number) => void;
  onUpdateParticipantAmount: (index: number, amount: number) => void;
};

export function SharedExpenseSection({
  totalCents,
  splitType,
  participants,
  validation,
  splitTypeError,
  participantsError,
  onSplitTypeChange,
  onAddParticipant,
  onRemoveParticipant,
  onUpdateParticipantAmount,
}: SharedExpenseSectionProps) {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="space-y-1">
        <h3 className="font-semibold">Divisao da despesa</h3>
        <p className="text-xs text-muted-foreground">
          Configure como a despesa sera compartilhada sem alterar o fluxo
          principal da transacao.
        </p>
      </div>

      <SplitTypeSelector
        value={splitType}
        onChange={onSplitTypeChange}
        error={splitTypeError}
      />

      <ParticipantsList
        participants={participants}
        splitType={splitType}
        error={participantsError}
        onAddParticipant={onAddParticipant}
        onRemoveParticipant={onRemoveParticipant}
        onUpdateParticipantAmount={onUpdateParticipantAmount}
      />

      <SplitSummary totalCents={totalCents} validation={validation} />
    </div>
  );
}
