import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityFeedPanel } from "@/components/activity/ActivityFeedPanel";
import { useActivityFeedStore } from "@/stores/activity-feed-store";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";

export default function ActivityFeedPage() {
  const { loadFeed, connectRealtime, disconnectRealtime, isConnectedRealtime, unreadCount } =
    useActivityFeedStore();

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
          <ActivityFeedPanel />
        </CardContent>
      </Card>
    </div>
  );
}
