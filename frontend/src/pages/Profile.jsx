import { api } from "@/lib/api";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, Mail, Shield, Briefcase, Calendar, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getUserCurrency } from "@/lib/currency";
import { PageShell } from "@/components/layout/PageLayout";

const roleLabel = (role) => {
  switch (role) {
    case "admin":
      return "Admin";
    case "hod":
      return "HOD";
    case "account":
      return "Account";
    default:
      return "Employee";
  }
};
   
const employeeTypeLabel = (type) => {
  switch (type) {
    case "permanent_india":
      return "Permanent (India)";
    case "permanent_usa":
      return "Permanent (USA)";
    case "freelancer_india":
      return "Freelancer (India)";
    case "freelancer_usa":
      return "Freelancer (USA)";
    default:
      return "Permanent (India)";
  }
};

export default function Profile() {
  const { user } = useAuth();
  const hodQuery = api.users.getById.useQuery(
    { id: user?.hodId || "" },
    { enabled: Boolean(user?.hodId) }
  );

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PageShell>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground mt-1">View your account and role details</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-semibold">{user.name || "-"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-semibold">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <Badge variant="secondary">{roleLabel(user.role)}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Briefcase className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Employee Type</p>
                <Badge variant="outline">{employeeTypeLabel(user.employeeType)}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Currency</p>
                <Badge variant="outline">{getUserCurrency(user)}</Badge>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Last Signed In</p>
                <p className="font-semibold">
                  {user.lastSignedIn ? new Date(user.lastSignedIn).toLocaleString() : "-"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Account Created</p>
                <p className="font-semibold">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}
                </p>
              </div>
            </div>
          </div>

          {user.hodId && (
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground">Reporting HOD</p>
              {hodQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <p className="font-semibold">
                  {hodQuery.data?.name || hodQuery.data?.email || "-"}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
