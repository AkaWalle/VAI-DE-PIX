import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { FormDialog } from "@/components/ui/form-dialog";
import { ActionButton } from "@/components/ui/action-button";
import { Plus } from "lucide-react";
import { TransactionFields } from "@/components/forms/transaction/TransactionFields";
import { SharedExpenseToggle } from "@/components/forms/transaction/SharedExpenseToggle";
import { SharedExpenseSection } from "@/components/forms/transaction/SharedExpenseSection";
import { useAuthStore } from "@/stores/auth-store-index";
import {
  recalculateCustomSplit,
  recalculateEqualSplit,
  recalculatePercentageSplit,
  validateSplitTotal,
} from "@/components/forms/transaction/sharedExpense.helpers";
import { useTransactionController } from "@/forms/transaction/transaction.controller";
import { createTransactionInitialState } from "@/forms/transaction/transaction.schema";
import { transactionValidationSchema } from "@/forms/transaction/transaction.validation";
import type {
  Participant,
  SharedExpenseSplitType,
  TransactionFormState,
} from "@/forms/transaction/transaction.types";

function getErrorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;

  const message = (error as { message?: unknown }).message;
  return typeof message === "string" ? message : undefined;
}

function buildCurrentUserParticipant(user?: {
  name?: string | null;
  email?: string | null;
}): Participant {
  return {
    userId: "current-user",
    userName: user?.name ?? "Você",
    userEmail: user?.email ?? "",
    amount: 0,
    paid: false,
  };
}

function applySplitStrategy(
  splitType: SharedExpenseSplitType,
  participants: Participant[],
  totalCents: number,
): Participant[] {
  switch (splitType) {
    case "equal":
      return recalculateEqualSplit(totalCents, participants);
    case "percentage":
      return recalculatePercentageSplit(totalCents, participants);
    case "custom":
    default:
      return recalculateCustomSplit(totalCents, participants);
  }
}

interface TransactionFormProps {
  trigger?: React.ReactNode;
}

export function TransactionForm({ trigger }: TransactionFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuthStore();
  const {
    categories,
    accounts,
    isLoading,
    submitTransaction,
    beginTransactionSession,
    clearTransactionSession,
  } = useTransactionController();
  const {
    handleSubmit,
    watch,
    setValue,
    reset,
    clearErrors,
    formState: { errors },
  } = useForm<TransactionFormState>({
    resolver: zodResolver(transactionValidationSchema),
    defaultValues: createTransactionInitialState(),
    mode: "onSubmit",
  });
  const form = watch();
  const sharedExpenseValidation = useMemo(
    () => validateSplitTotal(form.amountCents, form.sharedExpense.participants),
    [form.amountCents, form.sharedExpense.participants],
  );

  const defaultTrigger = (
    <ActionButton icon={Plus} variant="default">
      Nova Transação
    </ActionButton>
  );

  const resetFormState = () => {
    reset(createTransactionInitialState());
    clearErrors();
  };

  const setParticipants = (participants: Participant[]) => {
    setValue("sharedExpense.participants", participants, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleTypeChange = (value: "income" | "expense") => {
    setValue("type", value, {
      shouldDirty: true,
      shouldValidate: true,
    });

    if (value === "income") {
      setValue("sharedExpense", createTransactionInitialState().sharedExpense, {
        shouldDirty: true,
        shouldValidate: true,
      });
      clearErrors("sharedExpense");
    }
  };

  const handleAmountChange = (value: number) => {
    setValue("amountCents", value, {
      shouldDirty: true,
      shouldValidate: true,
    });

    if (!form.sharedExpense.enabled) return;

    setParticipants(
      applySplitStrategy(
        form.sharedExpense.splitType,
        form.sharedExpense.participants,
        value,
      ),
    );
  };

  const handleSharedExpenseToggle = (enabled: boolean) => {
    if (!enabled) {
      setValue("sharedExpense", createTransactionInitialState().sharedExpense, {
        shouldDirty: true,
        shouldValidate: true,
      });
      clearErrors("sharedExpense");
      return;
    }

    const participants =
      form.sharedExpense.participants.length > 0
        ? form.sharedExpense.participants
        : [buildCurrentUserParticipant(user)];

    setValue(
      "sharedExpense",
      {
        enabled: true,
        splitType: form.sharedExpense.splitType,
        participants: applySplitStrategy(
          form.sharedExpense.splitType,
          participants,
          form.amountCents,
        ),
      },
      {
        shouldDirty: true,
        shouldValidate: true,
      },
    );
  };

  const handleSplitTypeChange = (splitType: SharedExpenseSplitType) => {
    setValue("sharedExpense.splitType", splitType, {
      shouldDirty: true,
      shouldValidate: true,
    });

    setParticipants(
      applySplitStrategy(
        splitType,
        form.sharedExpense.participants,
        form.amountCents,
      ),
    );
  };

  const handleAddParticipant = (participant: Participant) => {
    setParticipants(
      applySplitStrategy(
        form.sharedExpense.splitType,
        [...form.sharedExpense.participants, participant],
        form.amountCents,
      ),
    );
  };

  const handleRemoveParticipant = (index: number) => {
    setParticipants(
      applySplitStrategy(
        form.sharedExpense.splitType,
        form.sharedExpense.participants.filter(
          (_participant, currentIndex) => currentIndex !== index,
        ),
        form.amountCents,
      ),
    );
  };

  const handleUpdateParticipant = (index: number, amount: number) => {
    const participants = form.sharedExpense.participants.map(
      (participant, currentIndex) =>
        currentIndex === index ? { ...participant, amount } : participant,
    );

    setParticipants(
      form.sharedExpense.splitType === "percentage"
        ? recalculatePercentageSplit(form.amountCents, participants)
        : recalculateCustomSplit(form.amountCents, participants),
    );
  };

  const handleValidSubmit = async (data: TransactionFormState) => {
    const success = await submitTransaction(data);
    if (success) {
      clearTransactionSession();
      resetFormState();
      setIsOpen(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      beginTransactionSession();
      resetFormState();
    } else {
      clearTransactionSession();
      resetFormState();
    }

    setIsOpen(open);
  };

  return (
    <FormDialog
      trigger={trigger || defaultTrigger}
      title="Nova Transação"
      description="Adicione uma nova receita ou despesa ao seu controle financeiro."
      onSubmit={handleSubmit(handleValidSubmit)}
      isLoading={isLoading}
      open={isOpen}
      onOpenChange={handleOpenChange}
      submitLabel="Criar Transação"
      mobileVariant="fullscreen"
      mobileContentClassName="flex h-[100dvh] w-screen max-w-none flex-col rounded-none border-0 p-0"
      contentClassName="max-h-[92vh] w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl"
    >
      <div className="space-y-4">
        <TransactionFields
          type={form.type}
          amountCents={form.amountCents}
          description={form.description}
          category={form.category}
          account={form.account}
          date={form.date}
          tags={form.tags}
          categories={categories}
          accounts={accounts}
          onTypeChange={handleTypeChange}
          onAmountChange={handleAmountChange}
          onDescriptionChange={(value) =>
            setValue("description", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          onCategoryChange={(value) =>
            setValue("category", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          onAccountChange={(value) =>
            setValue("account", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          onDateChange={(value) =>
            setValue("date", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          onTagsChange={(value) =>
            setValue("tags", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          errors={{
            type: getErrorMessage(errors.type),
            amountCents: getErrorMessage(errors.amountCents),
            description: getErrorMessage(errors.description),
            category: getErrorMessage(errors.category),
            account: getErrorMessage(errors.account),
            date: getErrorMessage(errors.date),
            tags: getErrorMessage(errors.tags),
          }}
        />

        {form.type === "expense" && (
          <>
            <SharedExpenseToggle
              checked={form.sharedExpense.enabled}
              onCheckedChange={handleSharedExpenseToggle}
            />

            {form.sharedExpense.enabled && (
              <SharedExpenseSection
                totalCents={form.amountCents}
                splitType={form.sharedExpense.splitType}
                participants={form.sharedExpense.participants}
                validation={sharedExpenseValidation}
                splitTypeError={getErrorMessage(errors.sharedExpense?.splitType)}
                participantsError={getErrorMessage(
                  errors.sharedExpense?.participants,
                )}
                onSplitTypeChange={handleSplitTypeChange}
                onAddParticipant={handleAddParticipant}
                onRemoveParticipant={handleRemoveParticipant}
                onUpdateParticipantAmount={handleUpdateParticipant}
              />
            )}
          </>
        )}
      </div>
    </FormDialog>
  );
}
