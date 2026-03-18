import type {
  Participant,
  SharedExpenseState,
  SharedExpenseSplitType,
  SplitValidation,
} from "@/components/forms/transaction/sharedExpense.types";

export type { Participant, SharedExpenseState, SharedExpenseSplitType, SplitValidation };

export type TransactionFormState = {
  type: "income" | "expense";
  amountCents: number;
  description: string;
  category: string;
  account: string;
  date: string;
  tags: string;
  sharedExpense: SharedExpenseState;
};

export type TransactionFieldKey = Exclude<
  keyof TransactionFormState,
  "sharedExpense"
>;

export type TransactionFieldValue = TransactionFormState[TransactionFieldKey];

export type TransactionFieldUpdate = {
  field: TransactionFieldKey;
  value: TransactionFieldValue;
};
