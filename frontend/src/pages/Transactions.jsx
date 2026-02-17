import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Plus, DollarSign, FileText, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { formatCurrencyValue, getUserCurrency } from "@/lib/currency";
import { PageShell } from "@/components/layout/PageLayout";


const statusLabels = {
  pending_signature: "Pending Signature",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected_by_user: "Rejected by Employee",
  rejected_by_hod: "Rejected by HOD",
}; 
  
const statusColors = {
  pending_signature: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  pending_approval: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected_by_user: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  rejected_by_hod: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function Transactions() {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: "policy",
    assignmentId: "",
    freelancerId: "",
    baseAmount: "",
    bonus: "",
    deductions: "",
    breakdown: "",
    notes: "",
  });

  const isAdminOrHod = user?.role === "admin" || user?.role === "hod";

  const { data: initiatorScope } = api.creditRequests.getInitiatorScope.useQuery();
  const canInitiate = isAdminOrHod ||
    (initiatorScope?.policyAssignments?.length || 0) > 0 ||
    (initiatorScope?.freelancers?.length || 0) > 0;

  const { data: allRequests, isLoading: allLoading, refetch: refetchAll } = api.creditRequests.getAll.useQuery(undefined, {
    enabled: isAdminOrHod,
  });
  const { data: myRequests, isLoading: myLoading, refetch: refetchMy } = api.creditRequests.getMyRequests.useQuery(undefined, {
    enabled: !isAdminOrHod,
  });
  const { data: mySubmissions, isLoading: submissionsLoading, refetch: refetchSubmissions } = api.creditRequests.getMySubmissions.useQuery(undefined, {
    enabled: !isAdminOrHod && canInitiate,
  });

  const createRequest = api.creditRequests.create.useMutation({
    onSuccess: () => {
      toast.success("Credit request submitted successfully");
      setIsDialogOpen(false);
      resetForm();
      if (isAdminOrHod) {
        refetchAll();
      } else {
        refetchMy();
        if (canInitiate) {
          refetchSubmissions();
        }
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      type: "policy",
      assignmentId: "",
      freelancerId: "",
      baseAmount: "",
      bonus: "",
      deductions: "",
      breakdown: "",
      notes: "",
    });
  };

  const totalAmount = useMemo(() => {
    const base = parseFloat(formData.baseAmount || "0") || 0;
    const bonus = parseFloat(formData.bonus || "0") || 0;
    const deductions = parseFloat(formData.deductions || "0") || 0;
    return base + bonus - deductions;
  }, [formData.baseAmount, formData.bonus, formData.deductions]);

  const assignmentsById = useMemo(() => {
    const map = new Map();
    (initiatorScope?.policyAssignments || []).forEach((assignment) => {
      map.set(assignment.assignmentId, assignment);
    });
    return map;
  }, [initiatorScope]);
  const freelancersById = useMemo(() => {
    const map = new Map();
    (initiatorScope?.freelancers || []).forEach((freelancer) => {
      map.set(freelancer._id?.toString(), freelancer);
    });
    return map;
  }, [initiatorScope]);
  const selectedCurrency = useMemo(() => {
    if (formData.type === "policy") {
      const assignment = assignmentsById.get(formData.assignmentId);
      return getUserCurrency(assignment?.user);
    }
    const freelancer = freelancersById.get(formData.freelancerId);
    return getUserCurrency(freelancer);
  }, [assignmentsById, freelancersById, formData.assignmentId, formData.freelancerId, formData.type]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.type === "policy" && !formData.assignmentId) {
      toast.error("Please select a policy assignment");
      return;
    }
    if (formData.type === "freelancer" && !formData.freelancerId) {
      toast.error("Please select a freelancer");
      return;
    }
    if (!formData.baseAmount) {
      toast.error("Base amount is required");
      return;
    }
    const assignment = assignmentsById.get(formData.assignmentId);
    const userId = formData.type === "policy" ? assignment?.user?._id : formData.freelancerId;
    const policyId = formData.type === "policy" ? assignment?.policy?._id : undefined;
    if (!userId) {
      toast.error("Missing employee selection");
      return;
    }
    createRequest.mutate({
      type: formData.type,
      userId: userId.toString(),
      policyId: policyId?.toString(),
      baseAmount: parseFloat(formData.baseAmount),
      bonus: parseFloat(formData.bonus || "0") || 0,
      deductions: parseFloat(formData.deductions || "0") || 0,
      amount: totalAmount,
      calculationBreakdown: formData.breakdown,
      notes: formData.notes || undefined,
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending_signature":
        return <Clock className="w-4 h-4" />;
      case "pending_approval":
        return <AlertCircle className="w-4 h-4" />;
      case "approved":
        return <CheckCircle className="w-4 h-4" />;
      case "rejected_by_user":
      case "rejected_by_hod":
        return <XCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const isLoading = allLoading || myLoading || submissionsLoading;
  const requestsToDisplay = isAdminOrHod ? allRequests : myRequests;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-100">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PageShell>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Credit History</h1>
          <p className="text-muted-foreground mt-1">Review credit history and submit requests</p>
        </div>
        {canInitiate && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Credit Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Submit Credit Request</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <Tabs value={formData.type} onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="policy">Policy-Based</TabsTrigger>
                    <TabsTrigger value="freelancer">Freelancer Amount</TabsTrigger>
                  </TabsList>

                  <TabsContent value="policy" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Select Policy Assignment *</Label>
                      <Select
                        value={formData.assignmentId}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, assignmentId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an assignment" />
                        </SelectTrigger>
                        <SelectContent>
                          {(initiatorScope?.policyAssignments || []).map((assignment) => (
                            <SelectItem key={assignment.assignmentId} value={assignment.assignmentId}>
                              {assignment.policy?.name} - {assignment.user?.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>

                  <TabsContent value="freelancer" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Select Freelancer *</Label>
                      <Select
                        value={formData.freelancerId}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, freelancerId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a freelancer" />
                        </SelectTrigger>
                        <SelectContent>
                          {(initiatorScope?.freelancers || []).map((freelancer) => (
                            <SelectItem key={freelancer._id.toString()} value={freelancer._id.toString()}>
                              {freelancer.name} ({freelancer.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="baseAmount">Base Amount ({selectedCurrency}) *</Label>
                    <Input
                      id="baseAmount"
                      type="number"
                      step="0.01"
                      value={formData.baseAmount}
                      onChange={(e) => setFormData((prev) => ({ ...prev, baseAmount: e.target.value }))}
                      required
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bonus">Bonus ({selectedCurrency})</Label>
                    <Input
                      id="bonus"
                      type="number"
                      step="0.01"
                      value={formData.bonus}
                      onChange={(e) => setFormData((prev) => ({ ...prev, bonus: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deductions">Deductions ({selectedCurrency})</Label>
                    <Input
                      id="deductions"
                      type="number"
                      step="0.01"
                      value={formData.deductions}
                      onChange={(e) => setFormData((prev) => ({ ...prev, deductions: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Total Amount ({selectedCurrency})</Label>
                  <Input value={formatCurrencyValue(totalAmount, selectedCurrency)} readOnly />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="breakdown">Calculation Breakdown *</Label>
                  <Textarea
                    id="breakdown"
                    value={formData.breakdown}
                    onChange={(e) => setFormData((prev) => ({ ...prev, breakdown: e.target.value }))}
                    required
                    placeholder="e.g., Base: 10,000 | Commission: 5% | Total: 500"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes or context"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createRequest.isPending}>
                    {createRequest.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Submit Request
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {isAdminOrHod ? "All Credit History" : "My Credit History"} ({requestsToDisplay?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!requestsToDisplay || requestsToDisplay.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No credit history yet</h3>
              <p className="text-muted-foreground mb-4">Submit your first credit request to get started</p>
              {canInitiate && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Credit Request
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {requestsToDisplay.map((request) => {
                const requestCurrency = request.currency || getUserCurrency(request.user);
                return (
                <div key={request._id?.toString()} className="border rounded-lg p-4 hover:bg-muted/40 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">
                          {request.type === "policy" ? "Policy-Based Request" : "Freelancer Amount"}
                        </h3>
                        <Badge className={`${statusColors[request.status] || statusColors.pending_signature} flex items-center gap-1`}>
                          {getStatusIcon(request.status)}
                          {statusLabels[request.status] || request.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        For: {request.user?.name} ({request.user?.email})
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">{formatCurrencyValue(request.amount, requestCurrency)}</p>
                      <p className="text-xs text-muted-foreground">Base: {formatCurrencyValue(request.baseAmount, requestCurrency)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                    {request.type === "policy" && request.policy && (
                      <div>
                        <p className="font-medium text-muted-foreground mb-1">Policy</p>
                        <p className="text-foreground">{request.policy.name}</p>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-muted-foreground mb-1">Submitted By</p>
                      <p className="text-foreground">{request.initiator?.name}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground mb-1">Breakdown</p>
                      <p className="text-foreground">{request.calculationBreakdown}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground mb-1">Date</p>
                      <p className="text-foreground">{new Date(request.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {request.notes && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-muted-foreground">{request.notes}</p>
                    </div>
                  )}
                </div>
              )})}
            </div>
          )}
        </CardContent>
      </Card>

      {!isAdminOrHod && canInitiate && (
        <Card>
          <CardHeader>
            <CardTitle>My Initiated Requests ({mySubmissions?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {!mySubmissions || mySubmissions.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No submissions yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {mySubmissions.map((request) => (
                  <div key={request._id?.toString()} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{request.user?.name}</p>
                        <p className="text-sm text-muted-foreground">{request.policy?.name || "Freelancer"}</p>
                      </div>
                      <Badge className={`${statusColors[request.status] || statusColors.pending_signature} flex items-center gap-1`}>
                        {getStatusIcon(request.status)}
                        {statusLabels[request.status] || request.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Amount: {formatCurrencyValue(request.amount, request.currency || getUserCurrency(request.user))} - {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}



