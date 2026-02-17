import { useMemo, useState } from "react";
import { PageHeader, PageShell, KpiCard } from "@/components/layout/PageLayout";
import { api } from "@/lib/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow, 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Activity, Loader2, Search, ShieldCheck } from "lucide-react";

const actionLabel = (value) =>
  (value || "unknown")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export default function AuditLogs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");

  const { data: logs, isLoading } = api.audit.getLogs.useQuery({
    limit: 250,
    action: actionFilter === "all" ? undefined : actionFilter,
    entityType: entityFilter === "all" ? undefined : entityFilter,
  });
  const { data: users } = api.users.getAll.useQuery();

  const usersById = useMemo(() => {
    const map = new Map();
    (users || []).forEach((user) => {
      map.set(user._id?.toString(), user);
    });
    return map;
  }, [users]);

  const availableActions = useMemo(
    () => Array.from(new Set((logs || []).map((log) => log.action).filter(Boolean))).sort(),
    [logs],
  );

  const availableEntities = useMemo(
    () => Array.from(new Set((logs || []).map((log) => log.entityType).filter(Boolean))).sort(),
    [logs],
  );

  const filteredLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return logs || [];

    return (logs || []).filter((log) => {
      const actor = usersById.get(log.userId?.toString());
      const haystack = [
        log.action,
        log.entityType,
        log.entityId,
        log.details,
        actor?.name,
        actor?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [logs, searchQuery, usersById]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const todayCount = (logs || []).filter((log) => {
    const now = new Date();
    const date = new Date(log.createdAt);
    return (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  }).length;

  return (
    <PageShell>
      <PageHeader
        title="Audit Logs"
        description="Track system activity and security-relevant changes across the workspace"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard title="Total Events" value={(logs || []).length} hint="Loaded logs" icon={Activity} tone="primary" />
        <KpiCard title="Today" value={todayCount} hint="Events in last 24 hours" icon={ShieldCheck} tone="success" />
        <KpiCard title="Visible Rows" value={filteredLogs.length} hint="After filters/search" icon={Search} tone="neutral" />
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search action, user, entity, details..."
                className="pl-9"
              />
            </div>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {availableActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {actionLabel(action)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                {availableEntities.map((entity) => (
                  <SelectItem key={entity} value={entity}>
                    {actionLabel(entity)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No logs found for current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => {
                  const actor = usersById.get(log.userId?.toString());
                  const actorName = actor?.name || actor?.email || "System";
                  return (
                    <TableRow key={log._id?.toString()}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-[11px] font-semibold">
                              {(actorName || "S").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{actorName}</p>
                            <p className="truncate text-xs text-muted-foreground">{actor?.email || log.userId}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{actionLabel(log.action)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium">{actionLabel(log.entityType || "general")}</p>
                          <p className="text-xs text-muted-foreground">{log.entityId || "-"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">{new Date(log.createdAt).toLocaleDateString()}</p>
                          <p className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleTimeString()}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}
