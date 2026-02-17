import { cn } from "@/lib/utils";

export function PageShell({ className, children }) {
  return <div className={cn("page-shell", className)}>{children}</div>;
}

export function PageHeader({ title, description, action, className }) {
  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-start md:justify-between", className)}>
      <div>
        <h1 className="page-title">{title}</h1>
        {description ? <p className="page-subtitle">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function KpiCard({ title, value, hint, icon: Icon, tone = "primary", className }) {
  const toneClasses = {
    primary: "text-primary bg-primary/10",
    success: "text-emerald-600 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/40",
    warning: "text-amber-600 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40",
    neutral: "text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-800/70",
  };

  return (
    <div className={cn("metric-card card-hover rounded-2xl border bg-card p-5", className)}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {Icon ? (
          <div className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl", toneClasses[tone] || toneClasses.primary)}>
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
