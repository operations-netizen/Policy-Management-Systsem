// _core/env-loader.js
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// _core/logger.js
var LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};
var normalizeLevel = (value) => {
  if (!value) {
    return "info";
  }
  const normalized = value.toLowerCase().trim();
  return LOG_LEVELS[normalized] !== void 0 ? normalized : "info";
};
var shouldLog = (level) => {
  const current = normalizeLevel(process.env.LOG_LEVEL);
  return LOG_LEVELS[level] <= LOG_LEVELS[current];
};
var logger = {
  error: (...args) => {
    if (shouldLog("error")) {
      console.error(...args);
    }
  },
  warn: (...args) => {
    if (shouldLog("warn")) {
      console.warn(...args);
    }
  },
  info: (...args) => {
    if (shouldLog("info")) {
      console.info(...args);
    }
  },
  debug: (...args) => {
    if (shouldLog("debug")) {
      console.debug(...args);
    }
  }
};

// _core/env-loader.js
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var envPath = path.resolve(__dirname, "..", ".env");
var envResult = dotenv.config({
  path: envPath,
  override: process.env.NODE_ENV !== "production"
});
if (envResult.error) {
  dotenv.config();
}
var jwtSecret = process.env.JWT_SECRET?.trim();
var mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
if (process.env.NODE_ENV !== "production") {
  logger.info(`[Env] Loaded ${envPath} (JWT_SECRET set: ${Boolean(jwtSecret)}, MONGODB_URI set: ${Boolean(mongoUri)})`);
}
if (!jwtSecret) {
  logger.error("[Env] JWT_SECRET is missing. Set it in backend/.env or your environment.");
  process.exit(1);
}
if (!mongoUri) {
  logger.warn("[Env] MONGODB_URI is missing. Database connection will fail until it is set.");
}

// _core/index.js
import express3 from "express";
import path5 from "path";
import { createServer } from "http";

// rest.js
import express from "express";
import fs2 from "fs";
import path3 from "path";
import multer from "multer";
import { z } from "zod";

// shared/const.js
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";

// _core/cookies.js
function isSecureRequest(req) {
  if (req.protocol === "https")
    return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto)
    return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  const secure = isSecureRequest(req);
  const sameSite = secure ? "none" : "lax";
  return {
    httpOnly: true,
    path: "/",
    sameSite,
    secure
  };
}

// shared/_core/errors.js
var HttpError = class extends Error {
  statusCode;
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var BadRequestError = (msg) => new HttpError(400, msg);
var UnauthorizedError = (msg) => new HttpError(401, msg);
var ForbiddenError = (msg) => new HttpError(403, msg);
var NotFoundError = (msg) => new HttpError(404, msg);

// _core/auth.js
import { parse as parseCookieHeader } from "cookie";
import { jwtVerify } from "jose";

// db.js
import mongoose2 from "mongoose";

// models.js
import mongoose, { Schema } from "mongoose";

// shared/currency.js
var CURRENCY_VALUES = ["USD", "INR"];
var DEFAULT_CURRENCY = "INR";
var CURRENCY_TO_LOCALE = {
  USD: "en-US",
  INR: "en-IN"
};
var CURRENCY_ALIASES = {
  $: "USD",
  usd: "USD",
  dollar: "USD",
  dollars: "USD",
  "us dollar": "USD",
  inr: "INR",
  rs: "INR",
  rupee: "INR",
  rupees: "INR",
  "indian rupee": "INR",
  "\u20B9": "INR"
};
var EMPLOYEE_TYPE_TO_CURRENCY = {
  permanent_india: "INR",
  permanent_usa: "USD",
  freelancer_india: "INR",
  freelancer_usa: "USD",
  permanent: "INR"
};
function normalizeCurrency(value, fallback = DEFAULT_CURRENCY) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (CURRENCY_VALUES.includes(trimmed.toUpperCase())) {
      return trimmed.toUpperCase();
    }
    const mapped = CURRENCY_ALIASES[trimmed.toLowerCase()];
    if (mapped) {
      return mapped;
    }
  }
  return fallback;
}
function getCurrencyByEmployeeType(employeeType) {
  const normalized = (employeeType || "").toString().trim().toLowerCase();
  if (EMPLOYEE_TYPE_TO_CURRENCY[normalized]) {
    return EMPLOYEE_TYPE_TO_CURRENCY[normalized];
  }
  if (normalized.endsWith("_usa") || normalized.includes("usa")) {
    return "USD";
  }
  if (normalized.endsWith("_india") || normalized.includes("india")) {
    return "INR";
  }
  return DEFAULT_CURRENCY;
}
function getCurrencyLocale(currency) {
  return CURRENCY_TO_LOCALE[normalizeCurrency(currency)] || CURRENCY_TO_LOCALE[DEFAULT_CURRENCY];
}
function formatCurrencyAmount(amount, currency, options = {}) {
  const safeCurrency = normalizeCurrency(currency);
  const locale = getCurrencyLocale(safeCurrency);
  const value = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: safeCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options
  }).format(value);
}

// models.js
var shouldSyncCollections = () => {
  if (process.env.SYNC_DB_ON_START === "true") {
    return true;
  }
  if (process.env.SYNC_DB_ON_START === "false") {
    return false;
  }
  return process.env.NODE_ENV === "development";
};
var ROLE_VALUES = [
  "admin",
  "hod",
  "employee",
  "account",
  // legacy values kept for backward compatibility
  "user",
  "accounts_manager",
  "initiator"
];
var EMPLOYEE_TYPE_VALUES = [
  "permanent_india",
  "permanent_usa",
  "freelancer_india",
  "freelancer_usa",
  // legacy value kept for backward compatibility
  "permanent"
];
var UserSchema = new Schema({
  openId: { type: String, required: true, unique: true },
  name: String,
  email: { type: String, required: true, unique: true },
  loginMethod: String,
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ROLE_VALUES,
    default: "employee",
    required: true
  },
  isEmployee: {
    type: Boolean,
    default: false
  },
  employeeType: {
    type: String,
    enum: EMPLOYEE_TYPE_VALUES,
    default: "permanent_india"
  },
  hodId: String,
  lastSignedIn: { type: Date, default: Date.now }
}, { timestamps: true });
var User = mongoose.models.User || mongoose.model("User", UserSchema);
var AttachmentSchema = new Schema(
  {
    originalName: String,
    filename: String,
    fileId: String,
    mimeType: String,
    size: Number,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  },
  { _id: true }
);
var TimelineEntrySchema = new Schema(
  {
    step: { type: String, required: true },
    role: { type: String, required: true },
    actorId: String,
    actorName: String,
    actorEmail: String,
    signatureId: String,
    message: String,
    metadata: Schema.Types.Mixed,
    at: { type: Date, default: Date.now }
  },
  { _id: true }
);
var PolicySchema = new Schema({
  name: { type: String, required: true },
  description: String,
  calculationLogic: String,
  validFrom: Date,
  validTo: Date,
  eligibilityCriteria: String,
  reRaiseAllowed: { type: Boolean, default: false },
  proofRequired: { type: Boolean, default: true },
  attachments: [AttachmentSchema],
  status: {
    type: String,
    enum: ["active", "draft", "archived"],
    default: "draft",
    required: true
  },
  createdBy: { type: String, required: true }
}, { timestamps: true });
var Policy = mongoose.models.Policy || mongoose.model("Policy", PolicySchema);
var TeamAssignmentSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  hodId: { type: String, required: true },
  freelancerInitiatorId: String,
  assignedBy: { type: String, required: true },
  assignedAt: { type: Date, default: Date.now }
}, { timestamps: true });
var TeamAssignment = mongoose.models.TeamAssignment || mongoose.model("TeamAssignment", TeamAssignmentSchema);
var EmployeePolicySchema = new Schema({
  userId: { type: String, required: true, index: true },
  policyId: { type: String, required: true, index: true },
  effectiveDate: { type: Date, required: true },
  assignedBy: { type: String, required: true }
}, { timestamps: true });
EmployeePolicySchema.index({ userId: 1, policyId: 1 }, { unique: true });
var EmployeePolicy = mongoose.models.EmployeePolicy || mongoose.model("EmployeePolicy", EmployeePolicySchema);
var PolicyInitiatorSchema = new Schema({
  assignmentId: { type: String, required: true, index: true },
  initiatorId: { type: String, required: true, index: true },
  assignedBy: { type: String, required: true },
  assignedAt: { type: Date, default: Date.now }
}, { timestamps: true });
PolicyInitiatorSchema.index({ assignmentId: 1, initiatorId: 1 }, { unique: true });
var PolicyInitiator = mongoose.models.PolicyInitiator || mongoose.model("PolicyInitiator", PolicyInitiatorSchema);
var EmployeeInitiatorSchema = new Schema({
  employeeId: { type: String, required: true, index: true },
  initiatorId: { type: String, required: true, index: true },
  assignedBy: { type: String, required: true },
  assignedAt: { type: Date, default: Date.now }
}, { timestamps: true });
EmployeeInitiatorSchema.index({ employeeId: 1, initiatorId: 1 }, { unique: true });
var EmployeeInitiator = mongoose.models.EmployeeInitiator || mongoose.model("EmployeeInitiator", EmployeeInitiatorSchema);
var CreditRequestSchema = new Schema({
  userId: { type: String, required: true },
  initiatorId: { type: String, required: true },
  hodId: { type: String, required: true },
  type: {
    type: String,
    enum: ["freelancer", "policy"],
    required: true
  },
  policyId: String,
  baseAmount: { type: Number, required: true },
  bonus: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  amount: { type: Number, required: true },
  currency: {
    type: String,
    enum: CURRENCY_VALUES,
    default: DEFAULT_CURRENCY,
    required: true
  },
  amountItems: [
    {
      amount: { type: Number, required: true },
      note: String,
      addedBy: String,
      addedAt: { type: Date, default: Date.now }
    }
  ],
  calculationBreakdown: String,
  notes: String,
  documents: String,
  attachments: [AttachmentSchema],
  status: {
    type: String,
    enum: [
      "pending_signature",
      "pending_approval",
      "pending_employee_approval",
      "approved",
      "rejected_by_user",
      "rejected_by_employee",
      "rejected_by_hod"
    ],
    default: "pending_signature",
    required: true
  },
  userSignature: String,
  userSignedAt: Date,
  userRejectionReason: String,
  employeeApprovedAt: Date,
  employeeRejectedAt: Date,
  hodApprovedAt: Date,
  hodRejectedAt: Date,
  hodRejectionReason: String,
  timelineLog: [TimelineEntrySchema]
}, { timestamps: true });
var CreditRequest = mongoose.models.CreditRequest || mongoose.model("CreditRequest", CreditRequestSchema);
var WalletSchema = new Schema({
  userId: { type: String, required: true, unique: true, index: true },
  balance: { type: Number, default: 0 },
  currency: {
    type: String,
    enum: CURRENCY_VALUES,
    default: DEFAULT_CURRENCY,
    required: true
  },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });
var Wallet = mongoose.models.Wallet || mongoose.model("Wallet", WalletSchema);
var WalletTransactionSchema = new Schema({
  userId: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ["credit", "debit"],
    required: true
  },
  amount: { type: Number, required: true },
  currency: {
    type: String,
    enum: CURRENCY_VALUES,
    default: DEFAULT_CURRENCY,
    required: true
  },
  balance: { type: Number, required: true },
  creditRequestId: String,
  redemptionRequestId: String,
  linkedCreditTxnId: String,
  redeemed: { type: Boolean, default: false },
  timelineLog: [TimelineEntrySchema],
  description: String
}, { timestamps: true });
var WalletTransaction = mongoose.models.WalletTransaction || mongoose.model("WalletTransaction", WalletTransactionSchema);
var NotificationSchema = new Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: "info" },
  actionUrl: String,
  readAt: Date
}, { timestamps: true });
NotificationSchema.index({ userId: 1, createdAt: -1 });
var Notification = mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);
var RedemptionRequestSchema = new Schema({
  userId: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: {
    type: String,
    enum: CURRENCY_VALUES,
    default: DEFAULT_CURRENCY,
    required: true
  },
  method: { type: String },
  bankDetails: String,
  notes: String,
  creditTransactionId: String,
  timelineLog: [TimelineEntrySchema],
  proofPdf: {
    filename: String,
    url: String,
    generatedAt: Date
  },
  status: {
    type: String,
    enum: ["pending", "processing", "completed", "rejected"],
    default: "pending",
    required: true
  },
  processedBy: String,
  processedAt: Date,
  transactionReference: String,
  paymentNotes: String
}, { timestamps: true });
var RedemptionRequest = mongoose.models.RedemptionRequest || mongoose.model("RedemptionRequest", RedemptionRequestSchema);
var AuditLogSchema = new Schema({
  userId: { type: String, required: true, index: true },
  action: { type: String, required: true },
  entityType: String,
  entityId: String,
  beforeValue: String,
  afterValue: String,
  details: String,
  ipAddress: String,
  userAgent: String
}, { timestamps: { createdAt: true, updatedAt: false } });
var AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);
var SystemMetaSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: Schema.Types.Mixed
  },
  { timestamps: true }
);
var SystemMeta = mongoose.models.SystemMeta || mongoose.model("SystemMeta", SystemMetaSchema);
var AccessControlSchema = new Schema({
  userId: { type: String, required: true },
  feature: { type: String, required: true },
  grantedBy: { type: String, required: true },
  grantedAt: { type: Date, default: Date.now },
  expiresAt: Date
}, { timestamps: true });
AccessControlSchema.index({ userId: 1, feature: 1 }, { unique: true });
var AccessControl = mongoose.models.AccessControl || mongoose.model("AccessControl", AccessControlSchema);
var isConnected = false;
var collectionsEnsured = false;
var modelsToSync = [
  User,
  Policy,
  TeamAssignment,
  EmployeePolicy,
  PolicyInitiator,
  EmployeeInitiator,
  CreditRequest,
  Wallet,
  WalletTransaction,
  Notification,
  RedemptionRequest,
  AuditLog,
  SystemMeta,
  AccessControl
];
async function ensureCollections() {
  if (collectionsEnsured || !shouldSyncCollections()) {
    return;
  }
  await Promise.all(modelsToSync.map(async (model) => {
    try {
      await model.createCollection();
    } catch (error) {
      const code = error?.code;
      const codeName = error?.codeName;
      if (code === 48 || codeName === "NamespaceExists") {
        return;
      }
      throw error;
    }
  }));
  collectionsEnsured = true;
  console.log("[MongoDB] Collections ensured");
}
async function connectDB() {
  if (isConnected) {
    return;
  }
  try {
    const mongoUri2 = process.env.MONGODB_URI || process.env.DATABASE_URL;
    if (!mongoUri2) {
      console.warn("[MongoDB] No connection string found. Skipping connection.");
      return;
    }
    await mongoose.connect(mongoUri2);
    isConnected = true;
    console.log("[MongoDB] Connected successfully");
    await ensureCollections();
  } catch (error) {
    console.error("[MongoDB] Connection error:", error);
    throw error;
  }
}

// shared/sync.js
var API_SYNC_VERSION = "2026.02.16.1";
var FRONTEND_SYNC_VERSION_REQUIRED = API_SYNC_VERSION;
var DB_SCHEMA_VERSION = 1;
var DB_SCHEMA_META_KEY = "db_schema_version";

// db.js
async function ensureConnection() {
  await connectDB();
}
function hasActiveDbConnection() {
  return mongoose2.connection?.readyState === 1;
}
function normalizeNumericVersion(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}
var LEGACY_ROLE_MAP = {
  user: "employee",
  accounts_manager: "account",
  initiator: "employee"
};
var LEGACY_EMPLOYEE_TYPE_MAP = {
  permanent: "permanent_india"
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
    currency: normalizeCurrencyValue(user.currency, normalizedEmployeeType)
  };
}
function normalizeUserList(users) {
  return users.map(normalizeUserRecord);
}
function expandRoleFilter(role) {
  const normalizedRole = normalizeRoleValue(role);
  if (normalizedRole === "employee") {
    return ["employee", "user", "initiator"];
  }
  if (normalizedRole === "account") {
    return ["account", "accounts_manager"];
  }
  return [normalizedRole];
}
async function getUserById(id) {
  await ensureConnection();
  const user = await User.findById(id).lean();
  return normalizeUserRecord(user);
}
async function getUserByEmail(email) {
  await ensureConnection();
  const normalizedEmail = normalizeEmailValue(email || "");
  const matcher = normalizedEmail ? new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i") : email;
  const user = await User.findOne({ email: matcher }).select("+password").lean();
  return normalizeUserRecord(user);
}
async function getUsersByIds(userIds) {
  await ensureConnection();
  const users = await User.find({ _id: { $in: userIds } }).lean();
  return normalizeUserList(users);
}
async function getAllUsers() {
  await ensureConnection();
  const users = await User.find().sort({ createdAt: -1 }).lean();
  return normalizeUserList(users);
}
async function getUsersByRole(role) {
  await ensureConnection();
  const roles = expandRoleFilter(role);
  const users = await User.find({ role: { $in: roles } }).sort({ createdAt: -1 }).lean();
  return normalizeUserList(users);
}
async function hasAdminUser() {
  await ensureConnection();
  const admin = await User.findOne({ role: "admin" }).select("_id").lean();
  return !!admin;
}
async function ensureDbSchemaVersion(requiredVersion) {
  await ensureConnection();
  if (!hasActiveDbConnection()) {
    return {
      skipped: true,
      requiredVersion,
      currentVersion: 0,
      compatible: false,
      updated: false
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
      updated: false
    };
  }
  await SystemMeta.findOneAndUpdate(
    { key: DB_SCHEMA_META_KEY },
    { $set: { value: requiredVersion } },
    { upsert: true, new: true }
  );
  return {
    skipped: false,
    requiredVersion,
    currentVersion: requiredVersion,
    compatible: true,
    updated: true
  };
}
async function getDbSchemaVersionState(requiredVersion) {
  await ensureConnection();
  if (!hasActiveDbConnection()) {
    return {
      skipped: true,
      requiredVersion,
      currentVersion: 0,
      compatible: false
    };
  }
  const existing = await SystemMeta.findOne({ key: DB_SCHEMA_META_KEY }).lean();
  const currentVersion = normalizeNumericVersion(existing?.value, 0);
  return {
    skipped: false,
    requiredVersion,
    currentVersion,
    compatible: currentVersion >= requiredVersion
  };
}
async function getUsersByHod(hodId) {
  await ensureConnection();
  const users = await User.find({ hodId }).sort({ createdAt: -1 }).lean();
  return normalizeUserList(users);
}
async function createUser(userData) {
  await ensureConnection();
  const normalizedEmployeeType = normalizeEmployeeTypeValue(userData.employeeType);
  const dataToSave = {
    ...userData,
    role: normalizeRoleValue(userData.role),
    employeeType: normalizedEmployeeType,
    currency: normalizeCurrencyValue(userData.currency, normalizedEmployeeType),
    email: normalizeEmailValue(userData.email)
  };
  if (userData.password) {
    const bcrypt = await import("bcryptjs");
    dataToSave.password = await bcrypt.hash(userData.password, 10);
  }
  const user = await User.create(dataToSave);
  return normalizeUserRecord(user.toObject());
}
async function updateUser(id, updates) {
  await ensureConnection();
  const normalizedUpdates = { ...updates };
  if (updates.role !== void 0) {
    normalizedUpdates.role = normalizeRoleValue(updates.role);
  }
  const normalizedEmployeeType = updates.employeeType !== void 0 ? normalizeEmployeeTypeValue(updates.employeeType) : void 0;
  if (normalizedEmployeeType !== void 0) {
    normalizedUpdates.employeeType = normalizedEmployeeType;
  }
  if (updates.currency !== void 0 || normalizedEmployeeType !== void 0) {
    normalizedUpdates.currency = normalizeCurrencyValue(updates.currency, normalizedEmployeeType);
  }
  if (updates.email !== void 0) {
    normalizedUpdates.email = normalizeEmailValue(updates.email);
  }
  if (updates.password) {
    const bcrypt = await import("bcryptjs");
    normalizedUpdates.password = await bcrypt.hash(updates.password, 10);
  }
  await User.findByIdAndUpdate(id, { $set: normalizedUpdates });
}
async function deleteUser(id) {
  await ensureConnection();
  await User.findByIdAndDelete(id);
}
async function getAllPolicies() {
  await ensureConnection();
  return await Policy.find().sort({ createdAt: -1 }).lean();
}
async function getPoliciesByIds(policyIds) {
  await ensureConnection();
  return await Policy.find({ _id: { $in: policyIds } }).lean();
}
async function getPoliciesByCreator(creatorId) {
  await ensureConnection();
  return await Policy.find({ createdBy: creatorId }).sort({ createdAt: -1 }).lean();
}
async function getPolicyById(id) {
  await ensureConnection();
  return await Policy.findById(id).lean();
}
async function createPolicy(policyData) {
  await ensureConnection();
  const policy = await Policy.create(policyData);
  return policy.toObject();
}
async function addPolicyAttachments(policyId, attachments) {
  await ensureConnection();
  const updated = await Policy.findByIdAndUpdate(policyId, {
    $push: { attachments: { $each: attachments } }
  }, { new: true }).lean();
  return updated;
}
async function removePolicyAttachment(policyId, attachmentId) {
  await ensureConnection();
  const updated = await Policy.findByIdAndUpdate(policyId, {
    $pull: { attachments: { _id: attachmentId } }
  }, { new: true }).lean();
  return updated;
}
async function updatePolicy(id, updates) {
  await ensureConnection();
  await Policy.findByIdAndUpdate(id, { $set: updates });
}
async function deletePolicy(id) {
  await ensureConnection();
  await Policy.findByIdAndDelete(id);
}
async function createEmployeePolicyAssignment(data) {
  await ensureConnection();
  const assignment = await EmployeePolicy.create(data);
  return assignment.toObject();
}
async function getEmployeePolicyAssignmentById(id) {
  await ensureConnection();
  return await EmployeePolicy.findById(id).lean();
}
async function getEmployeePolicyAssignmentsByUserId(userId) {
  await ensureConnection();
  return await EmployeePolicy.find({ userId }).lean();
}
async function getEmployeePolicyAssignmentByUserPolicy(userId, policyId) {
  await ensureConnection();
  return await EmployeePolicy.findOne({ userId, policyId }).lean();
}
async function getEmployeePolicyAssignmentsByUserIds(userIds) {
  await ensureConnection();
  return await EmployeePolicy.find({ userId: { $in: userIds } }).lean();
}
async function getEmployeePolicyAssignmentsByIds(assignmentIds) {
  await ensureConnection();
  return await EmployeePolicy.find({ _id: { $in: assignmentIds } }).lean();
}
async function removeEmployeePolicyAssignmentById(id) {
  await ensureConnection();
  await EmployeePolicy.findByIdAndDelete(id);
}
async function updateEmployeePolicyAssignment(id, updates) {
  await ensureConnection();
  await EmployeePolicy.findByIdAndUpdate(id, { $set: updates });
}
async function setPolicyInitiators(assignmentId, initiatorIds, assignedBy) {
  await ensureConnection();
  await PolicyInitiator.deleteMany({ assignmentId });
  if (!initiatorIds?.length) {
    return [];
  }
  const records = initiatorIds.map((initiatorId) => ({
    assignmentId,
    initiatorId,
    assignedBy,
    assignedAt: /* @__PURE__ */ new Date()
  }));
  const result = await PolicyInitiator.insertMany(records);
  return result.map((r) => r.toObject());
}
async function getPolicyInitiatorsByAssignmentIds(assignmentIds) {
  await ensureConnection();
  return await PolicyInitiator.find({ assignmentId: { $in: assignmentIds } }).lean();
}
async function getPolicyInitiatorsByInitiatorId(initiatorId) {
  await ensureConnection();
  return await PolicyInitiator.find({ initiatorId }).lean();
}
async function setEmployeeInitiators(employeeId, initiatorIds, assignedBy) {
  await ensureConnection();
  await EmployeeInitiator.deleteMany({ employeeId });
  if (!initiatorIds?.length) {
    return [];
  }
  const records = initiatorIds.map((initiatorId) => ({
    employeeId,
    initiatorId,
    assignedBy,
    assignedAt: /* @__PURE__ */ new Date()
  }));
  const result = await EmployeeInitiator.insertMany(records);
  return result.map((r) => r.toObject());
}
async function getEmployeeInitiatorsByEmployeeIds(employeeIds) {
  await ensureConnection();
  return await EmployeeInitiator.find({ employeeId: { $in: employeeIds } }).lean();
}
async function getEmployeeInitiatorsByEmployeeId(employeeId) {
  await ensureConnection();
  return await EmployeeInitiator.find({ employeeId }).lean();
}
async function getEmployeeInitiatorsByInitiatorId(initiatorId) {
  await ensureConnection();
  return await EmployeeInitiator.find({ initiatorId }).lean();
}
async function createCreditRequest(data) {
  await ensureConnection();
  const request = await CreditRequest.create({
    ...data,
    currency: normalizeCurrency(data.currency, DEFAULT_CURRENCY)
  });
  return request.toObject();
}
async function resolveCurrencyByUserIds(userIds) {
  const uniqueIds = Array.from(new Set((userIds || []).filter(Boolean).map((id) => id.toString())));
  if (uniqueIds.length === 0) {
    return /* @__PURE__ */ new Map();
  }
  const users = await User.find({ _id: { $in: uniqueIds } }).select("_id employeeType currency").lean();
  return new Map(
    users.map((user) => [
      user._id.toString(),
      normalizeCurrencyValue(user.currency, user.employeeType)
    ])
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
    currency: authoritativeCurrency || normalizeCurrency(request.currency, DEFAULT_CURRENCY)
  };
}
async function getCreditRequestById(id) {
  await ensureConnection();
  const request = await CreditRequest.findById(id).lean();
  if (!request) {
    return request;
  }
  const userCurrencyMap = await resolveCurrencyByUserIds([request.userId]);
  return normalizeCreditRequestCurrency(request, userCurrencyMap);
}
async function getCreditRequestsByUserId(userId) {
  await ensureConnection();
  const requests = await CreditRequest.find({ userId }).sort({ createdAt: -1 }).lean();
  const userCurrencyMap = await resolveCurrencyByUserIds([userId]);
  return requests.map((request) => normalizeCreditRequestCurrency(request, userCurrencyMap));
}
async function getCreditRequestsByHod(hodId) {
  await ensureConnection();
  const requests = await CreditRequest.find({ hodId }).sort({ createdAt: -1 }).lean();
  const userCurrencyMap = await resolveCurrencyByUserIds(requests.map((request) => request.userId));
  return requests.map((request) => normalizeCreditRequestCurrency(request, userCurrencyMap));
}
async function getCreditRequestsByUserIds(userIds) {
  await ensureConnection();
  const uniqueUserIds = Array.from(new Set((userIds || []).filter(Boolean).map((id) => id.toString())));
  if (uniqueUserIds.length === 0) {
    return [];
  }
  const requests = await CreditRequest.find({ userId: { $in: uniqueUserIds } }).sort({ createdAt: -1 }).lean();
  const userCurrencyMap = await resolveCurrencyByUserIds(uniqueUserIds);
  return requests.map((request) => normalizeCreditRequestCurrency(request, userCurrencyMap));
}
async function getCreditRequestsByInitiator(initiatorId) {
  await ensureConnection();
  const requests = await CreditRequest.find({ initiatorId }).sort({ createdAt: -1 }).lean();
  const userCurrencyMap = await resolveCurrencyByUserIds(requests.map((request) => request.userId));
  return requests.map((request) => normalizeCreditRequestCurrency(request, userCurrencyMap));
}
async function getAllCreditRequests() {
  await ensureConnection();
  const requests = await CreditRequest.find().sort({ createdAt: -1 }).lean();
  const userCurrencyMap = await resolveCurrencyByUserIds(requests.map((request) => request.userId));
  return requests.map((request) => normalizeCreditRequestCurrency(request, userCurrencyMap));
}
async function getCreditRequestsByStatus(status) {
  await ensureConnection();
  const requests = await CreditRequest.find({ status }).sort({ createdAt: -1 }).lean();
  const userCurrencyMap = await resolveCurrencyByUserIds(requests.map((request) => request.userId));
  return requests.map((request) => normalizeCreditRequestCurrency(request, userCurrencyMap));
}
async function updateCreditRequest(id, updates) {
  await ensureConnection();
  await CreditRequest.findByIdAndUpdate(id, { $set: updates });
}
async function ensureWallet(userId) {
  await ensureConnection();
  const user = await User.findById(userId).select("currency employeeType").lean();
  const userCurrency = normalizeCurrencyValue(
    user?.currency,
    user?.employeeType
  );
  let wallet = await Wallet.findOne({ userId }).lean();
  if (!wallet) {
    const created = await Wallet.create({
      userId,
      balance: 0,
      currency: userCurrency,
      updatedAt: /* @__PURE__ */ new Date()
    });
    wallet = created.toObject();
  } else if (normalizeCurrency(wallet.currency, userCurrency) !== userCurrency) {
    await Wallet.findOneAndUpdate(
      { userId },
      { $set: { currency: userCurrency, updatedAt: /* @__PURE__ */ new Date() } }
    );
    wallet = { ...wallet, currency: userCurrency };
  }
  return {
    ...wallet,
    currency: normalizeCurrency(wallet.currency, userCurrency)
  };
}
async function createWalletTransaction(data) {
  await ensureConnection();
  const wallet = await ensureWallet(data.userId);
  const currency = normalizeCurrency(data.currency, wallet.currency);
  const transaction = await WalletTransaction.create({
    ...data,
    currency
  });
  await Wallet.findOneAndUpdate({ userId: data.userId }, {
    $set: { balance: data.balance, currency, updatedAt: /* @__PURE__ */ new Date() }
  }, { upsert: true });
  return transaction.toObject();
}
async function getWalletByUserId(userId) {
  await ensureConnection();
  return await ensureWallet(userId);
}
async function getWalletBalance(userId) {
  await ensureConnection();
  const wallet = await ensureWallet(userId);
  return wallet?.balance || 0;
}
async function getWalletTransactions(userId) {
  await ensureConnection();
  const wallet = await ensureWallet(userId);
  const transactions = await WalletTransaction.find({ userId }).sort({ createdAt: -1 }).lean();
  return transactions.map((transaction) => ({
    ...transaction,
    currency: normalizeCurrency(wallet.currency, DEFAULT_CURRENCY)
  }));
}
async function getWalletTransactionById(id) {
  await ensureConnection();
  const transaction = await WalletTransaction.findById(id).lean();
  if (!transaction) {
    return transaction;
  }
  const wallet = await ensureWallet(transaction.userId);
  return {
    ...transaction,
    currency: normalizeCurrency(wallet.currency, DEFAULT_CURRENCY)
  };
}
async function updateWalletTransaction(id, updates) {
  await ensureConnection();
  await WalletTransaction.findByIdAndUpdate(id, { $set: updates });
}
async function getWalletTransactionsByUserIds(userIds) {
  await ensureConnection();
  const [transactions, wallets, userCurrencyMap] = await Promise.all([
    WalletTransaction.find({ userId: { $in: userIds } }).sort({ createdAt: -1 }).lean(),
    Wallet.find({ userId: { $in: userIds } }).select("userId currency").lean(),
    resolveCurrencyByUserIds(userIds)
  ]);
  const walletCurrencyMap = new Map(
    wallets.map((wallet) => [wallet.userId, normalizeCurrency(wallet.currency, DEFAULT_CURRENCY)])
  );
  return transactions.map((transaction) => ({
    ...transaction,
    currency: walletCurrencyMap.get(transaction.userId) || userCurrencyMap.get(transaction.userId) || normalizeCurrency(transaction.currency, DEFAULT_CURRENCY)
  }));
}
async function getAllWalletTransactions() {
  await ensureConnection();
  const transactions = await WalletTransaction.find().sort({ createdAt: -1 }).lean();
  if (transactions.length === 0) {
    return transactions;
  }
  const userIds = Array.from(new Set(transactions.map((transaction) => transaction.userId).filter(Boolean)));
  const [wallets, userCurrencyMap] = await Promise.all([
    Wallet.find({ userId: { $in: userIds } }).select("userId currency").lean(),
    resolveCurrencyByUserIds(userIds)
  ]);
  const walletCurrencyMap = new Map(
    wallets.map((wallet) => [wallet.userId, normalizeCurrency(wallet.currency, DEFAULT_CURRENCY)])
  );
  return transactions.map((transaction) => ({
    ...transaction,
    currency: walletCurrencyMap.get(transaction.userId) || userCurrencyMap.get(transaction.userId) || normalizeCurrency(transaction.currency, DEFAULT_CURRENCY)
  }));
}
async function createNotification(data) {
  await ensureConnection();
  const notification = await Notification.create(data);
  return notification.toObject();
}
async function getNotificationsByUserId(userId, limit = 50) {
  await ensureConnection();
  return await Notification.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
}
async function getUnreadNotificationCount(userId) {
  await ensureConnection();
  return await Notification.countDocuments({
    userId,
    $or: [
      { readAt: { $exists: false } },
      { readAt: null }
    ]
  });
}
async function markNotificationRead(notificationId, userId) {
  await ensureConnection();
  await Notification.findOneAndUpdate({ _id: notificationId, userId }, { $set: { readAt: /* @__PURE__ */ new Date() } });
}
async function markAllNotificationsRead(userId) {
  await ensureConnection();
  await Notification.updateMany(
    {
      userId,
      $or: [
        { readAt: { $exists: false } },
        { readAt: null }
      ]
    },
    { $set: { readAt: /* @__PURE__ */ new Date() } }
  );
}
async function getWalletSummary(userId) {
  await ensureConnection();
  const transactions = await WalletTransaction.find({ userId }).lean();
  const pendingRequests = await CreditRequest.find({
    userId,
    status: { $in: ["pending_signature", "pending_approval"] }
  }).lean();
  const earned = transactions.filter((t) => t.type === "credit").reduce((sum, t) => sum + t.amount, 0);
  const redeemed = transactions.filter((t) => t.type === "debit").reduce((sum, t) => sum + t.amount, 0);
  const pending = pendingRequests.reduce((sum, r) => sum + r.amount, 0);
  const available = earned - redeemed;
  return { earned, pending, redeemed, available };
}
async function createRedemptionRequest(data) {
  await ensureConnection();
  const request = await RedemptionRequest.create({
    ...data,
    currency: normalizeCurrency(data.currency, DEFAULT_CURRENCY)
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
    currency: authoritativeCurrency || normalizeCurrency(request.currency, DEFAULT_CURRENCY)
  };
}
async function getRedemptionRequestById(id) {
  await ensureConnection();
  const request = await RedemptionRequest.findById(id).lean();
  if (!request) {
    return request;
  }
  const userCurrencyMap = await resolveCurrencyByUserIds([request.userId]);
  return normalizeRedemptionRequestCurrency(request, userCurrencyMap);
}
async function getRedemptionRequestsByUserId(userId) {
  await ensureConnection();
  const requests = await RedemptionRequest.find({ userId }).sort({ createdAt: -1 }).lean();
  const userCurrencyMap = await resolveCurrencyByUserIds([userId]);
  return requests.map((request) => normalizeRedemptionRequestCurrency(request, userCurrencyMap));
}
async function getRedemptionRequestsByUserIds(userIds) {
  await ensureConnection();
  const requests = await RedemptionRequest.find({ userId: { $in: userIds } }).sort({ createdAt: -1 }).lean();
  const userCurrencyMap = await resolveCurrencyByUserIds(userIds);
  return requests.map((request) => normalizeRedemptionRequestCurrency(request, userCurrencyMap));
}
async function getAllRedemptionRequests() {
  await ensureConnection();
  const requests = await RedemptionRequest.find().sort({ createdAt: -1 }).lean();
  const userCurrencyMap = await resolveCurrencyByUserIds(requests.map((request) => request.userId));
  return requests.map((request) => normalizeRedemptionRequestCurrency(request, userCurrencyMap));
}
async function getRedemptionRequestsByStatus(status) {
  await ensureConnection();
  const requests = await RedemptionRequest.find({ status }).sort({ createdAt: -1 }).lean();
  const userCurrencyMap = await resolveCurrencyByUserIds(requests.map((request) => request.userId));
  return requests.map((request) => normalizeRedemptionRequestCurrency(request, userCurrencyMap));
}
async function updateRedemptionRequest(id, updates) {
  await ensureConnection();
  await RedemptionRequest.findByIdAndUpdate(id, { $set: updates });
}
async function reconcileCurrencyForUser(userId) {
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
      { $set: { currency: authoritativeCurrency, updatedAt: /* @__PURE__ */ new Date() } }
    ),
    WalletTransaction.updateMany(
      { userId: userIdString, currency: { $ne: authoritativeCurrency } },
      { $set: { currency: authoritativeCurrency } }
    ),
    CreditRequest.updateMany(
      { userId: userIdString, currency: { $ne: authoritativeCurrency } },
      { $set: { currency: authoritativeCurrency } }
    ),
    RedemptionRequest.updateMany(
      { userId: userIdString, currency: { $ne: authoritativeCurrency } },
      { $set: { currency: authoritativeCurrency } }
    )
  ]);
  return {
    userId: userIdString,
    currency: authoritativeCurrency,
    userUpdated: userCurrency !== authoritativeCurrency,
    walletUpdated: walletResult.modifiedCount || 0,
    transactionsUpdated: transactionsResult.modifiedCount || 0,
    creditsUpdated: creditsResult.modifiedCount || 0,
    redemptionsUpdated: redemptionsResult.modifiedCount || 0
  };
}
async function reconcileCurrencyForAllUsers() {
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
    details: results
  };
}
async function createAuditLog(data) {
  await ensureConnection();
  const log = await AuditLog.create(data);
  return log.toObject();
}
async function getAuditLogs(filters) {
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
  return await AuditLog.find(query).sort({ createdAt: -1 }).limit(1e3).lean();
}
async function grantAccess(data) {
  await ensureConnection();
  const access = await AccessControl.findOneAndUpdate({ userId: data.userId, feature: data.feature }, { $set: data }, { upsert: true, new: true });
  return access.toObject();
}
async function revokeAccess(userId, feature) {
  await ensureConnection();
  await AccessControl.findOneAndDelete({ userId, feature });
}
async function getUserAccess(userId) {
  await ensureConnection();
  return await AccessControl.find({
    userId,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gt: /* @__PURE__ */ new Date() } }
    ]
  }).lean();
}
async function getAllAccessGrants() {
  await ensureConnection();
  return await AccessControl.find().sort({ createdAt: -1 }).lean();
}
async function getActiveAccessGrants(userId) {
  await ensureConnection();
  return await getUserAccess(userId);
}
async function searchUsers(query, options = {}) {
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
      { employeeType: regex }
    ]
  };
  if (options.userIds?.length) {
    searchQuery._id = { $in: options.userIds };
  }
  if (options.hodId) {
    searchQuery.$and = [
      { $or: [{ _id: options.hodId }, { hodId: options.hodId }] }
    ];
  }
  if (options.roles?.length) {
    const expandedRoles = Array.from(
      new Set(options.roles.flatMap((role) => expandRoleFilter(role)))
    );
    searchQuery.role = { $in: expandedRoles };
  }
  const users = await User.find(searchQuery).sort({ createdAt: -1 }).limit(limit).lean();
  return normalizeUserList(users);
}
async function searchPolicies(query, options = {}) {
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
      { status: regex }
    ]
  };
  if (options.createdBy) {
    searchQuery.createdBy = options.createdBy;
  }
  if (options.statuses?.length) {
    searchQuery.status = { $in: options.statuses };
  }
  return await Policy.find(searchQuery).sort({ createdAt: -1 }).limit(limit).lean();
}
async function searchCreditRequests(query, options = {}) {
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
      { currency: regex }
    ]
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

// _core/env.js
var getOptionalEnv = (key) => {
  const value = process.env[key];
  return typeof value === "string" ? value.trim() : "";
};
var ENV = {
  get cookieSecret() {
    return getOptionalEnv("JWT_SECRET");
  },
  get databaseUrl() {
    return getOptionalEnv("DATABASE_URL");
  },
  get mongodbUri() {
    return getOptionalEnv("MONGODB_URI");
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  }
};

// _core/auth.js
var parseCookies = (cookieHeader) => {
  if (!cookieHeader) {
    return /* @__PURE__ */ new Map();
  }
  const parsed = parseCookieHeader(cookieHeader);
  return new Map(Object.entries(parsed));
};
var getSessionSecret = () => {
  const secret = ENV.cookieSecret;
  if (!secret) {
    throw new Error("JWT_SECRET is missing. Set it in backend/.env or your environment.");
  }
  return new TextEncoder().encode(secret);
};
async function authenticateRequest(req) {
  const cookies = parseCookies(req.headers.cookie);
  const sessionCookie = cookies.get(COOKIE_NAME);
  let sessionToken = sessionCookie;
  if (!sessionToken) {
    const authHeader = req.headers.authorization;
    if (typeof authHeader === "string" && authHeader.toLowerCase().startsWith("bearer ")) {
      sessionToken = authHeader.slice(7).trim();
    }
  }
  if (!sessionToken) {
    throw ForbiddenError("No session token");
  }
  let payload;
  try {
    const secretKey = getSessionSecret();
    ({ payload } = await jwtVerify(sessionToken, secretKey, {
      algorithms: ["HS256"]
    }));
  } catch (error) {
    logger.debug("[Auth] Session verification failed", String(error));
    throw ForbiddenError("Invalid session cookie");
  }
  const userId = payload?.userId;
  if (!userId || typeof userId !== "string") {
    throw ForbiddenError("Invalid session cookie");
  }
  const user = await Promise.race([
    getUserById(userId),
    new Promise((_, reject) => setTimeout(() => reject(new Error("getUserById timeout")), 5e3))
  ]);
  if (!user) {
    logger.warn("[Auth] User not found in DB:", userId);
    throw ForbiddenError("User not found");
  }
  const { password, ...safeUser } = user;
  return { ...safeUser, id: user._id?.toString() ?? userId };
}

// ghl.js
var GHL_API_KEY = "pit-6e8fd509-31e7-44fd-8182-bf77af82250a";
var GHL_LOCATION_ID = "2xEjfVQAkuHg30MBhtW1";
var GHL_API_VERSION = "2021-07-28";
var API_BASE = "https://services.leadconnectorhq.com";
function ghlHeaders() {
  return {
    Authorization: `Bearer ${GHL_API_KEY}`,
    Version: GHL_API_VERSION,
    "Content-Type": "application/json",
    Accept: "application/json",
    LocationId: GHL_LOCATION_ID
  };
}
async function ghlJson(path6, { method = "GET", body } = {}) {
  const res = await fetch(`${API_BASE}${path6}`, {
    method,
    headers: ghlHeaders(),
    body: body ? JSON.stringify(body) : void 0
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data?.message || data?.error || JSON.stringify(data);
    throw new Error(`GHL ${res.status} ${res.statusText}: ${msg}`);
  }
  return data;
}
async function upsertContactByEmail(email) {
  const data = await ghlJson("/contacts/upsert", {
    method: "POST",
    body: {
      email,
      locationId: GHL_LOCATION_ID
    }
  });
  const contactId = data?.contact?.id || data?.contact?._id || data?.id || data?._id;
  if (!contactId) {
    throw new Error(`Upsert succeeded but contactId not found in response: ${JSON.stringify(data)}`);
  }
  return contactId;
}
async function addTag(contactId, tag) {
  await ghlJson(`/contacts/${contactId}/tags`, {
    method: "POST",
    body: { tags: [tag] }
  });
}
async function updateContactCustomFields(contactId, customFields) {
  await ghlJson(`/contacts/${contactId}`, {
    method: "PUT",
    body: {
      customFields
    }
  });
}
async function createFreelancerDocument(email, name, amount, projectDetails, currency) {
  try {
    console.log(`[GHL] Creating document for ${email}`);
    const contactId = await upsertContactByEmail(email);
    console.log(`[GHL] Contact ID: ${contactId}`);
    await updateContactCustomFields(contactId, {
      name,
      submit_feedback: `Amount: ${formatCurrencyAmount(amount, normalizeCurrency(currency))} | ${projectDetails}`
    });
    console.log(`[GHL] Updated custom fields`);
    await addTag(contactId, "+offer-letter");
    console.log(`[GHL] Added +offer-letter tag - workflow triggered`);
    return contactId;
  } catch (error) {
    console.error(`[GHL] Error creating document:`, error);
    throw error;
  }
}
async function createSignatureDocument(email, name, amount, currency, projectDetails) {
  return createFreelancerDocument(email, name, amount, projectDetails, currency);
}

// _core/email.js
import fs from "fs";
import path2 from "path";
import nodemailer from "nodemailer";

// _core/files.js
import mongoose3 from "mongoose";
import { Readable } from "stream";
var BUCKET_NAME = "uploads";
var getBucket = async () => {
  await connectDB();
  if (!mongoose3.connection?.db) {
    throw new Error("MongoDB connection is not ready");
  }
  return new mongoose3.mongo.GridFSBucket(mongoose3.connection.db, { bucketName: BUCKET_NAME });
};
var toObjectId = (id) => {
  if (!id) {
    return null;
  }
  return new mongoose3.Types.ObjectId(id);
};
async function saveBufferToGridFS({ buffer, filename, mimeType, metadata }) {
  const bucket = await getBucket();
  return await new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename || "file", {
      contentType: mimeType,
      metadata
    });
    Readable.from(buffer).pipe(uploadStream).on("error", reject).on("finish", () => {
      resolve({
        fileId: uploadStream.id.toString(),
        filename: uploadStream.filename
      });
    });
  });
}
async function getGridFSFileInfo(id) {
  const bucket = await getBucket();
  const objectId = toObjectId(id);
  if (!objectId) {
    return null;
  }
  const files = await bucket.find({ _id: objectId }).toArray();
  return files?.[0] || null;
}
async function getGridFSFileBuffer(id) {
  const bucket = await getBucket();
  const objectId = toObjectId(id);
  if (!objectId) {
    return null;
  }
  return await new Promise((resolve, reject) => {
    const chunks = [];
    bucket.openDownloadStream(objectId).on("data", (chunk) => chunks.push(chunk)).on("error", reject).on("end", () => resolve(Buffer.concat(chunks)));
  });
}
async function streamGridFSFile(id, res) {
  const bucket = await getBucket();
  const objectId = toObjectId(id);
  if (!objectId) {
    return false;
  }
  const file = await getGridFSFileInfo(id);
  if (!file) {
    return false;
  }
  res.setHeader("Content-Type", file.contentType || "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${file.filename || "file"}"`
  );
  bucket.openDownloadStream(objectId).pipe(res);
  return true;
}
async function deleteGridFSFile(id) {
  const bucket = await getBucket();
  const objectId = toObjectId(id);
  if (!objectId) {
    return;
  }
  await bucket.delete(objectId);
}

// _core/email.js
var BRAND_NAME = "Policy Management System";
var ALERT_STYLES = {
  info: { bg: "#eff6ff", border: "#2563eb", text: "#1d4ed8" },
  success: { bg: "#ecfdf3", border: "#16a34a", text: "#15803d" },
  warning: { bg: "#fff7ed", border: "#f97316", text: "#c2410c" },
  danger: { bg: "#fff1f2", border: "#e11d48", text: "#be123c" }
};
var getSmtpConfig = () => {
  const secureValue = (process.env.SMTP_SECURE || "").toString().toLowerCase();
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER || "";
  const fromName = process.env.SMTP_FROM_NAME || "";
  const from = fromName && fromEmail ? `${fromName} <${fromEmail}>` : fromEmail;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const secure = secureValue ? secureValue === "true" : port === 465;
  return {
    host: process.env.SMTP_HOST || "",
    port,
    secure,
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from
  };
};
var getTransport = () => {
  const config = getSmtpConfig();
  if (!config.host || !config.user || !config.pass) {
    return null;
  }
  return {
    transporter: nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      requireTLS: !config.secure,
      auth: {
        user: config.user,
        pass: config.pass
      }
    }),
    from: config.from
  };
};
var resolveAttachmentPath = (filename) => path2.resolve(process.cwd(), "uploads", "credit-requests", filename);
var formatMoney = (amount, currency) => formatCurrencyAmount(amount, normalizeCurrency(currency));
var getFrontendBaseUrl = () => {
  const frontendUrl = (process.env.FRONTEND_URL || "").trim();
  if (!frontendUrl) {
    return "";
  }
  return frontendUrl.replace(/\/+$/, "");
};
var escapeHtml = (value) => `${value ?? ""}`.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
var multilineToHtml = (value) => escapeHtml(value).replace(/\r?\n/g, "<br/>");
var formatDateTime = (value) => {
  if (!value) {
    return "";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return `${value}`;
  }
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short"
  });
};
var toSafeUrl = (value) => {
  if (!value) {
    return "";
  }
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
    return "";
  } catch {
    return "";
  }
};
var valueOrDash = (value) => {
  if (value === void 0 || value === null || value === "") {
    return "-";
  }
  return `${value}`;
};
var renderNotificationEmail = ({
  preheader,
  title,
  greeting,
  alertTitle = "Important",
  alertMessage,
  alertTone = "info",
  detailTitle = "Notification Details",
  details = [],
  messageTitle = "Message",
  messageBody = [],
  actionTitle = "Action Required",
  actionBody = [],
  actionLabel,
  actionUrl,
  links = [],
  listTitle,
  listItems = [],
  footerNote
}) => {
  const tone = ALERT_STYLES[alertTone] || ALERT_STYLES.info;
  const safeActionUrl = toSafeUrl(actionUrl);
  const normalizedDetails = (details || []).filter((entry) => entry?.label && entry?.value !== void 0 && entry?.value !== null && entry?.value !== "");
  const detailRows = normalizedDetails.map((entry) => `
            <tr>
                <td style="padding:11px 0;border-bottom:1px solid #e5eaf3;width:38%;font-size:14px;color:#475569;font-weight:600;vertical-align:top;">${escapeHtml(entry.label)}</td>
                <td style="padding:11px 0;border-bottom:1px solid #e5eaf3;font-size:14px;color:#0f172a;vertical-align:top;">${multilineToHtml(entry.value)}</td>
            </tr>
        `).join("");
  const normalizedMessageBody = (Array.isArray(messageBody) ? messageBody : [messageBody]).filter(Boolean);
  const messageHtml = normalizedMessageBody.map((line) => `<p style="margin:0 0 10px 0;font-size:16px;line-height:1.6;color:#1f2937;">${multilineToHtml(line)}</p>`).join("");
  const normalizedActionBody = (Array.isArray(actionBody) ? actionBody : [actionBody]).filter(Boolean);
  const actionHtml = normalizedActionBody.map((line) => `<p style="margin:0 0 10px 0;font-size:16px;line-height:1.6;color:#1f2937;">${multilineToHtml(line)}</p>`).join("");
  const normalizedLinks = (links || []).map((entry) => ({
    label: valueOrDash(entry?.label),
    url: toSafeUrl(entry?.url)
  })).filter((entry) => entry.url);
  const linksHtml = normalizedLinks.map((entry) => `
            <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#334155;">
                <span style="font-weight:600;color:#0f172a;">${escapeHtml(entry.label)}:</span>
                <a href="${escapeHtml(entry.url)}" target="_blank" rel="noopener noreferrer" style="color:#1d4ed8;text-decoration:underline;">${escapeHtml(entry.url)}</a>
            </p>
        `).join("");
  const normalizedListItems = (Array.isArray(listItems) ? listItems : [listItems]).filter(Boolean);
  const listHtml = normalizedListItems.length > 0 ? `
            <div style="margin:22px 0 0;border:1px solid #dbe3f0;border-radius:10px;background:#f8fafc;padding:16px 18px;">
                <h3 style="margin:0 0 10px;font-size:18px;line-height:1.3;color:#0f172a;">${escapeHtml(listTitle || "Additional Details")}</h3>
                <ul style="margin:0;padding:0 0 0 18px;color:#1f2937;">
                    ${normalizedListItems.map((line) => `<li style="margin:0 0 8px;font-size:14px;line-height:1.6;">${multilineToHtml(line)}</li>`).join("")}
                </ul>
            </div>
        ` : "";
  return `
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title || `${BRAND_NAME} Notification`)}</title>
</head>
<body style="margin:0;padding:0;background:#e9edf7;font-family:'Segoe UI',Arial,sans-serif;color:#111827;">
    <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">
        ${escapeHtml(preheader || title || `${BRAND_NAME} notification`)}
    </div>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#e9edf7;">
        <tr>
            <td align="center" style="padding:24px 12px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="680" style="width:100%;max-width:680px;border-collapse:separate;">
                    <tr>
                        <td style="padding:26px 24px;background:linear-gradient(135deg,#0f1d46 0%,#2551d8 100%);border-radius:14px 14px 0 0;">
                            <h2 style="margin:0;color:#f8fafc;font-size:42px;line-height:1.35;font-weight:700;">Notification from ${escapeHtml(BRAND_NAME)}</h2>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:28px 24px;background:#ffffff;border:1px solid #d7dfec;border-top:none;border-radius:0 0 14px 14px;">
                            <h1 style="margin:0 0 14px;font-size:31px;line-height:1.3;color:#0f172a;font-weight:700;">${escapeHtml(title || "Notification")}</h1>
                            ${greeting ? `<p style="margin:0 0 18px;font-size:17px;line-height:1.6;color:#1f2937;">${multilineToHtml(greeting)}</p>` : ""}

                            ${alertMessage ? `
                                <div style="margin:0 0 20px;padding:14px 14px;border-left:4px solid ${tone.border};background:${tone.bg};border-radius:8px;">
                                    <p style="margin:0;font-size:15px;line-height:1.6;color:#1f2937;">
                                        <span style="font-weight:700;color:${tone.text};">${escapeHtml(alertTitle)}:</span>
                                        ${multilineToHtml(alertMessage)}
                                    </p>
                                </div>
                            ` : ""}

                            ${detailRows ? `
                                <div style="margin:0 0 20px;border:1px solid #dbe3f0;border-radius:10px;background:#f8fafc;padding:16px 18px;">
                                    <h3 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#0f172a;">${escapeHtml(detailTitle)}</h3>
                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                                        ${detailRows}
                                    </table>
                                </div>
                            ` : ""}

                            ${messageHtml ? `
                                <h3 style="margin:0 0 8px;font-size:28px;line-height:1.3;color:#0f172a;">${escapeHtml(messageTitle)}</h3>
                                ${messageHtml}
                            ` : ""}

                            ${actionHtml || safeActionUrl ? `
                                <h3 style="margin:10px 0 8px;font-size:28px;line-height:1.3;color:#0f172a;">${escapeHtml(actionTitle)}</h3>
                                ${actionHtml}
                                ${safeActionUrl && actionLabel ? `
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:12px 0 4px;">
                                            <tr>
                                                <td style="border-radius:10px;background:#2551d8;">
                                                    <a href="${escapeHtml(safeActionUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 18px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(actionLabel)}</a>
                                                </td>
                                            </tr>
                                        </table>
                                    ` : ""}
                            ` : ""}

                            ${listHtml}
                            ${linksHtml ? `<div style="margin:16px 0 0;">${linksHtml}</div>` : ""}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:14px 8px 0;text-align:center;">
                            <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">
                                ${escapeHtml(footerNote || `This is an automated email from ${BRAND_NAME}.`)}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;
};
async function sendHodFreelancerRequestEmail({
  to,
  hodName,
  employee,
  initiator,
  amount,
  currency,
  details,
  attachments,
  requestType
}) {
  if (!to) {
    return { skipped: true, reason: "missing_recipient" };
  }
  const transport = getTransport();
  if (!transport) {
    console.warn("[Email] SMTP is not configured. Skipping HOD notification email.");
    return { skipped: true, reason: "smtp_not_configured" };
  }
  const { transporter, from } = transport;
  const scenarioLabel = requestType === "policy" ? "Policy" : "Freelance";
  const employeeName = employee?.name || employee?.email || "employee";
  const initiatorName = initiator?.name || initiator?.email || "initiator";
  const subject = `${scenarioLabel} request submitted for ${employeeName} by initiator ${initiatorName}`;
  const frontendBase = getFrontendBaseUrl();
  const approvalsUrl = frontendBase ? `${frontendBase}/approvals` : "";
  const notificationsUrl = frontendBase ? `${frontendBase}/notifications` : "";
  const loginUrl = frontendBase ? `${frontendBase}/login` : "";
  const formattedAmount = formatMoney(amount, currency);
  const when = formatDateTime(/* @__PURE__ */ new Date());
  const html = renderNotificationEmail({
    preheader: `${scenarioLabel} request submitted`,
    title: `${scenarioLabel} request submitted`,
    greeting: `Dear ${hodName || "Approver"},`,
    alertTitle: "Important",
    alertMessage: `${scenarioLabel} request submitted for ${employeeName} by initiator ${initiatorName}.`,
    alertTone: "info",
    detailTitle: "Notification Details",
    details: [
      { label: "Event", value: `${scenarioLabel} request submitted` },
      { label: "Employee", value: `${employee?.name || "-"} (${employee?.email || "-"})` },
      { label: "Initiator", value: `${initiator?.name || "-"} (${initiator?.email || "-"})` },
      { label: "Amount", value: formattedAmount },
      { label: "When", value: when }
    ],
    messageTitle: "Message",
    messageBody: [
      details ? `Submission note: ${details}` : `${scenarioLabel} request is ready for your review and decision.`
    ],
    actionTitle: "Action Required",
    actionBody: [
      approvalsUrl ? `Please review this ${scenarioLabel.toLowerCase()} request and approve or reject it from the approvals panel.` : `Please review this ${scenarioLabel.toLowerCase()} request from the approvals panel.`
    ],
    actionLabel: approvalsUrl ? "Review Request" : "",
    actionUrl: approvalsUrl,
    links: [
      { label: "Notifications page", url: notificationsUrl },
      { label: "Direct login link", url: loginUrl },
      { label: "Open app", url: frontendBase }
    ]
  });
  const textLines = [
    `Hello ${hodName || ""},`,
    "",
    `${scenarioLabel} request submitted for ${employeeName} by initiator ${initiatorName}.`,
    `Employee: ${employee?.name || ""} (${employee?.email || ""})`,
    `Initiator: ${initiator?.name || ""} (${initiator?.email || ""})`,
    `Amount: ${formattedAmount}`,
    `When: ${when}`,
    details ? `Submission note: ${details}` : "",
    "",
    approvalsUrl ? `Review the request: ${approvalsUrl}` : "Please review the request in the approvals panel.",
    notificationsUrl ? `Notifications page: ${notificationsUrl}` : "",
    loginUrl ? `Direct login link: ${loginUrl}` : "",
    frontendBase ? `Open app: ${frontendBase}` : ""
  ].filter(Boolean);
  const attachmentPayload = [];
  for (const attachment of attachments || []) {
    if (!attachment) {
      continue;
    }
    if (attachment.fileId) {
      try {
        const content = await getGridFSFileBuffer(attachment.fileId);
        if (content) {
          attachmentPayload.push({
            filename: attachment.originalName || attachment.filename || "attachment",
            content,
            contentType: attachment.mimeType
          });
        }
        continue;
      } catch (error) {
        console.warn("[Email] Failed to load GridFS attachment:", error?.message || error);
      }
    }
    if (!attachment.filename) {
      continue;
    }
    const filepath = resolveAttachmentPath(attachment.filename);
    if (!fs.existsSync(filepath)) {
      continue;
    }
    attachmentPayload.push({
      filename: attachment.originalName || attachment.filename,
      path: filepath,
      contentType: attachment.mimeType
    });
  }
  await transporter.sendMail({
    from,
    to,
    subject,
    text: textLines.join("\n"),
    html,
    attachments: attachmentPayload
  });
  return { success: true };
}
async function sendInitiatorFreelancerRejectionEmail({
  to,
  initiatorName,
  employee,
  hod,
  amount,
  currency,
  reason,
  rejectedBy,
  requestType
}) {
  if (!to) {
    return { skipped: true, reason: "missing_recipient" };
  }
  const transport = getTransport();
  if (!transport) {
    console.warn("[Email] SMTP is not configured. Skipping initiator rejection email.");
    return { skipped: true, reason: "smtp_not_configured" };
  }
  const { transporter, from } = transport;
  const scenarioLabel = requestType === "policy" ? "Policy" : "Freelance";
  const employeeName = employee?.name || employee?.email || "employee";
  const initiatorDisplayName = initiatorName || "initiator";
  const rejectedByDisplay = rejectedBy || "approver";
  const subject = `${scenarioLabel} request rejected for ${employeeName}`;
  const frontendBase = getFrontendBaseUrl();
  const notificationsUrl = frontendBase ? `${frontendBase}/notifications` : "";
  const loginUrl = frontendBase ? `${frontendBase}/login` : "";
  const formattedAmount = formatMoney(amount, currency);
  const when = formatDateTime(/* @__PURE__ */ new Date());
  const html = renderNotificationEmail({
    preheader: `${scenarioLabel} request rejected`,
    title: `${scenarioLabel} request rejected`,
    greeting: `Dear ${initiatorDisplayName},`,
    alertTitle: "Attention",
    alertMessage: `${scenarioLabel} request for ${employeeName} was rejected by ${rejectedByDisplay}.`,
    alertTone: "danger",
    detailTitle: "Notification Details",
    details: [
      { label: "Event", value: `${scenarioLabel} request rejected` },
      { label: "Employee", value: `${employee?.name || "-"} (${employee?.email || "-"})` },
      hod ? { label: "HOD", value: `${hod?.name || "-"} (${hod?.email || "-"})` } : null,
      rejectedBy ? { label: "Rejected By", value: rejectedBy } : null,
      { label: "Amount", value: formattedAmount },
      reason ? { label: "Reason", value: reason } : null,
      { label: "When", value: when }
    ].filter(Boolean),
    messageTitle: "Message",
    messageBody: [
      reason ? `Reason provided: ${reason}` : `${scenarioLabel} request was rejected without an additional comment.`
    ],
    actionTitle: "Action Required",
    actionBody: [
      `Please review the rejection details and submit a revised ${scenarioLabel.toLowerCase()} request if needed.`
    ],
    actionLabel: notificationsUrl ? "Open Notifications" : "",
    actionUrl: notificationsUrl,
    links: [
      { label: "Notifications page", url: notificationsUrl },
      { label: "Direct login link", url: loginUrl },
      { label: "Open app", url: frontendBase }
    ]
  });
  const textLines = [
    `Hello ${initiatorDisplayName},`,
    "",
    `${scenarioLabel} request for ${employeeName} was rejected by ${rejectedByDisplay}.`,
    `Employee: ${employee?.name || ""} (${employee?.email || ""})`,
    hod ? `HOD: ${hod?.name || ""} (${hod?.email || ""})` : "",
    rejectedBy ? `Rejected by: ${rejectedBy}` : "",
    `Amount: ${formattedAmount}`,
    reason ? `Reason: ${reason}` : "",
    `When: ${when}`,
    "",
    `Please review the rejection details and submit a revised ${scenarioLabel.toLowerCase()} request if needed.`,
    notificationsUrl ? `Notifications page: ${notificationsUrl}` : "",
    loginUrl ? `Direct login link: ${loginUrl}` : "",
    frontendBase ? `Open app: ${frontendBase}` : ""
  ].filter(Boolean);
  await transporter.sendMail({
    from,
    to,
    subject,
    text: textLines.join("\n"),
    html
  });
  return { success: true };
}
async function sendRedemptionRequestEmail({
  to,
  accountName,
  employee,
  amount,
  currency,
  balanceBefore,
  balanceAfter,
  redemptionId,
  timelineLog,
  pdfAttachment
}) {
  if (!to) {
    return { skipped: true, reason: "missing_recipient" };
  }
  const transport = getTransport();
  if (!transport) {
    console.warn("[Email] SMTP is not configured. Skipping redemption email.");
    return { skipped: true, reason: "smtp_not_configured" };
  }
  const { transporter, from } = transport;
  const employeeName = employee?.name || employee?.email || "employee";
  const subject = `Redemption request submitted by ${employeeName}`;
  const frontendBase = getFrontendBaseUrl();
  const accountsUrl = frontendBase ? `${frontendBase}/accounts` : "";
  const notificationsUrl = frontendBase ? `${frontendBase}/notifications` : "";
  const loginUrl = frontendBase ? `${frontendBase}/login` : "";
  const formattedAmount = formatMoney(amount, currency);
  const formattedBalanceBefore = balanceBefore !== void 0 ? formatMoney(balanceBefore, currency) : "";
  const formattedBalanceAfter = balanceAfter !== void 0 ? formatMoney(balanceAfter, currency) : "";
  const when = formatDateTime(/* @__PURE__ */ new Date());
  const logLines = (timelineLog || []).map((entry, index) => {
    const parts = [
      `${index + 1}. ${entry.step || "STEP"}`,
      entry.actorName || entry.actorEmail ? `Actor: ${entry.actorName || ""}${entry.actorEmail ? ` (${entry.actorEmail})` : ""}` : "",
      entry.role ? `Role: ${entry.role}` : "",
      entry.signatureId ? `Signature: ${entry.signatureId}` : "",
      entry.message ? `Message: ${entry.message}` : "",
      entry.at ? `At: ${formatDateTime(entry.at)}` : ""
    ].filter(Boolean);
    return parts.join(" | ");
  });
  const html = renderNotificationEmail({
    preheader: "Redemption request submitted",
    title: "Redemption request submitted",
    greeting: `Dear ${accountName || "Account Manager"},`,
    alertTitle: "Important",
    alertMessage: `Redemption request submitted by ${employeeName}.`,
    alertTone: "warning",
    detailTitle: "Notification Details",
    details: [
      { label: "Event", value: "Redemption request submitted" },
      { label: "Employee", value: `${employee?.name || "-"} (${employee?.email || "-"})` },
      redemptionId ? { label: "Request ID", value: redemptionId } : null,
      { label: "Amount", value: formattedAmount },
      formattedBalanceBefore ? { label: "Balance Before", value: formattedBalanceBefore } : null,
      formattedBalanceAfter ? { label: "Balance After", value: formattedBalanceAfter } : null,
      { label: "When", value: when }
    ].filter(Boolean),
    messageTitle: "Message",
    messageBody: [
      `A redemption request is pending review and processing for ${employeeName}.`
    ],
    actionTitle: "Action Required",
    actionBody: [
      "Please validate payout details and process this redemption request."
    ],
    actionLabel: accountsUrl ? "Open Accounts" : "",
    actionUrl: accountsUrl,
    links: [
      { label: "Notifications page", url: notificationsUrl },
      { label: "Direct login link", url: loginUrl },
      { label: "Open app", url: frontendBase }
    ],
    listTitle: "Timeline Log",
    listItems: logLines
  });
  const textLines = [
    `Hello ${accountName || ""},`,
    "",
    `Redemption request submitted by ${employeeName}.`,
    `Employee: ${employee?.name || ""} (${employee?.email || ""})`,
    redemptionId ? `Request ID: ${redemptionId}` : "",
    `Amount: ${formattedAmount}`,
    formattedBalanceBefore ? `Balance before: ${formattedBalanceBefore}` : "",
    formattedBalanceAfter ? `Balance after: ${formattedBalanceAfter}` : "",
    `When: ${when}`,
    "",
    "Timeline Log:",
    ...logLines,
    "",
    accountsUrl ? `Process request: ${accountsUrl}` : "",
    notificationsUrl ? `Notifications page: ${notificationsUrl}` : "",
    loginUrl ? `Direct login link: ${loginUrl}` : "",
    frontendBase ? `Open app: ${frontendBase}` : ""
  ].filter(Boolean);
  const attachments = [];
  if (pdfAttachment?.content) {
    attachments.push({
      filename: pdfAttachment.filename || "redemption-proof.pdf",
      content: pdfAttachment.content,
      contentType: pdfAttachment.contentType || "application/pdf"
    });
  }
  await transporter.sendMail({
    from,
    to,
    subject,
    text: textLines.join("\n"),
    html,
    attachments
  });
  return { success: true };
}
async function sendRedemptionProcessedEmail({
  to,
  employeeName,
  amount,
  currency,
  transactionReference,
  processedBy,
  paymentNotes,
  redemptionId
}) {
  if (!to) {
    return { skipped: true, reason: "missing_recipient" };
  }
  const transport = getTransport();
  if (!transport) {
    console.warn("[Email] SMTP is not configured. Skipping redemption processed email.");
    return { skipped: true, reason: "smtp_not_configured" };
  }
  const { transporter, from } = transport;
  const subject = "Redemption payment processed";
  const frontendBase = getFrontendBaseUrl();
  const transactionsUrl = frontendBase ? `${frontendBase}/transactions` : "";
  const notificationsUrl = frontendBase ? `${frontendBase}/notifications` : "";
  const loginUrl = frontendBase ? `${frontendBase}/login` : "";
  const formattedAmount = formatMoney(amount, currency);
  const when = formatDateTime(/* @__PURE__ */ new Date());
  const html = renderNotificationEmail({
    preheader: "Redemption payment processed",
    title: "Redemption payment processed",
    greeting: `Dear ${employeeName || "Employee"},`,
    alertTitle: "Success",
    alertMessage: `Redemption payment has been processed for ${employeeName || "your account"}.`,
    alertTone: "success",
    detailTitle: "Notification Details",
    details: [
      { label: "Event", value: "Redemption payment processed" },
      redemptionId ? { label: "Request ID", value: redemptionId } : null,
      { label: "Amount", value: formattedAmount },
      transactionReference ? { label: "Transaction Reference", value: transactionReference } : null,
      processedBy ? { label: "Processed By", value: processedBy } : null,
      paymentNotes ? { label: "Notes", value: paymentNotes } : null,
      { label: "When", value: when }
    ].filter(Boolean),
    messageTitle: "Message",
    messageBody: [
      "Your payout has been completed. Please check your transactions for confirmation."
    ],
    actionTitle: "Action Required",
    actionBody: [
      "Review your transactions and keep this email for future reference."
    ],
    actionLabel: transactionsUrl ? "View Transactions" : "",
    actionUrl: transactionsUrl,
    links: [
      { label: "Notifications page", url: notificationsUrl },
      { label: "Direct login link", url: loginUrl },
      { label: "Open app", url: frontendBase }
    ]
  });
  const textLines = [
    `Hello ${employeeName || ""},`,
    "",
    "Your redemption request has been processed.",
    redemptionId ? `Request ID: ${redemptionId}` : "",
    `Amount: ${formattedAmount}`,
    transactionReference ? `Transaction Reference: ${transactionReference}` : "",
    processedBy ? `Processed by: ${processedBy}` : "",
    paymentNotes ? `Notes: ${paymentNotes}` : "",
    `When: ${when}`,
    "",
    transactionsUrl ? `View transactions: ${transactionsUrl}` : "",
    notificationsUrl ? `Notifications page: ${notificationsUrl}` : "",
    loginUrl ? `Direct login link: ${loginUrl}` : "",
    frontendBase ? `Open app: ${frontendBase}` : ""
  ].filter(Boolean);
  await transporter.sendMail({
    from,
    to,
    subject,
    text: textLines.join("\n"),
    html
  });
  return { success: true };
}

// _core/pdf.js
import PDFDocument from "pdfkit";
async function buildTimelinePdf({
  title,
  employee,
  amount,
  currency,
  timelineLog,
  creditTransactionId,
  redemptionId
}) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks = [];
  return await new Promise((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.fontSize(18).text(title || "Redemption Proof");
    doc.moveDown();
    doc.fontSize(12);
    if (employee) {
      doc.text(`Employee: ${employee.name || ""} (${employee.email || ""})`);
    }
    if (typeof amount === "number") {
      doc.text(`Amount: ${formatCurrencyAmount(amount, normalizeCurrency(currency))}`);
    }
    if (creditTransactionId) {
      doc.text(`Credit Transaction ID: ${creditTransactionId}`);
    }
    if (redemptionId) {
      doc.text(`Redemption Request ID: ${redemptionId}`);
    }
    doc.moveDown();
    doc.fontSize(14).text("Timeline Log");
    doc.moveDown(0.5);
    (timelineLog || []).forEach((entry, index) => {
      doc.fontSize(12).text(`${index + 1}. ${entry.step || "STEP"}`);
      doc.fontSize(10);
      if (entry.actorName || entry.actorEmail) {
        doc.text(`Actor: ${entry.actorName || ""} ${entry.actorEmail ? `(${entry.actorEmail})` : ""}`);
      }
      if (entry.role) {
        doc.text(`Role: ${entry.role}`);
      }
      if (entry.signatureId) {
        doc.text(`Signature ID: ${entry.signatureId}`);
      }
      if (entry.message) {
        doc.text(`Message: ${entry.message}`);
      }
      if (entry.at) {
        const at = new Date(entry.at).toLocaleString();
        doc.text(`At: ${at}`);
      }
      if (entry.metadata) {
        doc.text(`Metadata: ${JSON.stringify(entry.metadata)}`);
      }
      doc.moveDown();
    });
    doc.end();
  });
}

// rest.js
var ROLE_OPTIONS = ["admin", "hod", "employee", "account"];
var EMPLOYEE_TYPES = [
  "permanent_india",
  "permanent_usa",
  "freelancer_india",
  "freelancer_usa"
];
var POLICY_UPLOAD_DIR = path3.resolve(process.cwd(), "uploads", "policies");
fs2.mkdirSync(POLICY_UPLOAD_DIR, { recursive: true });
var POLICY_ALLOWED_MIME = /* @__PURE__ */ new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
]);
var policyUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!POLICY_ALLOWED_MIME.has(file.mimetype)) {
      cb(BadRequestError("Unsupported file type."));
      return;
    }
    cb(null, true);
  }
});
var creditRequestUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!POLICY_ALLOWED_MIME.has(file.mimetype)) {
      cb(BadRequestError("Unsupported file type."));
      return;
    }
    cb(null, true);
  }
});
var normalizeEmployeeType = (type) => type === "permanent" ? "permanent_india" : type;
var getUserCurrency = (user) => getCurrencyByEmployeeType(normalizeEmployeeType(user?.employeeType));
var formatMoney2 = (amount, currency) => formatCurrencyAmount(amount, normalizeCurrency(currency));
var asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};
var parseInput = (schema, data) => {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const message = parsed.error?.issues?.[0]?.message || "Invalid input";
    throw BadRequestError(message);
  }
  return parsed.data;
};
var attachUser = async (req) => {
  try {
    req.user = await authenticateRequest(req);
  } catch {
    req.user = null;
  }
};
var requireAuth = (req) => {
  if (!req.user) {
    throw UnauthorizedError(UNAUTHED_ERR_MSG);
  }
  return req.user;
};
var requireRole = (req, roles, message) => {
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
  const hods = hodIds.length > 0 ? await getUsersByIds(hodIds) : [];
  const hodMap = new Map(hods.map((hod) => [hod._id.toString(), hod]));
  return users.map((user) => ({
    ...user,
    hod: user.hodId ? hodMap.get(user.hodId) || null : null
  }));
}
async function hydrateFreelancerInitiators(users) {
  if (!users || users.length === 0) {
    return [];
  }
  const userIds = users.map((u) => u._id?.toString()).filter(Boolean);
  const initiatorLinks = await getEmployeeInitiatorsByEmployeeIds(userIds);
  const initiatorIds = Array.from(new Set(initiatorLinks.map((link) => link.initiatorId)));
  const initiators = initiatorIds.length > 0 ? await getUsersByIds(initiatorIds) : [];
  const initiatorMap = new Map(initiators.map((user) => [user._id.toString(), user]));
  const linksByEmployee = /* @__PURE__ */ new Map();
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
    freelancerInitiatorIds: (linksByEmployee.get(user._id.toString()) || []).map((init) => init._id.toString())
  }));
}
async function hydratePolicyAssignments(users) {
  if (!users || users.length === 0) {
    return [];
  }
  const userIds = users.map((u) => u._id?.toString()).filter(Boolean);
  const assignments = await getEmployeePolicyAssignmentsByUserIds(userIds);
  if (assignments.length === 0) {
    return users.map((user) => ({ ...user, policyAssignments: [] }));
  }
  const policyIds = Array.from(new Set(assignments.map((a) => a.policyId)));
  const policies = await getPoliciesByIds(policyIds);
  const policyMap = new Map(policies.map((policy) => [policy._id.toString(), policy]));
  const assignmentIds = assignments.map((a) => a._id.toString());
  const initiatorLinks = await getPolicyInitiatorsByAssignmentIds(assignmentIds);
  const initiatorIds = Array.from(new Set(initiatorLinks.map((link) => link.initiatorId)));
  const initiators = initiatorIds.length > 0 ? await getUsersByIds(initiatorIds) : [];
  const initiatorMap = new Map(initiators.map((user) => [user._id.toString(), user]));
  const initiatorsByAssignment = /* @__PURE__ */ new Map();
  initiatorLinks.forEach((link) => {
    const list = initiatorsByAssignment.get(link.assignmentId) || [];
    const initiator = initiatorMap.get(link.initiatorId);
    if (initiator) {
      list.push(initiator);
    }
    initiatorsByAssignment.set(link.assignmentId, list);
  });
  const assignmentsByUser = /* @__PURE__ */ new Map();
  assignments.forEach((assignment) => {
    const list = assignmentsByUser.get(assignment.userId) || [];
    list.push({
      ...assignment,
      policy: policyMap.get(assignment.policyId) || null,
      initiators: initiatorsByAssignment.get(assignment._id.toString()) || []
    });
    assignmentsByUser.set(assignment.userId, list);
  });
  return users.map((user) => ({
    ...user,
    policyAssignments: assignmentsByUser.get(user._id.toString()) || []
  }));
}
async function hydrateCreditRequests(requests) {
  if (!requests || requests.length === 0) {
    return [];
  }
  const userIds = Array.from(
    new Set(
      requests.flatMap((request) => [request.userId, request.initiatorId, request.hodId]).filter(Boolean)
    )
  );
  const policyIds = Array.from(new Set(requests.map((request) => request.policyId).filter(Boolean)));
  const users = userIds.length > 0 ? await getUsersByIds(userIds) : [];
  const policies = policyIds.length > 0 ? await getPoliciesByIds(policyIds) : [];
  const userMap = new Map(users.map((user) => [user._id.toString(), user]));
  const policyMap = new Map(policies.map((policy) => [policy._id.toString(), policy]));
  return requests.map((request) => ({
    ...request,
    user: userMap.get(request.userId) || null,
    initiator: userMap.get(request.initiatorId) || null,
    hod: request.hodId ? userMap.get(request.hodId) || null : null,
    policy: request.policyId ? policyMap.get(request.policyId) || null : null,
    currency: getUserCurrency(userMap.get(request.userId) || null)
  }));
}
async function hydrateRedemptionRequests(requests) {
  if (!requests || requests.length === 0) {
    return [];
  }
  const userIds = Array.from(new Set(requests.map((request) => request.userId).filter(Boolean)));
  const users = userIds.length > 0 ? await getUsersByIds(userIds) : [];
  const userMap = new Map(users.map((user) => [user._id.toString(), user]));
  return requests.map((request) => ({
    ...request,
    user: userMap.get(request.userId) || null,
    currency: getUserCurrency(userMap.get(request.userId) || null)
  }));
}
var buildTimelineEntry = ({ step, role, actor, signatureId, message, metadata }) => ({
  step,
  role,
  actorId: actor?.id || actor?._id?.toString(),
  actorName: actor?.name || "",
  actorEmail: actor?.email || "",
  signatureId,
  message,
  metadata,
  at: /* @__PURE__ */ new Date()
});
var appendTimelineEntry = (existing, entry) => [...existing || [], entry];
function createRestRouter() {
  const router = express.Router();
  router.use(
    asyncHandler(async (req, res, next) => {
      await attachUser(req);
      next();
    })
  );
  router.get(
    "/health",
    asyncHandler((req, res) => {
      parseInput(
        z.object({
          timestamp: z.coerce.number().min(0, "timestamp cannot be negative")
        }),
        req.query
      );
      res.json({ ok: true });
    })
  );
  router.get(
    "/system/sync-status",
    asyncHandler(async (req, res) => {
      const dbState = await getDbSchemaVersionState(DB_SCHEMA_VERSION);
      res.json({
        ok: true,
        sync: {
          frontendInSyncRequiredVersion: FRONTEND_SYNC_VERSION_REQUIRED,
          dbSchemaInSync: dbState.compatible
        },
        versions: {
          apiSyncVersion: API_SYNC_VERSION,
          dbSchemaRequired: DB_SCHEMA_VERSION,
          dbSchemaCurrent: dbState.currentVersion
        },
        db: {
          connected: !dbState.skipped
        },
        serverTime: (/* @__PURE__ */ new Date()).toISOString()
      });
    })
  );
  router.get(
    "/auth/me",
    asyncHandler((req, res) => {
      res.json(req.user ?? null);
    })
  );
  router.get(
    "/auth/admin-setup-status",
    asyncHandler(async (req, res) => {
      const adminExists = await hasAdminUser();
      res.json({ adminExists });
    })
  );
  router.post(
    "/auth/admin-signup",
    asyncHandler(async (req, res) => {
      const input = parseInput(
        z.object({
          name: z.string().min(1),
          email: z.string().email(),
          password: z.string().min(6)
        }),
        req.body
      );
      const adminExists = await hasAdminUser();
      if (adminExists) {
        throw ForbiddenError("Admin account already exists.");
      }
      const existingUser = await getUserByEmail(input.email);
      if (existingUser) {
        throw new HttpError(409, "Email already in use.");
      }
      const openId = `admin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      let user;
      try {
        user = await createUser({
          openId,
          name: input.name,
          email: input.email,
          password: input.password,
          role: "admin",
          loginMethod: "email",
          lastSignedIn: /* @__PURE__ */ new Date()
        });
      } catch (error) {
        if (error?.code === 11e3) {
          throw new HttpError(409, "Email already in use.");
        }
        throw error;
      }
      await updateUser(user._id.toString(), { hodId: user._id.toString() });
      const { SignJWT } = await import("jose");
      const jwtSecret2 = ENV.cookieSecret;
      if (!jwtSecret2) {
        throw new HttpError(500, "JWT_SECRET is missing. Set it in backend/.env.");
      }
      const secret = new TextEncoder().encode(jwtSecret2);
      const token = await new SignJWT({
        userId: user._id.toString(),
        openId: user.openId,
        role: user.role
      }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("7d").sign(secret);
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, cookieOptions);
      res.json({
        success: true,
        token,
        user: { id: user._id.toString(), email: user.email, name: user.name, role: user.role }
      });
    })
  );
  router.post(
    "/auth/login",
    asyncHandler(async (req, res) => {
      const input = parseInput(
        z.object({
          email: z.string().email(),
          password: z.string()
        }),
        req.body
      );
      const bcrypt = await import("bcryptjs");
      const user = await getUserByEmail(input.email);
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
      await updateUser(user._id.toString(), { lastSignedIn: /* @__PURE__ */ new Date() });
      const { SignJWT } = await import("jose");
      const jwtSecret2 = ENV.cookieSecret;
      if (!jwtSecret2) {
        throw new HttpError(500, "JWT_SECRET is missing. Set it in backend/.env.");
      }
      const secret = new TextEncoder().encode(jwtSecret2);
      const token = await new SignJWT({
        userId: user._id.toString(),
        openId: user.openId,
        role: user.role
      }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("7d").sign(secret);
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, cookieOptions);
      res.json({
        success: true,
        token,
        user: { id: user._id.toString(), email: user.email, name: user.name, role: user.role }
      });
    })
  );
  router.post(
    "/auth/logout",
    asyncHandler((req, res) => {
      const cookieOptions = getSessionCookieOptions(req);
      res.clearCookie(COOKIE_NAME, cookieOptions);
      res.json({ success: true });
    })
  );
  router.get(
    "/users",
    asyncHandler(async (req, res) => {
      const user = requireRole(req, ["admin", "hod"], "HOD access required");
      const users = await getAllUsers();
      res.json(await hydrateFreelancerInitiators(users));
    })
  );
  router.get(
    "/users/role/:role",
    asyncHandler(async (req, res) => {
      requireRole(req, ["admin", "hod"], "HOD access required");
      const input = parseInput(z.object({ role: z.enum(ROLE_OPTIONS) }), { role: req.params.role });
      const users = await getUsersByRole(input.role);
      res.json(await hydrateFreelancerInitiators(users));
    })
  );
  router.get(
    "/users/:id",
    asyncHandler(async (req, res) => {
      requireAuth(req);
      const input = parseInput(z.object({ id: z.string() }), { id: req.params.id });
      const user = await getUserById(input.id);
      const [hydrated] = await hydrateFreelancerInitiators(user ? [user] : []);
      res.json(hydrated || null);
    })
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
          freelancerInitiatorIds: z.array(z.string()).optional()
        }),
        req.body
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
        hodId = void 0;
      } else if (input.role === "hod") {
        if (!hodId) {
          throw BadRequestError("HOD must have an Admin assigned as HOD.");
        }
        const hodUser = await getUserById(hodId);
        if (!hodUser || hodUser.role !== "admin") {
          throw BadRequestError("HOD must be assigned to an Admin user.");
        }
      } else {
        if (!hodId) {
          throw BadRequestError("HOD is required for this role.");
        }
        const hodUser = await getUserById(hodId);
        if (!hodUser || hodUser.role !== "admin" && hodUser.role !== "hod") {
          throw BadRequestError("Assigned HOD must be an Admin or HOD.");
        }
      }
      const openId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const user = await createUser({
        ...userInput,
        employeeType: normalizedEmployeeType,
        openId,
        hodId
      });
      if (input.role === "admin") {
        await updateUser(user._id.toString(), { hodId: user._id.toString() });
      }
      await reconcileCurrencyForUser(user._id.toString());
      if (normalizedEmployeeType.startsWith("freelancer") && freelancerInitiatorIds?.length) {
        await setEmployeeInitiators(user._id.toString(), freelancerInitiatorIds, ctxUser.id);
      }
      await createAuditLog({
        userId: ctxUser.id,
        action: "user_created",
        entityType: "user",
        entityId: openId,
        details: JSON.stringify({ email: input.email, role: input.role })
      });
      res.json({ success: true, message: "User created successfully" });
    })
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
          status: z.enum(["active", "inactive"]).optional()
        }),
        { ...req.body, id: req.params.id }
      );
      const { id, freelancerInitiatorIds, ...updates } = input;
      const currentUser = await getUserById(id);
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
      const normalizedEmployeeType = updates.employeeType ? normalizeEmployeeType(updates.employeeType) : currentUser?.employeeType;
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
        const hodUser = await getUserById(hodIdToUse);
        if (!hodUser || hodUser.role !== "admin") {
          throw BadRequestError("HOD must be assigned to an Admin user.");
        }
        if (updates.hodId === void 0) {
          updates.hodId = hodIdToUse;
        }
      }
      if (targetRole === "employee" || targetRole === "account") {
        if (!hodIdToUse) {
          throw BadRequestError("HOD is required for this role.");
        }
        const hodUser = await getUserById(hodIdToUse);
        if (!hodUser || hodUser.role !== "admin" && hodUser.role !== "hod") {
          throw BadRequestError("Assigned HOD must be an Admin or HOD.");
        }
        if (updates.hodId === void 0) {
          updates.hodId = hodIdToUse;
        }
      }
      if (targetEmployeeType && targetEmployeeType.startsWith("freelancer")) {
        if (freelancerInitiatorIds && freelancerInitiatorIds.length === 0) {
          await setEmployeeInitiators(id, [], ctxUser.id);
        }
      }
      if (updates.employeeType) {
        updates.employeeType = normalizedEmployeeType;
      }
      await updateUser(id, updates);
      await reconcileCurrencyForUser(id);
      if (normalizedEmployeeType && normalizedEmployeeType.startsWith("freelancer") && freelancerInitiatorIds?.length) {
        await setEmployeeInitiators(id, freelancerInitiatorIds, ctxUser.id);
      }
      await createAuditLog({
        userId: ctxUser.id,
        action: "user_updated",
        entityType: "user",
        entityId: id,
        beforeValue: JSON.stringify(currentUser),
        afterValue: JSON.stringify(updates)
      });
      res.json({ success: true });
    })
  );
  router.delete(
    "/users/:id",
    asyncHandler(async (req, res) => {
      const ctxUser = requireRole(req, ["admin"], "Admin access required");
      const input = parseInput(z.object({ id: z.string() }), { id: req.params.id });
      await deleteUser(input.id);
      await createAuditLog({
        userId: ctxUser.id,
        action: "user_deleted",
        entityType: "user",
        entityId: input.id
      });
      res.json({ success: true });
    })
  );
  router.post(
    "/admin/currency/reconcile",
    asyncHandler(async (req, res) => {
      const ctxUser = requireRole(req, ["admin"], "Admin access required");
      const input = parseInput(
        z.object({
          userId: z.string().optional()
        }),
        req.body ?? {}
      );
      const result = input.userId ? await reconcileCurrencyForUser(input.userId) : await reconcileCurrencyForAllUsers();
      if (input.userId && !result) {
        throw NotFoundError("User not found");
      }
      await createAuditLog({
        userId: ctxUser.id,
        action: "currency_reconciled",
        entityType: "currency",
        entityId: input.userId || "all",
        details: JSON.stringify({
          scope: input.userId ? "user" : "all",
          userId: input.userId || null
        })
      });
      res.json({ success: true, result });
    })
  );
  router.get(
    "/policies",
    asyncHandler(async (req, res) => {
      const ctxUser = requireRole(req, ["admin", "hod"], "HOD access required");
      res.json(await getAllPolicies());
    })
  );
  router.get(
    "/policies/:id",
    asyncHandler(async (req, res) => {
      requireAuth(req);
      const input = parseInput(z.object({ id: z.string() }), { id: req.params.id });
      res.json(await getPolicyById(input.id));
    })
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
    })
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
          status: z.enum(["active", "draft", "archived"]).default("active")
        }),
        req.body
      );
      const policy = await createPolicy({
        ...input,
        createdBy: ctxUser.id
      });
      await createAuditLog({
        userId: ctxUser.id,
        action: "policy_created",
        entityType: "policy",
        details: JSON.stringify({ name: input.name })
      });
      res.json({ success: true, policy });
    })
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
          status: z.enum(["active", "draft", "archived"]).optional()
        }),
        { ...req.body, id: req.params.id }
      );
      const { id, ...updates } = input;
      const existing = await getPolicyById(id);
      if (!existing) {
        throw NotFoundError("Policy not found");
      }
      if (ctxUser.role === "hod" && existing.createdBy !== ctxUser.id) {
        throw ForbiddenError("You can only update policies you created.");
      }
      await updatePolicy(id, updates);
      await createAuditLog({
        userId: ctxUser.id,
        action: "policy_updated",
        entityType: "policy",
        entityId: id,
        details: JSON.stringify(updates)
      });
      res.json({ success: true });
    })
  );
  router.post(
    "/policies/:id/attachments",
    policyUpload.array("files", 10),
    asyncHandler(async (req, res) => {
      const ctxUser = requireRole(req, ["admin", "hod"], "HOD access required");
      const input = parseInput(z.object({ id: z.string() }), { id: req.params.id });
      const policy = await getPolicyById(input.id);
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
        files.map(
          (file) => saveBufferToGridFS({
            buffer: file.buffer,
            filename: file.originalname,
            mimeType: file.mimetype,
            metadata: { source: "policy", policyId: input.id }
          })
        )
      );
      const attachments = files.map((file, index) => ({
        originalName: file.originalname,
        filename: stored[index]?.filename || file.originalname,
        fileId: stored[index]?.fileId,
        mimeType: file.mimetype,
        size: file.size,
        url: stored[index]?.fileId ? `/api/files/${stored[index].fileId}` : "",
        uploadedAt: /* @__PURE__ */ new Date()
      }));
      const updated = await addPolicyAttachments(input.id, attachments);
      await createAuditLog({
        userId: ctxUser.id,
        action: "policy_attachment_added",
        entityType: "policy",
        entityId: input.id,
        details: JSON.stringify({ count: attachments.length })
      });
      res.json({ success: true, attachments: updated?.attachments || [] });
    })
  );
  router.delete(
    "/policies/:id/attachments/:attachmentId",
    asyncHandler(async (req, res) => {
      const ctxUser = requireRole(req, ["admin", "hod"], "HOD access required");
      const input = parseInput(
        z.object({ id: z.string(), attachmentId: z.string() }),
        { id: req.params.id, attachmentId: req.params.attachmentId }
      );
      const policy = await getPolicyById(input.id);
      if (!policy) {
        throw NotFoundError("Policy not found");
      }
      if (ctxUser.role === "hod" && policy.createdBy !== ctxUser.id) {
        throw ForbiddenError("You can only update policies you created.");
      }
      const attachment = policy.attachments?.find(
        (item) => item._id?.toString() === input.attachmentId
      );
      if (!attachment) {
        throw NotFoundError("Attachment not found");
      }
      await removePolicyAttachment(input.id, input.attachmentId);
      if (attachment.fileId) {
        try {
          await deleteGridFSFile(attachment.fileId);
        } catch (error) {
          console.warn("[Files] Failed to delete GridFS file:", error?.message || error);
        }
      }
      if (attachment.filename) {
        const filePath = path3.join(POLICY_UPLOAD_DIR, attachment.filename);
        fs2.unlink(filePath, () => {
        });
      }
      await createAuditLog({
        userId: ctxUser.id,
        action: "policy_attachment_removed",
        entityType: "policy",
        entityId: input.id,
        details: JSON.stringify({ attachmentId: input.attachmentId })
      });
      res.json({ success: true });
    })
  );
  router.delete(
    "/policies/:id",
    asyncHandler(async (req, res) => {
      const ctxUser = requireRole(req, ["admin", "hod"], "HOD access required");
      const input = parseInput(z.object({ id: z.string() }), { id: req.params.id });
      const existing = await getPolicyById(input.id);
      if (!existing) {
        throw NotFoundError("Policy not found");
      }
      if (ctxUser.role === "hod" && existing.createdBy !== ctxUser.id) {
        throw ForbiddenError("You can only delete policies you created.");
      }
      await deletePolicy(input.id);
      await createAuditLog({
        userId: ctxUser.id,
        action: "policy_deleted",
        entityType: "policy",
        entityId: input.id
      });
      res.json({ success: true });
    })
  );
  router.post(
    "/team/assign-policy",
    asyncHandler(async (req, res) => {
      const ctxUser = requireRole(req, ["admin", "hod"], "HOD access required");
      const input = parseInput(
        z.object({
          userId: z.string(),
          policyId: z.string(),
          initiatorIds: z.array(z.string()).min(1),
          effectiveDate: z.string().optional()
        }),
        req.body
      );
      const user = await getUserById(input.userId);
      if (!user) {
        throw NotFoundError("User not found");
      }
      if (ctxUser.role === "hod" && user.hodId?.toString() !== ctxUser.id) {
        throw ForbiddenError("You can only assign policies to your team members.");
      }
      const policy = await getPolicyById(input.policyId);
      if (!policy) {
        throw NotFoundError("Policy not found");
      }
      const effectiveDate = input.effectiveDate ? new Date(input.effectiveDate) : /* @__PURE__ */ new Date();
      if (Number.isNaN(effectiveDate.getTime())) {
        throw BadRequestError("Invalid effective date.");
      }
      const existingAssignment = await getEmployeePolicyAssignmentByUserPolicy(
        input.userId,
        input.policyId
      );
      let assignmentId;
      if (existingAssignment) {
        await updateEmployeePolicyAssignment(existingAssignment._id.toString(), {
          effectiveDate,
          assignedBy: ctxUser.id
        });
        assignmentId = existingAssignment._id.toString();
      } else {
        const assignment = await createEmployeePolicyAssignment({
          userId: input.userId,
          policyId: input.policyId,
          effectiveDate,
          assignedBy: ctxUser.id
        });
        assignmentId = assignment._id.toString();
      }
      await setPolicyInitiators(assignmentId, input.initiatorIds, ctxUser.id);
      try {
        const initiators = await getUsersByIds(input.initiatorIds);
        await Promise.all(
          initiators.map(
            (init) => createNotification({
              userId: init._id.toString(),
              title: "Policy initiator assigned",
              message: `You can initiate ${policy.name} for ${user.name || user.email}.`,
              type: "info",
              actionUrl: "/employees"
            })
          )
        );
      } catch (error) {
        console.warn("[Notifications] Failed to notify policy initiators:", error?.message || error);
      }
      await createAuditLog({
        userId: ctxUser.id,
        action: "policy_assigned",
        entityType: "policy_assignment",
        details: JSON.stringify({ ...input, assignmentId })
      });
      res.json({ success: true });
    })
  );
  router.post(
    "/team/remove-policy",
    asyncHandler(async (req, res) => {
      const ctxUser = requireRole(req, ["admin", "hod"], "HOD access required");
      const input = parseInput(z.object({ assignmentId: z.string() }), req.body);
      const assignment = await getEmployeePolicyAssignmentById(input.assignmentId);
      if (!assignment) {
        throw NotFoundError("Assignment not found");
      }
      if (ctxUser.role === "hod") {
        const user = await getUserById(assignment.userId);
        if (user?.hodId?.toString() !== ctxUser.id) {
          throw ForbiddenError("You can only remove policies from your team members.");
        }
      }
      await setPolicyInitiators(input.assignmentId, [], ctxUser.id);
      await removeEmployeePolicyAssignmentById(input.assignmentId);
      await createAuditLog({
        userId: ctxUser.id,
        action: "policy_removed",
        entityType: "policy_assignment",
        entityId: input.assignmentId
      });
      res.json({ success: true });
    })
  );
  router.get(
    "/team/my",
    asyncHandler(async (req, res) => {
      const ctxUser = requireAuth(req);
      if (ctxUser.role === "admin") {
        const users2 = await getAllUsers();
        const withHods2 = await hydrateHods(users2);
        const withInitiators2 = await hydrateFreelancerInitiators(withHods2);
        res.json(await hydratePolicyAssignments(withInitiators2));
        return;
      }
      if (ctxUser.role === "hod") {
        const users2 = await getUsersByHod(ctxUser.id);
        const withHods2 = await hydrateHods(users2);
        const withInitiators2 = await hydrateFreelancerInitiators(withHods2);
        res.json(await hydratePolicyAssignments(withInitiators2));
        return;
      }
      const [initiatorLinks, policyLinks] = await Promise.all([
        getEmployeeInitiatorsByInitiatorId(ctxUser.id),
        getPolicyInitiatorsByInitiatorId(ctxUser.id)
      ]);
      const employeeIds = new Set(initiatorLinks.map((link) => link.employeeId));
      if (policyLinks.length > 0) {
        const assignmentIds = Array.from(new Set(policyLinks.map((link) => link.assignmentId)));
        const assignments = await getEmployeePolicyAssignmentsByIds(assignmentIds);
        assignments.forEach((assignment) => {
          if (assignment?.userId) {
            employeeIds.add(assignment.userId);
          }
        });
      }
      const uniqueEmployeeIds = Array.from(employeeIds);
      const users = uniqueEmployeeIds.length > 0 ? await getUsersByIds(uniqueEmployeeIds) : [];
      const filtered = users.filter((member) => member.role === "employee" && member.isEmployee !== false);
      const withHods = await hydrateHods(filtered);
      const withInitiators = await hydrateFreelancerInitiators(withHods);
      res.json(await hydratePolicyAssignments(withInitiators));
    })
  );
  router.get(
    "/team/user-policies",
    asyncHandler(async (req, res) => {
      requireAuth(req);
      const input = parseInput(z.object({ userId: z.string() }), req.query);
      const user = await getUserById(input.userId);
      if (!user) {
        throw NotFoundError("User not found");
      }
      const [hydrated] = await hydratePolicyAssignments([user]);
      res.json(hydrated?.policyAssignments || []);
    })
  );
  router.get(
    "/credit-requests/initiator-scope",
    asyncHandler(async (req, res) => {
      const ctxUser = requireAuth(req);
      if (ctxUser.role === "admin" || ctxUser.role === "hod") {
        const users2 = ctxUser.role === "admin" ? await getAllUsers() : await getUsersByHod(ctxUser.id);
        const assignments2 = await getEmployeePolicyAssignmentsByUserIds(
          users2.map((u) => u._id.toString())
        );
        const policies2 = await getPoliciesByIds(
          Array.from(new Set(assignments2.map((a) => a.policyId)))
        );
        const policyMap2 = new Map(policies2.map((policy) => [policy._id.toString(), policy]));
        const userMap2 = new Map(users2.map((user) => [user._id.toString(), user]));
        const policyAssignments2 = assignments2.map((assignment) => ({
          assignmentId: assignment._id.toString(),
          user: userMap2.get(assignment.userId) || null,
          policy: policyMap2.get(assignment.policyId) || null,
          effectiveDate: assignment.effectiveDate
        })).filter((a) => a.user && a.policy);
        const freelancers2 = users2.filter((u) => u.employeeType?.startsWith("freelancer"));
        res.json({ policyAssignments: policyAssignments2, freelancers: freelancers2 });
        return;
      }
      const policyLinks = await getPolicyInitiatorsByInitiatorId(ctxUser.id);
      const assignmentIds = Array.from(new Set(policyLinks.map((link) => link.assignmentId)));
      const assignments = assignmentIds.length > 0 ? await getEmployeePolicyAssignmentsByIds(assignmentIds) : [];
      const policyIds = Array.from(new Set(assignments.map((a) => a.policyId)));
      const userIds = Array.from(new Set(assignments.map((a) => a.userId)));
      const [policies, users] = await Promise.all([
        policyIds.length > 0 ? getPoliciesByIds(policyIds) : Promise.resolve([]),
        userIds.length > 0 ? getUsersByIds(userIds) : Promise.resolve([])
      ]);
      const policyMap = new Map(policies.map((policy) => [policy._id.toString(), policy]));
      const userMap = new Map(users.map((user) => [user._id.toString(), user]));
      const policyAssignments = assignments.map((assignment) => ({
        assignmentId: assignment._id.toString(),
        user: userMap.get(assignment.userId) || null,
        policy: policyMap.get(assignment.policyId) || null,
        effectiveDate: assignment.effectiveDate
      })).filter((a) => a.user && a.policy);
      const freelancerLinks = await getEmployeeInitiatorsByInitiatorId(ctxUser.id);
      const freelancerIds = Array.from(new Set(freelancerLinks.map((link) => link.employeeId)));
      const freelancers = freelancerIds.length > 0 ? await getUsersByIds(freelancerIds) : [];
      res.json({ policyAssignments, freelancers });
    })
  );
  router.get(
    "/credit-requests",
    asyncHandler(async (req, res) => {
      const ctxUser = requireRole(req, ["admin", "hod"], "HOD access required");
      if (ctxUser.role === "admin") {
        const requests2 = await getAllCreditRequests();
        res.json(await hydrateCreditRequests(requests2));
        return;
      }
      const requests = await getCreditRequestsByHod(ctxUser.id);
      res.json(await hydrateCreditRequests(requests));
    })
  );
  router.get(
    "/credit-requests/pending-approvals",
    asyncHandler(async (req, res) => {
      const ctxUser = requireAuth(req);
      if (ctxUser.role === "admin") {
        const requests2 = await getAllCreditRequests();
        res.json(await hydrateCreditRequests(requests2));
        return;
      }
      if (ctxUser.role === "hod") {
        const requests2 = await getCreditRequestsByHod(ctxUser.id);
        res.json(await hydrateCreditRequests(requests2));
        return;
      }
      const requests = await getCreditRequestsByUserId(ctxUser.id);
      res.json(await hydrateCreditRequests(requests));
    })
  );
  router.get(
    "/credit-requests/my",
    asyncHandler(async (req, res) => {
      const ctxUser = requireAuth(req);
      const requests = await getCreditRequestsByUserId(ctxUser.id);
      res.json(await hydrateCreditRequests(requests));
    })
  );
  router.get(
    "/credit-requests/submissions",
    asyncHandler(async (req, res) => {
      const ctxUser = requireAuth(req);
      const requests = await getCreditRequestsByInitiator(ctxUser.id);
      res.json(await hydrateCreditRequests(requests));
    })
  );
  router.get(
    "/credit-requests/:id",
    asyncHandler(async (req, res) => {
      requireAuth(req);
      const input = parseInput(z.object({ id: z.string() }), { id: req.params.id });
      const request = await getCreditRequestById(input.id);
      const [hydrated] = await hydrateCreditRequests(request ? [request] : []);
      res.json(hydrated || null);
    })
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
        files.map(
          (file) => saveBufferToGridFS({
            buffer: file.buffer,
            filename: file.originalname,
            mimeType: file.mimetype,
            metadata: { source: "credit_request" }
          })
        )
      );
      const attachments = files.map((file, index) => ({
        originalName: file.originalname,
        filename: stored[index]?.filename || file.originalname,
        fileId: stored[index]?.fileId,
        mimeType: file.mimetype,
        size: file.size,
        url: stored[index]?.fileId ? `/api/files/${stored[index].fileId}` : ""
      }));
      res.json({ success: true, attachments });
    })
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
          amountItems: z.array(
            z.object({
              amount: z.number(),
              note: z.string().optional(),
              addedBy: z.string().optional(),
              addedAt: z.string().optional()
            })
          ).optional(),
          calculationBreakdown: z.string().optional(),
          notes: z.string().optional(),
          documents: z.string().optional(),
          attachments: z.array(
            z.object({
              originalName: z.string(),
              filename: z.string(),
              fileId: z.string().optional(),
              mimeType: z.string(),
              size: z.number(),
              url: z.string()
            })
          ).optional()
        }),
        req.body
      );
      const user = await getUserById(input.userId);
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
        policyForEmail = await getPolicyById(input.policyId);
        const assignment = await getEmployeePolicyAssignmentByUserPolicy(
          input.userId,
          input.policyId
        );
        if (!assignment) {
          throw BadRequestError("Policy is not assigned to this employee.");
        }
        if (!isAdminOrHod) {
          const initiators = await getPolicyInitiatorsByAssignmentIds([
            assignment._id.toString()
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
          const initiators = await getEmployeeInitiatorsByEmployeeId(input.userId);
          const isAllowed = initiators.some((link) => link.initiatorId === ctxUser.id);
          if (!isAllowed) {
            throw ForbiddenError("You are not an initiator for this freelancer.");
          }
        }
      }
      const status = input.type === "policy" ? isAdminOrHod ? "pending_signature" : "pending_approval" : "pending_approval";
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
            policyName: policyForEmail?.name
          }
        })
      ];
      await createCreditRequest({
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
          addedAt: item.addedAt ? new Date(item.addedAt) : /* @__PURE__ */ new Date()
        })),
        calculationBreakdown: input.calculationBreakdown,
        notes: input.notes,
        documents: input.documents,
        attachments: input.attachments || [],
        status,
        timelineLog
      });
      await createAuditLog({
        userId: ctxUser.id,
        action: "credit_request_created",
        entityType: "credit_request",
        details: JSON.stringify({ userId: input.userId, amount: input.amount })
      });
      await createNotification({
        userId: input.userId,
        title: "Credit request created",
        message: input.type === "policy" ? isAdminOrHod ? "A policy-based credit request is awaiting your signature." : "A policy credit request has been submitted and is pending HOD approval." : "A freelancer credit request has been submitted and is pending HOD approval.",
        type: "info",
        actionUrl: "/transactions"
      });
      if (user.hodId) {
        await createNotification({
          userId: user.hodId,
          title: "Credit request pending approval",
          message: `${user.name || user.email} has a ${formatMoney2(input.amount, requestCurrency)} credit request awaiting your approval.`,
          type: "action",
          actionUrl: "/approvals"
        });
      }
      if (input.type === "freelancer" && user.hodId) {
        try {
          const hodUser = await getUserById(user.hodId);
          await sendHodFreelancerRequestEmail({
            to: hodUser?.email,
            hodName: hodUser?.name,
            employee: user,
            initiator: ctxUser,
            amount: input.amount,
            currency: requestCurrency,
            details: input.notes,
            attachments: input.attachments || [],
            requestType: "freelancer"
          });
        } catch (error) {
          console.warn("[Email] Failed to send HOD freelancer email:", error?.message || error);
        }
      }
      if (input.type === "policy" && user.hodId) {
        try {
          const hodUser = await getUserById(user.hodId);
          const policyDetails = policyForEmail?.name ? `Policy: ${policyForEmail.name}${input.notes ? ` | ${input.notes}` : ""}` : input.notes;
          await sendHodFreelancerRequestEmail({
            to: hodUser?.email,
            hodName: hodUser?.name,
            employee: user,
            initiator: ctxUser,
            amount: input.amount,
            currency: requestCurrency,
            details: policyDetails,
            attachments: input.attachments || [],
            requestType: "policy"
          });
        } catch (error) {
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
            `Policy: ${input.policyId} | Notes: ${input.notes || "N/A"} | Breakdown: ${input.calculationBreakdown || "N/A"}`
          );
          res.json({
            success: true,
            message: "Credit request created. Signature request sent to employee."
          });
          return;
        } catch (error) {
          console.error("GHL document creation failed:", error);
          throw new HttpError(500, "Failed to create signature document");
        }
      }
      res.json({ success: true, message: "Credit request created and sent to HOD for approval." });
    })
  );
  router.post(
    "/credit-requests/sign",
    asyncHandler(async (req, res) => {
      const ctxUser = requireAuth(req);
      const input = parseInput(
        z.object({
          requestId: z.string(),
          signature: z.string()
        }),
        req.body
      );
      const request = await getCreditRequestById(input.requestId);
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
          message: "Employee signed policy request"
        })
      );
      await updateCreditRequest(input.requestId, {
        userSignature: input.signature,
        userSignedAt: /* @__PURE__ */ new Date(),
        status: "pending_approval",
        timelineLog
      });
      await createAuditLog({
        userId: ctxUser.id,
        action: "credit_request_signed",
        entityType: "credit_request",
        entityId: input.requestId
      });
      if (request.hodId) {
        await createNotification({
          userId: request.hodId,
          title: "Credit request ready for approval",
          message: `${ctxUser.name || ctxUser.email} signed a credit request and it is ready for approval.`,
          type: "action",
          actionUrl: "/approvals"
        });
      }
      res.json({ success: true });
    })
  );
  router.post(
    "/credit-requests/reject",
    asyncHandler(async (req, res) => {
      const ctxUser = requireAuth(req);
      const input = parseInput(
        z.object({
          requestId: z.string(),
          reason: z.string()
        }),
        req.body
      );
      const request = await getCreditRequestById(input.requestId);
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
          metadata: { reason: input.reason }
        })
      );
      await updateCreditRequest(input.requestId, {
        userRejectionReason: input.reason,
        status: "rejected_by_user",
        timelineLog
      });
      await createAuditLog({
        userId: ctxUser.id,
        action: "credit_request_rejected_by_user",
        entityType: "credit_request",
        entityId: input.requestId,
        details: input.reason
      });
      res.json({ success: true });
    })
  );
  router.post(
    "/credit-requests/approve",
    asyncHandler(async (req, res) => {
      const ctxUser = requireRole(req, ["admin", "hod"], "HOD access required");
      const input = parseInput(z.object({ requestId: z.string() }), req.body);
      const request = await getCreditRequestById(input.requestId);
      if (!request) {
        throw NotFoundError("Not found");
      }
      if (request.status !== "pending_approval") {
        throw BadRequestError("Only pending approvals can be approved.");
      }
      const requestCurrency = normalizeCurrency(request.currency);
      if (request.type === "freelancer") {
        const timelineLog2 = appendTimelineEntry(
          request.timelineLog,
          buildTimelineEntry({
            step: "HOD_APPROVED",
            role: ctxUser.role,
            actor: ctxUser,
            signatureId: ctxUser.id,
            message: "HOD approved freelancer request"
          })
        );
        await updateCreditRequest(input.requestId, {
          status: "pending_employee_approval",
          hodApprovedBy: ctxUser.id,
          hodApprovedAt: /* @__PURE__ */ new Date(),
          timelineLog: timelineLog2
        });
        await createAuditLog({
          userId: ctxUser.id,
          action: "credit_request_hod_approved",
          entityType: "credit_request",
          entityId: input.requestId
        });
        await createNotification({
          userId: request.userId,
          title: "Approval required",
          message: `Your freelancer incentive for ${formatMoney2(request.amount, requestCurrency)} is awaiting your approval.`,
          type: "action",
          actionUrl: "/approvals"
        });
        res.json({ success: true, status: "pending_employee_approval" });
        return;
      }
      const currentBalance = await getWalletBalance(request.userId.toString());
      const newBalance = currentBalance + request.amount;
      let timelineLog = appendTimelineEntry(
        request.timelineLog,
        buildTimelineEntry({
          step: "HOD_APPROVED",
          role: ctxUser.role,
          actor: ctxUser,
          signatureId: ctxUser.id,
          message: "HOD approved policy request"
        })
      );
      timelineLog = appendTimelineEntry(
        timelineLog,
        buildTimelineEntry({
          step: "WALLET_CREDITED",
          role: "system",
          actor: ctxUser,
          message: "Wallet credited after policy approval",
          metadata: { amount: request.amount }
        })
      );
      await updateCreditRequest(input.requestId, {
        status: "approved",
        hodApprovedBy: ctxUser.id,
        hodApprovedAt: /* @__PURE__ */ new Date(),
        timelineLog
      });
      await createWalletTransaction({
        userId: request.userId,
        type: "credit",
        amount: request.amount,
        currency: requestCurrency,
        creditRequestId: request._id?.toString(),
        description: request.type === "freelancer" ? "Freelancer Amount" : "Policy Credit",
        balance: newBalance,
        redeemed: false,
        timelineLog
      });
      await createAuditLog({
        userId: ctxUser.id,
        action: "credit_request_approved",
        entityType: "credit_request",
        entityId: input.requestId
      });
      await createNotification({
        userId: request.userId,
        title: "Credit request approved",
        message: `Your credit request for ${formatMoney2(request.amount, requestCurrency)} was approved.`,
        type: "success",
        actionUrl: "/transactions"
      });
      res.json({ success: true });
    })
  );
  router.post(
    "/credit-requests/reject-by-hod",
    asyncHandler(async (req, res) => {
      const ctxUser = requireRole(req, ["admin", "hod"], "HOD access required");
      const input = parseInput(
        z.object({
          requestId: z.string(),
          reason: z.string()
        }),
        req.body
      );
      const request = await getCreditRequestById(input.requestId);
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
          metadata: { reason: input.reason }
        })
      );
      await updateCreditRequest(input.requestId, {
        hodRejectionReason: input.reason,
        hodRejectedAt: /* @__PURE__ */ new Date(),
        status: "rejected_by_hod",
        timelineLog
      });
      await createAuditLog({
        userId: ctxUser.id,
        action: "credit_request_rejected_by_hod",
        entityType: "credit_request",
        entityId: input.requestId,
        details: input.reason
      });
      const employee = await getUserById(request.userId);
      await createNotification({
        userId: request.userId,
        title: "Credit request rejected",
        message: `Your credit request was rejected. Reason: ${input.reason}`,
        type: "warning",
        actionUrl: "/transactions"
      });
      if (request.initiatorId) {
        const initiator = await getUserById(request.initiatorId);
        await createNotification({
          userId: request.initiatorId,
          title: "Request rejected",
          message: `The ${request.type} request for ${employee?.name || employee?.email} was rejected by HOD. Reason: ${input.reason}`,
          type: "warning",
          actionUrl: "/approvals"
        });
        try {
          const hodUser = await getUserById(request.hodId);
          await sendInitiatorFreelancerRejectionEmail({
            to: initiator?.email,
            initiatorName: initiator?.name,
            employee,
            hod: hodUser,
            amount: request.amount,
            currency: request.currency,
            reason: input.reason,
            rejectedBy: hodUser?.name || hodUser?.email || "HOD",
            requestType: request.type
          });
        } catch (error) {
          console.warn("[Email] Failed to send initiator rejection email:", error?.message || error);
        }
      }
      res.json({ success: true });
    })
  );
  router.post(
    "/credit-requests/approve-by-employee",
    asyncHandler(async (req, res) => {
      const ctxUser = requireAuth(req);
      const input = parseInput(z.object({ requestId: z.string() }), req.body);
      const request = await getCreditRequestById(input.requestId);
      if (!request || request.userId !== ctxUser.id) {
        throw ForbiddenError("Forbidden");
      }
      if (request.status !== "pending_employee_approval") {
        throw BadRequestError("Only pending employee approvals can be approved.");
      }
      const requestCurrency = normalizeCurrency(request.currency, getCurrencyByEmployeeType(ctxUser.employeeType));
      const currentBalance = await getWalletBalance(request.userId.toString());
      const newBalance = currentBalance + request.amount;
      let timelineLog = appendTimelineEntry(
        request.timelineLog,
        buildTimelineEntry({
          step: "EMPLOYEE_APPROVED",
          role: "employee",
          actor: ctxUser,
          message: "Employee approved freelancer request"
        })
      );
      timelineLog = appendTimelineEntry(
        timelineLog,
        buildTimelineEntry({
          step: "WALLET_CREDITED",
          role: "system",
          actor: ctxUser,
          message: "Wallet credited after freelancer approval",
          metadata: { amount: request.amount }
        })
      );
      await updateCreditRequest(input.requestId, {
        status: "approved",
        employeeApprovedAt: /* @__PURE__ */ new Date(),
        timelineLog
      });
      await createWalletTransaction({
        userId: request.userId,
        type: "credit",
        amount: request.amount,
        currency: requestCurrency,
        creditRequestId: request._id?.toString(),
        description: "Freelancer Amount",
        balance: newBalance,
        redeemed: false,
        timelineLog
      });
      await createAuditLog({
        userId: ctxUser.id,
        action: "credit_request_approved_by_employee",
        entityType: "credit_request",
        entityId: input.requestId
      });
      res.json({ success: true });
    })
  );
  router.post(
    "/credit-requests/reject-by-employee",
    asyncHandler(async (req, res) => {
      const ctxUser = requireAuth(req);
      const input = parseInput(
        z.object({
          requestId: z.string(),
          reason: z.string()
        }),
        req.body
      );
      const request = await getCreditRequestById(input.requestId);
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
          metadata: { reason: input.reason }
        })
      );
      await updateCreditRequest(input.requestId, {
        userRejectionReason: input.reason,
        employeeRejectedAt: /* @__PURE__ */ new Date(),
        status: "rejected_by_employee",
        timelineLog
      });
      await createAuditLog({
        userId: ctxUser.id,
        action: "credit_request_rejected_by_employee",
        entityType: "credit_request",
        entityId: input.requestId,
        details: input.reason
      });
      if (request.initiatorId) {
        const initiator = await getUserById(request.initiatorId);
        const hodUser = request.hodId ? await getUserById(request.hodId) : null;
        await createNotification({
          userId: request.initiatorId,
          title: "Freelancer request rejected",
          message: `The freelancer request was rejected by ${ctxUser.name || ctxUser.email}. Reason: ${input.reason}`,
          type: "warning",
          actionUrl: "/approvals"
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
            requestType: request.type
          });
        } catch (error) {
          console.warn("[Email] Failed to send initiator rejection email:", error?.message || error);
        }
      }
      res.json({ success: true });
    })
  );
  router.get(
    "/wallet/balance",
    asyncHandler(async (req, res) => {
      const ctxUser = requireAuth(req);
      const [wallet, summary] = await Promise.all([
        getWalletByUserId(ctxUser.id),
        getWalletSummary(ctxUser.id)
      ]);
      const currency = normalizeCurrency(wallet?.currency, getUserCurrency(ctxUser));
      res.json({ balance: wallet?.balance || 0, currency, ...summary });
    })
  );
  router.get(
    "/wallet/transactions",
    asyncHandler(async (req, res) => {
      const ctxUser = requireAuth(req);
      res.json(await getWalletTransactions(ctxUser.id));
    })
  );
  router.post(
    "/redemption",
    asyncHandler(async (req, res) => {
      const ctxUser = requireAuth(req);
      const input = parseInput(
        z.object({
          creditTransactionId: z.string(),
          notes: z.string().optional()
        }),
        req.body
      );
      const creditTxn = await getWalletTransactionById(input.creditTransactionId);
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
      await reconcileCurrencyForUser(ctxUser.id.toString());
      const dbUser = await getUserById(ctxUser.id.toString());
      const redemptionCurrency = getUserCurrency(dbUser || ctxUser);
      const creditCurrency = normalizeCurrency(creditTxn.currency, redemptionCurrency);
      if (creditCurrency !== redemptionCurrency) {
        throw BadRequestError(
          `Currency mismatch found for this credit. Expected ${redemptionCurrency}. Please refresh and try again.`
        );
      }
      const balanceBefore = await getWalletBalance(ctxUser.id.toString());
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
            currency: redemptionCurrency
          }
        })
      );
      const redemption = await createRedemptionRequest({
        userId: ctxUser.id,
        amount,
        currency: redemptionCurrency,
        notes: input.notes,
        creditTransactionId: creditTxn._id?.toString(),
        timelineLog
      });
      const balanceAfter = balanceBefore - amount;
      await createWalletTransaction({
        userId: ctxUser.id,
        type: "debit",
        amount,
        currency: redemptionCurrency,
        redemptionRequestId: redemption._id?.toString(),
        linkedCreditTxnId: creditTxn._id?.toString(),
        description: "Redemption",
        balance: balanceAfter,
        timelineLog
      });
      await updateWalletTransaction(creditTxn._id?.toString(), {
        redeemed: true,
        redemptionRequestId: redemption._id?.toString()
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
          redemptionId: redemption._id?.toString()
        });
        const pdfFile = await saveBufferToGridFS({
          buffer: pdfBuffer,
          filename: `redemption-${redemption._id?.toString()}.pdf`,
          mimeType: "application/pdf",
          metadata: { redemptionId: redemption._id?.toString() }
        });
        await updateRedemptionRequest(redemption._id?.toString(), {
          proofPdf: {
            filename: pdfFile.filename,
            url: `/api/files/${pdfFile.fileId}`,
            generatedAt: /* @__PURE__ */ new Date()
          }
        });
      } catch (error) {
        console.warn("[PDF] Failed to generate redemption proof:", error?.message || error);
      }
      await createAuditLog({
        userId: ctxUser.id,
        action: "redemption_requested",
        entityType: "redemption_request",
        details: JSON.stringify({ amount, creditTransactionId: creditTxn._id?.toString() })
      });
      await createNotification({
        userId: ctxUser.id,
        title: "Redemption request submitted",
        message: `Your redemption request for ${formatMoney2(amount, redemptionCurrency)} was submitted.`,
        type: "info",
        actionUrl: "/my-account"
      });
      const accountUsers = await getUsersByRole("account");
      await Promise.all(
        accountUsers.map(async (user) => {
          await createNotification({
            userId: user._id.toString(),
            title: "New redemption request",
            message: `A redemption request for ${formatMoney2(amount, redemptionCurrency)} is waiting to be processed.`,
            type: "action",
            actionUrl: "/accounts"
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
              pdfAttachment: pdfBuffer ? { content: pdfBuffer, filename: `redemption-${redemption._id?.toString()}.pdf` } : null
            });
          } catch (error) {
            console.warn("[Email] Failed to send redemption email:", error?.message || error);
          }
        })
      );
      res.json({ success: true });
    })
  );
  router.get(
    "/redemption/my",
    asyncHandler(async (req, res) => {
      const ctxUser = requireAuth(req);
      const requests = await getRedemptionRequestsByUserId(ctxUser.id);
      res.json(await hydrateRedemptionRequests(requests));
    })
  );
  router.get(
    "/redemption/queue",
    asyncHandler(async (req, res) => {
      requireRole(req, ["admin", "account"], "Accounts access required");
      const requests = await getAllRedemptionRequests();
      res.json(await hydrateRedemptionRequests(requests));
    })
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
          paymentCurrency: z.enum(CURRENCY_VALUES).optional()
        }),
        req.body
      );
      const request = await getRedemptionRequestById(input.requestId);
      if (!request) {
        throw NotFoundError("Not found");
      }
      const employeeId = request.userId?.toString?.() || request.userId;
      await reconcileCurrencyForUser(employeeId);
      const employee = await getUserById(employeeId);
      const expectedCurrency = getUserCurrency(employee);
      const processedCurrency = normalizeCurrency(input.paymentCurrency, expectedCurrency);
      if (processedCurrency !== expectedCurrency) {
        throw BadRequestError(
          `Payment currency mismatch. This request must be processed in ${expectedCurrency}.`
        );
      }
      if (normalizeCurrency(request.currency, expectedCurrency) !== expectedCurrency) {
        await updateRedemptionRequest(input.requestId, { currency: expectedCurrency });
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
            currency: processedCurrency
          }
        })
      );
      await updateRedemptionRequest(input.requestId, {
        status: "completed",
        processedBy: ctxUser.id,
        processedAt: /* @__PURE__ */ new Date(),
        currency: processedCurrency,
        transactionReference: input.transactionReference,
        paymentNotes: input.paymentNotes,
        timelineLog
      });
      await createAuditLog({
        userId: ctxUser.id,
        action: "redemption_processed",
        entityType: "redemption_request",
        entityId: input.requestId,
        details: JSON.stringify({
          transactionReference: input.transactionReference,
          paymentCurrency: processedCurrency
        })
      });
      await createNotification({
        userId: request.userId,
        title: "Redemption processed",
        message: `Your redemption request for ${formatMoney2(request.amount, processedCurrency)} has been processed. Reference: ${input.transactionReference}`,
        type: "success",
        actionUrl: "/my-account"
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
          redemptionId: request._id?.toString()
        });
      } catch (error) {
        console.warn("[Email] Failed to send redemption processed email:", error?.message || error);
      }
      res.json({ success: true });
    })
  );
  router.get(
    "/audit",
    asyncHandler(async (req, res) => {
      requireRole(req, ["admin", "hod"], "HOD access required");
      const input = parseInput(
        z.object({
          userId: z.string().optional(),
          action: z.string().optional(),
          entityType: z.string().optional(),
          limit: z.coerce.number().default(100)
        }),
        req.query
      );
      res.json(await getAuditLogs(input));
    })
  );
  router.post(
    "/access/grant",
    asyncHandler(async (req, res) => {
      const ctxUser = requireRole(req, ["admin", "hod"], "HOD access required");
      const input = parseInput(
        z.object({
          userId: z.string(),
          feature: z.string(),
          reason: z.string(),
          expiresAt: z.coerce.date().optional()
        }),
        req.body
      );
      await grantAccess({
        ...input,
        grantedBy: ctxUser.id
      });
      await createAuditLog({
        userId: ctxUser.id,
        action: "access_granted",
        entityType: "access_control",
        details: JSON.stringify(input)
      });
      res.json({ success: true });
    })
  );
  router.post(
    "/access/revoke",
    asyncHandler(async (req, res) => {
      const ctxUser = requireRole(req, ["admin", "hod"], "HOD access required");
      const input = parseInput(z.object({ accessId: z.string() }), req.body);
      const access = await getAllAccessGrants();
      const targetAccess = access.find((a) => a._id?.toString() === input.accessId);
      if (targetAccess) {
        await revokeAccess(targetAccess.userId, targetAccess.feature);
      }
      await createAuditLog({
        userId: ctxUser.id,
        action: "access_revoked",
        entityType: "access_control",
        entityId: input.accessId
      });
      res.json({ success: true });
    })
  );
  router.get(
    "/access",
    asyncHandler(async (req, res) => {
      requireRole(req, ["admin", "hod"], "HOD access required");
      res.json(await getAllAccessGrants());
    })
  );
  router.get(
    "/access/my",
    asyncHandler(async (req, res) => {
      const ctxUser = requireAuth(req);
      res.json(await getActiveAccessGrants(ctxUser.id));
    })
  );
  router.get(
    "/notifications",
    asyncHandler(async (req, res) => {
      const ctxUser = requireAuth(req);
      const input = parseInput(
        z.object({
          limit: z.coerce.number().min(1).max(200).optional()
        }),
        req.query
      );
      res.json(await getNotificationsByUserId(ctxUser.id, input.limit || 50));
    })
  );
  router.get(
    "/notifications/unread-count",
    asyncHandler(async (req, res) => {
      const ctxUser = requireAuth(req);
      const count = await getUnreadNotificationCount(ctxUser.id);
      res.json({ count });
    })
  );
  router.post(
    "/notifications/mark-read",
    asyncHandler(async (req, res) => {
      const ctxUser = requireAuth(req);
      const input = parseInput(z.object({ id: z.string() }), req.body);
      await markNotificationRead(input.id, ctxUser.id);
      res.json({ success: true });
    })
  );
  router.post(
    "/notifications/mark-all-read",
    asyncHandler(async (req, res) => {
      const ctxUser = requireAuth(req);
      await markAllNotificationsRead(ctxUser.id);
      res.json({ success: true });
    })
  );
  router.get(
    "/reports/overview",
    asyncHandler(async (req, res) => {
      const ctxUser = requireRole(req, ["admin", "hod"], "HOD access required");
      const input = parseInput(
        z.object({
          months: z.coerce.number().min(3).max(12).optional()
        }),
        req.query
      );
      const monthsBack = input.months ?? 6;
      const scopedEmployees = ctxUser.role === "admin" ? (await getAllUsers()).filter(
        (user) => user.role === "employee" && user.isEmployee !== false
      ) : (await getUsersByHod(ctxUser.id)).filter(
        (user) => user.role === "employee" && user.isEmployee !== false
      );
      const scopedEmployeeIds = scopedEmployees.map((user) => user._id.toString());
      const [creditRequests, walletTransactions, redemptions] = await Promise.all([
        ctxUser.role === "admin" ? getAllCreditRequests() : getCreditRequestsByUserIds(scopedEmployeeIds),
        ctxUser.role === "admin" ? getAllWalletTransactions() : getWalletTransactionsByUserIds(scopedEmployeeIds),
        ctxUser.role === "admin" ? getAllRedemptionRequests() : getRedemptionRequestsByUserIds(scopedEmployeeIds)
      ]);
      const scopedEmployeeIdSet = new Set(scopedEmployeeIds);
      const scopedCreditRequests = ctxUser.role === "admin" ? creditRequests : creditRequests.filter(
        (request) => scopedEmployeeIdSet.has(request.userId?.toString?.() || request.userId)
      );
      const userCurrencyMap = new Map(
        scopedEmployees.map((user) => [user._id.toString(), getUserCurrency(user)])
      );
      const monthLabels = [];
      const now = /* @__PURE__ */ new Date();
      for (let i = monthsBack - 1; i >= 0; i -= 1) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthLabels.push({
          key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
          label: date.toLocaleString("default", { month: "short", year: "numeric" })
        });
      }
      const buildMonthlySeries = (items, valueSelector, currencySelector) => {
        const totals = new Map(
          monthLabels.map((label) => [label.key, { USD: 0, INR: 0, total: 0 }])
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
          ...totals.get(label.key) || { USD: 0, INR: 0, total: 0 }
        }));
      };
      const sumByCurrency = (items, amountSelector, currencySelector) => items.reduce(
        (acc, item) => {
          const amount = Number(amountSelector(item) || 0);
          const currency = normalizeCurrency(currencySelector(item));
          acc[currency] = (acc[currency] || 0) + amount;
          return acc;
        },
        { USD: 0, INR: 0 }
      );
      const creditsByMonth = buildMonthlySeries(
        walletTransactions.filter((t) => t.type === "credit"),
        (item) => item.amount,
        (item) => item.currency || userCurrencyMap.get(item.userId)
      );
      const redemptionsByMonth = buildMonthlySeries(
        walletTransactions.filter((t) => t.type === "debit"),
        (item) => item.amount,
        (item) => item.currency || userCurrencyMap.get(item.userId)
      );
      const policyCounts = scopedCreditRequests.filter((request) => request.type === "policy" && request.policyId).reduce((acc, request) => {
        acc[request.policyId] = (acc[request.policyId] || 0) + 1;
        return acc;
      }, {});
      const policyIds = Object.keys(policyCounts);
      const policies = policyIds.length > 0 ? await getPoliciesByIds(policyIds) : [];
      const policyMap = new Map(policies.map((policy) => [policy._id.toString(), policy.name]));
      const topPolicies = policyIds.map((policyId) => ({
        policyId,
        name: policyMap.get(policyId) || "Unknown Policy",
        requests: policyCounts[policyId]
      })).sort((a, b) => b.requests - a.requests).slice(0, 5);
      const employeeTypeCounts = scopedEmployees.reduce((acc, user) => {
        const type = user.employeeType || "unknown";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
      const totalCreditsByCurrency = sumByCurrency(
        walletTransactions.filter((t) => t.type === "credit"),
        (item) => item.amount,
        (item) => item.currency || userCurrencyMap.get(item.userId)
      );
      const totalRedemptionsByCurrency = sumByCurrency(
        walletTransactions.filter((t) => t.type === "debit"),
        (item) => item.amount,
        (item) => item.currency || userCurrencyMap.get(item.userId)
      );
      const totalCredits = Object.values(totalCreditsByCurrency).reduce((sum, value) => sum + value, 0);
      const totalRedemptions = Object.values(totalRedemptionsByCurrency).reduce(
        (sum, value) => sum + value,
        0
      );
      res.json({
        totals: {
          totalCredits,
          totalCreditsByCurrency,
          totalRedemptions,
          totalRedemptionsByCurrency,
          pendingApprovals: scopedCreditRequests.filter((r) => r.status === "pending_approval").length,
          pendingSignatures: scopedCreditRequests.filter((r) => r.status === "pending_signature").length,
          pendingRedemptions: redemptions.filter((r) => r.status === "pending").length
        },
        creditsByMonth,
        redemptionsByMonth,
        topPolicies,
        employeeTypes: Object.entries(employeeTypeCounts).map(([type, count]) => ({ type, count }))
      });
    })
  );
  router.get(
    "/dashboard/stats",
    asyncHandler(async (req, res) => {
      const ctxUser = requireAuth(req);
      const role = ctxUser.role;
      try {
        if (role === "admin") {
          const allUsers = await Promise.race([
            getAllUsers(),
            new Promise(
              (_, reject) => setTimeout(() => reject(new Error("getAllUsers timeout")), 5e3)
            )
          ]);
          const allRequests = await Promise.race([
            getCreditRequestsByStatus("pending_approval"),
            new Promise(
              (_, reject) => setTimeout(() => reject(new Error("getCreditRequestsByStatus timeout")), 5e3)
            )
          ]);
          const allRedemptions = await Promise.race([
            getRedemptionRequestsByStatus("pending"),
            new Promise(
              (_, reject) => setTimeout(() => reject(new Error("getRedemptionRequestsByStatus timeout")), 5e3)
            )
          ]);
          res.json({
            totalUsers: allUsers.length,
            totalHods: allUsers.filter((u) => u.role === "hod").length,
            pendingApprovals: allRequests.length,
            pendingRedemptions: allRedemptions.length
          });
          return;
        }
        if (role === "hod") {
          const myTeam = await getUsersByHod(ctxUser.id);
          const myPolicies2 = await getPoliciesByCreator(ctxUser.id);
          const pendingApprovals = await getCreditRequestsByHod(ctxUser.id);
          res.json({
            teamSize: myTeam.length,
            activePolicies: myPolicies2.filter((p) => p.status === "active").length,
            pendingApprovals: pendingApprovals.filter((r) => r.status === "pending_approval").length
          });
          return;
        }
        if (role === "account") {
          const allRedemptions = await getAllRedemptionRequests();
          res.json({
            pendingRedemptions: allRedemptions.filter((r) => r.status === "pending").length,
            processingToday: allRedemptions.filter((r) => r.status === "processing").length,
            completedThisMonth: allRedemptions.filter((r) => r.status === "completed").length
          });
          return;
        }
        const wallet = await getWalletByUserId(ctxUser.id.toString());
        const myRequests = await getCreditRequestsByUserId(ctxUser.id.toString());
        const myPolicies = await getEmployeePolicyAssignmentsByUserId(ctxUser.id.toString());
        const summary = await getWalletSummary(ctxUser.id.toString());
        const userCurrency = normalizeCurrency(wallet?.currency, getUserCurrency(ctxUser));
        res.json({
          walletBalance: wallet?.balance || 0,
          currency: userCurrency,
          pendingReviews: myRequests.filter(
            (r) => r.status === "pending_signature" || r.status === "pending_employee_approval"
          ).length,
          activePolicies: myPolicies.length,
          thisMonthEarnings: summary.earned
        });
      } catch (error) {
        console.error("[Dashboard] Error fetching stats:", error);
        res.json({
          totalUsers: 0,
          totalHods: 0,
          pendingApprovals: 0,
          pendingRedemptions: 0
        });
      }
    })
  );
  router.get(
    "/search/global",
    asyncHandler(async (req, res) => {
      const ctxUser = requireAuth(req);
      const input = parseInput(
        z.object({
          q: z.string().trim().min(2, "Enter at least 2 characters"),
          limit: z.coerce.number().min(1).max(12).optional()
        }),
        req.query
      );
      const limit = input.limit ?? 6;
      const query = input.q.trim();
      const dedupeById = (items) => {
        const seen = /* @__PURE__ */ new Set();
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
          searchUsers(query, { limit }),
          searchPolicies(query, { limit }),
          searchCreditRequests(query, { limit: limit * 2 })
        ]);
      } else if (ctxUser.role === "hod") {
        [users, policies, requests] = await Promise.all([
          searchUsers(query, { limit, hodId: ctxUser.id }),
          searchPolicies(query, { limit }),
          searchCreditRequests(query, { limit: limit * 2, hodId: ctxUser.id })
        ]);
      } else if (ctxUser.role === "employee") {
        const [myRequests, initiatedRequests, policyLinks] = await Promise.all([
          searchCreditRequests(query, { limit: limit * 2, userIds: [ctxUser.id] }),
          searchCreditRequests(query, { limit: limit * 2, initiatorId: ctxUser.id }),
          getEmployeePolicyAssignmentsByUserId(ctxUser.id)
        ]);
        users = await searchUsers(query, { limit, userIds: [ctxUser.id] });
        const policyIds = Array.from(
          new Set((policyLinks || []).map((assignment) => assignment.policyId).filter(Boolean))
        );
        if (policyIds.length > 0) {
          const assignedPolicies = await getPoliciesByIds(policyIds);
          const q = query.toLowerCase();
          policies = assignedPolicies.filter((policy) => {
            const hay = `${policy.name || ""} ${policy.description || ""} ${policy.status || ""}`.toLowerCase();
            return hay.includes(q);
          }).slice(0, limit);
        }
        requests = dedupeById([...myRequests || [], ...initiatedRequests || []]).slice(0, limit * 2);
      } else {
        users = await searchUsers(query, { limit, userIds: [ctxUser.id] });
        policies = await searchPolicies(query, { limit, statuses: ["active"] });
        requests = await searchCreditRequests(query, { limit: limit * 2, statuses: ["approved"] });
      }
      const hydratedRequests = await hydrateCreditRequests(requests);
      const requestSummaries = hydratedRequests.slice(0, limit * 2).map((request) => ({
        id: request._id?.toString(),
        label: request.type === "policy" ? request.policy?.name || "Policy request" : "Freelancer request",
        subtitle: `${request.user?.name || "Unknown user"} \u2022 ${request.status}`,
        amount: request.amount,
        currency: request.currency,
        status: request.status,
        type: request.type,
        route: request.status === "pending_approval" || request.status === "pending_employee_approval" ? "/approvals" : "/transactions"
      }));
      const userSummaries = users.slice(0, limit).map((user) => ({
        id: user._id?.toString(),
        label: user.name || user.email,
        subtitle: `${user.email} \u2022 ${user.role}`,
        role: user.role,
        route: user._id?.toString() === ctxUser.id ? "/profile" : "/user-management"
      }));
      const policySummaries = policies.slice(0, limit).map((policy) => ({
        id: policy._id?.toString(),
        label: policy.name,
        subtitle: policy.status || "draft",
        status: policy.status,
        route: "/policies"
      }));
      res.json({
        query,
        users: userSummaries,
        policies: policySummaries,
        requests: requestSummaries,
        counts: {
          users: userSummaries.length,
          policies: policySummaries.length,
          requests: requestSummaries.length
        }
      });
    })
  );
  router.post(
    "/ghl/document-webhook",
    asyncHandler(async (req, res) => {
      const input = parseInput(
        z.object({
          email: z.string().email().optional(),
          contact: z.object({ email: z.string().email() }).optional(),
          contactEmail: z.string().email().optional(),
          status: z.string().optional()
        }),
        req.body
      );
      const email = (input.email || input.contact?.email || input.contactEmail || "").trim().toLowerCase();
      if (!email) {
        throw BadRequestError("Email missing in webhook payload");
      }
      console.log(`[GHL Webhook] Document completed for: ${email}`);
      const user = await getUserByEmail(email);
      if (!user) {
        console.error(`[GHL Webhook] User not found: ${email}`);
        throw NotFoundError("User not found");
      }
      const requests = await getCreditRequestsByUserId(user._id.toString());
      const pendingRequest = requests.find((r) => r.status === "pending_signature");
      if (!pendingRequest) {
        console.error(`[GHL Webhook] No pending request found for: ${email}`);
        res.json({ ok: true, message: "No pending request found" });
        return;
      }
      await updateCreditRequest(pendingRequest._id.toString(), {
        status: "pending_approval",
        userSignedAt: /* @__PURE__ */ new Date()
      });
      console.log(`[GHL Webhook] Updated request ${pendingRequest._id} to pending_approval`);
      res.json({ ok: true, message: "Status updated successfully" });
    })
  );
  return router;
}

// _core/vite.js
import express2 from "express";
import fs3 from "fs";
import { nanoid } from "nanoid";
import path4 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
async function setupVite(app, server) {
  const { createServer: createViteServer } = await import("vite");
  const __dirname2 = path4.dirname(fileURLToPath2(import.meta.url));
  const cacheBase = process.env.LOCALAPPDATA || process.env.TEMP;
  const cacheDir = cacheBase ? path4.resolve(cacheBase, "freelance-management-vite-cache-backend") : path4.resolve(__dirname2, "../..", "frontend", "vite-cache-backend");
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    configFile: path4.resolve(__dirname2, "../..", "frontend", "vite.config.js"),
    cacheDir,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path4.resolve(__dirname2, "../..", "frontend", "index.html");
      let template = await fs3.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(`src="/src/main.jsx"`, `src="/src/main.jsx?v=${nanoid()}"`);
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const __dirname2 = path4.dirname(fileURLToPath2(import.meta.url));
  const distPath = path4.resolve(__dirname2, "../..", "frontend", "dist");
  if (!fs3.existsSync(distPath)) {
    console.error(`Could not find the build directory: ${distPath}, make sure to build the frontend first`);
  }
  app.use(express2.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path4.resolve(distPath, "index.html"));
  });
}

// _core/index.js
async function startServer() {
  await connectDB();
  const dbSchemaState = await ensureDbSchemaVersion(DB_SCHEMA_VERSION);
  if (dbSchemaState.skipped) {
    logger.warn(
      `[Sync] API ${API_SYNC_VERSION}: DB schema check skipped (no active DB connection). Required schema=${DB_SCHEMA_VERSION}`
    );
  } else {
    logger.info(
      `[Sync] API ${API_SYNC_VERSION}: DB schema ${dbSchemaState.currentVersion}/${dbSchemaState.requiredVersion} (compatible=${dbSchemaState.compatible})`
    );
  }
  const app = express3();
  const server = createServer(app);
  const rawOrigins = (process.env.CORS_ORIGINS || "").split(",").map((origin) => origin.trim()).filter(Boolean);
  const allowedOrigins = rawOrigins.map((origin) => origin.replace(/\/+$/, ""));
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      const normalizedOrigin = origin.replace(/\/+$/, "");
      if (allowedOrigins.length === 0 || allowedOrigins.includes(normalizedOrigin)) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Vary", "Origin");
      }
    }
    res.header("Access-Control-Allow-Credentials", "true");
    res.header(
      "Access-Control-Allow-Headers",
      req.headers["access-control-request-headers"] || "Content-Type, Authorization"
    );
    res.header(
      "Access-Control-Allow-Methods",
      req.headers["access-control-request-method"] || "GET,POST,PATCH,DELETE,OPTIONS"
    );
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });
  app.use("/uploads", express3.static(path5.resolve(process.cwd(), "uploads")));
  app.use(express3.json({ limit: "50mb" }));
  app.use(express3.urlencoded({ limit: "50mb", extended: true }));
  app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    const { method, originalUrl } = req;
    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      logger.info(`[HTTP] ${method} ${originalUrl} ${res.statusCode} ${durationMs.toFixed(1)} ms`);
    });
    next();
  });
  app.use("/api", createRestRouter());
  const frontendUrl = process.env.FRONTEND_URL?.trim();
  const backendUrl = process.env.BACKEND_URL?.trim();
  const hasExternalFrontend = Boolean(frontendUrl) && frontendUrl !== (backendUrl || "");
  const shouldUseViteMiddleware = process.env.NODE_ENV === "development" && process.env.DISABLE_BACKEND_VITE !== "true" && !hasExternalFrontend;
  if (shouldUseViteMiddleware) {
    try {
      await setupVite(app, server);
    } catch (error) {
      logger.warn("[Vite] Failed to start Vite middleware. Skipping.", error?.message || error);
    }
  } else if (process.env.NODE_ENV !== "development" && !hasExternalFrontend) {
    serveStatic(app);
  } else {
    logger.info("[Vite] Backend Vite middleware disabled. Using external frontend dev server.");
  }
  app.use((error, req, res, next) => {
    if (error?.statusCode) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }
    if (error?.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ message: "File is too large." });
      return;
    }
    if (error?.code === "LIMIT_UNEXPECTED_FILE") {
      res.status(400).json({ message: "Too many files uploaded." });
      return;
    }
    logger.error("[API] Unexpected error:", error);
    res.status(500).json({ message: "Internal server error" });
  });
  const port = Number.parseInt(process.env.PORT || "3001", 10);
  server.listen(port, () => {
    logger.info(`[Server] Listening on port ${port}`);
  });
  server.on("error", (error) => {
    if (error?.code === "EADDRINUSE") {
      logger.error(`[Server] Port ${port} is already in use. Stop the other process or change PORT in backend/.env.`);
      process.exit(1);
    }
    logger.error("[Server] Failed to start:", error);
    process.exit(1);
  });
}
startServer().catch((error) => {
  logger.error("[Server] Startup failed:", error);
  process.exit(1);
});
