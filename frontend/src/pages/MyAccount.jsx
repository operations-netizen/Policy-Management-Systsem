import { useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Wallet, DollarSign, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { formatCurrencyValue, getUserCurrency } from "@/lib/currency";
import { PageShell } from "@/components/layout/PageLayout";
 
export default function MyAccount() {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRedemptionId, setSelectedRedemptionId] = useState("");
  const [redemptionNotes, setRedemptionNotes] = useState(""); 

  const { data: walletData, isLoading: walletLoading, refetch } = api.wallet.getBalance.useQuery();
  const { data: transactions, isLoading: txLoading } = api.wallet.getTransactions.useQuery();
  const { data: redemptions, isLoading: redemptionsLoading } = api.redemption.getMyRequests.useQuery();
  const walletCurrency = walletData?.currency || getUserCurrency(user);
  const redeemableTransactions = (transactions || []).filter(
    (tx) => tx.type === "credit" && tx.amount > 0 && !tx.redeemed
  );
 
  const requestRedemption = api.redemption.create.useMutation({
    onSuccess: () => {
      toast.success("Redemption request submitted successfully");
      setIsDialogOpen(false);
      setSelectedRedemptionId("");
      setRedemptionNotes("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleRedemptionRequest = () => {
    const selectedTransaction = redeemableTransactions.find((tx) => tx._id?.toString() === selectedRedemptionId);
    if (!selectedTransaction) {
      toast.error("Please select a redemption amount");
      return;
    }
    if (selectedTransaction.amount > (walletData?.balance || 0)) {
      toast.error("Insufficient balance");
      return;
    }
    requestRedemption.mutate({
      creditTransactionId: selectedTransaction._id?.toString(),
      notes: redemptionNotes || undefined,
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "processing":
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "rejected":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      processing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return colors[status] || colors.pending;
  };

  if (walletLoading || txLoading || redemptionsLoading) {
    return (
      <div className="flex justify-center items-center min-h-100">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PageShell>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Account</h1>
        <p className="text-muted-foreground mt-1">Manage your wallet and redemptions</p>
      </div>

      <Card className="bg-linear-to-br from-green-500 to-green-600 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Wallet className="w-6 h-6" />
            Wallet Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-5xl font-bold">{formatCurrencyValue(walletData?.balance || 0, walletCurrency)}</p>
              <p className="text-green-100 mt-2">Available for redemption ({walletCurrency})</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" size="lg" disabled={(walletData?.balance || 0) <= 0}>
                  <Send className="w-4 h-4 mr-2" />
                  Request Redemption
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Redemption</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="p-4 bg-accent/30 rounded-md">
                    <p className="text-sm text-muted-foreground">Available Balance</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrencyValue(walletData?.balance || 0, walletCurrency)}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Redemption Amount *</Label>
                    <Select value={selectedRedemptionId} onValueChange={setSelectedRedemptionId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select from credit history" />
                      </SelectTrigger>
                      <SelectContent>
                        {redeemableTransactions.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No credit history available
                          </SelectItem>
                        ) : (
                          redeemableTransactions.map((tx) => (
                            <SelectItem key={tx._id?.toString()} value={tx._id?.toString()}>
                              {formatCurrencyValue(tx.amount, tx.currency || walletCurrency)} - {tx.description || "Credit"} - {new Date(tx.createdAt).toLocaleDateString()}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Maximum: {formatCurrencyValue(walletData?.balance || 0, walletCurrency)}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={redemptionNotes}
                      onChange={(e) => setRedemptionNotes(e.target.value)}
                      placeholder="Add any additional information..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleRedemptionRequest} disabled={requestRedemption.isPending}>
                      {requestRedemption.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Submit Request
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Redemption Requests ({redemptions?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!redemptions || redemptions.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No redemption requests yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {redemptions.map((redemption) => (
                <div key={redemption._id?.toString()} className="border rounded-lg p-4 hover:bg-accent/30 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-lg">{formatCurrencyValue(redemption.amount, redemption.currency || walletCurrency)}</p>
                        <Badge className={`${getStatusColor(redemption.status)} flex items-center gap-1`}>
                          {getStatusIcon(redemption.status)}
                          {redemption.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Requested on {new Date(redemption.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {redemption.notes && <p className="text-sm text-muted-foreground mt-2">{redemption.notes}</p>}
                  {redemption.processedAt && (
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-green-600">
                        Processed on {new Date(redemption.processedAt).toLocaleDateString()}
                      </p>
                      {redemption.transactionReference && (
                        <p className="text-sm text-muted-foreground">
                          Transaction Reference:{" "}
                          <span className="font-mono text-foreground">{redemption.transactionReference}</span>
                        </p>
                      )}
                      {redemption.paymentNotes && (
                        <p className="text-sm text-muted-foreground">{redemption.paymentNotes}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History ({transactions?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!transactions || transactions.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx._id?.toString()} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-3">
                    {tx.type === "credit" ? (
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      </div>
                    ) : (
                      <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{tx.description}</p>
                      <p className="text-sm text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <p className={`text-lg font-bold ${tx.type === "credit" ? "text-green-600" : "text-red-600"}`}>
                    {tx.type === "credit" ? "+" : "-"}{formatCurrencyValue(Math.abs(tx.amount || 0), tx.currency || walletCurrency)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
