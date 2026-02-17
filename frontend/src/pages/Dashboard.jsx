import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader, PageShell, KpiCard } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatCurrencyValue, getUserCurrency } from "@/lib/currency";
import {
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Loader2,
  TrendingUp,
  Users,
} from "lucide-react";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { data: stats, isLoading } = api.dashboard.getStats.useQuery();

  if (authLoading || isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
 
  if (!user) return null;

  const role = user.role;
  const userCurrency = stats?.currency || getUserCurrency(user);

  const roleCards = {
    admin: [
      { title: "Total Users", value: stats?.totalUsers ?? 0, hint: "System-wide users", icon: Users, tone: "primary" },
      { title: "Total HODs", value: stats?.totalHods ?? 0, hint: "Department heads", icon: Users, tone: "neutral" },
      {
        title: "Pending Approvals",
        value: stats?.pendingApprovals ?? 0,
        hint: "Awaiting manager action",
        icon: Clock,
        tone: "warning",
      },
      {
        title: "Pending Redemptions",
        value: stats?.pendingRedemptions ?? 0,
        hint: "Waiting for accounts",
        icon: DollarSign,
        tone: "success",
      },
    ],
    hod: [
      { title: "Team Size", value: stats?.teamSize ?? 0, hint: "Direct reports", icon: Users, tone: "primary" },
      {
        title: "Active Policies",
        value: stats?.activePolicies ?? 0,
        hint: "Policies in effect",
        icon: FileText,
        tone: "neutral",
      },
      {
        title: "Pending Approvals",
        value: stats?.pendingApprovals ?? 0,
        hint: "Needs your review",
        icon: Clock,
        tone: "warning",
      },
    ],
    account: [
      {
        title: "Pending Redemptions",
        value: stats?.pendingRedemptions ?? 0,
        hint: "To be paid",
        icon: Clock,
        tone: "warning",
      },
      {
        title: "Processing Today",
        value: stats?.processingToday ?? 0,
        hint: "In current queue",
        icon: DollarSign,
        tone: "primary",
      },
      {
        title: "Completed This Month",
        value: stats?.completedThisMonth ?? 0,
        hint: "Successfully processed",
        icon: CheckCircle,
        tone: "success",
      },
    ],
    employee: [
      {
        title: "Wallet Balance",
        value: formatCurrencyValue(stats?.walletBalance ?? 0, userCurrency),
        hint: "Available for redemption",
        icon: DollarSign,
        tone: "success",
      },
      {
        title: "Pending Reviews",
        value: stats?.pendingReviews ?? 0,
        hint: "Awaiting approvals",
        icon: Clock,
        tone: "warning",
      },
      {
        title: "Active Policies",
        value: stats?.activePolicies ?? 0,
        hint: "Assigned to you",
        icon: FileText,
        tone: "neutral",
      },
      {
        title: "This Month Earnings",
        value: formatCurrencyValue(stats?.thisMonthEarnings ?? 0, userCurrency),
        hint: "Credits this month",
        icon: TrendingUp,
        tone: "primary",
      },
    ],
  };

  const cards = roleCards[role] || [];

  return (
    <PageShell>
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${user.name || user.email}`}
      />

      <div className={`grid gap-4 md:grid-cols-2 ${cards.length > 3 ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
        {cards.map((card) => (
          <KpiCard
            key={card.title}
            title={card.title}
            value={card.value}
            hint={card.hint}
            icon={card.icon}
            tone={card.tone}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Operational Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
          <p>
            Role: <span className="font-semibold text-foreground">{role.toUpperCase()}</span>
          </p>
          <p>
            Currency: <span className="font-semibold text-foreground">{userCurrency}</span>
          </p>
        </CardContent>
      </Card>
    </PageShell>
  );
}
