import { useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Clock, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { formatCurrencyValue, getUserCurrency } from "@/lib/currency";
import { KpiCard, PageHeader, PageShell } from "@/components/layout/PageLayout";

const getInitials = (nameOrEmail) => {
  if (!nameOrEmail) return "U";
  const cleaned = nameOrEmail.split("@")[0];
  const parts = cleaned
    .replace(/[^a-zA-Z\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
 
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "U";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const statusConfig = (status) => {
  switch (status) {
    case "pending_approval":
      return {
        label: "Pending HOD",
        className: "bg-blue-100 text-blue-700 border-blue-200",
        icon: Clock,
      };
    case "pending_employee_approval":
      return {
        label: "Pending Employee",
        className: "bg-amber-100 text-amber-700 border-amber-200",
        icon: Clock,
      };
    case "pending_signature":
      return {
        label: "Pending Signature",
        className: "bg-slate-100 text-slate-700 border-slate-200",
        icon: Clock,
      };
    case "approved":
      return {
        label: "Approved",
        className: "bg-emerald-100 text-emerald-700 border-emerald-200",
        icon: CheckCircle,
      };
    case "rejected_by_hod":
      return {
        label: "Rejected by HOD",
        className: "bg-rose-100 text-rose-700 border-rose-200",
        icon: XCircle,
      };
    case "rejected_by_employee":
      return {
        label: "Rejected by Employee",
        className: "bg-rose-100 text-rose-700 border-rose-200",
        icon: XCircle,
      };
    case "rejected_by_user":
      return {
        label: "Rejected by User",
        className: "bg-rose-100 text-rose-700 border-rose-200",
        icon: XCircle,
      };
    default:
      return {
        label: status?.toUpperCase?.() || "Unknown",
        className: "bg-slate-100 text-slate-700 border-slate-200",
        icon: Clock,
      };
  }
};

export default function Approvals() {
  const { user } = useAuth();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionType, setActionType] = useState("approve");
  const [rejectionReason, setRejectionReason] = useState("");
  const [detailRequest, setDetailRequest] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: pendingRequests, isLoading, refetch } = api.creditRequests.getPendingApprovals.useQuery();

  const isManager = user?.role === "admin" || user?.role === "hod";

  const approveRequest = (isManager ? api.creditRequests.hodApprove : api.creditRequests.employeeApprove).useMutation({
    onSuccess: () => {
      toast.success(isManager ? "Credit request approved successfully" : "Approval submitted");
      setIsDialogOpen(false);
      setSelectedRequest(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const rejectRequest = (isManager ? api.creditRequests.hodReject : api.creditRequests.employeeReject).useMutation({
    onSuccess: () => {
      toast.success("Request rejected");
      setIsDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleApprove = (request) => {
    setSelectedRequest(request);
    setActionType("approve");
    setIsDialogOpen(true);
  };

  const handleReject = (request) => {
    setSelectedRequest(request);
    setActionType("reject");
    setIsDialogOpen(true);
  };

  const confirmAction = () => {
    if (!selectedRequest?._id) {
      return;
    }

    if (actionType === "approve") {
      approveRequest.mutate({ requestId: selectedRequest._id.toString() });
      return;
    }

    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    rejectRequest.mutate({
      requestId: selectedRequest._id.toString(),
      reason: rejectionReason,
    });
  };

  const sortedRequests = (pendingRequests || []).slice().sort((a, b) => {
    const priority = {
      pending_approval: 0,
      pending_employee_approval: 1,
      pending_signature: 2,
      approved: 3,
      rejected_by_hod: 4,
      rejected_by_employee: 5,
      rejected_by_user: 6,
    };

    const aScore = priority[a.status] ?? 99;
    const bScore = priority[b.status] ?? 99;

    if (aScore !== bScore) {
      return aScore - bScore;
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const pendingCount = (pendingRequests || []).filter((request) =>
    isManager ? request.status === "pending_approval" : request.status === "pending_employee_approval",
  ).length;
  const totalPendingStageCount = (pendingRequests || []).filter((request) =>
    ["pending_approval", "pending_employee_approval", "pending_signature"].includes(request.status),
  ).length;
  const approvedCount = (pendingRequests || []).filter((request) => request.status === "approved").length;
  const rejectedCount = (pendingRequests || []).filter((request) => request.status?.startsWith("rejected")).length;
  const filteredRequests = sortedRequests.filter((request) => {
    if (activeFilter === "pending") {
      return ["pending_approval", "pending_employee_approval", "pending_signature"].includes(request.status);
    }
    if (activeFilter === "approved") {
      return request.status === "approved";
    }
    if (activeFilter === "rejected") {
      return request.status?.startsWith("rejected");
    }
    return true;
  });

  const isMutating = approveRequest.isPending || rejectRequest.isPending;

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Approvals"
        description={
          isManager
            ? "Review, approve, and track credit requests"
            : "Review, approve, and track your incentive requests"
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Total Requests" value={pendingRequests?.length || 0} hint="All visible requests" icon={FileText} tone="primary" />
        <KpiCard title="Pending" value={pendingCount} hint="Requires your action" icon={Clock} tone="warning" />
        <KpiCard title="Approved" value={approvedCount} hint="Processed successfully" icon={CheckCircle} tone="success" />
        <KpiCard title="Rejected" value={rejectedCount} hint="Closed with rejection" icon={XCircle} tone="neutral" />
      </div>

      <Card className="border-border/70">
        <CardHeader className="pb-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-lg">Requests Queue</CardTitle>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-medium">
                {pendingCount} Pending Action
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={activeFilter === "all" ? "default" : "outline"}
                className="h-8 rounded-full px-3 text-xs"
                onClick={() => setActiveFilter("all")}
              >
                All ({pendingRequests?.length || 0})
              </Button>
              <Button
                size="sm"
                variant={activeFilter === "pending" ? "default" : "outline"}
                className="h-8 rounded-full px-3 text-xs"
                onClick={() => setActiveFilter("pending")}
              >
                Pending ({totalPendingStageCount})
              </Button>
              <Button
                size="sm"
                variant={activeFilter === "approved" ? "default" : "outline"}
                className="h-8 rounded-full px-3 text-xs"
                onClick={() => setActiveFilter("approved")}
              >
                Approved ({approvedCount})
              </Button>
              <Button
                size="sm"
                variant={activeFilter === "rejected" ? "default" : "outline"}
                className="h-8 rounded-full px-3 text-xs"
                onClick={() => setActiveFilter("rejected")}
              >
                Rejected ({rejectedCount})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!filteredRequests.length ? (
            <div className="py-14 text-center">
              <CheckCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-1 text-lg font-semibold">No requests in this filter</h3>
              <p className="text-muted-foreground">Try switching to another status filter.</p>
            </div>
          ) : (
            <div className="max-h-[640px] space-y-3 overflow-y-auto pr-1">
              {filteredRequests.map((request) => {
                const requestId = request._id?.toString();
                const statusMeta = statusConfig(request.status);
                const StatusIcon = statusMeta.icon;
                const requestCurrency = request.currency || getUserCurrency(request.user);
                const isActionable = isManager
                  ? request.status === "pending_approval"
                  : request.status === "pending_employee_approval";
                const isApproved = request.status === "approved";
                const isRejected = request.status?.startsWith("rejected");
                const requestTypeLabel = request.type === "policy" ? "Policy" : "Freelancer";
                const requestTypeValue =
                  request.type === "policy"
                    ? request.policy?.name || "Policy"
                    : (request.user?.employeeType || "freelancer").replace(/_/g, " ");

                return (
                  <div
                    key={requestId}
                    className="rounded-xl border border-border/70 bg-card p-4 transition-shadow hover:shadow-md"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {getInitials(request.user?.name || request.user?.email)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-base font-semibold text-foreground">
                                {request.user?.name || "Unnamed User"}
                              </h3>
                              <Badge className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusMeta.className}`}>
                                <StatusIcon className="mr-1 h-3.5 w-3.5" />
                                {statusMeta.label}
                              </Badge>
                            </div>

                            <p className="mt-0.5 truncate text-sm text-muted-foreground">{request.user?.email || "-"}</p>

                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                              <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[11px]">
                                {requestTypeLabel}
                              </Badge>
                              <span className="text-muted-foreground">{requestTypeValue}</span>
                              <button
                                type="button"
                                className="inline-flex items-center text-[12px] font-medium text-primary hover:text-primary/80"
                                onClick={() => {
                                  setDetailRequest(request);
                                  setIsDetailOpen(true);
                                }}
                              >
                                <FileText className="mr-1 h-3.5 w-3.5" />
                                View details
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-3xl font-semibold tracking-tight text-emerald-600">
                          {formatCurrencyValue(request.amount, requestCurrency)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Base: {formatCurrencyValue(request.baseAmount, requestCurrency)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Submitted {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : "-"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-3">
                      {isActionable ? (
                        <>
                          <Button
                            onClick={() => handleApprove(request)}
                            size="sm"
                            variant="outline"
                            disabled={isMutating}
                            className="h-9 rounded-lg border-emerald-600 bg-emerald-600 px-4 font-semibold text-white hover:border-emerald-700 hover:bg-emerald-700 hover:text-white"
                          >
                            <CheckCircle className="mr-1.5 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => handleReject(request)}
                            variant="outline"
                            size="sm"
                            disabled={isMutating}
                            className="h-9 rounded-lg border-rose-200 px-4 font-semibold text-rose-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800"
                          >
                            <XCircle className="mr-1.5 h-4 w-4" />
                            Reject
                          </Button>
                        </>
                      ) : (
                        <div className="inline-flex h-9 items-center rounded-lg border border-border/70 bg-muted/50 px-3 text-xs font-semibold text-muted-foreground">
                          {isApproved ? "Already approved" : isRejected ? "Already rejected" : "No action required"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve Credit Request" : "Reject Credit Request"}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {selectedRequest ? (
              <div className="space-y-2 rounded-lg border border-border/70 bg-muted/30 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground">Employee</span>
                  <span className="font-medium">{selectedRequest.user?.name || "-"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground">Amount</span>
                  <span className="font-semibold text-emerald-600">
                    {formatCurrencyValue(
                      selectedRequest.amount,
                      selectedRequest.currency || getUserCurrency(selectedRequest.user),
                    )}
                  </span>
                </div>
                {selectedRequest.policy ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-muted-foreground">Policy</span>
                    <span>{selectedRequest.policy.name}</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {actionType === "reject" ? (
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Rejection *</Label>
                <Textarea
                  id="reason"
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  placeholder="Explain why this request is being rejected..."
                  rows={4}
                  required
                />
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setRejectionReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmAction}
                variant={actionType === "approve" ? "default" : "destructive"}
                disabled={isMutating}
                className={actionType === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              >
                {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {actionType === "approve" ? "Confirm Approval" : "Confirm Rejection"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detailRequest?.type === "policy" ? "Policy Details" : "Freelance Details"}</DialogTitle>
          </DialogHeader>

          {detailRequest ? (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/30 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Submitted by</p>
                  <p className="mt-1 text-sm font-medium">{detailRequest.initiator?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Submitted date</p>
                  <p className="mt-1 text-sm font-medium">
                    {detailRequest.createdAt ? new Date(detailRequest.createdAt).toLocaleDateString() : "-"}
                  </p>
                </div>
                {detailRequest.type === "policy" && detailRequest.policy ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Policy</p>
                    <p className="mt-1 text-sm font-medium">{detailRequest.policy.name}</p>
                  </div>
                ) : null}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Calculation</p>
                  <p className="mt-1 text-sm text-muted-foreground">{detailRequest.calculationBreakdown || "-"}</p>
                </div>
              </div>

              {detailRequest.notes ? (
                <div className="rounded-lg border border-border/70 bg-card p-4 text-sm">
                  <p className="mb-1 font-medium text-muted-foreground">Notes</p>
                  <p>{detailRequest.notes}</p>
                </div>
              ) : null}

              {detailRequest.attachments?.length ? (
                <div className="rounded-lg border border-border/70 bg-card p-4 text-sm">
                  <p className="mb-2 font-medium text-muted-foreground">Attachments</p>
                  <div className="flex flex-col gap-1.5">
                    {detailRequest.attachments.map((attachment) => (
                      <a
                        key={attachment.filename}
                        href={attachment.url}
                        className="text-primary hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {attachment.originalName || attachment.filename}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
