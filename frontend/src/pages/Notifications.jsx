import { useMemo } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { api, buildQueryKey } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bell, CheckCircle2 } from "lucide-react";
import { PageShell } from "@/components/layout/PageLayout";

const typeStyles = {
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
  action: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200",
  success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
};
 
export default function Notifications() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: notifications, isLoading, refetch } = api.notifications.getMy.useQuery({ limit: 100 });
 
  const refreshNotifications = async () => {
    await Promise.all([
      refetch(),
      queryClient.invalidateQueries({ queryKey: buildQueryKey("notifications.getUnreadCount") }),
      queryClient.invalidateQueries({ queryKey: buildQueryKey("notifications.getMy") }),
    ]);
  };

  const markRead = api.notifications.markRead.useMutation({
    onSuccess: () => refreshNotifications(),
  });
  const markAllRead = api.notifications.markAllRead.useMutation({
    onSuccess: () => refreshNotifications(),
  });
 
  const unreadCount = useMemo(
    () => (notifications || []).filter((notification) => !notification.readAt).length,
    [notifications]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Stay updated with approvals, redemptions, and system updates
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending || unreadCount === 0}
          className="gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          Mark all read
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Notifications ({notifications?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!notifications || notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">You're all caught up</h3>
              <p className="text-muted-foreground">No notifications yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification._id?.toString()}
                  className={`border rounded-lg p-4 transition-colors hover:bg-muted/40 ${
                    notification.readAt ? "bg-background" : "bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{notification.title}</h4>
                        <Badge className={typeStyles[notification.type] || typeStyles.info}>
                          {notification.type || "info"}
                        </Badge>
                        {!notification.readAt && (
                          <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {notification.actionUrl && (
                        <Button
                          size="sm"
                          onClick={() => {
                            markRead.mutate({ id: notification._id.toString() });
                            setLocation(notification.actionUrl);
                          }}
                        >
                          View
                        </Button>
                      )}
                      {!notification.readAt && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markRead.mutate({ id: notification._id.toString() })}
                        >
                          Mark read
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
