import mongoose from "mongoose";
import { connectDB, User, Policy, TeamAssignment, EmployeePolicy, PolicyInitiator, EmployeeInitiator, CreditRequest, Wallet, WalletTransaction, Notification, RedemptionRequest, AuditLog, SystemMeta, AccessControl, } from './models.js';
import { DEFAULT_CURRENCY, getCurrencyByEmployeeType, normalizeCurrency } from "./shared/currency.js";
import { DB_SCHEMA_META_KEY } from "./shared/sync.js";
// Ensure DB connection before any operation
async function ensureConnection() {
    await connectDB();
}

function hasActiveDbConnection() {
    return mongoose.connection?.readyState === 1;
}

function normalizeNumericVersion(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}
const LEGACY_ROLE_MAP = {
    user: 'employee',
    accounts_manager: 'account',
    initiator: 'employee',
};
const LEGACY_EMPLOYEE_TYPE_MAP = {
    permanent: 'permanent_india', 
};
function normalizeRoleValue(role) {
    return LEGACY_ROLE_MAP[role] || role;
} 
function normalizeEmployeeTypeValue(employeeType) {
    return LEGACY_EMPLOYEE_TYPE_MAP[employeeType] || employeeType;
}
function normalizeEmailValue(email) {
    return typeof email === "string" ? email.trim().toLowerCase() : email;
}
function normalizeCurrencyValue(currency, employeeType) {
    const normalizedEmployeeType = normalizeEmployeeTypeValue(employeeType);
    if (normalizedEmployeeType) {
        return getCurrencyByEmployeeType(normalizedEmployeeType);
    }
    return normalizeCurrency(currency, DEFAULT_CURRENCY);
}
function buildSearchRegex(query) {
    const normalized = (query || "").trim();
    if (!normalized) {
        return null;
    }
    return new RegExp(escapeRegex(normalized), "i");
}
function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function normalizeUserRecord(user) {
    if (!user)
        return user;
    const normalizedEmployeeType = normalizeEmployeeTypeValue(user.employeeType);
    return {
        ...user,
        role: normalizeRoleValue(user.role),
        employeeType: normalizedEmployeeType,
        currency: normalizeCurrencyValue(user.currency, normalizedEmployeeType),
    };
}
function normalizeUserList(users) {
    return users.map(normalizeUserRecord);
}
function expandRoleFilter(role) {
    const normalizedRole = normalizeRoleValue(role);
    if (normalizedRole === 'employee') {
        return ['employee', 'user', 'initiator'];
    }
    if (normalizedRole === 'account') {
        return ['account', 'accounts_manager'];
    }
    return [normalizedRole];
}
// ==================== USER OPERATIONS ====================
export async function upsertUser(userData) {
    await ensureConnection();
    const normalizedEmployeeType = userData.employeeType !== undefined
        ? normalizeEmployeeTypeValue(userData.employeeType)
        : undefined;
    const updateData = {
        openId: userData.openId,
        lastSignedIn: userData.lastSignedIn || new Date(),
    };
    if (userData.name !== undefined)
        updateData.name = userData.name;
    if (userData.email !== undefined)
        updateData.email = normalizeEmailValue(userData.email);
    if (userData.loginMethod !== undefined)
        updateData.loginMethod = userData.loginMethod;
    if (normalizedEmployeeType !== undefined)
        updateData.employeeType = normalizedEmployeeType;
    if (userData.currency !== undefined || normalizedEmployeeType !== undefined) {
        updateData.currency = normalizeCurrencyValue(userData.currency, normalizedEmployeeType);
    }
    // Set role, defaulting to admin for owner
    if (userData.role !== undefined) {
        updateData.role = normalizeRoleValue(userData.role);
    }
    await User.findOneAndUpdate({ openId: userData.openId }, { $set: updateData }, { upsert: true, new: true });
}
export async function getUserByOpenId(openId) {
    await ensureConnection();
    const user = await User.findOne({ openId }).lean();
    return normalizeUserRecord(user);
}
export async function getUserById(id) {
    await ensureConnection();
    const user = await User.findById(id).lean();
    return normalizeUserRecord(user);
}
export async function getUserByEmail(email) {
    await ensureConnection();
    const normalizedEmail = normalizeEmailValue(email || "");
    const matcher = normalizedEmail
        ? new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i")
        : email;
    // Explicitly select all fields including password
    const user = await User.findOne({ email: matcher }).select('+password').lean();
    return normalizeUserRecord(user);
}
export async function getUsersByIds(userIds) {
    await ensureConnection();
    const users = await User.find({ _id: { $in: userIds } }).lean();
    return normalizeUserList(users);
}
export async function getAllUsers() {
    await ensureConnection();
    const users = await User.find().sort({ createdAt: -1 }).lean();
    return normalizeUserList(users);
}
export async function getUsersByRole(role) {
    await ensureConnection();
    const roles = expandRoleFilter(role);
    const users = await User.find({ role: { $in: roles } }).sort({ createdAt: -1 }).lean();
    return normalizeUserList(users);
}
export async function hasAdminUser() {
    await ensureConnection();
    const admin = await User.findOne({ role: 'admin' }).select('_id').lean();
    return !!admin;
}

export async function ensureDbSchemaVersion(requiredVersion) {
    await ensureConnection();
    if (!hasActiveDbConnection()) {
        return {
            skipped: true,
            requiredVersion,
            currentVersion: 0,
            compatible: false,
            updated: false,
        };
    }
    const existing = await SystemMeta.findOne({ key: DB_SCHEMA_META_KEY }).lean();
    const currentVersion = normalizeNumericVersion(existing?.value, 0);
    if (currentVersion >= requiredVersion) {
        return {
            skipped: false,
            requiredVersion,
            currentVersion,
            compatible: true,
            updated: false,
        };
    }
    await SystemMeta.findOneAndUpdate(
        { key: DB_SCHEMA_META_KEY },
        { $set: { value: requiredVersion } },
        { upsert: true, new: true },
    );
    return {
        skipped: false,
        requiredVersion,
        currentVersion: requiredVersion,
        compatible: true,
        updated: true,
    };
}

export async function getDbSchemaVersionState(requiredVersion) {
    await ensureConnection();
    if (!hasActiveDbConnection()) {
        return {
            skipped: true,
            requiredVersion,
            currentVersion: 0,
            compatible: false,
        };
    }
    const existing = await SystemMeta.findOne({ key: DB_SCHEMA_META_KEY }).lean();
    const currentVersion = normalizeNumericVersion(existing?.value, 0);
    return {
        skipped: false,
        requiredVersion,
        currentVersion,
        compatible: currentVersion >= requiredVersion,
    };
}

export async function getUsersByHod(hodId) {
    await ensureConnection();
    const users = await User.find({ hodId }).sort({ createdAt: -1 }).lean();
    return normalizeUserList(users);
}
export async function createUser(userData) {
    await ensureConnection();
    const normalizedEmployeeType = normalizeEmployeeTypeValue(userData.employeeType);
    // Hash password if provided
    const dataToSave = {
        ...userData,
        role: normalizeRoleValue(userData.role),
        employeeType: normalizedEmployeeType,
        currency: normalizeCurrencyValue(userData.currency, normalizedEmployeeType),
        email: normalizeEmailValue(userData.email),
    };
    if (userData.password) {
        const bcrypt = await import('bcryptjs');
        dataToSave.password = await bcrypt.hash(userData.password, 10);
    }
    const user = await User.create(dataToSave);
    return normalizeUserRecord(user.toObject());
}
export async function updateUser(id, updates) {
    await ensureConnection();
    const normalizedUpdates = { ...updates };
    if (updates.role !== undefined) {
        normalizedUpdates.role = normalizeRoleValue(updates.role);
    }
    const normalizedEmployeeType = updates.employeeType !== undefined
        ? normalizeEmployeeTypeValue(updates.employeeType)
        : undefined;
    if (normalizedEmployeeType !== undefined) {
        normalizedUpdates.employeeType = normalizedEmployeeType;
    }
    if (updates.currency !== undefined || normalizedEmployeeType !== undefined) {
        normalizedUpdates.currency = normalizeCurrencyValue(updates.currency, normalizedEmployeeType);
    }
    if (updates.email !== undefined) {
        normalizedUpdates.email = normalizeEmailValue(updates.email);
    }
    if (updates.password) {
        const bcrypt = await import('bcryptjs');
        normalizedUpdates.password = await bcrypt.hash(updates.password, 10);
    }
    await User.findByIdAndUpdate(id, { $set: normalizedUpdates });
}
export async function deleteUser(id) {
    await ensureConnection();
    await User.findByIdAndDelete(id);
}
// ==================== POLICY OPERATIONS ====================
export async function getAllPolicies() {
    await ensureConnection();
    return await Policy.find().sort({ createdAt: -1 }).lean();
}
export async function getPoliciesByIds(policyIds) {
    await ensureConnection();
    return await Policy.find({ _id: { $in: policyIds } }).lean();
}
export async function getPoliciesByCreator(creatorId) {
    await ensureConnection();
    return await Policy.find({ createdBy: creatorId }).sort({ createdAt: -1 }).lean();
}
export async function getPolicyById(id) {
    await ensureConnection();
    return await Policy.findById(id).lean();
}
export async function getPoliciesByStatus(status) {
    await ensureConnection();
    return await Policy.find({ status }).sort({ createdAt: -1 }).lean();
}
export async function createPolicy(policyData) {
    await ensureConnection();
    const policy = await Policy.create(policyData);
    return policy.toObject();
}
export async function addPolicyAttachments(policyId, attachments) {
    await ensureConnection();
    const updated = await Policy.findByIdAndUpdate(policyId, {
        $push: { attachments: { $each: attachments } },
    }, { new: true }).lean();
    return updated;
}
export async function removePolicyAttachment(policyId, attachmentId) {
    await ensureConnection();
    const updated = await Policy.findByIdAndUpdate(policyId, {
        $pull: { attachments: { _id: attachmentId } },
    }, { new: true }).lean();
    return updated;
}
export async function updatePolicy(id, updates) {
    await ensureConnection();
    await Policy.findByIdAndUpdate(id, { $set: updates });
}
export async function deletePolicy(id) {
    await ensureConnection();
    await Policy.findByIdAndDelete(id);
}
// ==================== TEAM ASSIGNMENT OPERATIONS ====================
export async function createTeamAssignment(data) {
    await ensureConnection();
    const assignment = await TeamAssignment.create(data);
    return assignment.toObject();
}
export async function getTeamAssignmentByUserId(userId) {
    await ensureConnection();
    return await TeamAssignment.findOne({ userId }).lean();
}
export async function updateTeamAssignment(userId, updates) {
    await ensureConnection();
    await TeamAssignment.findOneAndUpdate({ userId }, { $set: updates });
}
export async function deleteTeamAssignment(userId) {
    await ensureConnection();
    await TeamAssignment.findOneAndDelete({ userId });
}
// ==================== POLICY ASSIGNMENT OPERATIONS ====================
export async function createEmployeePolicyAssignment(data) {
    await ensureConnection();
    const assignment = await EmployeePolicy.create(data);
    return assignment.toObject();
}
export async function getEmployeePolicyAssignmentById(id) {
    await ensureConnection();
    return await EmployeePolicy.findById(id).lean();
}
export async function getEmployeePolicyAssignmentsByUserId(userId) {
    await ensureConnection();
    return await EmployeePolicy.find({ userId }).lean();
}
export async function getEmployeePolicyAssignmentByUserPolicy(userId, policyId) {
    await ensureConnection();
    return await EmployeePolicy.findOne({ userId, policyId }).lean();
}
export async function getEmployeePolicyAssignmentsByUserIds(userIds) {
    await ensureConnection();
    return await EmployeePolicy.find({ userId: { $in: userIds } }).lean();
}
export async function getEmployeePolicyAssignmentsByIds(assignmentIds) {
    await ensureConnection();
    return await EmployeePolicy.find({ _id: { $in: assignmentIds } }).lean();
}
export async function getEmployeePolicyAssignmentsByPolicyId(policyId) {
    await ensureConnection();
    return await EmployeePolicy.find({ policyId }).lean();
}
export async function removeEmployeePolicyAssignmentById(id) {
    await ensureConnection();
    await EmployeePolicy.findByIdAndDelete(id);
}
export async function removeEmployeePolicyAssignment(userId, policyId) {
    await ensureConnection();
    await EmployeePolicy.findOneAndDelete({ userId, policyId });
}
export async function updateEmployeePolicyAssignment(id, updates) {
    await ensureConnection();
    await EmployeePolicy.findByIdAndUpdate(id, { $set: updates });
}
export async function setPolicyInitiators(assignmentId, initiatorIds, assignedBy) {
    await ensureConnection();
    await PolicyInitiator.deleteMany({ assignmentId });
    if (!initiatorIds?.length) {
        return [];
    }
    const records = initiatorIds.map(initiatorId => ({
        assignmentId,
        initiatorId,
        assignedBy,
        assignedAt: new Date(),
    }));
    const result = await PolicyInitiator.insertMany(records);
    return result.map(r => r.toObject());
}
export async function getPolicyInitiatorsByAssignmentIds(assignmentIds) {
    await ensureConnection();
    return await PolicyInitiator.find({ assignmentId: { $in: assignmentIds } }).lean();
}
export async function getPolicyInitiatorsByInitiatorId(initiatorId) {
    await ensureConnection();
    return await PolicyInitiator.find({ initiatorId }).lean();
}
// ==================== EMPLOYEE INITIATOR OPERATIONS ====================
export async function setEmployeeInitiators(employeeId, initiatorIds, assignedBy) {
    await ensureConnection();
    await EmployeeInitiator.deleteMany({ employeeId });
    if (!initiatorIds?.length) {
        return [];
    }
    const records = initiatorIds.map(initiatorId => ({
        employeeId,
        initiatorId,
        assignedBy,
        assignedAt: new Date(),
    }));
    const result = await EmployeeInitiator.insertMany(records);
    return result.map(r => r.toObject());
}
export async function getEmployeeInitiatorsByEmployeeIds(employeeIds) {
    await ensureConnection();
    return await EmployeeInitiator.find({ employeeId: { $in: employeeIds } }).lean();
}
export async function getEmployeeInitiatorsByEmployeeId(employeeId) {
    await ensureConnection();
    return await EmployeeInitiator.find({ employeeId }).lean();
}
export async function getEmployeeInitiatorsByInitiatorId(initiatorId) {
    await ensureConnection();
    return await EmployeeInitiator.find({ initiatorId }).lean();
}
// ==================== CREDIT REQUEST OPERATIONS ====================
export async function createCreditRequest(data) {
    await ensureConnection();
    const request = await CreditRequest.create({
        ...data,
        currency: normalizeCurrency(data.currency, DEFAULT_CURRENCY),
    });
    return request.toObject();
}
async function resolveCurrencyByUserIds(userIds) {
    const uniqueIds = Array.from(new Set((userIds || []).filter(Boolean).map((id) => id.toString())));
    if (uniqueIds.length === 0) {
        return new Map();
    }
    const users = await User.find({ _id: { $in: uniqueIds } })
        .select("_id employeeType currency")
        .lean();
    return new Map(
        users.map((user) => [
            user._id.toString(),
            normalizeCurrencyValue(user.currency, user.employeeType),
        ]),
    );
}
function normalizeCreditRequestCurrency(request, userCurrencyMap) {
    if (!request) {
        return request;
    }
    const userId = request.userId?.toString?.() || request.userId;
    const authoritativeCurrency = userCurrencyMap.get(userId);
    return {
        ...request,
        currency: authoritativeCurrency || normalizeCurrency(request.currency, DEFAULT_CURRENCY),
    };
}
export async function getCreditRequestById(id) {
    await ensureConnection();
    const request = await CreditRequest.findById(id).lean();
    if (!request) {
        return request;
    }
    const userCurrencyMap = await resolveCurrencyByUserIds([request.userId]);
    return normalizeCreditRequestCurrency(request, userCurrencyMap);
}
export async function getCreditRequestsByUserId(userId) {
    await ensureConnection();
    const requests = await CreditRequest.find({ userId }).sort({ createdAt: -1 }).lean();
    const userCurrencyMap = await resolveCurrencyByUserIds([userId]);
    return requests.map((request) => normalizeCreditRequestCurrency(request, userCurrencyMap));
}
export async function getCreditRequestsByHod(hodId) {
    await ensureConnection();
    const requests = await CreditRequest.find({ hodId }).sort({ createdAt: -1 }).lean();
    const userCurrencyMap = await resolveCurrencyByUserIds(requests.map((request) => request.userId));
    return requests.map((request) => normalizeCreditRequestCurrency(request, userCurrencyMap));
}
export async function getCreditRequestsByUserIds(userIds) {
    await ensureConnection();
    const uniqueUserIds = Array.from(new Set((userIds || []).filter(Boolean).map((id) => id.toString())));
    if (uniqueUserIds.length === 0) {
        return [];
    }
    const requests = await CreditRequest.find({ userId: { $in: uniqueUserIds } })
        .sort({ createdAt: -1 })
        .lean();
    const userCurrencyMap = await resolveCurrencyByUserIds(uniqueUserIds);
    return requests.map((request) => normalizeCreditRequestCurrency(request, userCurrencyMap));
}
export async function getCreditRequestsByInitiator(initiatorId) {
    await ensureConnection();
    const requests = await CreditRequest.find({ initiatorId }).sort({ createdAt: -1 }).lean();
    const userCurrencyMap = await resolveCurrencyByUserIds(requests.map((request) => request.userId));
    return requests.map((request) => normalizeCreditRequestCurrency(request, userCurrencyMap));
}
export async function getAllCreditRequests() {
    await ensureConnection();
    const requests = await CreditRequest.find().sort({ createdAt: -1 }).lean();
    const userCurrencyMap = await resolveCurrencyByUserIds(requests.map((request) => request.userId));
    return requests.map((request) => normalizeCreditRequestCurrency(request, userCurrencyMap));
}
export async function getCreditRequestsByStatus(status) {
    await ensureConnection();
    const requests = await CreditRequest.find({ status }).sort({ createdAt: -1 }).lean();
    const userCurrencyMap = await resolveCurrencyByUserIds(requests.map((request) => request.userId));
    return requests.map((request) => normalizeCreditRequestCurrency(request, userCurrencyMap));
}
export async function updateCreditRequest(id, updates) {
    await ensureConnection();
    await CreditRequest.findByIdAndUpdate(id, { $set: updates });
}

export async function migrateLegacyPolicyPendingSignatures() {
    await ensureConnection();
    const result = await CreditRequest.updateMany(
        { type: "policy", status: "pending_signature" },
        { $set: { status: "pending_approval" } },
    );
    return {
        matchedCount: result.matchedCount || 0,
        modifiedCount: result.modifiedCount || 0,
    };
}
// ==================== WALLET OPERATIONS ====================
async function ensureWallet(userId) {
    await ensureConnection();
    const user = await User.findById(userId).select("currency employeeType").lean();
    const userCurrency = normalizeCurrencyValue(
        user?.currency,
        user?.employeeType,
    );
    let wallet = await Wallet.findOne({ userId }).lean();
    if (!wallet) {
        const created = await Wallet.create({
            userId,
            balance: 0,
            currency: userCurrency,
            updatedAt: new Date(),
        });
        wallet = created.toObject();
    } else if (normalizeCurrency(wallet.currency, userCurrency) !== userCurrency) {
        await Wallet.findOneAndUpdate(
            { userId },
            { $set: { currency: userCurrency, updatedAt: new Date() } },
        );
        wallet = { ...wallet, currency: userCurrency };
    }
    return {
        ...wallet,
        currency: normalizeCurrency(wallet.currency, userCurrency),
    };
}
export async function createWalletTransaction(data) {
    await ensureConnection();
    const wallet = await ensureWallet(data.userId);
    const currency = normalizeCurrency(data.currency, wallet.currency);
    const transaction = await WalletTransaction.create({
        ...data,
        currency,
    });
    await Wallet.findOneAndUpdate({ userId: data.userId }, {
        $set: { balance: data.balance, currency, updatedAt: new Date() },
    }, { upsert: true });
    return transaction.toObject();
}
export async function getWalletByUserId(userId) {
    await ensureConnection();
    return await ensureWallet(userId);
}
export async function getWalletBalance(userId) {
    await ensureConnection();
    const wallet = await ensureWallet(userId);
    return wallet?.balance || 0;
}
export async function getWalletTransactions(userId) {
    await ensureConnection();
    const wallet = await ensureWallet(userId);
    const transactions = await WalletTransaction.find({ userId }).sort({ createdAt: -1 }).lean();
    return transactions.map((transaction) => ({
        ...transaction,
        currency: normalizeCurrency(wallet.currency, DEFAULT_CURRENCY),
    }));
}
export async function getWalletTransactionById(id) {
    await ensureConnection();
    const transaction = await WalletTransaction.findById(id).lean();
    if (!transaction) {
        return transaction;
    }
    const wallet = await ensureWallet(transaction.userId);
    return {
        ...transaction,
        currency: normalizeCurrency(wallet.currency, DEFAULT_CURRENCY),
    };
}
export async function updateWalletTransaction(id, updates) {
    await ensureConnection();
    await WalletTransaction.findByIdAndUpdate(id, { $set: updates });
}
export async function getRedeemableCreditTransactions(userId) {
    await ensureConnection();
    const wallet = await ensureWallet(userId);
    const transactions = await WalletTransaction.find({
        userId,
        type: "credit",
        redeemed: false,
    }).sort({ createdAt: -1 }).lean();
    return transactions.map((transaction) => ({
        ...transaction,
        currency: normalizeCurrency(wallet.currency, DEFAULT_CURRENCY),
    }));
}
export async function getWalletTransactionsByUserIds(userIds) {
    await ensureConnection();
    const [transactions, wallets, userCurrencyMap] = await Promise.all([
        WalletTransaction.find({ userId: { $in: userIds } }).sort({ createdAt: -1 }).lean(),
        Wallet.find({ userId: { $in: userIds } }).select("userId currency").lean(),
        resolveCurrencyByUserIds(userIds),
    ]);
    const walletCurrencyMap = new Map(
        wallets.map((wallet) => [wallet.userId, normalizeCurrency(wallet.currency, DEFAULT_CURRENCY)]),
    );
    return transactions.map((transaction) => ({
        ...transaction,
        currency:
            walletCurrencyMap.get(transaction.userId) ||
            userCurrencyMap.get(transaction.userId) ||
            normalizeCurrency(transaction.currency, DEFAULT_CURRENCY),
    }));
}
export async function getAllWalletTransactions() {
    await ensureConnection();
    const transactions = await WalletTransaction.find().sort({ createdAt: -1 }).lean();
    if (transactions.length === 0) {
        return transactions;
    }
    const userIds = Array.from(new Set(transactions.map((transaction) => transaction.userId).filter(Boolean)));
    const [wallets, userCurrencyMap] = await Promise.all([
        Wallet.find({ userId: { $in: userIds } }).select("userId currency").lean(),
        resolveCurrencyByUserIds(userIds),
    ]);
    const walletCurrencyMap = new Map(
        wallets.map((wallet) => [wallet.userId, normalizeCurrency(wallet.currency, DEFAULT_CURRENCY)]),
    );
    return transactions.map((transaction) => ({
        ...transaction,
        currency:
            walletCurrencyMap.get(transaction.userId) ||
            userCurrencyMap.get(transaction.userId) ||
            normalizeCurrency(transaction.currency, DEFAULT_CURRENCY),
    }));
}
// ==================== NOTIFICATION OPERATIONS ====================
export async function createNotification(data) {
    await ensureConnection();
    const notification = await Notification.create(data);
    return notification.toObject();
}
export async function getNotificationsByUserId(userId, limit = 50) {
    await ensureConnection();
    return await Notification.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
}
export async function getUnreadNotificationCount(userId) {
    await ensureConnection();
    return await Notification.countDocuments({
        userId,
        $or: [
            { readAt: { $exists: false } },
            { readAt: null },
        ],
    });
}
export async function markNotificationRead(notificationId, userId) {
    await ensureConnection();
    await Notification.findOneAndUpdate({ _id: notificationId, userId }, { $set: { readAt: new Date() } });
}
export async function markAllNotificationsRead(userId) {
    await ensureConnection();
    await Notification.updateMany(
        {
            userId,
            $or: [
                { readAt: { $exists: false } },
                { readAt: null },
            ],
        },
        { $set: { readAt: new Date() } },
    );
}
export async function getWalletSummary(userId) {
    await ensureConnection();
    const transactions = await WalletTransaction.find({ userId }).lean();
    const pendingRequests = await CreditRequest.find({
        userId,
        status: { $in: ['pending_signature', 'pending_approval'] }
    }).lean();
    const earned = transactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + t.amount, 0);
    const redeemed = transactions
        .filter(t => t.type === 'debit')
        .reduce((sum, t) => sum + t.amount, 0);
    const pending = pendingRequests.reduce((sum, r) => sum + r.amount, 0);
    const available = earned - redeemed;
    return { earned, pending, redeemed, available };
}
// ==================== REDEMPTION OPERATIONS ====================
export async function createRedemptionRequest(data) {
    await ensureConnection();
    const request = await RedemptionRequest.create({
        ...data,
        currency: normalizeCurrency(data.currency, DEFAULT_CURRENCY),
    });
    return request.toObject();
}
function normalizeRedemptionRequestCurrency(request, userCurrencyMap) {
    if (!request) {
        return request;
    }
    const userId = request.userId?.toString?.() || request.userId;
    const authoritativeCurrency = userCurrencyMap.get(userId);
    return {
        ...request,
        currency: authoritativeCurrency || normalizeCurrency(request.currency, DEFAULT_CURRENCY),
    };
}
export async function getRedemptionRequestById(id) {
    await ensureConnection();
    const request = await RedemptionRequest.findById(id).lean();
    if (!request) {
        return request;
    }
    const userCurrencyMap = await resolveCurrencyByUserIds([request.userId]);
    return normalizeRedemptionRequestCurrency(request, userCurrencyMap);
}
export async function getRedemptionRequestsByUserId(userId) {
    await ensureConnection();
    const requests = await RedemptionRequest.find({ userId }).sort({ createdAt: -1 }).lean();
    const userCurrencyMap = await resolveCurrencyByUserIds([userId]);
    return requests.map((request) => normalizeRedemptionRequestCurrency(request, userCurrencyMap));
}
export async function getRedemptionRequestsByUserIds(userIds) {
    await ensureConnection();
    const requests = await RedemptionRequest.find({ userId: { $in: userIds } }).sort({ createdAt: -1 }).lean();
    const userCurrencyMap = await resolveCurrencyByUserIds(userIds);
    return requests.map((request) => normalizeRedemptionRequestCurrency(request, userCurrencyMap));
}
export async function getAllRedemptionRequests() {
    await ensureConnection();
    const requests = await RedemptionRequest.find().sort({ createdAt: -1 }).lean();
    const userCurrencyMap = await resolveCurrencyByUserIds(requests.map((request) => request.userId));
    return requests.map((request) => normalizeRedemptionRequestCurrency(request, userCurrencyMap));
}
export async function getRedemptionRequestsByStatus(status) {
    await ensureConnection();
    const requests = await RedemptionRequest.find({ status }).sort({ createdAt: -1 }).lean();
    const userCurrencyMap = await resolveCurrencyByUserIds(requests.map((request) => request.userId));
    return requests.map((request) => normalizeRedemptionRequestCurrency(request, userCurrencyMap));
}
export async function updateRedemptionRequest(id, updates) {
    await ensureConnection();
    await RedemptionRequest.findByIdAndUpdate(id, { $set: updates });
}

export async function reconcileCurrencyForUser(userId) {
    await ensureConnection();
    const user = await User.findById(userId).select("_id employeeType currency").lean();
    if (!user) {
        return null;
    }

    const userIdString = user._id.toString();
    const authoritativeCurrency = normalizeCurrencyValue(user.currency, user.employeeType);
    const userCurrency = normalizeCurrency(user.currency, authoritativeCurrency);

    if (userCurrency !== authoritativeCurrency) {
        await User.findByIdAndUpdate(userIdString, { $set: { currency: authoritativeCurrency } });
    }

    const [walletResult, transactionsResult, creditsResult, redemptionsResult] = await Promise.all([
        Wallet.updateOne(
            { userId: userIdString, currency: { $ne: authoritativeCurrency } },
            { $set: { currency: authoritativeCurrency, updatedAt: new Date() } },
        ),
        WalletTransaction.updateMany(
            { userId: userIdString, currency: { $ne: authoritativeCurrency } },
            { $set: { currency: authoritativeCurrency } },
        ),
        CreditRequest.updateMany(
            { userId: userIdString, currency: { $ne: authoritativeCurrency } },
            { $set: { currency: authoritativeCurrency } },
        ),
        RedemptionRequest.updateMany(
            { userId: userIdString, currency: { $ne: authoritativeCurrency } },
            { $set: { currency: authoritativeCurrency } },
        ),
    ]);

    return {
        userId: userIdString,
        currency: authoritativeCurrency,
        userUpdated: userCurrency !== authoritativeCurrency,
        walletUpdated: walletResult.modifiedCount || 0,
        transactionsUpdated: transactionsResult.modifiedCount || 0,
        creditsUpdated: creditsResult.modifiedCount || 0,
        redemptionsUpdated: redemptionsResult.modifiedCount || 0,
    };
}

export async function reconcileCurrencyForAllUsers() {
    await ensureConnection();
    const users = await User.find().select("_id").lean();
    const results = [];
    for (const user of users) {
        const result = await reconcileCurrencyForUser(user._id.toString());
        if (result) {
            results.push(result);
        }
    }

    return {
        usersChecked: results.length,
        usersUpdated: results.filter((entry) => entry.userUpdated).length,
        walletsUpdated: results.reduce((sum, entry) => sum + entry.walletUpdated, 0),
        transactionsUpdated: results.reduce((sum, entry) => sum + entry.transactionsUpdated, 0),
        creditsUpdated: results.reduce((sum, entry) => sum + entry.creditsUpdated, 0),
        redemptionsUpdated: results.reduce((sum, entry) => sum + entry.redemptionsUpdated, 0),
        details: results,
    };
}
// ==================== AUDIT LOG OPERATIONS ====================
export async function createAuditLog(data) {
    await ensureConnection();
    const log = await AuditLog.create(data);
    return log.toObject();
}
export async function getAuditLogs(filters) {
    await ensureConnection();
    const query = {};
    if (filters?.userId)
        query.userId = filters.userId;
    if (filters?.action)
        query.action = filters.action;
    if (filters?.entityType)
        query.entityType = filters.entityType;
    if (filters?.startDate || filters?.endDate) {
        query.createdAt = {};
        if (filters.startDate)
            query.createdAt.$gte = filters.startDate;
        if (filters.endDate)
            query.createdAt.$lte = filters.endDate;
    }
    return await AuditLog.find(query).sort({ createdAt: -1 }).limit(1000).lean();
}
// ==================== ACCESS CONTROL OPERATIONS ====================
export async function grantAccess(data) {
    await ensureConnection();
    const access = await AccessControl.findOneAndUpdate({ userId: data.userId, feature: data.feature }, { $set: data }, { upsert: true, new: true });
    return access.toObject();
}
export async function checkAccess(userId, feature) {
    await ensureConnection();
    const access = await AccessControl.findOne({
        userId,
        feature,
        $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } }
        ]
    }).lean();
    return !!access;
}
export async function revokeAccess(userId, feature) {
    await ensureConnection();
    await AccessControl.findOneAndDelete({ userId, feature });
}
export async function getUserAccess(userId) {
    await ensureConnection();
    return await AccessControl.find({
        userId,
        $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } }
        ]
    }).lean();
}
export async function getAllAccessGrants() {
    await ensureConnection();
    return await AccessControl.find().sort({ createdAt: -1 }).lean();
}
export async function getActiveAccessGrants(userId) {
    await ensureConnection();
    return await getUserAccess(userId);
}
// ==================== SEARCH OPERATIONS ====================
export async function searchUsers(query, options = {}) {
    await ensureConnection();
    const regex = buildSearchRegex(query);
    if (!regex) {
        return [];
    }
    const limit = Math.min(Math.max(Number(options.limit) || 8, 1), 25);
    const searchQuery = {
        $or: [
            { name: regex },
            { email: regex },
            { role: regex },
            { employeeType: regex },
        ],
    };
    if (options.userIds?.length) {
        searchQuery._id = { $in: options.userIds };
    }
    if (options.hodId) {
        searchQuery.$and = [
            { $or: [{ _id: options.hodId }, { hodId: options.hodId }] },
        ];
    }
    if (options.roles?.length) {
        const expandedRoles = Array.from(
            new Set(options.roles.flatMap((role) => expandRoleFilter(role))),
        );
        searchQuery.role = { $in: expandedRoles };
    }
    const users = await User.find(searchQuery).sort({ createdAt: -1 }).limit(limit).lean();
    return normalizeUserList(users);
}
export async function searchPolicies(query, options = {}) {
    await ensureConnection();
    const regex = buildSearchRegex(query);
    if (!regex) {
        return [];
    }
    const limit = Math.min(Math.max(Number(options.limit) || 8, 1), 25);
    const searchQuery = {
        $or: [
            { name: regex },
            { description: regex },
            { eligibilityCriteria: regex },
            { calculationLogic: regex },
            { status: regex },
        ],
    };
    if (options.createdBy) {
        searchQuery.createdBy = options.createdBy;
    }
    if (options.statuses?.length) {
        searchQuery.status = { $in: options.statuses };
    }
    return await Policy.find(searchQuery).sort({ createdAt: -1 }).limit(limit).lean();
}
export async function searchCreditRequests(query, options = {}) {
    await ensureConnection();
    const regex = buildSearchRegex(query);
    if (!regex) {
        return [];
    }
    const limit = Math.min(Math.max(Number(options.limit) || 10, 1), 30);
    const searchQuery = {
        $or: [
            { type: regex },
            { status: regex },
            { notes: regex },
            { calculationBreakdown: regex },
            { currency: regex },
        ],
    };
    if (options.userIds?.length) {
        searchQuery.userId = { $in: options.userIds };
    }
    if (options.hodId) {
        searchQuery.hodId = options.hodId;
    }
    if (options.initiatorId) {
        searchQuery.initiatorId = options.initiatorId;
    }
    if (options.statuses?.length) {
        searchQuery.status = { $in: options.statuses };
    }
    const requests = await CreditRequest.find(searchQuery).sort({ createdAt: -1 }).limit(limit).lean();
    const userCurrencyMap = await resolveCurrencyByUserIds(requests.map((request) => request.userId));
    return requests.map((request) => normalizeCreditRequestCurrency(request, userCurrencyMap));
}
// ==================== DASHBOARD & REPORTS ====================
export async function getDashboardStats(userId, role) {
    await ensureConnection();
    if (role === 'admin') {
        const totalUsers = await User.countDocuments();
        const totalPolicies = await Policy.countDocuments();
        const pendingApprovals = await CreditRequest.countDocuments({ status: 'pending_approval' });
        const totalCreditsIssued = await WalletTransaction.aggregate([
            { $match: { type: 'credit' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        return {
            totalUsers,
            totalPolicies,
            pendingApprovals,
            totalCreditsIssued: totalCreditsIssued[0]?.total || 0,
        };
    }
    if (role === 'hod') {
        const teamMembers = await getUsersByHod(userId);
        const pendingApprovals = await CreditRequest.countDocuments({
            hodId: userId,
            status: 'pending_approval'
        });
        const totalCreditsIssued = await WalletTransaction.aggregate([
            { $match: { type: 'credit' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        return {
            teamSize: teamMembers.length,
            pendingApprovals,
            totalCreditsIssued: totalCreditsIssued[0]?.total || 0,
        };
    }
    if (role === 'account') {
        const pendingPayments = await RedemptionRequest.countDocuments({ status: 'pending' });
        const processingPayments = await RedemptionRequest.countDocuments({ status: 'processing' });
        const completedThisMonth = await RedemptionRequest.countDocuments({
            status: 'completed',
            processedAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
        });
        return {
            pendingPayments,
            processingPayments,
            completedThisMonth,
        };
    }
    // Regular user
    const walletSummary = await getWalletSummary(userId);
    const pendingRequests = await CreditRequest.countDocuments({
        userId,
        status: { $in: ['pending_signature', 'pending_approval'] }
    });
    return {
        ...walletSummary,
        pendingRequests,
    };
}
