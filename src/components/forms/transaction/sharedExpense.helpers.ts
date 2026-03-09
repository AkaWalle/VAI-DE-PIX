import { toCents } from "@/utils/currency";
import type {
  SharedExpenseCreatePayload,
  SharedExpenseParticipantCreate,
} from "@/services/sharedExpenseApi";
import type {
  Participant,
  SharedExpenseSplitType,
  SplitValidation,
} from "./sharedExpense.types";

function sanitizeAmount(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

function distributeCents(totalCents: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(totalCents / count);
  const remainder = totalCents % count;

  return Array.from({ length: count }, (_, index) =>
    index < remainder ? base + 1 : base,
  );
}

export function normalizeParticipants(participants: Participant[]): Participant[] {
  return participants.map((participant) => ({
    ...participant,
    userName: participant.userName.trim(),
    userEmail: participant.userEmail.trim(),
    amount: sanitizeAmount(participant.amount),
  }));
}

export function recalculateEqualSplit(
  totalCents: number,
  participants: Participant[],
): Participant[] {
  const normalized = normalizeParticipants(participants);
  const amounts = distributeCents(totalCents, normalized.length);

  return normalized.map((participant, index) => ({
    ...participant,
    amount: amounts[index] / 100,
  }));
}

export function recalculatePercentageSplit(
  totalCents: number,
  participants: Participant[],
): Participant[] {
  const normalized = normalizeParticipants(participants);
  if (normalized.length === 0) return normalized;

  const totalCurrentCents = normalized.reduce(
    (sum, participant) => sum + toCents(participant.amount),
    0,
  );

  if (totalCurrentCents <= 0) {
    return recalculateEqualSplit(totalCents, normalized);
  }

  let allocated = 0;
  return normalized.map((participant, index) => {
    if (index === normalized.length - 1) {
      const remaining = Math.max(totalCents - allocated, 0);
      return { ...participant, amount: remaining / 100 };
    }

    const shareCents = Math.round(
      (toCents(participant.amount) / totalCurrentCents) * totalCents,
    );
    allocated += shareCents;
    return { ...participant, amount: shareCents / 100 };
  });
}

export function recalculateCustomSplit(
  _totalCents: number,
  participants: Participant[],
): Participant[] {
  return normalizeParticipants(participants);
}

export function validateSplitTotal(
  totalCents: number,
  participants: Participant[],
): SplitValidation {
  const normalized = normalizeParticipants(participants);
  const totalSplitCents = normalized.reduce(
    (sum, participant) => sum + toCents(participant.amount),
    0,
  );
  const differenceCents = totalCents - totalSplitCents;

  return {
    totalSplitCents,
    differenceCents,
    isValid: differenceCents === 0,
  };
}

function getInvitedEmail(
  participants: Participant[],
  currentUserEmail?: string,
): string | null {
  const normalizedCurrent = currentUserEmail?.trim();
  const other = participants.find(
    (participant) =>
      participant.userEmail &&
      participant.userEmail.trim() !== normalizedCurrent,
  );

  return other?.userEmail?.trim() ?? null;
}

function buildParticipantsPayload(
  participants: Participant[],
  splitType: SharedExpenseSplitType,
  currentUserId?: string,
  currentUserEmail?: string,
): SharedExpenseParticipantCreate[] {
  const normalizedParticipants = normalizeParticipants(participants);

  const payload = normalizedParticipants.map((participant) => {
    const isCreator =
      participant.userId === "current-user" ||
      (!!currentUserEmail &&
        participant.userEmail.toLowerCase() === currentUserEmail.trim().toLowerCase());

    const base: SharedExpenseParticipantCreate = {};

    if (isCreator && currentUserId) {
      base.user_id = currentUserId;
    } else {
      base.email = participant.userEmail;
    }

    if (splitType === "percentage") {
      base.percentage = 0;
    }

    if (splitType === "custom") {
      base.amount = toCents(participant.amount);
    }

    return base;
  });

  if (splitType === "percentage" && payload.length > 0) {
    const total = normalizedParticipants.reduce(
      (sum, participant) => sum + participant.amount,
      0,
    );

    let assigned = 0;
    payload.forEach((participantPayload, index) => {
      if (index === payload.length - 1) {
        participantPayload.percentage = Number((100 - assigned).toFixed(2));
        return;
      }

      const participantTotal = normalizedParticipants[index].amount;
      const percentage =
        total > 0 ? Math.round((participantTotal / total) * 10000) / 100 : 0;
      participantPayload.percentage = percentage;
      assigned += percentage;
    });
  }

  return payload;
}

export function buildSharedExpensePayload(args: {
  totalCents: number;
  description: string;
  splitType: SharedExpenseSplitType;
  participants: Participant[];
  currentUserId?: string;
  currentUserEmail?: string;
}): SharedExpenseCreatePayload {
  const {
    totalCents,
    description,
    splitType,
    participants,
    currentUserId,
    currentUserEmail,
  } = args;

  const normalizedParticipants = normalizeParticipants(participants);
  const invitedEmail = getInvitedEmail(normalizedParticipants, currentUserEmail);

  if (
    splitType === "equal" &&
    normalizedParticipants.length === 2 &&
    invitedEmail
  ) {
    return {
      total_cents: totalCents,
      description,
      invited_email: invitedEmail,
    };
  }

  return {
    total_cents: totalCents,
    description,
    split_type: splitType,
    participants: buildParticipantsPayload(
      normalizedParticipants,
      splitType,
      currentUserId,
      currentUserEmail,
    ),
  };
}
