import { useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, CheckCircle, DollarSign, User, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrencyValue, getUserCurrency, normalizeCurrency } from "@/lib/currency";
import { PageShell } from "@/components/layout/PageLayout";
export default function AccountsManager() {
    const [selectedRedemption, setSelectedRedemption] = useState(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [paymentReference, setPaymentReference] = useState("");
    const [paymentNotes, setPaymentNotes] = useState("");
    const [paymentCurrency, setPaymentCurrency] = useState("INR");
    const { data: redemptionQueue, isLoading, refetch } = api.redemption.getQueue.useQuery();
    const processRedemption = api.redemption.process.useMutation({
        onSuccess: () => {
            toast.success("Redemption processed successfully");
            setIsDialogOpen(false); 
            setSelectedRedemption(null);
            setPaymentReference("");
            setPaymentNotes("");
            setPaymentCurrency("INR");
            refetch(); 
        }, 
        onError: (error) => {
            toast.error(error.message);
        },
    });
    const getExpectedCurrency = (redemption) => normalizeCurrency(redemption?.currency, getUserCurrency(redemption?.user));
    const handleProcess = (redemption) => {
        setSelectedRedemption(redemption);
        setPaymentCurrency(getExpectedCurrency(redemption));
        setIsDialogOpen(true);
    };
    const confirmProcess = () => {
        if (!paymentReference.trim()) {
            toast.error("Please provide a payment/transaction reference");
            return;
        }
        const expectedCurrency = getExpectedCurrency(selectedRedemption);
        if (paymentCurrency !== expectedCurrency) {
            toast.error(`This request must be processed in ${expectedCurrency}`);
            setPaymentCurrency(expectedCurrency);
            return;
        }
        processRedemption.mutate({
            requestId: selectedRedemption._id.toString(),
            transactionReference: paymentReference,
            paymentNotes: paymentNotes || undefined,
            paymentCurrency,
        });
    };
    const getEmployeeTypeLabel = (employeeType) => {
        switch (employeeType) {
            case "freelancer_usa":
                return "Freelancer (USA)";
            case "freelancer_india":
                return "Freelancer (India)";
            case "permanent_usa":
                return "Permanent (USA)";
            case "permanent_india":
                return "Permanent (India)";
            default:
                return "Employee";
        }
    };
    const getStatusColor = (status) => {
        const colors = {
            pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
            completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        };
        return colors[status] || colors.pending;
    };
    const pendingRedemptions = redemptionQueue?.filter((r) => r.status === 'pending') || [];
    const completedRedemptions = redemptionQueue?.filter((r) => r.status === 'completed') || [];
    if (isLoading) {
        return (<div className="flex justify-center items-center min-h-100">
        <Loader2 className="w-8 h-8 animate-spin text-primary"/>
      </div>);
    }
    return (<PageShell>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Redemption Management</h1>
        <p className="text-muted-foreground mt-1">Process redemption requests and manage payments</p>
      </div>

      <div className="grid gap-6">
        {/* Pending Redemptions */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Redemptions ({pendingRedemptions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingRedemptions.length === 0 ? (<div className="text-center py-12">
                <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4"/>
                <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                <p className="text-muted-foreground">No pending redemptions at the moment</p>
              </div>) : (<div className="space-y-4">
                {pendingRedemptions.map((redemption) => (<div key={redemption._id?.toString()} className="border rounded-lg p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <User className="w-5 h-5 text-muted-foreground"/>
                          <div>
                            <p className="font-semibold">{redemption.user?.name}</p>
                            <p className="text-sm text-muted-foreground">{redemption.user?.email}</p>
                          </div>
                        </div>
                        <Badge className={`${getStatusColor(redemption.status)} flex items-center gap-1 w-fit`}>
                          PENDING PAYMENT
                        </Badge>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{getEmployeeTypeLabel(redemption.user?.employeeType)}</Badge>
                          <Badge variant="secondary">{getExpectedCurrency(redemption)}</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-green-600">{formatCurrencyValue(redemption.amount, getExpectedCurrency(redemption))}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Requested {new Date(redemption.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {redemption.notes && (<div className="mb-4 p-3 bg-muted/50 rounded-md">
                        <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
                        <p className="text-sm text-foreground">{redemption.notes}</p>
                      </div>)}

                    <div className="flex gap-3 pt-4 border-t">
                      <Button onClick={() => handleProcess(redemption)} className="flex-1" disabled={processRedemption.isPending}>
                        <DollarSign className="w-4 h-4 mr-2"/>
                        Process Payment
                      </Button>
                    </div>
                  </div>))}
              </div>)}
          </CardContent>
        </Card>

        {/* Completed Redemptions */}
        <Card>
          <CardHeader>
            <CardTitle>Recently Completed ({completedRedemptions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {completedRedemptions.length === 0 ? (<div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4"/>
                <h3 className="text-lg font-semibold mb-2">No completed redemptions yet</h3>
                <p className="text-muted-foreground">Completed payments will appear here</p>
              </div>) : (<div className="space-y-4">
                {completedRedemptions.slice(0, 5).map((redemption) => (<div key={redemption._id?.toString()} className="border rounded-lg p-5 bg-accent/10">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <User className="w-5 h-5 text-muted-foreground"/>
                          <div>
                            <p className="font-semibold">{redemption.user?.name}</p>
                            <p className="text-sm text-muted-foreground">{redemption.user?.email}</p>
                          </div>
                        </div>
                        <Badge className={`${getStatusColor(redemption.status)} flex items-center gap-1 w-fit`}>
                          <CheckCircle className="w-4 h-4"/>
                          COMPLETED
                        </Badge>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{getEmployeeTypeLabel(redemption.user?.employeeType)}</Badge>
                          <Badge variant="secondary">{getExpectedCurrency(redemption)}</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">{formatCurrencyValue(redemption.amount, getExpectedCurrency(redemption))}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Processed {new Date(redemption.processedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {redemption.transactionReference && (<div className="p-3 bg-muted/50 rounded-md">
                        <p className="text-sm font-medium text-muted-foreground mb-1">Transaction Reference</p>
                        <p className="text-sm text-foreground font-mono">{redemption.transactionReference}</p>
                        {redemption.paymentNotes && (<>
                            <p className="text-sm font-medium text-muted-foreground mt-2 mb-1">Payment Notes</p>
                            <p className="text-sm text-foreground">{redemption.paymentNotes}</p>
                          </>)}
                      </div>)}
                  </div>))}
              </div>)}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {selectedRedemption && (<div className="p-4 bg-accent/30 rounded-md space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Employee:</span>
                  <span className="text-sm">{selectedRedemption.user?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Amount:</span>
                  <span className="text-sm font-bold text-green-600">{formatCurrencyValue(selectedRedemption.amount, getExpectedCurrency(selectedRedemption))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Currency:</span>
                  <span className="text-sm">{getExpectedCurrency(selectedRedemption)}</span>
                </div>
                {selectedRedemption.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium mb-1">Notes:</p>
                    <p className="text-xs text-muted-foreground">{selectedRedemption.notes}</p>
                  </div>
                )}
              </div>)}

            <div className="space-y-2">
              <Label htmlFor="reference">Transaction Reference *</Label>
              <Input id="reference" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="e.g., TXN123456789" required/>
            </div>

            <div className="space-y-2">
              <Label>Payment Currency *</Label>
              <Select value={paymentCurrency} onValueChange={setPaymentCurrency} disabled={!selectedRedemption}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {selectedRedemption ? (
                    <SelectItem value={getExpectedCurrency(selectedRedemption)}>
                      {getExpectedCurrency(selectedRedemption)}
                    </SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Payment Notes (Optional)</Label>
              <Textarea id="notes" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} placeholder="Any additional notes about this payment..." rows={3}/>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => {
            setIsDialogOpen(false);
            setPaymentReference("");
            setPaymentNotes("");
            setPaymentCurrency("INR");
        }}>
                Cancel
              </Button>
              <Button onClick={confirmProcess} disabled={processRedemption.isPending}>
                {processRedemption.isPending && (<Loader2 className="w-4 h-4 mr-2 animate-spin"/>)}
                Confirm Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>);
}
