import { z } from "zod";
import { validateSplitTotal } from "@/components/forms/transaction/sharedExpense.helpers";

const participantSchema = z.object({
  userId: z.string().optional(),
  userName: z.string().trim().min(1, "Informe o nome do participante."),
  userEmail: z.string().trim().min(1, "Informe um e-mail valido."),
  amount: z.number().min(0, "Informe um valor valido."),
  paid: z.boolean().optional(),
});

const sharedExpenseSchema = z
  .object({
    enabled: z.boolean(),
    splitType: z.enum(["equal", "percentage", "custom"]),
    participants: z.array(participantSchema),
  })
  .superRefine((sharedExpense, ctx) => {
    if (!sharedExpense.enabled) return;

    if (sharedExpense.participants.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["participants"],
        message: "Adicione pelo menos 2 participantes.",
      });
    }

    if (sharedExpense.participants.some((participant) => !participant.userName.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["participants"],
        message: "Revise os participantes e informe os nomes corretamente.",
      });
    }

    if (
      sharedExpense.participants.some(
        (participant) =>
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(participant.userEmail.trim()),
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["participants"],
        message: "Revise os participantes e informe e-mails validos.",
      });
    }
  });

export const transactionValidationSchema = z
  .object({
    type: z.enum(["income", "expense"]),
    amountCents: z.number().int().positive("Informe um valor maior que zero."),
    description: z.string().trim().min(1, "Informe a descricao da transacao."),
    category: z.string().min(1, "Selecione uma categoria."),
    account: z.string().min(1, "Selecione uma conta."),
    date: z.string().min(1, "Informe uma data."),
    tags: z.string(),
    sharedExpense: sharedExpenseSchema,
  })
  .superRefine((form, ctx) => {
    if (!form.sharedExpense.enabled) return;

    if (form.type !== "expense") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sharedExpense", "enabled"],
        message: "Despesa compartilhada so e permitida para tipo Despesa.",
      });
    }

    const splitValidation = validateSplitTotal(
      form.amountCents,
      form.sharedExpense.participants,
    );

    if (!splitValidation.isValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sharedExpense", "participants"],
        message: "A soma da divisao deve ser igual ao valor total.",
      });
    }
  });

export type TransactionValidationData = z.infer<
  typeof transactionValidationSchema
>;
