import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Login from "./pages/Login";
import AdminSignup from "./pages/AdminSignup";
import Dashboard from "./pages/Dashboard";
import MyAccount from "./pages/MyAccount";
import EmployeeManagement from "./pages/EmployeeManagement";
import Transactions from "./pages/Transactions";
import Reports from "./pages/Reports";
import AuditLogs from "./pages/AuditLogs";
import UserManagement from "./pages/UserManagement";
import Policies from "./pages/Policies";
import Approvals from "./pages/Approvals";
import AccountsManager from "./pages/AccountsManager";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import { useAuth } from "./_core/hooks/useAuth";
import { useEffect } from "react";
import { toast } from "sonner";
import { FRONTEND_SYNC_VERSION_REQUIRED } from "@shared/sync";

const DEV_API_FALLBACK = "http://localhost:3001";
const API_BASE = (
    import.meta?.env?.VITE_API_URL
    || (import.meta?.env?.DEV ? DEV_API_FALLBACK : "")
).trim().replace(/\/+$/, "");

function Router() {
    const { isAuthenticated, loading } = useAuth();
    useEffect(() => {
        let cancelled = false;
        const syncUrl = `${API_BASE}/api/system/sync-status`;

        const checkSync = async () => {
            try {
                const response = await fetch(syncUrl, { credentials: "include" });
                if (!response.ok) {
                    return;
                }
                const payload = await response.json();
                if (cancelled) {
                    return;
                }

                const backendRequiredFrontend = payload?.sync?.frontendInSyncRequiredVersion || "";
                const frontendVersionInSync = !backendRequiredFrontend
                    || backendRequiredFrontend === FRONTEND_SYNC_VERSION_REQUIRED;
                const dbSchemaInSync = payload?.sync?.dbSchemaInSync !== false;

                if (!frontendVersionInSync || !dbSchemaInSync) {
                    toast.error("System sync warning: frontend/backend/database versions are not aligned.", {
                        id: "system-sync-warning",
                        duration: 12000,
                    });
                    console.warn("[Sync] Version mismatch detected", {
                        frontendVersion: FRONTEND_SYNC_VERSION_REQUIRED,
                        backendRequiredFrontend,
                        dbSchemaInSync,
                        payload,
                    });
                }
            }
            catch (error) {
                console.warn("[Sync] Unable to check sync status", error);
            }
        };

        checkSync();
        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) {
        return (<div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-primary/30 border-t-primary"></div>
          <p className="text-muted-foreground">Loading workspace...</p>
        </div>
      </div>);
    }  
    if (!isAuthenticated) {
        return (<Switch>
        <Route path="/login" component={Login}/>
        <Route path="/admin-signup" component={AdminSignup}/>
        <Route path="*">
          {() => <Redirect to="/login"/>}
        </Route>
      </Switch>);
    }
    return (<DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard}/>
        <Route path="/dashboard" component={Dashboard}/>
        <Route path="/login">
          {() => <Redirect to="/"/>}
        </Route>
        <Route path="/admin-signup">
          {() => <Redirect to="/"/>}
        </Route>
        <Route path="/my-account" component={MyAccount}/>
        <Route path="/employees" component={EmployeeManagement}/>
        <Route path="/transactions" component={Transactions}/>
        <Route path="/reports" component={Reports}/>
        <Route path="/notifications" component={Notifications}/>
        <Route path="/profile" component={Profile}/>
        <Route path="/audit-logs" component={AuditLogs}/>
        <Route path="/user-management" component={UserManagement}/>
        <Route path="/policies" component={Policies}/>
        <Route path="/approvals" component={Approvals}/>
        <Route path="/accounts" component={AccountsManager}/>
        <Route path="/404" component={NotFound}/>
        <Route component={NotFound}/>
      </Switch>
    </DashboardLayout>);
}
function App() {
    return (<ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>);
}
export default App;
 
