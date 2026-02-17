import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { z } from "zod";
import { COOKIE_NAME, UNAUTHED_ERR_MSG } from "./shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies.js";
import { authenticateRequest } from "./_core/auth.js";
import {  
    BadRequestError,
    ForbiddenError,
    HttpError,
    NotFoundError,
    UnauthorizedError,
} from "./shared/_core/errors.js";
import * as db from "./db.js";
import { createSignatureDocument } from "./ghl.js";
import {
    sendHodFreelancerRequestEmail,
    sendInitiatorFreelancerRejectionEmail,
    sendRedemptionRequestEmail,
    sendRedemptionProcessedEmail,
} from "./_core/email.js";
import { deleteGridFSFile, saveBufferToGridFS, streamGridFSFile } from "./_core/files.js";
import { buildTimelinePdf } from "./_core/pdf.js";
import { ENV } from "./_core/env.js";
import {
    CURRENCY_VALUES,
    formatCurrencyAmount,
    getCurrencyByEmployeeType,
    normalizeCurrency,
} from "./shared/currency.js";
import { API_SYNC_VERSION, DB_SCHEMA_VERSION, FRONTEND_SYNC_VERSION_REQUIRED } from "./shared/sync.js";
 
const ROLE_OPTIONS = ["admin", "hod", "employee", "account"];
const EMPLOYEE_TYPES = [
    "permanent_india",
    "permanent_usa",
    "freelancer_india",
    "freelancer_usa",
];

const POLICY_UPLOAD_DIR = path.resolve(process.cwd(), "uploads", "policies");
fs.mkdirSync(POLICY_UPLOAD_DIR, { recursive: true });
const POLICY_ALLOWED_MIME = new Set([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/gif",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const policyUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!POLICY_ALLOWED_MIME.has(file.mimetype)) {
            cb(BadRequestError("Unsupported file type."));
            return;
        }
        cb(null, true);
    },
});
const creditRequestUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!POLICY_ALLOWED_MIME.has(file.mimetype)) {
            cb(BadRequestError("Unsupported file type."));
            return;
        }
        cb(null, true);
    },
});

const normalizeEmployeeType = (type) => (type === "permanent" ? "permanent_india" : type);
const getUserCurrency = (user) => getCurrencyByEmployeeType(normalizeEmployeeType(user?.employeeType));
const formatMoney = (amount, currency) => formatCurrencyAmount(amount, normalizeCurrency(currency));

const asyncHandler = (handler) => (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
};

const parseInput = (schema, data) => {
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
        const message = parsed.error?.issues?.[0]?.message || "Invalid input";
        throw BadRequestError(message);
    }
    return parsed.data;
};

const attachUser = async (req) => {
    try {
        req.user = await authenticateRequest(req);
    }
    catch {
        req.user = null;
    }
};

const requireAuth = (req) => {
    if (!req.user) {
        throw UnauthorizedError(UNAUTHED_ERR_MSG);
    }
    return req.user;
};

const requireRole = (req, roles, message) => {
    const user = requireAuth(req);
    if (!roles.includes(user.role)) {
        throw ForbiddenError(message);
    }
    return user;
};

async function hydrateHods(users) {
    if (!users || users.length === 0) {
        return [];
    }
    const hodIds = Array.from(new Set(users.map((u) => u.hodId).filter(Boolean)));
    const hods = hodIds.length > 0 ? await db.getUsersByIds(hodIds) : [];
    const hodMap = new Map(hods.map((hod) => [hod._id.toString(), hod]));
    return users.map((user) => ({
        ...user,
        hod: user.hodId ? hodMap.get(user.hodId) || null : null,
    }));
}

async function hydrateFreelancerInitiators(users) {
    if (!users || users.length === 0) {
        return [];
    }
    const userIds = users.map((u) => u._id?.toString()).filter(Boolean);
    const initiatorLinks = await db.getEmployeeInitiatorsByEmployeeIds(userIds);
    const initiatorIds = Array.from(new Set(initiatorLinks.map((link) => link.initiatorId)));
    const initiators = initiatorIds.length > 0 ? await db.getUsersByIds(initiatorIds) : [];
    const initiatorMap = new Map(initiators.map((user) => [user._id.toString(), user]));
    const linksByEmployee = new Map();
    initiatorLinks.forEach((link) => {
        const list = linksByEmployee.get(link.employeeId) || [];
        const initiator = initiatorMap.get(link.initiatorId);
        if (initiator) {
            list.push(initiator);
        }
        linksByEmployee.set(link.employeeId, list);
    });
    return users.map((user) => ({
        ...user,
        freelancerInitiators: linksByEmployee.get(user._id.toString()) || [],
        freelancerInitiatorIds: (linksByEmployee.get(user._id.toString()) || []).map((init) => init._id.toString()),
    }));
}

async function hydratePolicyAssignments(users) {
    if (!users || users.length === 0) {
        return [];
    }
    const userIds = users.map((u) => u._id?.toString()).filter(Boolean);
    const assignments = await db.getEmployeePolicyAssignmentsByUserIds(userIds);
    if (assignments.length === 0) {
        return users.map((user) => ({ ...user, policyAssignments: [] }));
    }
    const policyIds = Array.from(new Set(assignments.map((a) => a.policyId)));
    const policies = await db.getPoliciesByIds(policyIds);
    const policyMap = new Map(policies.map((policy) => [policy._id.toString(), policy]));
    const assignmentIds = assignments.map((a) => a._id.toString());
    const initiatorLinks = await db.getPolicyInitiatorsByAssignmentIds(assignmentIds);
    const initiatorIds = Array.from(new Set(initiatorLinks.map((link) => link.initiatorId)));
    const initiators = initiatorIds.length > 0 ? await db.getUsersByIds(initiatorIds) : [];
    const initiatorMap = new Map(initiators.map((user) => [user._id.toString(), user]));
    const initiatorsByAssignment = new Map();
    initiatorLinks.forEach((link) => {
        const list = initiatorsByAssignment.get(link.assignmentId) || [];
        const initiator = initiatorMap.get(link.initiatorId);
        if (initiator) {
            list.push(initiator);
        }
        initiatorsByAssignment.set(link.assignmentId, list);
    });
    const assignmentsByUser = new Map();
    assignments.forEach((assignment) => {
        const list = assignmentsByUser.get(assignment.userId) || [];
        list.push({
            ...assignment,
            policy: policyMap.get(assignment.policyId) || null,
            initiators: initiatorsByAssignment.get(assignment._id.toString()) || [],
        });
        assignmentsByUser.set(assignment.userId, list);
    });
    return users.map((user) => ({
        ...user,
        policyAssignments: assignmentsByUser.get(user._id.toString()) || [],
    }));
}

async function hydrateCreditRequests(requests) {
    if (!requests || requests.length === 0) {
        return [];
    }
    const userIds = Array.from(
        new Set(
            requests
                .flatMap((request) => [request.userId, request.initiatorId, request.hodId])
                .filter(Boolean),
        ),
    );
    const policyIds = Array.from(new Set(requests.map((request) => request.policyId).filter(Boolean)));
    const users = userIds.length > 0 ? await db.getUsersByIds(userIds) : [];
    const policies = policyIds.length > 0 ? await db.getPoliciesByIds(policyIds) : [];
    const userMap = new Map(users.map((user) => [user._id.toString(), user]));
    const policyMap = new Map(policies.map((policy) => [policy._id.toString(), policy]));
    return requests.map((request) => ({
        ...request,
        user: userMap.get(request.userId) || null,
        initiator: userMap.get(request.initiatorId) || null,
        hod: request.hodId ? userMap.get(request.hodId) || null : null,
        policy: request.policyId ? policyMap.get(request.policyId) || null : null,
        currency: getUserCurrency(userMap.get(request.userId) || null),
    }));
}

async function hydrateRedemptionRequests(requests) {
    if (!requests || requests.length === 0) {
        return [];
    }
    const userIds = Array.from(new Set(requests.map((request) => request.userId).filter(Boolean)));
    const users = userIds.length > 0 ? await db.getUsersByIds(userIds) : [];
    const userMap = new Map(users.map((user) => [user._id.toString(), user]));
    return requests.map((request) => ({
        ...request,
        user: userMap.get(request.userId) || null,
        currency: getUserCurrency(userMap.get(request.userId) || null),
    }));
}

const buildTimelineEntry = ({ step, role, actor, signatureId, message, metadata }) => ({
    step,
    role,
    actorId: actor?.id || actor?._id?.toString(),
    actorName: actor?.name || "",
    actorEmail: actor?.email || "",
    signatureId,
    message,
    metadata,
    at: new Date(),
});

const appendTimelineEntry = (existing, entry) => [...(existing || []), entry];

export function createRestRouter() {
    const router = express.Router();

    router.use(
        asyncHandler(async (req, res, next) => {
            await attachUser(req);
            next();
        }),
    );

    // ==================== SYSTEM ====================
    router.get(
        "/health",
        asyncHandler((req, res) => {
            parseInput(
                z.object({
                    timestamp: z.coerce.number().min(0, "timestamp cannot be negative"),
                }),
                req.query,
            );
            res.json({ ok: true });
        }),
    );

    router.get(
        "/system/sync-status",
        asyncHandler(async (req, res) => {
            const dbState = await db.getDbSchemaVersionState(DB_SCHEMA_VERSION);
            res.json({
                ok: true,
                sync: {
                    frontendInSyncRequiredVersion: FRONTEND_SYNC_VERSION_REQUIRED,
                    dbSchemaInSync: dbState.compatible,
                },
                versions: {
                    apiSyncVersion: API_SYNC_VERSION,
                    dbSchemaRequired: DB_SCHEMA_VERSION,
                    dbSchemaCurrent: dbState.currentVersion,
                },
                db: {
                    connected: !dbState.skipped,
                },
                serverTime: new Date().toISOString(),
            });
        }),
    );

    // ==================== AUTH ====================
    router.get(
        "/auth/me",
        asyncHandler((req, res) => {
            res.json(req.user ?? null);
        }),
    );

    router.get(
        "/auth/admin-setup-status",
        asyncHandler(async (req, res) => {
            const adminExists = await db.hasAdminUser();
            res.json({ adminExists });
        }),
    );

    router.post(
        "/auth/admin-signup",
        asyncHandler(async (req, res) => {
            const input = parseInput(
                z.object({
                    name: z.string().min(1),
                    email: z.string().email(),
                    password: z.string().min(6),
                }),
                req.body,
            );
            const adminExists = await db.hasAdminUser();
            if (adminExists) {
                throw ForbiddenError("Admin account already exists.");
            }
            const existingUser = await db.getUserByEmail(input.email);
            if (existingUser) {
                throw new HttpError(409, "Email already in use.");
            }
            const openId = `admin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            let user;
            try {
                user = await db.createUser({
                    openId,
                    name: input.name,
                    email: input.email,
                    password: input.password,
                    role: "admin",
                    loginMethod: "email",
                    lastSignedIn: new Date(),
                });
            }
            catch (error) {
                if (error?.code === 11000) {
                    throw new HttpError(409, "Email already in use.");
                }
                throw error;
            }
            await db.updateUser(user._id.toString(), { hodId: user._id.toString() });
            const { SignJWT } = await import("jose");
            const jwtSecret = ENV.cookieSecret;
            if (!jwtSecret) {
                throw new HttpError(500, "JWT_SECRET is missing. Set it in backend/.env.");
            }
            const secret = new TextEncoder().encode(jwtSecret);
            const token = await new SignJWT({
                userId: user._id.toString(),
                openId: user.openId,
                role: user.role,
            })
                .setProtectedHeader({ alg: "HS256" })
                .setExpirationTime("7d")
                .sign(secret);
            const cookieOptions = getSessionCookieOptions(req);
            res.cookie(COOKIE_NAME, token, cookieOptions);
            res.json({
                success: true,
                token,
                user: { id: user._id.toString(), email: user.email, name: user.name, role: user.role },
            });
        }),
    );

    router.post(
        "/auth/login",
        asyncHandler(async (req, res) => {
            const input = parseInput(
                z.object({
                    email: z.string().email(),
                    password: z.string(),
                }),
                req.body,
            );
            const bcrypt = await import("bcryptjs");
            const user = await db.getUserByEmail(input.email);
            if (!user) {
                throw UnauthorizedError("Invalid email or password");
            }
            if (!user.password) {
                console.error("[Login] User found but password field is missing:", user.email);
                throw new HttpError(500, "Account configuration error. Please contact administrator.");
            }
            const isValidPassword = await bcrypt.compare(input.password, user.password);
            if (!isValidPassword) {
                throw UnauthorizedError("Invalid email or password");
            }
            await db.updateUser(user._id.toString(), { lastSignedIn: new Date() });
            const { SignJWT } = await import("jose");
            const jwtSecret = ENV.cookieSecret;
            if (!jwtSecret) {
                throw new HttpError(500, "JWT_SECRET is missing. Set it in backend/.env.");
            }
            const secret = new TextEncoder().encode(jwtSecret);
            const token = await new SignJWT({
                userId: user._id.toString(),
                openId: user.openId,
                role: user.role,
            })
                .setProtectedHeader({ alg: "HS256" })
                .setExpirationTime("7d")
                .sign(secret);
            const cookieOptions = getSessionCookieOptions(req);
            res.cookie(COOKIE_NAME, token, cookieOptions);
            res.json({
                success: true,
                token,
                user: { id: user._id.toString(), email: user.email, name: user.name, role: user.role },
            });
        }),
    );

    router.post(
        "/auth/logout",
        asyncHandler((req, res) => {
            const cookieOptions = getSessionCookieOptions(req);
            res.clearCookie(COOKIE_NAME, cookieOptions);
            res.json({ success: true });
        }),
    );

    // ==================== USER MANAGEMENT ====================
    router.get(
        "/users",
        asyncHandler(async (req, res) => {
            const user = requireRole(req, ["admin", "hod"], "HOD access required");
            const users = await db.getAllUsers();
            res.json(await hydrateFreelancerInitiators(users));
        }),
    );

    router.get(
        "/users/role/:role",
        asyncHandler(async (req, res) => {
            requireRole(req, ["admin", "hod"], "HOD access required");
            const input = parseInput(z.object({ role: z.enum(ROLE_OPTIONS) }), { role: req.params.role });
            const users = await db.getUsersByRole(input.role);
            res.json(await hydrateFreelancerInitiators(users));
        }),
    );

    router.get(
        "/users/:id",
        asyncHandler(async (req, res) => {
            requireAuth(req);
            const input = parseInput(z.object({ id: z.string() }), { id: req.params.id });
            const user = await db.getUserById(input.id);
            const [hydrated] = await hydrateFreelancerInitiators(user ? [user] : []);
            res.json(hydrated || null);
        }),
    );

    router.post(
        "/users",
        asyncHandler(async (req, res) => {
            const ctxUser = requireRole(req, ["admin", "hod"], "HOD access required");
            const input = parseInput(
                z.object({
                    name: z.string(),
                    email: z.string().email(),
                    password: z.string().min(6),
                    phone: z.string().optional(),
                    employeeType: z.enum(EMPLOYEE_TYPES),
                    role: z.enum(ROLE_OPTIONS),
                    hodId: z.string().optional(),
                    freelancerInitiatorIds: z.array(z.string()).optional(),
                }),
                req.body,
            );
            const { freelancerInitiatorIds, ...userInput } = input;
            const normalizedEmployeeType = normalizeEmployeeType(input.employeeType);
            let hodId = input.hodId;
            if (ctxUser.role === "hod") {
                if (input.role !== "employee") {
                    throw ForbiddenError("HOD can only create employee users.");
                }
                hodId = ctxUser.id;
            }
            if (input.role === "admin") {
                hodId = undefined;
            }
            else if (input.role === "hod") {
                if (!hodId) {
                    throw BadRequestError("HOD must have an Admin assigned as HOD.");
                }
                const hodUser = await db.getUserById(hodId);
                if (!hodUser || hodUser.role !== "admin") {
                    throw BadRequestError("HOD must be assigned to an Admin user.");
                }
            }
            else {
                if (!hodId) {
                    throw BadRequestError("HOD is required for this role.");
                }
                const hodUser = await db.getUserById(hodId);
                if (!hodUser || (hodUser.role !== "admin" && hodUser.role !== "hod")) {
                    throw BadRequestError("Assigned HOD must be an Admin or HOD.");
                }
            }
            const openId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const user = await db.createUser({
                ...userInput,
                employeeType: normalizedEmployeeType,
                openId,
                hodId,
            });
            if (input.role === "admin") {
                await db.updateUser(user._id.toString(), { hodId: user._id.toString() });
            }
            await db.reconcileCurrencyForUser(user._id.toString());
            if (normalizedEmployeeType.startsWith("freelancer") && freelancerInitiatorIds?.length) {
                await db.setEmployeeInitiators(user._id.toString(), freelancerInitiatorIds, ctxUser.id);
            }
            await db.createAuditLog({
                userId: ctxUser.id,
                action: "user_created",
                entityType: "user",
                entityId: openId,
                details: JSON.stringify({ email: input.email, role: input.role }),
            });
            res.json({ success: true, message: "User created successfully" });
        }),
    );

    router.patch(
        "/users/:id",
        asyncHandler(async (req, res) => {
            const ctxUser = requireRole(req, ["admin", "hod"], "HOD access required");
            const input = parseInput(
                z.object({
                    id: z.string(),
                    name: z.string().optional(),
                    email: z.string().email().optional(),
                    password: z.string().min(6).optional(),
                    phone: z.string().optional(),
                    employeeType: z.enum(EMPLOYEE_TYPES).optional(),
                    role: z.enum(ROLE_OPTIONS).optional(),
                    hodId: z.string().optional(),
                    freelancerInitiatorIds: z.array(z.string()).optional(),
                    isEmployee: z.boolean().optional(),
                    status: z.enum(["active", "inactive"]).optional(),
                }),
                { ...req.body, id: req.params.id },
            );
            const { id, freelancerInitiatorIds, ...updates } = input;
            const currentUser = await db.getUserById(id);
            if (!currentUser) {
                throw NotFoundError("User not found");
            }
            if (ctxUser.role === "hod") {
                const isSelf = currentUser._id?.toString() === ctxUser.id;
                const isOwned = currentUser.hodId?.toString() === ctxUser.id;
                if (!isSelf && !isOwned) {
                    throw ForbiddenError("HOD can only update users created by them.");
                }
            }
            const normalizedEmployeeType = updates.employeeType
                ? normalizeEmployeeType(updates.employeeType)
                : currentUser?.employeeType;
            const targetRole = updates.role ?? currentUser?.role;
            const targetEmployeeType = normalizedEmployeeType ?? currentUser?.employeeType;
            const hodIdToUse = updates.hodId ?? currentUser?.hodId;
            if (targetRole === "admin") {
                updates.hodId = id;
            }
            if (targetRole === "hod") {
                if (!hodIdToUse) {
                    throw BadRequestError("HOD must have an Admin assigned as HOD.");
                }
                const hodUser = await db.getUserById(hodIdToUse);
                if (!hodUser || hodUser.role !== "admin") {
                    throw BadRequestError("HOD must be assigned to an Admin user.");
                }
                if (updates.hodId === undefined) {
                    updates.hodId = hodIdToUse;
                }
            }
            if (targetRole === "employee" || targetRole === "account") {
                if (!hodIdToUse) {
                    throw BadRequestError("HOD is required for this role.");
                }
                const hodUser = await db.getUserById(hodIdToUse);
                if (!hodUser || (hodUser.role !== "admin" && hodUser.role !== "hod")) {
                    throw BadRequestError("Assigned HOD must be an Admin or HOD.");
                }
                if (updates.hodId === undefined) {
                    updates.hodId = hodIdToUse;
                }
            }
            if (targetEmployeeType && targetEmployeeType.startsWith("freelancer")) {
                if (freelancerInitiatorIds && freelancerInitiatorIds.length === 0) {
                    await db.setEmployeeInitiators(id, [], ctxUser.id);
                }
            }
            if (updates.employeeType) {
                updates.employeeType = normalizedEmployeeType;
            }
            await db.updateUser(id, updates);
            await db.reconcileCurrencyForUser(id);
            if (normalizedEmployeeType && normalizedEmployeeType.startsWith("freelancer") && freelancerInitiatorIds?.length) {
                await db.setEmployeeInitiators(id, freelancerInitiatorIds, ctxUser.id);
            }
            await db.createAuditLog({
                userId: ctxUser.id,
                action: "user_updated",
                entityType: "user",
                entityId: id,
                beforeValue: JSON.stringify(currentUser),
                afterValue: JSON.stringify(updates),
            });
            res.json({ success: true });
        }),
    );

    router.delete(
        "/users/:id",
        asyncHandler(async (req, res) => {
            const ctxUser = requireRole(req, ["admin"], "Admin access required");
            const input = parseInput(z.object({ id: z.string() }), { id: req.params.id });
            await db.deleteUser(input.id);
            await db.createAuditLog({
                userId: ctxUser.id,
                action: "user_deleted",
                entityType: "user",
                entityId: input.id,
            });
            res.json({ success: true });
        }),
    );

    router.post(
        "/admin/currency/reconcile",
        asyncHandler(async (req, res) => {
            const ctxUser = requireRole(req, ["admin"], "Admin access required");
            const input = parseInput(
                z.object({
                    userId: z.string().optional(),
                }),
                req.body ?? {},
            );

            const result = input.userId
                ? await db.reconcileCurrencyForUser(input.userId)
                : await db.reconcileCurrencyForAllUsers();
            if (input.userId && !result) {
                throw NotFoundError("User not found");
            }

            await db.createAuditLog({
                userId: ctxUser.id,
                action: "currency_reconciled",
                entityType: "currency",
                entityId: input.userId || "all",
                details: JSON.stringify({
                    scope: input.userId ? "user" : "all",
                    userId: input.userId || null,
                }),
            });

            res.json({ success: true, result });
        }),
    );

    // ==================== POLICY MANAGEMENT ====================
    router.get(
        "/policies",
        asyncHandler(async (req, res) => {
            const ctxUser = requireRole(req, ["admin", "hod"], "HOD access required");
            res.json(await db.getAllPolicies());
        }),
    );

    router.get(
        "/policies/:id",
        asyncHandler(async (req, res) => {
            requireAuth(req);
            const input = parseInput(z.object({ id: z.string() }), { id: req.params.id });
            res.json(await db.getPolicyById(input.id));
        }),
    );

    router.get(
        "/files/:id",
        asyncHandler(async (req, res) => {
            requireAuth(req);
            const input = parseInput(z.object({ id: z.string() }), { id: req.params.id });
            const streamed = await streamGridFSFile(input.id, res);
            if (!streamed) {
                throw NotFoundError("File not found");
            }
        }),
    );

    router.post(
        "/policies",
        asyncHandler(async (req, res) => {
            const ctxUser = requireRole(req, ["admin", "hod"], "HOD access required");
            const input = parseInput(
                z.object({
                    name: z.string(),
                    description: z.string().optional(),
                    eligibilityCriteria: z.string().optional(),
                    calculationLogic: z.string().optional(),
                    status: z.enum(["active", "draft", "archived"]).default("active"),
                }),
                req.body,
            );
            const policy = await db.createPolicy({
                ...input,
                createdBy: ctxUser.id,
            });
            await db.createAuditLog({
                userId: ctxUser.id,
                action: "policy_created",
                entityType: "policy",
                details: JSON.stringify({ name: input.name }),
            });
            res.json({ success: true, policy });
        }),
    );

    router.patch(
        "/policies/:id",
        asyncHandler(async (req, res) => {
            const ctxUser = requireRole(req, ["admin", "hod"], "HOD access required");
            const input = parseInput(
                z.object({
                    id: z.string(),
                    name: z.string().optional(),
                    description: z.string().optional(),
                    eligibilityCriteria: z.string().optional(),
                    calculationLogic: z.string().optional(),
                    status: z.enum(["active", "draft", "archived"]).optional(),
                }),
                { ...req.body, id: req.params.id },
            );
            const { id, ...updates } = input;
            const existing = await db.getPolicyById(id);
            if (!existing) {
                throw NotFoundError("Policy not found");
            }
            if (ctxUser.role === "hod" && existing.createdBy !== ctxUser.id) {
                throw ForbiddenError("You can only update policies you created.");
            }
            await db.updatePolicy(id, updates);
            await db.createAuditLog({
                userId: ctxUser.id,
                action: "policy_updated",
                entityType: "policy",
                entityId: id,
                details: JSON.stringify(updates),
            });
            res.json({ success: true });
        }),
    );

    router.post(
        "/policies/:id/attachments",
        policyUpload.array("files", 10),
        asyncHandler(async (req, res) => {
            const ctxUser = requireRole(req, ["admin", "hod"], "HOD access required");
            const input = parseInput(z.object({ id: z.string() }), { id: req.params.id });
            const policy = await db.getPolicyById(input.id);
            if (!policy) {
                throw NotFoundError("Policy not found");
            }
            if (ctxUser.role === "hod" && policy.createdBy !== ctxUser.id) {
                throw ForbiddenError("You can only update policies you created.");
            }
            const files = req.files || [];
            if (!files.length) {
                throw BadRequestError("No files uploaded.");
            }
            const stored = await Promise.all(
                files.map((file) =>
                    saveBufferToGridFS({
                        buffer: file.buffer,
                        filename: file.originalname,
                        mimeType: file.mimetype,
                        metadata: { source: "policy", policyId: input.id },
                    }),
                ),
            );
            const attachments = files.map((file, index) => ({
                originalName: file.originalname,
                filename: stored[index]?.filename || file.originalname,
                fileId: stored[index]?.fileId,
                mimeType: file.mimetype,
                size: file.size,
                url: stored[index]?.fileId ? `/api/files/${stored[index].fileId}` : "",
                uploadedAt: new Date(),
            }));
            const updated = await db.addPolicyAttachments(input.id, attachments);
            await db.createAuditLog({
                userId: ctxUser.id,
                action: "policy_attachment_added",
                entityType: "policy",
                entityId: input.id,
                details: JSON.stringify({ count: attachments.length }),
            });
            res.json({ success: true, attachments: updated?.attachments || [] });
        }),
    );

    router.delete(
        "/policies/:id/attachments/:attachmentId",
        asyncHandler(async (req, res) => {
            const ctxUser = requireRole(req, ["admin", "hod"], "HOD access required");
            const input = parseInput(
                z.object({ id: z.string(), attachmentId: z.string() }),
                { id: req.params.id, attachmentId: req.params.attachmentId },
            );
            const policy = await db.getPolicyById(input.id);
            if (!policy) {
                throw NotFoundError("Policy not found");
            }
            if (ctxUser.role === "hod" && policy.createdBy !== ctxUser.id) {
                throw ForbiddenError("You can only update policies you created.");
            }
            const attachment = policy.attachments?.find(
                (item) => item._id?.toString() === input.attachmentId,
            );
            if (!attachment) {
                throw NotFoundError("Attachment not found");
            }
            await db.removePolicyAttachment(input.id, input.attachmentId);
            if (attachment.fileId) {
                try {
                    await deleteGridFSFile(attachment.fileId);
                }
                catch (error) {
                    console.warn("[Files] Failed to delete GridFS file:", error?.message || error);
                }
            }
            if (attachment.filename) {
                const filePath = path.join(POLICY_UPLOAD_DIR, attachment.filename);
                fs.unlink(filePath, () => {});
            }
            await db.createAuditLog({
                userId: ctxUser.id,
                action: "policy_attachment_removed",
                entityType: "policy",
                entityId: input.id,
                details: JSON.stringify({ attachmentId: input.attachmentId }),
            });
            res.json({ success: true });
        }),
    );

    router.delete(
        "/policies/:id",
        asyncHandler(async (req, res) => {
            const ctxUser = requireRole(req, ["admin", "hod"], "HOD access required");
            const input = parseInput(z.object({ id: z.string() }), { id: req.params.id });
            const existing = await db.getPolicyById(input.id);
            if (!existing) {
                throw NotFoundError("Policy not found");
            }
            if (ctxUser.role === "hod" && existing.createdBy !== ctxUser.id) {
                throw ForbiddenError("You can only delete policies you created.");
            }
            await db.deletePolicy(input.id);
            await db.createAuditLog({
                userId: ctxUser.id,
                action: "policy_deleted",
                entityType: "policy",
                entityId: input.id,
            });
            res.json({ success: true });
        }),
    );

    // ==================== TEAM MANAGEMENT ====================
    router.post(
        "/team/assign-policy",
        asyncHandler(async (req, res) => {
            const ctxUser = requireRole(req, ["admin", "hod"], "HOD access required");
            const input = parseInput(
                z.object({
                    userId: z.string(),
                    policyId: z.string(),
                    initiatorIds: z.array(z.string()).min(1),
                    effectiveDate: z.string().optional(),
                }),
                req.body,
            );
            const user = await db.getUserById(input.userId);
            if (!user) {
                throw NotFoundError("User not found");
            }
            if (ctxUser.role === "hod" && user.hodId?.toString() !== ctxUser.id) {
                throw ForbiddenError("You can only assign policies to your team members.");
            }
            const policy = await db.getPolicyById(input.policyId);
            if (!policy) {
                throw NotFoundError("Policy not found");
            }
            const effectiveDate = input.effectiveDate ? new Date(input.effectiveDate) : new Date();
            if (Number.isNaN(effectiveDate.getTime())) {
                throw BadRequestError("Invalid effective date.");
            }
            const existingAssignment = await db.getEmployeePolicyAssignmentByUserPolicy(
                input.userId,
                input.policyId,
            );
            let assignmentId;
            if (existingAssignment) {
                await db.updateEmployeePolicyAssignment(existingAssignment._id.toString(), {
                    effectiveDate,
                    assignedBy: ctxUser.id,
                });
                assignmentId = existingAssignment._id.toString();
            }
            else {
                const assignment = await db.createEmployeePolicyAssignment({
                    userId: input.userId,
                    policyId: input.policyId,
                    effectiveDate,
                    assignedBy: ctxUser.id,
                });
                assignmentId = assignment._id.toString();
            }
            await db.setPolicyInitiators(assignmentId, input.initiatorIds, ctxUser.id);
            try {
                const initiators = await db.getUsersByIds(input.initiatorIds);
                await Promise.all(
                    initiators.map((init) =>
                        db.createNotification({
                            userId: init._id.toString(),
                            title: "Policy initiator assigned",
                            message: `You can initiate ${policy.name} for ${user.name || user.email}.`,
                            type: "info",
                            actionUrl: "/employees",
                        }),
                    ),
                );
            }
            catch (error) {
                console.warn("[Notifications] Failed to notify policy initiators:", error?.message || error);
            }
            await db.createAuditLog({
                userId: ctxUser.id,
                action: "policy_assigned",
                entityType: "policy_assignment",
                details: JSON.stringify({ ...input, assignmentId }),
            });
            res.json({ success: true });
        }),
    );

    router.post(
        "/team/remove-policy",
        asyncHandler(async (req, res) => {
            const ctxUser = requireRole(req, ["admin", "hod"], "HOD access required");
            const input = parseInput(z.object({ assignmentId: z.string() }), req.body);
            const assignment = await db.getEmployeePolicyAssignmentById(input.assignmentId);
            if (!assignment) {
                throw NotFoundError("Assignment not found");
            }
            if (ctxUser.role === "hod") {
                const user = await db.getUserById(assignment.userId);
                if (user?.hodId?.toString() !== ctxUser.id) {
                    throw ForbiddenError("You can only remove policies from your team members.");
                }
            }
            await db.setPolicyInitiators(input.assignmentId, [], ctxUser.id);
            await db.removeEmployeePolicyAssignmentById(input.assignmentId);
            await db.createAuditLog({
                userId: ctxUser.id,
                action: "policy_removed",
                entityType: "policy_assignment",
                entityId: input.assignmentId,
            });
            res.json({ success: true });
        }),
    );

    router.get(
        "/team/my",
        asyncHandler(async (req, res) => {
            const ctxUser = requireAuth(req);
            if (ctxUser.role === "admin") {
                const users = await db.getAllUsers();
                const withHods = await hydrateHods(users);
                const withInitiators = await hydrateFreelancerInitiators(withHods);
                res.json(await hydratePolicyAssignments(withInitiators));
                return;
            }
            if (ctxUser.role === "hod") {
                const users = await db.getUsersByHod(ctxUser.id);
                const withHods = await hydrateHods(users);
                const withInitiators = await hydrateFreelancerInitiators(withHods);
                res.json(await hydratePolicyAssignments(withInitiators));
                return;
            }
            const [initiatorLinks, policyLinks] = await Promise.all([
                db.getEmployeeInitiatorsByInitiatorId(ctxUser.id),
                db.getPolicyInitiatorsByInitiatorId(ctxUser.id),
            ]);
            const employeeIds = new Set(initiatorLinks.map((link) => link.employeeId));
            if (policyLinks.length > 0) {
                const assignmentIds = Array.from(new Set(policyLinks.map((link) => link.assignmentId)));
                const assignments = await db.getEmployeePolicyAssignmentsByIds(assignmentIds);
                assignments.forEach((assignment) => {
                    if (assignment?.userId) {
                        employeeIds.add(assignment.userId);
                    }
                });
            }
            const uniqueEmployeeIds = Array.from(employeeIds);
            const users = uniqueEmployeeIds.length > 0 ? await db.getUsersByIds(uniqueEmployeeIds) : [];
            const filtered = users.filter((member) => member.role === "employee" && member.isEmployee !== false);
            const withHods = await hydrateHods(filtered);
            const withInitiators = await hydrateFreelancerInitiators(withHods);
            res.json(await hydratePolicyAssignments(withInitiators));
        }),
    );

    router.get(
        "/team/user-policies",
        asyncHandler(async (req, res) => {
            requireAuth(req);
            const input = parseInput(z.object({ userId: z.string() }), req.query);
            const user = await db.getUserById(input.userId);
            if (!user) {
                throw NotFoundError("User not found");
            }
            const [hydrated] = await hydratePolicyAssignments([user]);
            res.json(hydrated?.policyAssignments || []);
        }),
    );

    // ==================== CREDIT REQUESTS ====================
    router.get(
        "/credit-requests/initiator-scope",
        asyncHandler(async (req, res) => {
            const ctxUser = requireAuth(req);
            if (ctxUser.role === "admin" || ctxUser.role === "hod") {
                const users =
                    ctxUser.role === "admin"
                        ? await db.getAllUsers()
                        : await db.getUsersByHod(ctxUser.id);
                const assignments = await db.getEmployeePolicyAssignmentsByUserIds(
                    users.map((u) => u._id.toString()),
                );
                const policies = await db.getPoliciesByIds(
                    Array.from(new Set(assignments.map((a) => a.policyId))),
                );
                const policyMap = new Map(policies.map((policy) => [policy._id.toString(), policy]));
                const userMap = new Map(users.map((user) => [user._id.toString(), user]));
                const policyAssignments = assignments
                    .map((assignment) => ({
                        assignmentId: assignment._id.toString(),
                        user: userMap.get(assignment.userId) || null,
                        policy: policyMap.get(assignment.policyId) || null,
                        effectiveDate: assignment.effectiveDate,
                    }))
                    .filter((a) => a.user && a.policy);
                const freelancers = users.filter((u) => u.employeeType?.startsWith("freelancer"));
                res.json({ policyAssignments, freelancers });
                return;
            }
            const policyLinks = await db.getPolicyInitiatorsByInitiatorId(ctxUser.id);
            const assignmentIds = Array.from(new Set(policyLinks.map((link) => link.assignmentId)));
            const assignments =
                assignmentIds.length > 0
                    ? await db.getEmployeePolicyAssignmentsByIds(assignmentIds)
                    : [];
            const policyIds = Array.from(new Set(assignments.map((a) => a.policyId)));
            const userIds = Array.from(new Set(assignments.map((a) => a.userId)));
            const [policies, users] = await Promise.all([
                policyIds.length > 0 ? db.getPoliciesByIds(policyIds) : Promise.resolve([]),
                userIds.length > 0 ? db.getUsersByIds(userIds) : Promise.resolve([]),
            ]);
            const policyMap = new Map(policies.map((policy) => [policy._id.toString(), policy]));
            const userMap = new Map(users.map((user) => [user._id.toString(), user]));
            const policyAssignments = assignments
                .map((assignment) => ({
                    assignmentId: assignment._id.toString(),
                    user: userMap.get(assignment.userId) || null,
                    policy: policyMap.get(assignment.policyId) || null,
                    effectiveDate: assignment.effectiveDate,
                }))
                .filter((a) => a.user && a.policy);
            const freelancerLinks = await db.getEmployeeInitiatorsByInitiatorId(ctxUser.id);
            const freelancerIds = Array.from(new Set(freelancerLinks.map((link) => link.employeeId)));
            const freelancers = freelancerIds.length > 0 ? await db.getUsersByIds(freelancerIds) : [];
            res.json({ policyAssignments, freelancers });
        }),
    );

    router.get(
        "/credit-requests",
        asyncHandler(async (req, res) => {
            const ctxUser = requireRole(req, ["admin", "hod"], "HOD access required");
            if (ctxUser.role === "admin") {
                const requests = await db.getAllCreditRequests();
                res.json(await hydrateCreditRequests(requests));
                return;
            }
            const requests = await db.getCreditRequestsByHod(ctxUser.id);
            res.json(await hydrateCreditRequests(requests));
        }),
    );

    router.get(
        "/credit-requests/pending-approvals",
        asyncHandler(async (req, res) => {
            const ctxUser = requireAuth(req);
            if (ctxUser.role === "admin") {
                const requests = await db.getAllCreditRequests();
                res.json(await hydrateCreditRequests(requests));
                return;
            }
            if (ctxUser.role === "hod") {
                const requests = await db.getCreditRequestsByHod(ctxUser.id);
                res.json(await hydrateCreditRequests(requests));
                return;
            }
            const requests = await db.getCreditRequestsByUserId(ctxUser.id);
            res.json(await hydrateCreditRequests(requests));
        }),
    );

    router.get(
        "/credit-requests/my",
        asyncHandler(async (req, res) => {
            const ctxUser = requireAuth(req);
            const requests = await db.getCreditRequestsByUserId(ctxUser.id);
            res.json(await hydrateCreditRequests(requests));
        }),
    );

    router.get(
        "/credit-requests/submissions",
        asyncHandler(async (req, res) => {
            const ctxUser = requireAuth(req);
            const requests = await db.getCreditRequestsByInitiator(ctxUser.id);
            res.json(await hydrateCreditRequests(requests));
        }),
    );

    router.get(
        "/credit-requests/:id",
        asyncHandler(async (req, res) => {
            requireAuth(req);
            const input = parseInput(z.object({ id: z.string() }), { id: req.params.id });
            const request = await db.getCreditRequestById(input.id);
            const [hydrated] = await hydrateCreditRequests(request ? [request] : []);
            res.json(hydrated || null);
        }),
    );

    router.post(
        "/credit-requests/attachments",
        creditRequestUpload.array("files", 6),
        asyncHandler(async (req, res) => {
            requireAuth(req);
            const files = Array.isArray(req.files) ? req.files : [];
            if (files.length === 0) {
                throw BadRequestError("No files uploaded.");
            }
            const stored = await Promise.all(
                files.map((file) =>
                    saveBufferToGridFS({
                        buffer: file.buffer,
                        filename: file.originalname,
                        mimeType: file.mimetype,
                        metadata: { source: "credit_request" },
                    }),
                ),
            );
            const attachments = files.map((file, index) => ({
                originalName: file.originalname,
                filename: stored[index]?.filename || file.originalname,
                fileId: stored[index]?.fileId,
                mimeType: file.mimetype,
                size: file.size,
                url: stored[index]?.fileId ? `/api/files/${stored[index].fileId}` : "",
            }));
            res.json({ success: true, attachments });
        }),
    );

    router.post(
        "/credit-requests",
        asyncHandler(async (req, res) => {
            const ctxUser = requireAuth(req);
            const input = parseInput(
                z.object({
                    userId: z.string(),
                    type: z.enum(["freelancer", "policy"]),
                    policyId: z.string().optional(),
                    baseAmount: z.number(),
                    bonus: z.number().default(0),
                    deductions: z.number().default(0),
                    amount: z.number(),
                    amountItems: z
                        .array(
                            z.object({
                                amount: z.number(),
                                note: z.string().optional(),
                                addedBy: z.string().optional(),
                                addedAt: z.string().optional(),
                            }),
                        )
                        .optional(),
                    calculationBreakdown: z.string().optional(),
                    notes: z.string().optional(),
                    documents: z.string().optional(),
                    attachments: z
                        .array(
                            z.object({
                                originalName: z.string(),
                                filename: z.string(),
                                fileId: z.string().optional(),
                                mimeType: z.string(),
                                size: z.number(),
                                url: z.string(),
                            }),
                        )
                        .optional(),
                }),
                req.body,
            );
            const user = await db.getUserById(input.userId);
            if (!user) {
                throw NotFoundError("User not found");
            }
            if (!user.hodId) {
                throw BadRequestError("User has no HOD assigned.");
            }
            const requestCurrency = getUserCurrency(user);
            const isAdminOrHod = ctxUser.role === "admin" || ctxUser.role === "hod";
            let policyForEmail = null;
            if (input.type === "policy") {
                if (!input.policyId) {
                    throw BadRequestError("Policy is required for policy-based requests.");
                }
                policyForEmail = await db.getPolicyById(input.policyId);
                const assignment = await db.getEmployeePolicyAssignmentByUserPolicy(
                    input.userId,
                    input.policyId,
                );
                if (!assignment) {
                    throw BadRequestError("Policy is not assigned to this employee.");
                }
                if (!isAdminOrHod) {
                    const initiators = await db.getPolicyInitiatorsByAssignmentIds([
                        assignment._id.toString(),
                    ]);
                    const isAllowed = initiators.some((link) => link.initiatorId === ctxUser.id);
                    if (!isAllowed) {
                        throw ForbiddenError("You are not an initiator for this policy assignment.");
                    }
                }
            }
            if (input.type === "freelancer") {
                if (!user.employeeType?.startsWith("freelancer")) {
                    throw BadRequestError("Selected user is not a freelancer.");
                }
                if (!isAdminOrHod) {
                    const initiators = await db.getEmployeeInitiatorsByEmployeeId(input.userId);
                    const isAllowed = initiators.some((link) => link.initiatorId === ctxUser.id);
                    if (!isAllowed) {
                        throw ForbiddenError("You are not an initiator for this freelancer.");
                    }
                }
            }
            const status =
                input.type === "policy"
                    ? isAdminOrHod
                        ? "pending_signature"
                        : "pending_approval"
                    : "pending_approval";
            const timelineLog = [
                buildTimelineEntry({
                    step: "REQUEST_INITIATED",
                    role: isAdminOrHod ? "admin" : "initiator",
                    actor: ctxUser,
                    message: "Credit request initiated",
                    metadata: {
                        type: input.type,
                        amount: input.amount,
                        currency: requestCurrency,
                        employeeName: user?.name,
                        employeeEmail: user?.email,
                        policyName: policyForEmail?.name,
                    },
                }),
            ];
            await db.createCreditRequest({
                userId: input.userId,
                initiatorId: ctxUser.id,
                hodId: user.hodId,
                type: input.type,
                policyId: input.policyId,
                baseAmount: input.baseAmount,
                bonus: input.bonus,
                deductions: input.deductions,
                amount: input.amount,
                currency: requestCurrency,
                amountItems: (input.amountItems || []).map((item) => ({
                    amount: item.amount,
                    note: item.note,
                    addedBy: item.addedBy || ctxUser.id,
                    addedAt: item.addedAt ? new Date(item.addedAt) : new Date(),
                })),
                calculationBreakdown: input.calculationBreakdown,
                notes: input.notes,
                documents: input.documents,
                attachments: input.attachments || [],
                status,
                timelineLog,
            });
            await db.createAuditLog({
                userId: ctxUser.id,
                action: "credit_request_created",
                entityType: "credit_request",
                details: JSON.stringify({ userId: input.userId, amount: input.amount }),
            });
            await db.createNotification({
                userId: input.userId,
                title: "Credit request created",
                message:
                    input.type === "policy"
                        ? isAdminOrHod
                            ? "A policy-based credit request is awaiting your signature."
                            : "A policy credit request has been submitted and is pending HOD approval."
                        : "A freelancer credit request has been submitted and is pending HOD approval.",
                type: "info",
                actionUrl: "/transactions",
            });
            if (user.hodId) {
                await db.createNotification({
                    userId: user.hodId,
                    title: "Credit request pending approval",
                    message: `${user.name || user.email} has a ${formatMoney(input.amount, requestCurrency)} credit request awaiting your approval.`,
                    type: "action",
                    actionUrl: "/approvals",
                });
            }
            if (input.type === "freelancer" && user.hodId) {
                try {
                    const hodUser = await db.getUserById(user.hodId);
                    await sendHodFreelancerRequestEmail({
                        to: hodUser?.email,
                        hodName: hodUser?.name,
                        employee: user,
                        initiator: ctxUser,
                        amount: input.amount,
                        currency: requestCurrency,
                        details: input.notes,
                        attachments: input.attachments || [],
                        requestType: "freelancer",
                    });
                }
                catch (error) {
                    console.warn("[Email] Failed to send HOD freelancer email:", error?.message || error);
                }
            }
            if (input.type === "policy" && user.hodId) {
                try {
                    const hodUser = await db.getUserById(user.hodId);
                    const policyDetails = policyForEmail?.name
                        ? `Policy: ${policyForEmail.name}${input.notes ? ` | ${input.notes}` : ""}`
                        : input.notes;
                    await sendHodFreelancerRequestEmail({
                        to: hodUser?.email,
                        hodName: hodUser?.name,
                        employee: user,
                        initiator: ctxUser,
                        amount: input.amount,
                        currency: requestCurrency,
                        details: policyDetails,
                        attachments: input.attachments || [],
                        requestType: "policy",
                    });
                }
                catch (error) {
                    console.warn("[Email] Failed to send HOD policy email:", error?.message || error);
                }
            }
            if (input.type === "policy" && !isAdminOrHod) {
                res.json({ success: true, message: "Policy request created and sent to HOD for approval." });
                return;
            }
            if (input.type === "policy") {
                try {
                    await createSignatureDocument(
                        user.email || "",
                        user.name || "",
                        input.amount,
                        requestCurrency,
                        `Policy: ${input.policyId} | Notes: ${input.notes || "N/A"} | Breakdown: ${input.calculationBreakdown || "N/A"}`,
                    );
                    res.json({
                        success: true,
                        message: "Credit request created. Signature request sent to employee.",
                    });
                    return;
                }
                catch (error) {
                    console.error("GHL document creation failed:", error);
                    throw new HttpError(500, "Failed to create signature document");
                }
            }
            res.json({ success: true, message: "Credit request created and sent to HOD for approval." });
        }),
    );

    router.post(
        "/credit-requests/sign",
        asyncHandler(async (req, res) => {
            const ctxUser = requireAuth(req);
            const input = parseInput(
                z.object({
                    requestId: z.string(),
                    signature: z.string(),
                }),
                req.body,
            );
            const request = await db.getCreditRequestById(input.requestId);
            if (!request || request.userId !== ctxUser.id) {
                throw ForbiddenError("Forbidden");
            }
            if (request.type !== "policy") {
                throw BadRequestError("Signature is only required for policy-based requests.");
            }
            if (request.status !== "pending_signature") {
                throw BadRequestError("Request is not awaiting signature.");
            }
            const timelineLog = appendTimelineEntry(
                request.timelineLog,
                buildTimelineEntry({
                    step: "EMPLOYEE_SIGNATURE",
                    role: "employee",
                    actor: ctxUser,
                    signatureId: input.signature,
                    message: "Employee signed policy request",
                }),
            );
            await db.updateCreditRequest(input.requestId, {
                userSignature: input.signature,
                userSignedAt: new Date(),
                status: "pending_approval",
                timelineLog,
            });
            await db.createAuditLog({
                userId: ctxUser.id,
                action: "credit_request_signed",
                entityType: "credit_request",
                entityId: input.requestId,
            });
            if (request.hodId) {
                await db.createNotification({
                    userId: request.hodId,
                    title: "Credit request ready for approval",
                    message: `${ctxUser.name || ctxUser.email} signed a credit request and it is ready for approval.`,
                    type: "action",
                    actionUrl: "/approvals",
                });
            }
            res.json({ success: true });
        }),
    );

    router.post(
        "/credit-requests/reject",
        asyncHandler(async (req, res) => {
            const ctxUser = requireAuth(req);
            const input = parseInput(
                z.object({
                    requestId: z.string(),
                    reason: z.string(),
                }),
                req.body,
            );
            const request = await db.getCreditRequestById(input.requestId);
            if (!request || request.userId !== ctxUser.id) {
                throw ForbiddenError("Forbidden");
            }
            if (request.type !== "policy") {
                throw BadRequestError("Only policy-based requests can be rejected by the employee.");
            }
            const timelineLog = appendTimelineEntry(
                request.timelineLog,
                buildTimelineEntry({
                    step: "EMPLOYEE_REJECTED",
                    role: "employee",
                    actor: ctxUser,
                    message: "Employee rejected policy request",
                    metadata: { reason: input.reason },
                }),
            );
            await db.updateCreditRequest(input.requestId, {
                userRejectionReason: input.reason,
                status: "rejected_by_user",
                timelineLog,
            });
            await db.createAuditLog({
                userId: ctxUser.id,
                action: "credit_request_rejected_by_user",
                entityType: "credit_request",
                entityId: input.requestId,
                details: input.reason,
            });
            res.json({ success: true });
        }),
    );

    router.post(
        "/credit-requests/approve",
        asyncHandler(async (req, res) => {
            const ctxUser = requireRole(req, ["admin", "hod"], "HOD access required");
            const input = parseInput(z.object({ requestId: z.string() }), req.body);
            const request = await db.getCreditRequestById(input.requestId);
            if (!request) {
                throw NotFoundError("Not found");
            }
            if (request.status !== "pending_approval") {
                throw BadRequestError("Only pending approvals can be approved.");
            }
            const requestCurrency = normalizeCurrency(request.currency);
            if (request.type === "freelancer") {
                const timelineLog = appendTimelineEntry(
                    request.timelineLog,
                    buildTimelineEntry({
                        step: "HOD_APPROVED",
                        role: ctxUser.role,
                        actor: ctxUser,
                        signatureId: ctxUser.id,
                        message: "HOD approved freelancer request",
                    }),
                );
                await db.updateCreditRequest(input.requestId, {
                    status: "pending_employee_approval",
                    hodApprovedBy: ctxUser.id,
                    hodApprovedAt: new Date(),
                    timelineLog,
                });
                await db.createAuditLog({
                    userId: ctxUser.id,
                    action: "credit_request_hod_approved",
                    entityType: "credit_request",
                    entityId: input.requestId,
                });
                await db.createNotification({
                    userId: request.userId,
                    title: "Approval required",
                    message: `Your freelancer incentive for ${formatMoney(request.amount, requestCurrency)} is awaiting your approval.`,
                    type: "action",
                    actionUrl: "/approvals",
                });
                res.json({ success: true, status: "pending_employee_approval" });
                return;
            }
            const currentBalance = await db.getWalletBalance(request.userId.toString());
            const newBalance = currentBalance + request.amount;
            let timelineLog = appendTimelineEntry(
                request.timelineLog,
                buildTimelineEntry({
                    step: "HOD_APPROVED",
                    role: ctxUser.role,
                    actor: ctxUser,
                    signatureId: ctxUser.id,
                    message: "HOD approved policy request",
                }),
            );
            timelineLog = appendTimelineEntry(
                timelineLog,
                buildTimelineEntry({
                    step: "WALLET_CREDITED",
                    role: "system",
                    actor: ctxUser,
                    message: "Wallet credited after policy approval",
                    metadata: { amount: request.amount },
                }),
            );
            await db.updateCreditRequest(input.requestId, {
                status: "approved",
                hodApprovedBy: ctxUser.id,
                hodApprovedAt: new Date(),
                timelineLog,
            });
            await db.createWalletTransaction({
                userId: request.userId,
                type: "credit",
                amount: request.amount,
                currency: requestCurrency,
                creditRequestId: request._id?.toString(),
                description: request.type === "freelancer" ? "Freelancer Amount" : "Policy Credit",
                balance: newBalance,
                redeemed: false,
                timelineLog,
            });
            await db.createAuditLog({
                userId: ctxUser.id,
                action: "credit_request_approved",
                entityType: "credit_request",
                entityId: input.requestId,
            });
            await db.createNotification({
                userId: request.userId,
                title: "Credit request approved",
                message: `Your credit request for ${formatMoney(request.amount, requestCurrency)} was approved.`,
                type: "success",
                actionUrl: "/transactions",
            });
            res.json({ success: true });
        }),
    );

    router.post(
        "/credit-requests/reject-by-hod",
        asyncHandler(async (req, res) => {
            const ctxUser = requireRole(req, ["admin", "hod"], "HOD access required");
            const input = parseInput(
                z.object({
                    requestId: z.string(),
                    reason: z.string(),
                }),
                req.body,
            );
            const request = await db.getCreditRequestById(input.requestId);
            if (!request) {
                throw NotFoundError("Not found");
            }
            if (request.status !== "pending_approval") {
                throw BadRequestError("Only pending approvals can be rejected.");
            }
            const timelineLog = appendTimelineEntry(
                request.timelineLog,
                buildTimelineEntry({
                    step: "HOD_REJECTED",
                    role: ctxUser.role,
                    actor: ctxUser,
                    signatureId: ctxUser.id,
                    message: "HOD rejected request",
                    metadata: { reason: input.reason },
                }),
            );
            await db.updateCreditRequest(input.requestId, {
                hodRejectionReason: input.reason,
                hodRejectedAt: new Date(),
                status: "rejected_by_hod",
                timelineLog,
            });
            await db.createAuditLog({
                userId: ctxUser.id,
                action: "credit_request_rejected_by_hod",
                entityType: "credit_request",
                entityId: input.requestId,
                details: input.reason,
            });
            const employee = await db.getUserById(request.userId);
            await db.createNotification({
                userId: request.userId,
                title: "Credit request rejected",
                message: `Your credit request was rejected. Reason: ${input.reason}`,
                type: "warning",
                actionUrl: "/transactions",
            });
            if (request.initiatorId) {
                const initiator = await db.getUserById(request.initiatorId);
                await db.createNotification({
                    userId: request.initiatorId,
                    title: "Request rejected",
                    message: `The ${request.type} request for ${employee?.name || employee?.email} was rejected by HOD. Reason: ${input.reason}`,
                    type: "warning",
                    actionUrl: "/approvals",
                });
                try {
                    const hodUser = await db.getUserById(request.hodId);
                    await sendInitiatorFreelancerRejectionEmail({
                        to: initiator?.email,
                        initiatorName: initiator?.name,
                        employee,
                        hod: hodUser,
                        amount: request.amount,
                        currency: request.currency,
                        reason: input.reason,
                        rejectedBy: hodUser?.name || hodUser?.email || "HOD",
                        requestType: request.type,
                    });
                }
                catch (error) {
                    console.warn("[Email] Failed to send initiator rejection email:", error?.message || error);
                }
            }
            res.json({ success: true });
        }),
    );

    router.post(
        "/credit-requests/approve-by-employee",
        asyncHandler(async (req, res) => {
            const ctxUser = requireAuth(req);
            const input = parseInput(z.object({ requestId: z.string() }), req.body);
            const request = await db.getCreditRequestById(input.requestId);
            if (!request || request.userId !== ctxUser.id) {
                throw ForbiddenError("Forbidden");
            }
            if (request.status !== "pending_employee_approval") {
                throw BadRequestError("Only pending employee approvals can be approved.");
            }
            const requestCurrency = normalizeCurrency(request.currency, getCurrencyByEmployeeType(ctxUser.employeeType));
            const currentBalance = await db.getWalletBalance(request.userId.toString());
            const newBalance = currentBalance + request.amount;
            let timelineLog = appendTimelineEntry(
                request.timelineLog,
                buildTimelineEntry({
                    step: "EMPLOYEE_APPROVED",
                    role: "employee",
                    actor: ctxUser,
                    message: "Employee approved freelancer request",
                }),
            );
            timelineLog = appendTimelineEntry(
                timelineLog,
                buildTimelineEntry({
                    step: "WALLET_CREDITED",
                    role: "system",
                    actor: ctxUser,
                    message: "Wallet credited after freelancer approval",
                    metadata: { amount: request.amount },
                }),
            );
            await db.updateCreditRequest(input.requestId, {
                status: "approved",
                employeeApprovedAt: new Date(),
                timelineLog,
            });
            await db.createWalletTransaction({
                userId: request.userId,
                type: "credit",
                amount: request.amount,
                currency: requestCurrency,
                creditRequestId: request._id?.toString(),
                description: "Freelancer Amount",
                balance: newBalance,
                redeemed: false,
                timelineLog,
            });
            await db.createAuditLog({
                userId: ctxUser.id,
                action: "credit_request_approved_by_employee",
                entityType: "credit_request",
                entityId: input.requestId,
            });
            res.json({ success: true });
        }),
    );

    router.post(
        "/credit-requests/reject-by-employee",
        asyncHandler(async (req, res) => {
            const ctxUser = requireAuth(req);
            const input = parseInput(
                z.object({
                    requestId: z.string(),
                    reason: z.string(),
                }),
                req.body,
            );
            const request = await db.getCreditRequestById(input.requestId);
            if (!request || request.userId !== ctxUser.id) {
                throw ForbiddenError("Forbidden");
            }
            if (request.status !== "pending_employee_approval") {
                throw BadRequestError("Only pending employee approvals can be rejected.");
            }
            const timelineLog = appendTimelineEntry(
                request.timelineLog,
                buildTimelineEntry({
                    step: "EMPLOYEE_REJECTED",
                    role: "employee",
                    actor: ctxUser,
                    message: "Employee rejected freelancer request",
                    metadata: { reason: input.reason },
                }),
            );
            await db.updateCreditRequest(input.requestId, {
                userRejectionReason: input.reason,
                employeeRejectedAt: new Date(),
                status: "rejected_by_employee",
                timelineLog,
            });
            await db.createAuditLog({
                userId: ctxUser.id,
                action: "credit_request_rejected_by_employee",
                entityType: "credit_request",
                entityId: input.requestId,
                details: input.reason,
            });
            if (request.initiatorId) {
                const initiator = await db.getUserById(request.initiatorId);
                const hodUser = request.hodId ? await db.getUserById(request.hodId) : null;
                await db.createNotification({
                    userId: request.initiatorId,
                    title: "Freelancer request rejected",
                    message: `The freelancer request was rejected by ${ctxUser.name || ctxUser.email}. Reason: ${input.reason}`,
                    type: "warning",
                    actionUrl: "/approvals",
                });
                try {
                    await sendInitiatorFreelancerRejectionEmail({
                        to: initiator?.email,
                        initiatorName: initiator?.name,
                        employee: ctxUser,
                        hod: hodUser,
                        amount: request.amount,
                        currency: request.currency,
                        reason: input.reason,
                        rejectedBy: ctxUser.name || ctxUser.email,
                        requestType: request.type,
                    });
                }
                catch (error) {
                    console.warn("[Email] Failed to send initiator rejection email:", error?.message || error);
                }
            }
            res.json({ success: true });
        }),
    );

    // ==================== WALLET ====================
    router.get(
        "/wallet/balance",
        asyncHandler(async (req, res) => {
            const ctxUser = requireAuth(req);
            const [wallet, summary] = await Promise.all([
                db.getWalletByUserId(ctxUser.id),
                db.getWalletSummary(ctxUser.id),
            ]);
            const currency = normalizeCurrency(wallet?.currency, getUserCurrency(ctxUser));
            res.json({ balance: wallet?.balance || 0, currency, ...summary });
        }),
    );

    router.get(
        "/wallet/transactions",
        asyncHandler(async (req, res) => {
            const ctxUser = requireAuth(req);
            res.json(await db.getWalletTransactions(ctxUser.id));
        }),
    );

    // ==================== REDEMPTION ====================
    router.post(
        "/redemption",
        asyncHandler(async (req, res) => {
            const ctxUser = requireAuth(req);
            const input = parseInput(
                z.object({
                    creditTransactionId: z.string(),
                    notes: z.string().optional(),
                }),
                req.body,
            );
            const creditTxn = await db.getWalletTransactionById(input.creditTransactionId);
            if (!creditTxn || creditTxn.userId?.toString() !== ctxUser.id.toString()) {
                throw ForbiddenError("Invalid credit selection.");
            }
            if (creditTxn.type !== "credit") {
                throw BadRequestError("Selected transaction is not a credit.");
            }
            if (creditTxn.redeemed) {
                throw BadRequestError("Selected credit has already been redeemed.");
            }
            const amount = Number(creditTxn.amount || 0);
            await db.reconcileCurrencyForUser(ctxUser.id.toString());
            const dbUser = await db.getUserById(ctxUser.id.toString());
            const redemptionCurrency = getUserCurrency(dbUser || ctxUser);
            const creditCurrency = normalizeCurrency(creditTxn.currency, redemptionCurrency);
            if (creditCurrency !== redemptionCurrency) {
                throw BadRequestError(
                    `Currency mismatch found for this credit. Expected ${redemptionCurrency}. Please refresh and try again.`,
                );
            }
            const balanceBefore = await db.getWalletBalance(ctxUser.id.toString());
            if (balanceBefore < amount) {
                throw BadRequestError("Insufficient balance");
            }
            const timelineLog = appendTimelineEntry(
                creditTxn.timelineLog,
                buildTimelineEntry({
                    step: "REDEMPTION_REQUESTED",
                    role: "employee",
                    actor: ctxUser,
                    message: "Redemption requested",
                    metadata: {
                        creditTransactionId: creditTxn._id?.toString(),
                        amount,
                        currency: redemptionCurrency,
                    },
                }),
            );
            const redemption = await db.createRedemptionRequest({
                userId: ctxUser.id,
                amount,
                currency: redemptionCurrency,
                notes: input.notes,
                creditTransactionId: creditTxn._id?.toString(),
                timelineLog,
            });
            const balanceAfter = balanceBefore - amount;
            await db.createWalletTransaction({
                userId: ctxUser.id,
                type: "debit",
                amount,
                currency: redemptionCurrency,
                redemptionRequestId: redemption._id?.toString(),
                linkedCreditTxnId: creditTxn._id?.toString(),
                description: "Redemption",
                balance: balanceAfter,
                timelineLog,
            });
            await db.updateWalletTransaction(creditTxn._id?.toString(), {
                redeemed: true,
                redemptionRequestId: redemption._id?.toString(),
            });
            let pdfBuffer = null;
            try {
                pdfBuffer = await buildTimelinePdf({
                    title: "Wallet Redemption Proof",
                    employee: { name: ctxUser.name, email: ctxUser.email },
                    amount,
                    currency: redemptionCurrency,
                    timelineLog,
                    creditTransactionId: creditTxn._id?.toString(),
                    redemptionId: redemption._id?.toString(),
                });
                const pdfFile = await saveBufferToGridFS({
                    buffer: pdfBuffer,
                    filename: `redemption-${redemption._id?.toString()}.pdf`,
                    mimeType: "application/pdf",
                    metadata: { redemptionId: redemption._id?.toString() },
                });
                await db.updateRedemptionRequest(redemption._id?.toString(), {
                    proofPdf: {
                        filename: pdfFile.filename,
                        url: `/api/files/${pdfFile.fileId}`,
                        generatedAt: new Date(),
                    },
                });
            }
            catch (error) {
                console.warn("[PDF] Failed to generate redemption proof:", error?.message || error);
            }
            await db.createAuditLog({
                userId: ctxUser.id,
                action: "redemption_requested",
                entityType: "redemption_request",
                details: JSON.stringify({ amount, creditTransactionId: creditTxn._id?.toString() }),
            });
            await db.createNotification({
                userId: ctxUser.id,
                title: "Redemption request submitted",
                message: `Your redemption request for ${formatMoney(amount, redemptionCurrency)} was submitted.`,
                type: "info",
                actionUrl: "/my-account",
            });
            const accountUsers = await db.getUsersByRole("account");
            await Promise.all(
                accountUsers.map(async (user) => {
                    await db.createNotification({
                        userId: user._id.toString(),
                        title: "New redemption request",
                        message: `A redemption request for ${formatMoney(amount, redemptionCurrency)} is waiting to be processed.`,
                        type: "action",
                        actionUrl: "/accounts",
                    });
                    try {
                        await sendRedemptionRequestEmail({
                            to: user.email,
                            accountName: user.name,
                            employee: { name: ctxUser.name, email: ctxUser.email },
                            amount,
                            currency: redemptionCurrency,
                            balanceBefore,
                            balanceAfter,
                            redemptionId: redemption._id?.toString(),
                            timelineLog,
                            pdfAttachment: pdfBuffer
                                ? { content: pdfBuffer, filename: `redemption-${redemption._id?.toString()}.pdf` }
                                : null,
                        });
                    }
                    catch (error) {
                        console.warn("[Email] Failed to send redemption email:", error?.message || error);
                    }
                }),
            );
            res.json({ success: true });
        }),
    );

    router.get(
        "/redemption/my",
        asyncHandler(async (req, res) => {
            const ctxUser = requireAuth(req);
            const requests = await db.getRedemptionRequestsByUserId(ctxUser.id);
            res.json(await hydrateRedemptionRequests(requests));
        }),
    );

    router.get(
        "/redemption/queue",
        asyncHandler(async (req, res) => {
            requireRole(req, ["admin", "account"], "Accounts access required");
            const requests = await db.getAllRedemptionRequests();
            res.json(await hydrateRedemptionRequests(requests));
        }),
    );

    router.post(
        "/redemption/process",
        asyncHandler(async (req, res) => {
            const ctxUser = requireRole(req, ["admin", "account"], "Accounts access required");
            const input = parseInput(
                z.object({
                    requestId: z.string(),
                    transactionReference: z.string(),
                    paymentNotes: z.string().optional(),
                    paymentCurrency: z.enum(CURRENCY_VALUES).optional(),
                }),
                req.body,
            );
            const request = await db.getRedemptionRequestById(input.requestId);
            if (!request) {
                throw NotFoundError("Not found");
            }
            const employeeId = request.userId?.toString?.() || request.userId;
            await db.reconcileCurrencyForUser(employeeId);
            const employee = await db.getUserById(employeeId);
            const expectedCurrency = getUserCurrency(employee);
            const processedCurrency = normalizeCurrency(input.paymentCurrency, expectedCurrency);
            if (processedCurrency !== expectedCurrency) {
                throw BadRequestError(
                    `Payment currency mismatch. This request must be processed in ${expectedCurrency}.`,
                );
            }
            if (normalizeCurrency(request.currency, expectedCurrency) !== expectedCurrency) {
                await db.updateRedemptionRequest(input.requestId, { currency: expectedCurrency });
            }
            const timelineLog = appendTimelineEntry(
                request.timelineLog,
                buildTimelineEntry({
                    step: "REDEMPTION_PROCESSED",
                    role: ctxUser.role,
                    actor: ctxUser,
                    signatureId: ctxUser.id,
                    message: "Redemption processed",
                    metadata: {
                        transactionReference: input.transactionReference,
                        currency: processedCurrency,
                    },
                }),
            );
            await db.updateRedemptionRequest(input.requestId, {
                status: "completed",
                processedBy: ctxUser.id,
                processedAt: new Date(),
                currency: processedCurrency,
                transactionReference: input.transactionReference,
                paymentNotes: input.paymentNotes,
                timelineLog,
            });
            // Debit is recorded when the redemption request is submitted.
            await db.createAuditLog({
                userId: ctxUser.id,
                action: "redemption_processed",
                entityType: "redemption_request",
                entityId: input.requestId,
                details: JSON.stringify({
                    transactionReference: input.transactionReference,
                    paymentCurrency: processedCurrency,
                }),
            });
            await db.createNotification({
                userId: request.userId,
                title: "Redemption processed",
                message: `Your redemption request for ${formatMoney(request.amount, processedCurrency)} has been processed. Reference: ${input.transactionReference}`,
                type: "success",
                actionUrl: "/my-account",
            });
            try {
                await sendRedemptionProcessedEmail({
                    to: employee?.email,
                    employeeName: employee?.name,
                    amount: request.amount,
                    currency: processedCurrency,
                    transactionReference: input.transactionReference,
                    processedBy: ctxUser?.name || ctxUser?.email,
                    paymentNotes: input.paymentNotes,
                    redemptionId: request._id?.toString(),
                });
            }
            catch (error) {
                console.warn("[Email] Failed to send redemption processed email:", error?.message || error);
            }
            res.json({ success: true });
        }),
    );

    // ==================== AUDIT LOGS ====================
    router.get(
        "/audit",
        asyncHandler(async (req, res) => {
            requireRole(req, ["admin", "hod"], "HOD access required");
            const input = parseInput(
                z.object({
                    userId: z.string().optional(),
                    action: z.string().optional(),
                    entityType: z.string().optional(),
                    limit: z.coerce.number().default(100),
                }),
                req.query,
            );
            res.json(await db.getAuditLogs(input));
        }),
    );

    // ==================== ACCESS CONTROL ====================
    router.post(
        "/access/grant",
        asyncHandler(async (req, res) => {
            const ctxUser = requireRole(req, ["admin", "hod"], "HOD access required");
            const input = parseInput(
                z.object({
                    userId: z.string(),
                    feature: z.string(),
                    reason: z.string(),
                    expiresAt: z.coerce.date().optional(),
                }),
                req.body,
            );
            await db.grantAccess({
                ...input,
                grantedBy: ctxUser.id,
            });
            await db.createAuditLog({
                userId: ctxUser.id,
                action: "access_granted",
                entityType: "access_control",
                details: JSON.stringify(input),
            });
            res.json({ success: true });
        }),
    );

    router.post(
        "/access/revoke",
        asyncHandler(async (req, res) => {
            const ctxUser = requireRole(req, ["admin", "hod"], "HOD access required");
            const input = parseInput(z.object({ accessId: z.string() }), req.body);
            const access = await db.getAllAccessGrants();
            const targetAccess = access.find((a) => a._id?.toString() === input.accessId);
            if (targetAccess) {
                await db.revokeAccess(targetAccess.userId, targetAccess.feature);
            }
            await db.createAuditLog({
                userId: ctxUser.id,
                action: "access_revoked",
                entityType: "access_control",
                entityId: input.accessId,
            });
            res.json({ success: true });
        }),
    );

    router.get(
        "/access",
        asyncHandler(async (req, res) => {
            requireRole(req, ["admin", "hod"], "HOD access required");
            res.json(await db.getAllAccessGrants());
        }),
    );

    router.get(
        "/access/my",
        asyncHandler(async (req, res) => {
            const ctxUser = requireAuth(req);
            res.json(await db.getActiveAccessGrants(ctxUser.id));
        }),
    );

    // ==================== NOTIFICATIONS ====================
    router.get(
        "/notifications",
        asyncHandler(async (req, res) => {
            const ctxUser = requireAuth(req);
            const input = parseInput(
                z.object({
                    limit: z.coerce.number().min(1).max(200).optional(),
                }),
                req.query,
            );
            res.json(await db.getNotificationsByUserId(ctxUser.id, input.limit || 50));
        }),
    );

    router.get(
        "/notifications/unread-count",
        asyncHandler(async (req, res) => {
            const ctxUser = requireAuth(req);
            const count = await db.getUnreadNotificationCount(ctxUser.id);
            res.json({ count });
        }),
    );

    router.post(
        "/notifications/mark-read",
        asyncHandler(async (req, res) => {
            const ctxUser = requireAuth(req);
            const input = parseInput(z.object({ id: z.string() }), req.body);
            await db.markNotificationRead(input.id, ctxUser.id);
            res.json({ success: true });
        }),
    );

    router.post(
        "/notifications/mark-all-read",
        asyncHandler(async (req, res) => {
            const ctxUser = requireAuth(req);
            await db.markAllNotificationsRead(ctxUser.id);
            res.json({ success: true });
        }),
    );

    // ==================== REPORTS & ANALYTICS ====================
    router.get(
        "/reports/overview",
        asyncHandler(async (req, res) => {
            const ctxUser = requireRole(req, ["admin", "hod"], "HOD access required");
            const input = parseInput(
                z.object({
                    months: z.coerce.number().min(3).max(12).optional(),
                }),
                req.query,
            );
            const monthsBack = input.months ?? 6;
            const scopedEmployees =
                ctxUser.role === "admin"
                    ? (await db.getAllUsers()).filter(
                        (user) => user.role === "employee" && user.isEmployee !== false,
                    )
                    : (await db.getUsersByHod(ctxUser.id)).filter(
                        (user) => user.role === "employee" && user.isEmployee !== false,
                    );
            const scopedEmployeeIds = scopedEmployees.map((user) => user._id.toString());
            const [creditRequests, walletTransactions, redemptions] = await Promise.all([
                ctxUser.role === "admin"
                    ? db.getAllCreditRequests()
                    : db.getCreditRequestsByUserIds(scopedEmployeeIds),
                ctxUser.role === "admin"
                    ? db.getAllWalletTransactions()
                    : db.getWalletTransactionsByUserIds(scopedEmployeeIds),
                ctxUser.role === "admin"
                    ? db.getAllRedemptionRequests()
                    : db.getRedemptionRequestsByUserIds(scopedEmployeeIds),
            ]);
            const scopedEmployeeIdSet = new Set(scopedEmployeeIds);
            const scopedCreditRequests =
                ctxUser.role === "admin"
                    ? creditRequests
                    : creditRequests.filter((request) =>
                        scopedEmployeeIdSet.has(request.userId?.toString?.() || request.userId),
                    );
            const userCurrencyMap = new Map(
                scopedEmployees.map((user) => [user._id.toString(), getUserCurrency(user)]),
            );
            const monthLabels = [];
            const now = new Date();
            for (let i = monthsBack - 1; i >= 0; i -= 1) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                monthLabels.push({
                    key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
                    label: date.toLocaleString("default", { month: "short", year: "numeric" }),
                });
            }
            const buildMonthlySeries = (items, valueSelector, currencySelector) => {
                const totals = new Map(
                    monthLabels.map((label) => [label.key, { USD: 0, INR: 0, total: 0 }]),
                );
                items.forEach((item) => {
                    const date = new Date(item.createdAt);
                    if (Number.isNaN(date.getTime())) {
                        return;
                    }
                    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
                    if (!totals.has(key)) {
                        return;
                    }
                    const amount = Number(valueSelector(item) || 0);
                    const currency = normalizeCurrency(currencySelector(item));
                    const bucket = totals.get(key);
                    bucket[currency] = (bucket[currency] || 0) + amount;
                    bucket.total += amount;
                    totals.set(key, bucket);
                });
                return monthLabels.map((label) => ({
                    month: label.label,
                    ...(totals.get(label.key) || { USD: 0, INR: 0, total: 0 }),
                }));
            };
            const sumByCurrency = (items, amountSelector, currencySelector) =>
                items.reduce(
                    (acc, item) => {
                        const amount = Number(amountSelector(item) || 0);
                        const currency = normalizeCurrency(currencySelector(item));
                        acc[currency] = (acc[currency] || 0) + amount;
                        return acc;
                    },
                    { USD: 0, INR: 0 },
                );
            const creditsByMonth = buildMonthlySeries(
                walletTransactions.filter((t) => t.type === "credit"),
                (item) => item.amount,
                (item) => item.currency || userCurrencyMap.get(item.userId),
            );
            const redemptionsByMonth = buildMonthlySeries(
                walletTransactions.filter((t) => t.type === "debit"),
                (item) => item.amount,
                (item) => item.currency || userCurrencyMap.get(item.userId),
            );
            const policyCounts = scopedCreditRequests
                .filter((request) => request.type === "policy" && request.policyId)
                .reduce((acc, request) => {
                    acc[request.policyId] = (acc[request.policyId] || 0) + 1;
                    return acc;
                }, {});
            const policyIds = Object.keys(policyCounts);
            const policies = policyIds.length > 0 ? await db.getPoliciesByIds(policyIds) : [];
            const policyMap = new Map(policies.map((policy) => [policy._id.toString(), policy.name]));
            const topPolicies = policyIds
                .map((policyId) => ({
                    policyId,
                    name: policyMap.get(policyId) || "Unknown Policy",
                    requests: policyCounts[policyId],
                }))
                .sort((a, b) => b.requests - a.requests)
                .slice(0, 5);
            const employeeTypeCounts = scopedEmployees.reduce((acc, user) => {
                const type = user.employeeType || "unknown";
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {});
            const totalCreditsByCurrency = sumByCurrency(
                walletTransactions.filter((t) => t.type === "credit"),
                (item) => item.amount,
                (item) => item.currency || userCurrencyMap.get(item.userId),
            );
            const totalRedemptionsByCurrency = sumByCurrency(
                walletTransactions.filter((t) => t.type === "debit"),
                (item) => item.amount,
                (item) => item.currency || userCurrencyMap.get(item.userId),
            );
            const totalCredits = Object.values(totalCreditsByCurrency).reduce((sum, value) => sum + value, 0);
            const totalRedemptions = Object.values(totalRedemptionsByCurrency).reduce(
                (sum, value) => sum + value,
                0,
            );
            res.json({
                totals: {
                    totalCredits,
                    totalCreditsByCurrency,
                    totalRedemptions,
                    totalRedemptionsByCurrency,
                    pendingApprovals: scopedCreditRequests.filter((r) => r.status === "pending_approval").length,
                    pendingSignatures: scopedCreditRequests.filter((r) => r.status === "pending_signature").length,
                    pendingRedemptions: redemptions.filter((r) => r.status === "pending").length,
                },
                creditsByMonth,
                redemptionsByMonth,
                topPolicies,
                employeeTypes: Object.entries(employeeTypeCounts).map(([type, count]) => ({ type, count })),
            });
        }),
    );

    // ==================== DASHBOARD ====================
    router.get(
        "/dashboard/stats",
        asyncHandler(async (req, res) => {
            const ctxUser = requireAuth(req);
            const role = ctxUser.role;
            try {
                if (role === "admin") {
                    const allUsers = await Promise.race([
                        db.getAllUsers(),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error("getAllUsers timeout")), 5000),
                        ),
                    ]);
                    const allRequests = await Promise.race([
                        db.getCreditRequestsByStatus("pending_approval"),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error("getCreditRequestsByStatus timeout")), 5000),
                        ),
                    ]);
                    const allRedemptions = await Promise.race([
                        db.getRedemptionRequestsByStatus("pending"),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error("getRedemptionRequestsByStatus timeout")), 5000),
                        ),
                    ]);
                    res.json({
                        totalUsers: allUsers.length,
                        totalHods: allUsers.filter((u) => u.role === "hod").length,
                        pendingApprovals: allRequests.length,
                        pendingRedemptions: allRedemptions.length,
                    });
                    return;
                }
                if (role === "hod") {
                    const myTeam = await db.getUsersByHod(ctxUser.id);
                    const myPolicies = await db.getPoliciesByCreator(ctxUser.id);
                    const pendingApprovals = await db.getCreditRequestsByHod(ctxUser.id);
                    res.json({
                        teamSize: myTeam.length,
                        activePolicies: myPolicies.filter((p) => p.status === "active").length,
                        pendingApprovals: pendingApprovals.filter((r) => r.status === "pending_approval").length,
                    });
                    return;
                }
                if (role === "account") {
                    const allRedemptions = await db.getAllRedemptionRequests();
                    res.json({
                        pendingRedemptions: allRedemptions.filter((r) => r.status === "pending").length,
                        processingToday: allRedemptions.filter((r) => r.status === "processing").length,
                        completedThisMonth: allRedemptions.filter((r) => r.status === "completed").length,
                    });
                    return;
                }
                const wallet = await db.getWalletByUserId(ctxUser.id.toString());
                const myRequests = await db.getCreditRequestsByUserId(ctxUser.id.toString());
                const myPolicies = await db.getEmployeePolicyAssignmentsByUserId(ctxUser.id.toString());
                const summary = await db.getWalletSummary(ctxUser.id.toString());
                const userCurrency = normalizeCurrency(wallet?.currency, getUserCurrency(ctxUser));
                res.json({
                    walletBalance: wallet?.balance || 0,
                    currency: userCurrency,
                    pendingReviews: myRequests.filter(
                        (r) =>
                            r.status === "pending_signature" || r.status === "pending_employee_approval",
                    ).length,
                    activePolicies: myPolicies.length,
                    thisMonthEarnings: summary.earned,
                });
            }
            catch (error) {
                console.error("[Dashboard] Error fetching stats:", error);
                res.json({
                    totalUsers: 0,
                    totalHods: 0,
                    pendingApprovals: 0,
                    pendingRedemptions: 0,
                });
            }
        }),
    );

    // ==================== GLOBAL SEARCH ====================
    router.get(
        "/search/global",
        asyncHandler(async (req, res) => {
            const ctxUser = requireAuth(req);
            const input = parseInput(
                z.object({
                    q: z.string().trim().min(2, "Enter at least 2 characters"),
                    limit: z.coerce.number().min(1).max(12).optional(),
                }),
                req.query,
            );
            const limit = input.limit ?? 6;
            const query = input.q.trim();

            const dedupeById = (items) => {
                const seen = new Set();
                return items.filter((item) => {
                    const id = item?._id?.toString?.() || item?.id;
                    if (!id || seen.has(id)) {
                        return false;
                    }
                    seen.add(id);
                    return true;
                });
            };

            let users = [];
            let policies = [];
            let requests = [];

            if (ctxUser.role === "admin") {
                [users, policies, requests] = await Promise.all([
                    db.searchUsers(query, { limit }),
                    db.searchPolicies(query, { limit }),
                    db.searchCreditRequests(query, { limit: limit * 2 }),
                ]);
            } else if (ctxUser.role === "hod") {
                [users, policies, requests] = await Promise.all([
                    db.searchUsers(query, { limit, hodId: ctxUser.id }),
                    db.searchPolicies(query, { limit }),
                    db.searchCreditRequests(query, { limit: limit * 2, hodId: ctxUser.id }),
                ]);
            } else if (ctxUser.role === "employee") {
                const [myRequests, initiatedRequests, policyLinks] = await Promise.all([
                    db.searchCreditRequests(query, { limit: limit * 2, userIds: [ctxUser.id] }),
                    db.searchCreditRequests(query, { limit: limit * 2, initiatorId: ctxUser.id }),
                    db.getEmployeePolicyAssignmentsByUserId(ctxUser.id),
                ]);
                users = await db.searchUsers(query, { limit, userIds: [ctxUser.id] });
                const policyIds = Array.from(
                    new Set((policyLinks || []).map((assignment) => assignment.policyId).filter(Boolean)),
                );
                if (policyIds.length > 0) {
                    const assignedPolicies = await db.getPoliciesByIds(policyIds);
                    const q = query.toLowerCase();
                    policies = assignedPolicies
                        .filter((policy) => {
                            const hay = `${policy.name || ""} ${policy.description || ""} ${policy.status || ""}`.toLowerCase();
                            return hay.includes(q);
                        })
                        .slice(0, limit);
                }
                requests = dedupeById([...(myRequests || []), ...(initiatedRequests || [])]).slice(0, limit * 2);
            } else {
                users = await db.searchUsers(query, { limit, userIds: [ctxUser.id] });
                policies = await db.searchPolicies(query, { limit, statuses: ["active"] });
                requests = await db.searchCreditRequests(query, { limit: limit * 2, statuses: ["approved"] });
            }

            const hydratedRequests = await hydrateCreditRequests(requests);
            const requestSummaries = hydratedRequests.slice(0, limit * 2).map((request) => ({
                id: request._id?.toString(),
                label:
                    request.type === "policy"
                        ? request.policy?.name || "Policy request"
                        : "Freelancer request",
                subtitle: `${request.user?.name || "Unknown user"} • ${request.status}`,
                amount: request.amount,
                currency: request.currency,
                status: request.status,
                type: request.type,
                route:
                    request.status === "pending_approval" || request.status === "pending_employee_approval"
                        ? "/approvals"
                        : "/transactions",
            }));

            const userSummaries = users.slice(0, limit).map((user) => ({
                id: user._id?.toString(),
                label: user.name || user.email,
                subtitle: `${user.email} • ${user.role}`,
                role: user.role,
                route: user._id?.toString() === ctxUser.id ? "/profile" : "/user-management",
            }));

            const policySummaries = policies.slice(0, limit).map((policy) => ({
                id: policy._id?.toString(),
                label: policy.name,
                subtitle: policy.status || "draft",
                status: policy.status,
                route: "/policies",
            }));

            res.json({
                query,
                users: userSummaries,
                policies: policySummaries,
                requests: requestSummaries,
                counts: {
                    users: userSummaries.length,
                    policies: policySummaries.length,
                    requests: requestSummaries.length,
                },
            });
        }),
    );

    // ==================== GHL WEBHOOK ====================
    router.post(
        "/ghl/document-webhook",
        asyncHandler(async (req, res) => {
            const input = parseInput(
                z.object({
                    email: z.string().email().optional(),
                    contact: z.object({ email: z.string().email() }).optional(),
                    contactEmail: z.string().email().optional(),
                    status: z.string().optional(),
                }),
                req.body,
            );
            const email = (input.email || input.contact?.email || input.contactEmail || "").trim().toLowerCase();
            if (!email) {
                throw BadRequestError("Email missing in webhook payload");
            }
            console.log(`[GHL Webhook] Document completed for: ${email}`);
            const user = await db.getUserByEmail(email);
            if (!user) {
                console.error(`[GHL Webhook] User not found: ${email}`);
                throw NotFoundError("User not found");
            }
            const requests = await db.getCreditRequestsByUserId(user._id.toString());
            const pendingRequest = requests.find((r) => r.status === "pending_signature");
            if (!pendingRequest) {
                console.error(`[GHL Webhook] No pending request found for: ${email}`);
                res.json({ ok: true, message: "No pending request found" });
                return;
            }
            await db.updateCreditRequest(pendingRequest._id.toString(), {
                status: "pending_approval",
                userSignedAt: new Date(),
            });
            console.log(`[GHL Webhook] Updated request ${pendingRequest._id} to pending_approval`);
            res.json({ ok: true, message: "Status updated successfully" });
        }),
    );

    return router;
}
