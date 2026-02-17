import { getLoginUrl } from "@/const";
import { ApiError, api, buildQueryKey, setSessionToken } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
export function useAuth(options) {
    const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } = options ?? {};
    const queryClient = useQueryClient();
    const meQuery = api.auth.me.useQuery(undefined, {
        retry: false,
        refetchOnWindowFocus: false,
    });
    const logoutMutation = api.auth.logout.useMutation({
        onSuccess: () => {
            queryClient.setQueryData(buildQueryKey("auth.me", undefined), null);
        },
    });
    const logout = useCallback(async () => {
        try {
            await logoutMutation.mutateAsync();
        }
        catch (error) {
            if (error instanceof ApiError && error.status === 401) {
                return;
            }
            throw error;
        }
        finally {
            setSessionToken(null);
            queryClient.setQueryData(buildQueryKey("auth.me", undefined), null);
            await queryClient.invalidateQueries({ queryKey: ["auth.me"] });
        }
    }, [logoutMutation, queryClient]);
    const state = useMemo(() => {
        return {
            user: meQuery.data ?? null,
            loading: meQuery.isLoading || logoutMutation.isPending,
            error: meQuery.error ?? logoutMutation.error ?? null,
            isAuthenticated: Boolean(meQuery.data),
        };
    }, [
        meQuery.data,
        meQuery.error,
        meQuery.isLoading,
        logoutMutation.error,
        logoutMutation.isPending,
    ]);
    useEffect(() => {
        if (!redirectOnUnauthenticated)
            return;
        if (meQuery.isLoading || logoutMutation.isPending)
            return;
        if (state.user)
            return;
        if (typeof window === "undefined")
            return;
        if (window.location.pathname === redirectPath)
            return;
        window.location.href = redirectPath;
    }, [
        redirectOnUnauthenticated,
        redirectPath,
        logoutMutation.isPending,
        meQuery.isLoading,
        state.user,
    ]);
    return {
        ...state,
        refresh: () => meQuery.refetch(),
        logout,
    };
}

