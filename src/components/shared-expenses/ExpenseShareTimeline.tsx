import { useState, useEffect } from "react";
import { sharedExpenseApi, type ExpenseShareEventItem } from "@/services/sharedExpenseApi";
import { formatDateTime } from "@/utils/format";
import { Loader2 } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  created: "criou o convite",
  accepted: "aceitou o convite",
  rejected: "recusou o convite",
};

interface ExpenseShareTimelineProps {
  shareId: string;
  /** Se informado, não faz fetch (usa lista passada). */
  events?: ExpenseShareEventItem[] | null;
}

export function ExpenseShareTimeline({ shareId, events: eventsProp }: ExpenseShareTimelineProps) {
  const [events, setEvents] = useState<ExpenseShareEventItem[]>(eventsProp ?? []);
  const [loading, setLoading] = useState(!eventsProp);

  useEffect(() => {
    if (eventsProp !== undefined) {
      setEvents(eventsProp ?? []);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    sharedExpenseApi
      .getShareEvents(shareId)
      .then((data) => {
        if (!cancelled) setEvents(data);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shareId, eventsProp]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando timeline...
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <p className="py-2 text-sm text-muted-foreground">Nenhum evento registrado.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {events.map((ev) => (
        <li key={ev.id} className="flex gap-2 text-sm">
          <span className="shrink-0 text-muted-foreground">
            {formatDateTime(ev.created_at)}
          </span>
          <span className="text-foreground">
            {ev.performed_by_name || "Usuário"} {ACTION_LABELS[ev.action] ?? ev.action}
          </span>
        </li>
      ))}
    </ul>
  );
}
