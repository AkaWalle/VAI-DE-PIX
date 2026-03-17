import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { notificationsService, type NotificationItem } from "@/services/notifications.service";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuthStore } from "@/stores/auth-store-index";

export function NotificationBell() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isAuthenticated } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchUnreadCount = () => {
    if (!isAuthenticated) return;
    notificationsService.getUnreadCount().then(setUnreadCount).catch(() => setUnreadCount(0));
  };

  const fetchNotifications = () => {
    setLoading(true);
    notificationsService
      .list({ limit: 20 })
      .then(setNotifications)
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    if (open && isAuthenticated) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [open, isAuthenticated]);

  const handleMarkAsRead = (id: string) => {
    notificationsService.markAsRead(id).then(() => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    });
  };

  const handleMarkAllRead = () => {
    notificationsService.markAllAsRead().then(() => {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })),
      );
      setUnreadCount(0);
      setOpen(false);
    });
  };

  const trigger = (
    <Button variant="ghost" size="icon" className="relative">
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
      <span className="sr-only">Notificações</span>
    </Button>
  );

  const listContent = (
    <ScrollArea className="h-[280px]">
      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
          Carregando...
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
          Nenhuma notificação
        </div>
      ) : (
        <ul className="divide-y">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={cn(
                "cursor-pointer px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
                !n.read_at && "bg-muted/30",
              )}
              onClick={() => {
                if (!n.read_at) handleMarkAsRead(n.id);
                if (n.type === "expense_share_pending" && n.metadata?.share_id) {
                  setOpen(false);
                  navigate(`/shared-expenses/pending?shareId=${String(n.metadata.share_id)}`);
                }
              }}
            >
              <div className="flex gap-2">
                {!n.read_at && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">{n.title}</p>
                  {n.body && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </ScrollArea>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl p-0">
          <SheetHeader className="border-b px-4 py-4 text-left">
            <SheetTitle>Notificações</SheetTitle>
          </SheetHeader>
          <div className="flex items-center justify-end border-b px-3 py-2">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleMarkAllRead}>
                Marcar todas como lidas
              </Button>
            )}
          </div>
          {listContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="font-semibold">Notificações</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleMarkAllRead}>
              Marcar todas como lidas
            </Button>
          )}
        </div>
        {listContent}
      </PopoverContent>
    </Popover>
  );
}
