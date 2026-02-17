import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { api } from "@/lib/api";
import {
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarCheck2,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Settings,
  Shield,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import GlobalSearchCommand from "./GlobalSearchCommand";
import { Button } from "./ui/button";

const getMenuItems = (
  role,
  { showEmployeeManagement = false, showEmployeeApprovals = false } = {},
) => {
  const items = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/", roles: ["admin", "hod", "account", "employee"] },
    { icon: User, label: "My Account", path: "/my-account", roles: ["employee"] },
    { icon: Users, label: "Employee Management", path: "/employees", roles: ["admin", "hod"] },
    { icon: Wallet, label: "Transactions", path: "/transactions", roles: ["admin", "hod", "employee"] },
    { icon: BarChart3, label: "Reports", path: "/reports", roles: ["admin", "hod"] },
    { icon: Shield, label: "Audit Logs", path: "/audit-logs", roles: ["admin", "hod"] },
    { icon: Settings, label: "User Management", path: "/user-management", roles: ["admin", "hod"] },
    { icon: BookOpen, label: "Policies", path: "/policies", roles: ["admin", "hod"] },
    { icon: CalendarCheck2, label: "Approvals", path: "/approvals", roles: ["admin", "hod"] },
    { icon: BriefcaseBusiness, label: "Accounts", path: "/accounts", roles: ["admin", "account"] },
  ];

  return items.filter(
    (item) =>
      item.roles.includes(role) ||
      (item.path === "/employees" && showEmployeeManagement) ||
      (item.path === "/approvals" && showEmployeeApprovals),
  );
};

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 272;
const MIN_WIDTH = 220;
const MAX_WIDTH = 420;

export default function DashboardLayout({ children }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight">Sign in to continue</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Access to this dashboard requires authentication.
          </p>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="mt-6 w-full"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": `${sidebarWidth}px`,
      }}
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({ children, setSidebarWidth }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const [isResizing, setIsResizing] = useState(false);
  const [searchFocusRequested, setSearchFocusRequested] = useState(false);
  const sidebarRef = useRef(null);
  const isMobile = useIsMobile();

  const isCollapsed = state === "collapsed";
  const isManager = user?.role === "admin" || user?.role === "hod";

  const { data: unreadData } = api.notifications.getUnreadCount.useQuery(undefined, {
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: "always",
  });

  const { data: initiatorTeam } = api.team.getMyTeam.useQuery(undefined, {
    enabled: !!user && !isManager,
  });

  const canSeeEmployeeManagement = isManager || (initiatorTeam?.length ?? 0) > 0;
  const canSeeEmployeeApprovals = user?.role === "employee";

  const menuItems = getMenuItems(user?.role || "user", {
    showEmployeeManagement: canSeeEmployeeManagement,
    showEmployeeApprovals: canSeeEmployeeApprovals,
  });
  const globalSearchConfig = useMemo(() => {
    if (user?.role === "admin" || user?.role === "hod") {
      return {
        placeholderParts: ["users", "policies", "requests"],
        showSections: { users: true, policies: true, requests: true },
      };
    }
    if (user?.role === "account") {
      return {
        placeholderParts: ["users", "policies", "approved requests"],
        showSections: { users: true, policies: true, requests: true },
      };
    }
    if (user?.role === "employee") {
      return {
        placeholderParts: canSeeEmployeeManagement
          ? ["employees", "policies", "requests"]
          : ["policies", "requests"],
        showSections: {
          users: canSeeEmployeeManagement,
          policies: true,
          requests: true,
        },
      };
    }

    return {
      placeholderParts: ["policies", "requests"],
      showSections: { users: false, policies: true, requests: true },
    };
  }, [canSeeEmployeeManagement, user?.role]);
  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = event.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchFocusRequested(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const unreadCount = unreadData?.count || 0;

  return (
    <>
      <div ref={sidebarRef} className="relative">
        <Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}>
          <SidebarHeader className="h-16 border-b border-sidebar-border/60 px-3">
            <div className="flex h-full items-center gap-3">
              <button
                onClick={toggleSidebar}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
              <div className="flex min-w-0 items-center gap-3 group-data-[collapsible=icon]:hidden">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
                  D
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold tracking-wide text-sidebar-foreground">DWS</p>
                  <p className="text-xs text-sidebar-foreground/60">Operations Workspace</p>
                </div>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="px-2 py-4">
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 rounded-xl px-3 font-medium ${
                        isActive
                          ? "bg-sidebar-primary/20 text-sidebar-foreground"
                          : "text-sidebar-foreground/75"
                      }`}
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? "text-sidebar-primary" : ""}`} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border/60 p-3">
            <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/55 p-2.5 group-data-[collapsible=icon]:justify-center">
              <Avatar className="h-8 w-8 border border-sidebar-border">
                <AvatarFallback className="bg-sidebar-primary/25 text-xs font-semibold text-sidebar-foreground">
                  {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                <p className="truncate text-sm font-semibold text-sidebar-foreground">{user?.name || "-"}</p>
                <p className="truncate text-xs text-sidebar-foreground/60">{user?.email || "-"}</p>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div
          className={`absolute top-0 right-0 h-full w-1 cursor-col-resize transition-colors hover:bg-primary/30 ${
            isCollapsed ? "hidden" : ""
          }`}
          onMouseDown={() => {
            if (!isCollapsed) {
              setIsResizing(true);
            }
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        <div className="sticky top-0 z-40 border-b border-border/70 bg-white">
          <div className="flex h-16 items-center gap-2 px-3 md:gap-3 md:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
              {isMobile ? (
                <SidebarTrigger className="h-9 w-9 rounded-lg border border-border/70 bg-card" />
              ) : null}
              <GlobalSearchCommand
                open={searchFocusRequested}
                onOpenChange={setSearchFocusRequested}
                placeholderParts={globalSearchConfig.placeholderParts}
                showSections={globalSearchConfig.showSections}
                className="w-full max-w-xl"
              />
            </div>

            <div className="flex items-center gap-1.5 md:gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 rounded-md text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                onClick={() => setLocation("/notifications")}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 ? (
                  <span className="absolute -top-1 -right-1 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-destructive p-0 text-[10px] font-bold leading-none text-destructive-foreground">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex h-9 items-center gap-2 rounded-md px-1.5 pr-1.5 text-foreground transition-colors hover:bg-accent/35">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-emerald-500 text-xs font-semibold text-white">
                        {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden max-w-[160px] truncate text-sm font-semibold md:block">
                      {user?.name || "Profile"}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 overflow-hidden p-0">
                  <div className="border-b border-border/70 bg-muted/30 px-3 py-2.5">
                    <p className="truncate text-sm font-semibold">{user?.name || "Profile"}</p>
                    <p className="truncate text-xs text-muted-foreground">{user?.email || "-"}</p>
                    <p className="mt-1 text-[11px] font-medium text-primary/80">{user?.role || "user"}</p>
                  </div>
                  <div className="p-1.5">
                    <DropdownMenuItem onClick={() => setLocation("/profile")} className="cursor-pointer rounded-md">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile Settings</span>
                    </DropdownMenuItem>
                  </div>
                  <DropdownMenuSeparator />
                  <div className="p-1.5 pt-0">
                    <DropdownMenuItem
                      onClick={logout}
                      className="cursor-pointer rounded-md text-destructive focus:text-destructive"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <main className="flex-1 p-4 md:p-6 lg:p-7">{children}</main>
      </SidebarInset>
    </>
  );
}
