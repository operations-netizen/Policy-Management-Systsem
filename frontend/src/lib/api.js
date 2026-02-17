import { useMutation, useQuery } from "@tanstack/react-query";

export class ApiError extends Error {
    constructor(message, status, data) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.data = data;
    }
}

const SESSION_TOKEN_KEY = "ims_session_token";

export const getSessionToken = () => {
    if (typeof window === "undefined") {
        return null;
    }
    return window.localStorage.getItem(SESSION_TOKEN_KEY);
}; 
 
export const setSessionToken = (token) => {
    if (typeof window === "undefined") {
        return;
    }
    if (token) {
        window.localStorage.setItem(SESSION_TOKEN_KEY, token);
    }
    else {
        window.localStorage.removeItem(SESSION_TOKEN_KEY);
    }
};

const API_BASE = (import.meta?.env?.VITE_API_URL || "").trim().replace(/\/+$/, "");

const buildUrl = (path, query) => {
    const base = API_BASE;
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = `${base}${normalizedPath}${buildQueryString(query)}`;
    return url;
};

const buildQueryString = (params) => {
    if (!params) {
        return "";
    }
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) {
            return;
        }
        if (Array.isArray(value)) {
            value.forEach((item) => {
                if (item !== undefined && item !== null) {
                    search.append(key, String(item));
                }
            });
            return;
        }
        search.append(key, String(value));
    });
    const query = search.toString();
    return query ? `?${query}` : "";
};

export const buildQueryKey = (key, input) => [key, input ?? null];

const request = async (path, { method = "GET", body, query } = {}) => {
    const url = buildUrl(path, query);
    const headers = {};
    const sessionToken = getSessionToken();
    if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
    }
    let payload;
    if (body !== undefined) {
        headers["Content-Type"] = "application/json";
        payload = JSON.stringify(body);
    }
    const response = await fetch(url, {
        method,
        credentials: "include",
        headers,
        body: payload,
    });
    const contentType = response.headers.get("content-type") || "";
    let data = null;
    if (contentType.includes("application/json")) {
        data = await response.json();
    }
    else if (response.status !== 204) {
        data = await response.text();
    }
    if (!response.ok) {
        const message = typeof data === "string"
            ? data
            : data?.message || data?.error || response.statusText || "Request failed";
        throw new ApiError(message, response.status, data);
    }
    return data;
};

const get = (path, query) => request(path, { query });
const post = (path, body) => request(path, { method: "POST", body });
const patch = (path, body) => request(path, { method: "PATCH", body });
const del = (path) => request(path, { method: "DELETE" });
const uploadFiles = async (path, files) => {
    const formData = new FormData();
    (files || []).forEach((file) => {
        if (file) {
            formData.append("files", file);
        }
    });
    const headers = {};
    const sessionToken = getSessionToken();
    if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
    }
    const response = await fetch(buildUrl(path), {
        method: "POST",
        credentials: "include",
        headers,
        body: formData,
    });
    const contentType = response.headers.get("content-type") || "";
    let data = null;
    if (contentType.includes("application/json")) {
        data = await response.json();
    }
    else if (response.status !== 204) {
        data = await response.text();
    }
    if (!response.ok) {
        const message = typeof data === "string"
            ? data
            : data?.message || data?.error || response.statusText || "Request failed";
        throw new ApiError(message, response.status, data);
    }
    return data;
};

const createQuery = (key, fetcher) => ({
    useQuery: (input, options) =>
        useQuery({
            queryKey: buildQueryKey(key, input),
            queryFn: () => fetcher(input),
            ...options,
        }),
});

const createMutation = (mutator) => ({
    useMutation: (options) =>
        useMutation({
            mutationFn: (input) => mutator(input),
            ...options,
        }),
});

export const api = {
    auth: {
        me: createQuery("auth.me", () => get("/api/auth/me")),
        adminSetupStatus: createQuery("auth.adminSetupStatus", () => get("/api/auth/admin-setup-status")),
        adminSignup: createMutation((input) => post("/api/auth/admin-signup", input)),
        login: createMutation((input) => post("/api/auth/login", input)),
        logout: createMutation(() => post("/api/auth/logout")),
    },
    users: {
        getAll: createQuery("users.getAll", () => get("/api/users")),
        getById: createQuery("users.getById", (input) => get(`/api/users/${input?.id}`)),
        getByRole: createQuery("users.getByRole", (input) => get(`/api/users/role/${input?.role}`)),
        create: createMutation((input) => post("/api/users", input)),
        update: createMutation((input) => {
            const { id, ...payload } = input || {};
            return patch(`/api/users/${id}`, payload);
        }),
        delete: createMutation((input) => del(`/api/users/${input?.id}`)),
    },
    policies: {
        getAll: createQuery("policies.getAll", () => get("/api/policies")),
        getById: createQuery("policies.getById", (input) => get(`/api/policies/${input?.id}`)),
        create: createMutation((input) => post("/api/policies", input)),
        update: createMutation((input) => {
            const { id, ...payload } = input || {};
            return patch(`/api/policies/${id}`, payload);
        }),
        delete: createMutation((input) => del(`/api/policies/${input?.id}`)),
        uploadAttachments: createMutation((input) =>
            uploadFiles(`/api/policies/${input?.id}/attachments`, input?.files || []),
        ),
        deleteAttachment: createMutation((input) =>
            del(`/api/policies/${input?.id}/attachments/${input?.attachmentId}`),
        ),
    },
    team: {
        getMyTeam: createQuery("team.getMyTeam", () => get("/api/team/my")),
        getUserPolicies: createQuery("team.getUserPolicies", (input) =>
            get("/api/team/user-policies", input),
        ),
        assignPolicy: createMutation((input) => post("/api/team/assign-policy", input)),
        removePolicy: createMutation((input) => post("/api/team/remove-policy", input)),
    },
    creditRequests: {
        getInitiatorScope: createQuery("creditRequests.getInitiatorScope", () =>
            get("/api/credit-requests/initiator-scope"),
        ),
        getAll: createQuery("creditRequests.getAll", () => get("/api/credit-requests")),
        getMyRequests: createQuery("creditRequests.getMyRequests", () => get("/api/credit-requests/my")),
        getMySubmissions: createQuery("creditRequests.getMySubmissions", () =>
            get("/api/credit-requests/submissions"),
        ),
        getPendingApprovals: createQuery("creditRequests.getPendingApprovals", () =>
            get("/api/credit-requests/pending-approvals"),
        ),
        getById: createQuery("creditRequests.getById", (input) => get(`/api/credit-requests/${input?.id}`)),
        create: createMutation((input) => post("/api/credit-requests", input)),
        uploadAttachments: createMutation((input) =>
            uploadFiles("/api/credit-requests/attachments", input?.files || []),
        ),
        userSign: createMutation((input) => post("/api/credit-requests/sign", input)),
        userReject: createMutation((input) => post("/api/credit-requests/reject", input)),
        hodApprove: createMutation((input) => post("/api/credit-requests/approve", input)),
        hodReject: createMutation((input) => post("/api/credit-requests/reject-by-hod", input)),
        employeeApprove: createMutation((input) =>
            post("/api/credit-requests/approve-by-employee", input),
        ),
        employeeReject: createMutation((input) =>
            post("/api/credit-requests/reject-by-employee", input),
        ),
    },
    wallet: {
        getBalance: createQuery("wallet.getBalance", () => get("/api/wallet/balance")),
        getTransactions: createQuery("wallet.getTransactions", () => get("/api/wallet/transactions")),
    },
    redemption: {
        create: createMutation((input) => post("/api/redemption", input)),
        getMyRequests: createQuery("redemption.getMyRequests", () => get("/api/redemption/my")),
        getQueue: createQuery("redemption.getQueue", () => get("/api/redemption/queue")),
        process: createMutation((input) => post("/api/redemption/process", input)),
    },
    audit: {
        getLogs: createQuery("audit.getLogs", (input) => get("/api/audit", input)),
    },
    access: {
        grant: createMutation((input) => post("/api/access/grant", input)),
        revoke: createMutation((input) => post("/api/access/revoke", input)),
        getAll: createQuery("access.getAll", () => get("/api/access")),
        getMy: createQuery("access.getMy", () => get("/api/access/my")),
    },
    notifications: {
        getMy: createQuery("notifications.getMy", (input) => get("/api/notifications", input)),
        getUnreadCount: createQuery("notifications.getUnreadCount", () =>
            get("/api/notifications/unread-count"),
        ),
        markRead: createMutation((input) => post("/api/notifications/mark-read", input)),
        markAllRead: createMutation(() => post("/api/notifications/mark-all-read")),
    },
    reports: {
        getOverview: createQuery("reports.getOverview", (input) => get("/api/reports/overview", input)),
    },
    dashboard: {
        getStats: createQuery("dashboard.getStats", () => get("/api/dashboard/stats")),
    },
    search: {
        global: createQuery("search.global", (input) => get("/api/search/global", input)),
    },
};
