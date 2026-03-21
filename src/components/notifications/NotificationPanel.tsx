import { useNavigate } from "react-router-dom";
import { Bell, Check, CheckCheck, Trash2, FileText, ClipboardCheck, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotifications } from "@/contexts/NotificationContext";
import { AppNotification } from "@/models/notification";
import { cn } from "@/lib/utils";

function getNotificationIcon(type: AppNotification["type"]) {
  switch (type) {
    case "record_created":
      return <FileText className="h-4 w-4 text-info" />;
    case "record_approved":
      return <ClipboardCheck className="h-4 w-4 text-success" />;
    case "record_rejected":
      return <XCircle className="h-4 w-4 text-destructive" />;
    case "form_created":
      return <FileText className="h-4 w-4 text-accent" />;
    default:
      return <Clock className="h-4 w-4 text-warning" />;
  }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days}d`;
}

export function NotificationPanel() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] flex items-center justify-center p-0 bg-destructive text-destructive-foreground text-xs">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">Notificaciones</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} nuevas
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7 px-2">
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Leer todo
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs h-7 px-2 text-muted-foreground">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Notification List */}
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">Sin notificaciones</p>
              <p className="text-xs">Las notificaciones aparecerán en tiempo real</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                    !n.read && "bg-accent/5"
                  )}
                  onClick={() => {
                    markAsRead(n.id);
                    if (n.link) navigate(n.link);
                  }}
                >
                  <div className="mt-0.5 shrink-0">
                    {getNotificationIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn("text-sm truncate", !n.read && "font-semibold")}>
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {n.message}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {timeAgo(n.timestamp)}
                    </p>
                  </div>
                  {!n.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(n.id);
                      }}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
