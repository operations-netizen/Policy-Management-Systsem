import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { formatCurrencyValue } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { FileText, Loader2, Search, UserRound, Wallet } from "lucide-react";

const DEFAULT_PLACEHOLDER_PARTS = ["users", "policies", "requests"];

export default function GlobalSearchCommand({
  open = false, 
  onOpenChange,
  placeholderParts = DEFAULT_PLACEHOLDER_PARTS,
  showSections = { users: true, policies: true, requests: true },
  className,
}) {
  const [, setLocation] = useLocation();
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const normalizedPlaceholderParts = useMemo(() => {
    const unique = Array.from(new Set((placeholderParts || []).map((part) => String(part).trim()).filter(Boolean)));
    return unique.length > 0 ? unique : DEFAULT_PLACEHOLDER_PARTS;
  }, [placeholderParts]);

  const canShowUsers = showSections?.users !== false;
  const canShowPolicies = showSections?.policies !== false;
  const canShowRequests = showSections?.requests !== false;

  const inputPlaceholder = useMemo(
    () => `Search ${normalizedPlaceholderParts.join(", ")}...`,
    [normalizedPlaceholderParts],
  );
  const dialogDescription = useMemo(
    () => `Search ${normalizedPlaceholderParts.join(", ")}.`,
    [normalizedPlaceholderParts],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    setIsDropdownOpen(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    onOpenChange?.(false);
  }, [open, onOpenChange]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!containerRef.current) {
        return;
      }
      if (!containerRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 220);

    return () => clearTimeout(timer);
  }, [query]);

  const canSearch = debouncedQuery.length >= 2;

  const { data, isLoading } = api.search.global.useQuery(
    { q: debouncedQuery, limit: 6 },
    {
      enabled: canSearch,
      staleTime: 15_000,
    },
  );

  const visibleCounts = useMemo(() => {
    return {
      users: canShowUsers ? data?.users?.length || 0 : 0,
      policies: canShowPolicies ? data?.policies?.length || 0 : 0,
      requests: canShowRequests ? data?.requests?.length || 0 : 0,
    };
  }, [canShowUsers, canShowPolicies, canShowRequests, data]);

  const firstResultRoute = useMemo(() => {
    if (visibleCounts.users > 0) {
      return data?.users?.[0]?.route || "";
    }
    if (visibleCounts.policies > 0) {
      return data?.policies?.[0]?.route || "";
    }
    if (visibleCounts.requests > 0) {
      return data?.requests?.[0]?.route || "";
    }
    return "";
  }, [data, visibleCounts.policies, visibleCounts.requests, visibleCounts.users]);

  const hasResults = useMemo(() => {
    if (!data) return false;
    return visibleCounts.users + visibleCounts.policies + visibleCounts.requests > 0;
  }, [data, visibleCounts]);

  const handleSelect = (route) => {
    if (!route) return;
    setLocation(route);
    setIsDropdownOpen(false);
    setQuery("");
    setDebouncedQuery("");
  };

  const handleInputKeyDown = (event) => {
    if (event.key === "Escape") {
      setIsDropdownOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (event.key === "Enter" && firstResultRoute) {
      event.preventDefault();
      handleSelect(firstResultRoute);
    }
  };

  const showPanel = isDropdownOpen;

  return (
    <div ref={containerRef} className={cn("relative w-full max-w-xl", className)}>
      <div className="inline-flex h-10 w-full items-center gap-2 rounded-xl border border-border/70 bg-card px-3 text-left shadow-sm transition-colors focus-within:border-ring/60 focus-within:bg-accent/30">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsDropdownOpen(true)}
          onKeyDown={handleInputKeyDown}
          placeholder={inputPlaceholder}
          aria-label={dialogDescription}
          className="h-full w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setIsDropdownOpen(true);
            inputRef.current?.focus();
          }}
          className="ml-auto hidden rounded border border-border/70 bg-muted/50 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground md:inline-flex"
          aria-label="Focus global search"
        >
          Ctrl+K
        </button>
      </div>

      {showPanel ? (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-full overflow-hidden rounded-xl border border-border/70 bg-popover shadow-xl">
          <div className="max-h-[430px] overflow-y-auto py-1">
            {!canSearch ? (
              <div className="px-4 py-8 text-sm text-muted-foreground">
                Type at least 2 characters to start searching.
              </div>
            ) : null}

            {isLoading ? (
              <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching workspace...
              </div>
            ) : null}

            {canSearch && !isLoading && !hasResults ? (
              <div className="px-4 py-8 text-sm text-muted-foreground">No results found.</div>
            ) : null}

            {canShowUsers && visibleCounts.users > 0 ? (
              <div>
                <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Users
                </p>
                <div className="space-y-0.5 px-1 pb-2">
                  {data.users.map((item) => (
                    <button
                      key={`user-${item.id}`}
                      type="button"
                      onClick={() => handleSelect(item.route)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                    >
                      <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item.label}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        User
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {visibleCounts.users > 0 && (visibleCounts.policies > 0 || visibleCounts.requests > 0) ? (
              <div className="mx-2 h-px bg-border" />
            ) : null}

            {canShowPolicies && visibleCounts.policies > 0 ? (
              <div>
                <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Policies
                </p>
                <div className="space-y-0.5 px-1 pb-2">
                  {data.policies.map((item) => (
                    <button
                      key={`policy-${item.id}`}
                      type="button"
                      onClick={() => handleSelect(item.route)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item.label}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Policy
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {visibleCounts.policies > 0 && visibleCounts.requests > 0 ? (
              <div className="mx-2 h-px bg-border" />
            ) : null}

            {canShowRequests && visibleCounts.requests > 0 ? (
              <div>
                <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Requests
                </p>
                <div className="space-y-0.5 px-1 pb-2">
                  {data.requests.map((item) => (
                    <button
                      key={`request-${item.id}`}
                      type="button"
                      onClick={() => handleSelect(item.route)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                    >
                      <Wallet className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item.label}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {formatCurrencyValue(item.amount || 0, item.currency || "USD")}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {canSearch && !isLoading && hasResults ? (
              <div className="flex items-center gap-2 border-t px-3 py-2 text-xs text-muted-foreground">
                <Search className="h-3.5 w-3.5" />
                Press Enter to open the first result
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
