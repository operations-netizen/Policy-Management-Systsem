import mongoose, { Schema } from 'mongoose';
import { CURRENCY_VALUES, DEFAULT_CURRENCY } from "./shared/currency.js";
const shouldSyncCollections = () => {
    if (process.env.SYNC_DB_ON_START === 'true') {
        return true;
    }
    if (process.env.SYNC_DB_ON_START === 'false') {
        return false;
    }
    return process.env.NODE_ENV === 'development';
};
const ROLE_VALUES = [
    'admin',
    'hod',
    'employee',
    'account',
    // legacy values kept for backward compatibility
    'user',
    'accounts_manager',
    'initiator',
]; 
const EMPLOYEE_TYPE_VALUES = [
    'permanent_india',
    'permanent_usa',
    'freelancer_india',
    'freelancer_usa',
    // legacy value kept for backward compatibility
    'permanent',
];
const UserSchema = new Schema({
    openId: { type: String, required: true, unique: true },
    name: String,
    email: { type: String, required: true, unique: true },
    loginMethod: String,
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ROLE_VALUES,
        default: 'employee',
        required: true
    },
    isEmployee: {
        type: Boolean,
        default: false,
    },
    employeeType: {
        type: String,
        enum: EMPLOYEE_TYPE_VALUES,
        default: 'permanent_india',
    },
    hodId: String,
    lastSignedIn: { type: Date, default: Date.now },
}, { timestamps: true });
export const User = mongoose.models.User || mongoose.model('User', UserSchema);
const AttachmentSchema = new Schema(
    {
        originalName: String,
        filename: String,
        fileId: String,
        mimeType: String,
        size: Number,
        url: String,
        uploadedAt: { type: Date, default: Date.now },
    },
    { _id: true },
);

const TimelineEntrySchema = new Schema(
    {
        step: { type: String, required: true },
        role: { type: String, required: true },
        actorId: String,
        actorName: String,
        actorEmail: String,
        signatureId: String,
        message: String,
        metadata: Schema.Types.Mixed,
        at: { type: Date, default: Date.now },
    },
    { _id: true },
);

const PolicySchema = new Schema({
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
        enum: ['active', 'draft', 'archived'],
        default: 'draft',
        required: true
    },
    createdBy: { type: String, required: true },
}, { timestamps: true });
export const Policy = mongoose.models.Policy || mongoose.model('Policy', PolicySchema);
const TeamAssignmentSchema = new Schema({
    userId: { type: String, required: true, unique: true },
    hodId: { type: String, required: true },
    freelancerInitiatorId: String,
    assignedBy: { type: String, required: true },
    assignedAt: { type: Date, default: Date.now },
}, { timestamps: true });
export const TeamAssignment = mongoose.models.TeamAssignment || mongoose.model('TeamAssignment', TeamAssignmentSchema);
const EmployeePolicySchema = new Schema({
    userId: { type: String, required: true, index: true },
    policyId: { type: String, required: true, index: true },
    effectiveDate: { type: Date, required: true },
    assignedBy: { type: String, required: true },
}, { timestamps: true });
EmployeePolicySchema.index({ userId: 1, policyId: 1 }, { unique: true });
export const EmployeePolicy = mongoose.models.EmployeePolicy || mongoose.model('EmployeePolicy', EmployeePolicySchema);
const PolicyInitiatorSchema = new Schema({
    assignmentId: { type: String, required: true, index: true },
    initiatorId: { type: String, required: true, index: true },
    assignedBy: { type: String, required: true },
    assignedAt: { type: Date, default: Date.now },
}, { timestamps: true });
PolicyInitiatorSchema.index({ assignmentId: 1, initiatorId: 1 }, { unique: true });
export const PolicyInitiator = mongoose.models.PolicyInitiator || mongoose.model('PolicyInitiator', PolicyInitiatorSchema);
const EmployeeInitiatorSchema = new Schema({
    employeeId: { type: String, required: true, index: true },
    initiatorId: { type: String, required: true, index: true },
    assignedBy: { type: String, required: true },
    assignedAt: { type: Date, default: Date.now },
}, { timestamps: true });
EmployeeInitiatorSchema.index({ employeeId: 1, initiatorId: 1 }, { unique: true });
export const EmployeeInitiator = mongoose.models.EmployeeInitiator || mongoose.model('EmployeeInitiator', EmployeeInitiatorSchema);
const CreditRequestSchema = new Schema({
    userId: { type: String, required: true },
    initiatorId: { type: String, required: true },
    hodId: { type: String, required: true },
    type: {
        type: String,
        enum: ['freelancer', 'policy'],
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
        required: true,
    },
    amountItems: [
        {
            amount: { type: Number, required: true },
            note: String,
            addedBy: String,
            addedAt: { type: Date, default: Date.now },
        },
    ],
    calculationBreakdown: String,
    notes: String,
    documents: String,
    attachments: [AttachmentSchema],
    status: {
        type: String,
        enum: [
            'pending_signature',
            'pending_approval',
            'pending_employee_approval',
            'approved',
            'rejected_by_user',
            'rejected_by_employee',
            'rejected_by_hod',
        ],
        default: 'pending_signature',
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
    timelineLog: [TimelineEntrySchema],
}, { timestamps: true });
export const CreditRequest = mongoose.models.CreditRequest || mongoose.model('CreditRequest', CreditRequestSchema);
const WalletSchema = new Schema({
    userId: { type: String, required: true, unique: true, index: true },
    balance: { type: Number, default: 0 },
    currency: {
        type: String,
        enum: CURRENCY_VALUES,
        default: DEFAULT_CURRENCY,
        required: true,
    },
    updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });
export const Wallet = mongoose.models.Wallet || mongoose.model('Wallet', WalletSchema);
const WalletTransactionSchema = new Schema({
    userId: { type: String, required: true, index: true },
    type: {
        type: String,
        enum: ['credit', 'debit'],
        required: true
    },
    amount: { type: Number, required: true },
    currency: {
        type: String,
        enum: CURRENCY_VALUES,
        default: DEFAULT_CURRENCY,
        required: true,
    },
    balance: { type: Number, required: true },
    creditRequestId: String,
    redemptionRequestId: String,
    linkedCreditTxnId: String,
    redeemed: { type: Boolean, default: false },
    timelineLog: [TimelineEntrySchema],
    description: String,
}, { timestamps: true });
export const WalletTransaction = mongoose.models.WalletTransaction || mongoose.model('WalletTransaction', WalletTransactionSchema);
const NotificationSchema = new Schema({
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: 'info' },
    actionUrl: String,
    readAt: Date,
}, { timestamps: true });
NotificationSchema.index({ userId: 1, createdAt: -1 });
export const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
const RedemptionRequestSchema = new Schema({
    userId: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: {
        type: String,
        enum: CURRENCY_VALUES,
        default: DEFAULT_CURRENCY,
        required: true,
    },
    method: { type: String },
    bankDetails: String,
    notes: String,
    creditTransactionId: String,
    timelineLog: [TimelineEntrySchema],
    proofPdf: {
        filename: String,
        url: String,
        generatedAt: Date,
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'rejected'],
        default: 'pending',
        required: true
    },
    processedBy: String,
    processedAt: Date,
    transactionReference: String,
    paymentNotes: String,
}, { timestamps: true });
export const RedemptionRequest = mongoose.models.RedemptionRequest || mongoose.model('RedemptionRequest', RedemptionRequestSchema);
const AuditLogSchema = new Schema({
    userId: { type: String, required: true, index: true },
    action: { type: String, required: true },
    entityType: String,
    entityId: String,
    beforeValue: String,
    afterValue: String,
    details: String,
    ipAddress: String,
    userAgent: String,
}, { timestamps: { createdAt: true, updatedAt: false } });
export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);

const SystemMetaSchema = new Schema(
    {
        key: { type: String, required: true, unique: true, index: true },
        value: Schema.Types.Mixed,
    },
    { timestamps: true },
);
export const SystemMeta = mongoose.models.SystemMeta || mongoose.model('SystemMeta', SystemMetaSchema);

const AccessControlSchema = new Schema({
    userId: { type: String, required: true },
    feature: { type: String, required: true },
    grantedBy: { type: String, required: true },
    grantedAt: { type: Date, default: Date.now },
    expiresAt: Date,
}, { timestamps: true });
AccessControlSchema.index({ userId: 1, feature: 1 }, { unique: true });
export const AccessControl = mongoose.models.AccessControl || mongoose.model('AccessControl', AccessControlSchema);
// ==================== DATABASE CONNECTION ====================
let isConnected = false;
let collectionsEnsured = false;
const modelsToSync = [
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
    AccessControl,
];
async function ensureCollections() {
    if (collectionsEnsured || !shouldSyncCollections()) {
        return;
    }
    await Promise.all(modelsToSync.map(async (model) => {
        try {
            await model.createCollection();
        }
        catch (error) {
            const code = error?.code;
            const codeName = error?.codeName;
            if (code === 48 || codeName === 'NamespaceExists') {
                return;
            }
            throw error;
        }
    }));
    collectionsEnsured = true;
    console.log('[MongoDB] Collections ensured');
}
export async function connectDB() {
    if (isConnected) {
        return;
    }
    try {
        const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
        if (!mongoUri) {
            console.warn('[MongoDB] No connection string found. Skipping connection.');
            return;
        }
        await mongoose.connect(mongoUri);
        isConnected = true;
        console.log('[MongoDB] Connected successfully');
        await ensureCollections();
    }
    catch (error) {
        console.error('[MongoDB] Connection error:', error);
        throw error;
    }
}
