export type SharedExpenseSplitType = "equal" | "percentage" | "custom";

export type Participant = {
  userId?: string;
  userName: string;
  userEmail: string;
  amount: number;
  paid?: boolean;
};

export type SharedExpenseState = {
  enabled: boolean;
  splitType: SharedExpenseSplitType;
  participants: Participant[];
};

export type SplitValidation = {
  totalSplitCents: number;
  differenceCents: number;
  isValid: boolean;
};
