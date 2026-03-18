import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityFeedPanel } from "@/components/activity/ActivityFeedPanel";
import { useActivityFeedStore } from "@/stores/activity-feed-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, Mail, CreditCard, Settings, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeedFilter } from "@/components/activity/ActivityFeedPanel";

const FILTER_OPTIONS: { value: FeedFilter; label: string; icon: typeof Mail }[] = [
  { value: "all", label: "Todos", icon: LayoutGrid },
  { value: "convites", label: "Convites", icon: Mail },
  { value: "pagamentos", label: "Pagamentos", icon: CreditCard },
  { value: "sistema", label: "Sistema", icon: Settings },
];

export default function ActivityFeedPage() {
  const { loadFeed, connectRealtime, disconnectRealtime, isConnectedRealtime, unreadCount } =
    useActivityFeedStore();
  const [filter, setFilter] = useState<FeedFilter>("all");

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    connectRealtime();
    return () => disconnectRealtime();
  }, [connectRealtime, disconnectRealtime]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Feed de atividade</h1>
          <p className="text-muted-foreground">
            Convites enviados, aceitos ou recusados e outras atualizações.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge variant="secondary">{unreadCount} não lidos</Badge>
          )}
          {isConnectedRealtime ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Wifi className="h-3 w-3" /> Tempo real
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <WifiOff className="h-3 w-3" /> Offline
            </span>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {FILTER_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <Button
                  key={opt.value}
                  variant={filter === opt.value ? "default" : "outline"}
                  size="sm"
                  className="h-8"
                  onClick={() => setFilter(opt.value)}
                >
                  <Icon className={cn("h-3.5 w-3.5 mr-1.5", filter === opt.value && "text-primary-foreground")} />
                  {opt.label}
                </Button>
              );
            })}
          </div>
          <ActivityFeedPanel filter={filter} />
        </CardContent>
      </Card>
    </div>
  );
}
