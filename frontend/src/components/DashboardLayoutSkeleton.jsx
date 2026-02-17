import { Skeleton } from './ui/skeleton';
export function DashboardLayoutSkeleton() {
    return (<div className="flex min-h-screen bg-background">
      {/* Sidebar skeleton */}
      <div className="relative hidden w-[272px] border-r border-sidebar-border/60 bg-sidebar p-4 md:block">
        {/* Logo area */}
        <div className="flex items-center gap-3 px-2 py-1">
          <Skeleton className="h-8 w-8 rounded-lg bg-sidebar-accent"/>
          <Skeleton className="h-4 w-24 bg-sidebar-accent"/>
        </div>

        {/* Menu items */}
        <div className="mt-6 space-y-2 px-2">
          <Skeleton className="h-10 w-full rounded-xl bg-sidebar-accent"/>
          <Skeleton className="h-10 w-full rounded-xl bg-sidebar-accent"/>
          <Skeleton className="h-10 w-full rounded-xl bg-sidebar-accent"/>
          <Skeleton className="h-10 w-full rounded-xl bg-sidebar-accent"/>
        </div>
 
        {/* User profile area at bottom */}
        <div className="absolute bottom-4 left-4 right-4 rounded-xl bg-sidebar-accent p-2.5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full bg-sidebar-border"/>
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20 bg-sidebar-border"/>
              <Skeleton className="h-2 w-32 bg-sidebar-border"/>
            </div>
          </div>
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 space-y-4 p-4 md:p-6">
        {/* Content blocks */}
        <Skeleton className="h-14 w-full rounded-2xl"/>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 rounded-xl"/>
          <Skeleton className="h-32 rounded-xl"/>
          <Skeleton className="h-32 rounded-xl"/>
        </div>
        <Skeleton className="h-64 rounded-xl"/>
      </div>
    </div>);
}
