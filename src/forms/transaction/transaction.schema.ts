import type { TransactionFormState } from "./transaction.types";

function getCurrentDate(): string {
  return new Date().toISOString().split("T")[0];
}

export function createTransactionInitialState(): TransactionFormState {
  return {
    type: "expense",
    amountCents: 0,
    description: "",
    category: "",
    account: "",
    date: getCurrentDate(),
    tags: "",
    sharedExpense: {
      enabled: false,
      splitType: "equal",
      participants: [],
    },
  };
}

export const transactionInitialState = createTransactionInitialState();
