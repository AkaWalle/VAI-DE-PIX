import { useActivityFeedStore } from "@/stores/activity-feed-store";
import { formatDate, formatDateTime } from "@/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import type { ActivityFeedItem } from "@/services/activityFeedApi";

export type FeedFilter = "all" | "convites" | "pagamentos" | "sistema";

function groupByDate(items: ActivityFeedItem[]): Record<string, ActivityFeedItem[]> {
  const groups: Record<string, ActivityFeedItem[]> = {};
  for (const item of items) {
    const d = formatDate(item.created_at, "medium");
    if (!groups[d]) groups[d] = [];
    groups[d].push(item);
  }
  return groups;
}

function filterItems(items: ActivityFeedItem[], filter: FeedFilter): ActivityFeedItem[] {
  if (filter === "all") return items;
  if (filter === "convites") {
    return items.filter((i) => i.type?.startsWith("expense_share_"));
  }
  if (filter === "pagamentos") {
    return items.filter((i) =>
      i.type?.includes("payment") || i.type?.includes("pagamento"),
    );
  }
  if (filter === "sistema") {
    return items.filter(
      (i) =>
        !i.type?.startsWith("expense_share_") &&
        !i.type?.includes("payment") &&
        !i.type?.includes("pagamento"),
    );
  }
  return items;
}

export function ActivityFeedPanel({ filter = "all" }: { filter?: FeedFilter }) {
  const {
    items,
    unreadCount,
    loading,
    markAsRead,
    markAllRead,
  } = useActivityFeedStore();

  const filtered = filterItems(items, filter);
  const grouped = groupByDate(filtered);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">Atividade</span>
        {unreadCount > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{unreadCount} não lidos</Badge>
            <Button variant="ghost" size="sm" onClick={() => markAllRead()}>
              Marcar todos como lidos
            </Button>
          </div>
        )}
      </div>
      <ScrollArea className="h-[400px] pr-4">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma atividade recente.</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([dateLabel, dateItems]) => {
              const hasUnread = dateItems.some((i) => !i.is_read);
              return (
              <div key={dateLabel}>
                <div className="mb-2 flex items-center gap-2">
                  <p className="text-xs font-medium text-muted-foreground">{dateLabel}</p>
                  {hasUnread && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      novos
                    </Badge>
                  )}
                </div>
                <ul className="space-y-2">
                  {dateItems.map((item) => (
                    <li
                      key={item.id}
                      className={`rounded-lg border p-3 text-sm ${!item.is_read ? "bg-muted/50" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{item.title}</p>
                          {item.description && (
                            <p className="mt-0.5 text-muted-foreground">{item.description}</p>
                          )}
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDateTime(item.created_at)}
                          </p>
                        </div>
                        {!item.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0"
                            onClick={() => markAsRead(item.id)}
                          >
                            Marcar lido
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
