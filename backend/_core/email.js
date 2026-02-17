import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import { getGridFSFileBuffer } from "./files.js";
import { formatCurrencyAmount, normalizeCurrency } from "../shared/currency.js";

const BRAND_NAME = "Policy Management System";

const ALERT_STYLES = {
    info: { bg: "#eff6ff", border: "#2563eb", text: "#1d4ed8" },
    success: { bg: "#ecfdf3", border: "#16a34a", text: "#15803d" },
    warning: { bg: "#fff7ed", border: "#f97316", text: "#c2410c" },
    danger: { bg: "#fff1f2", border: "#e11d48", text: "#be123c" },
};

const getSmtpConfig = () => {
    const secureValue = (process.env.SMTP_SECURE || "").toString().toLowerCase();
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER || "";
    const fromName = process.env.SMTP_FROM_NAME || "";
    const from = fromName && fromEmail ? `${fromName} <${fromEmail}>` : fromEmail;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
    const secure = secureValue
        ? secureValue === "true"
        : port === 465;
    return {
        host: process.env.SMTP_HOST || "",
        port,
        secure,
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
        from,
    };
};

const getTransport = () => {
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
                pass: config.pass,
            },
        }),
        from: config.from,
    };
};

const resolveAttachmentPath = (filename) =>
    path.resolve(process.cwd(), "uploads", "credit-requests", filename);
const formatMoney = (amount, currency) => formatCurrencyAmount(amount, normalizeCurrency(currency));
const getFrontendBaseUrl = () => {
    const frontendUrl = (process.env.FRONTEND_URL || "").trim();
    if (!frontendUrl) {
        return "";
    }
    return frontendUrl.replace(/\/+$/, "");
};

const escapeHtml = (value) =>
    `${value ?? ""}`
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

const multilineToHtml = (value) => escapeHtml(value).replace(/\r?\n/g, "<br/>");

const formatDateTime = (value) => {
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
        timeZoneName: "short",
    });
};

const toSafeUrl = (value) => {
    if (!value) {
        return "";
    }
    try {
        const url = new URL(value);
        if (url.protocol === "http:" || url.protocol === "https:") {
            return url.toString();
        }
        return "";
    }
    catch {
        return "";
    }
};

const valueOrDash = (value) => {
    if (value === undefined || value === null || value === "") {
        return "-";
    }
    return `${value}`;
};

const renderNotificationEmail = ({
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
    footerNote,
}) => {
    const tone = ALERT_STYLES[alertTone] || ALERT_STYLES.info;
    const safeActionUrl = toSafeUrl(actionUrl);
    const normalizedDetails = (details || []).filter((entry) => entry?.label && entry?.value !== undefined && entry?.value !== null && entry?.value !== "");
    const detailRows = normalizedDetails
        .map((entry) => `
            <tr>
                <td style="padding:11px 0;border-bottom:1px solid #e5eaf3;width:38%;font-size:14px;color:#475569;font-weight:600;vertical-align:top;">${escapeHtml(entry.label)}</td>
                <td style="padding:11px 0;border-bottom:1px solid #e5eaf3;font-size:14px;color:#0f172a;vertical-align:top;">${multilineToHtml(entry.value)}</td>
            </tr>
        `)
        .join("");

    const normalizedMessageBody = (Array.isArray(messageBody) ? messageBody : [messageBody]).filter(Boolean);
    const messageHtml = normalizedMessageBody
        .map((line) => `<p style="margin:0 0 10px 0;font-size:16px;line-height:1.6;color:#1f2937;">${multilineToHtml(line)}</p>`)
        .join("");

    const normalizedActionBody = (Array.isArray(actionBody) ? actionBody : [actionBody]).filter(Boolean);
    const actionHtml = normalizedActionBody
        .map((line) => `<p style="margin:0 0 10px 0;font-size:16px;line-height:1.6;color:#1f2937;">${multilineToHtml(line)}</p>`)
        .join("");

    const normalizedLinks = (links || [])
        .map((entry) => ({
            label: valueOrDash(entry?.label),
            url: toSafeUrl(entry?.url),
        }))
        .filter((entry) => entry.url);
    const linksHtml = normalizedLinks
        .map((entry) => `
            <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#334155;">
                <span style="font-weight:600;color:#0f172a;">${escapeHtml(entry.label)}:</span>
                <a href="${escapeHtml(entry.url)}" target="_blank" rel="noopener noreferrer" style="color:#1d4ed8;text-decoration:underline;">${escapeHtml(entry.url)}</a>
            </p>
        `)
        .join("");

    const normalizedListItems = (Array.isArray(listItems) ? listItems : [listItems]).filter(Boolean);
    const listHtml = normalizedListItems.length > 0
        ? `
            <div style="margin:22px 0 0;border:1px solid #dbe3f0;border-radius:10px;background:#f8fafc;padding:16px 18px;">
                <h3 style="margin:0 0 10px;font-size:18px;line-height:1.3;color:#0f172a;">${escapeHtml(listTitle || "Additional Details")}</h3>
                <ul style="margin:0;padding:0 0 0 18px;color:#1f2937;">
                    ${normalizedListItems
            .map((line) => `<li style="margin:0 0 8px;font-size:14px;line-height:1.6;">${multilineToHtml(line)}</li>`)
            .join("")}
                </ul>
            </div>
        `
        : "";

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

                            ${alertMessage
            ? `
                                <div style="margin:0 0 20px;padding:14px 14px;border-left:4px solid ${tone.border};background:${tone.bg};border-radius:8px;">
                                    <p style="margin:0;font-size:15px;line-height:1.6;color:#1f2937;">
                                        <span style="font-weight:700;color:${tone.text};">${escapeHtml(alertTitle)}:</span>
                                        ${multilineToHtml(alertMessage)}
                                    </p>
                                </div>
                            `
            : ""}

                            ${detailRows
            ? `
                                <div style="margin:0 0 20px;border:1px solid #dbe3f0;border-radius:10px;background:#f8fafc;padding:16px 18px;">
                                    <h3 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#0f172a;">${escapeHtml(detailTitle)}</h3>
                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                                        ${detailRows}
                                    </table>
                                </div>
                            `
            : ""}

                            ${messageHtml
            ? `
                                <h3 style="margin:0 0 8px;font-size:28px;line-height:1.3;color:#0f172a;">${escapeHtml(messageTitle)}</h3>
                                ${messageHtml}
                            `
            : ""}

                            ${actionHtml || safeActionUrl
            ? `
                                <h3 style="margin:10px 0 8px;font-size:28px;line-height:1.3;color:#0f172a;">${escapeHtml(actionTitle)}</h3>
                                ${actionHtml}
                                ${safeActionUrl && actionLabel
                ? `
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:12px 0 4px;">
                                            <tr>
                                                <td style="border-radius:10px;background:#2551d8;">
                                                    <a href="${escapeHtml(safeActionUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 18px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(actionLabel)}</a>
                                                </td>
                                            </tr>
                                        </table>
                                    `
                : ""}
                            `
            : ""}

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

export async function sendHodFreelancerRequestEmail({
    to,
    hodName,
    employee,
    initiator,
    amount,
    currency,
    details,
    attachments,
    requestType,
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
    const when = formatDateTime(new Date());
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
            { label: "When", value: when },
        ],
        messageTitle: "Message",
        messageBody: [
            details
                ? `Submission note: ${details}`
                : `${scenarioLabel} request is ready for your review and decision.`,
        ],
        actionTitle: "Action Required",
        actionBody: [
            approvalsUrl
                ? `Please review this ${scenarioLabel.toLowerCase()} request and approve or reject it from the approvals panel.`
                : `Please review this ${scenarioLabel.toLowerCase()} request from the approvals panel.`,
        ],
        actionLabel: approvalsUrl ? "Review Request" : "",
        actionUrl: approvalsUrl,
        links: [
            { label: "Notifications page", url: notificationsUrl },
            { label: "Direct login link", url: loginUrl },
            { label: "Open app", url: frontendBase },
        ],
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
        approvalsUrl
            ? `Review the request: ${approvalsUrl}`
            : "Please review the request in the approvals panel.",
        notificationsUrl ? `Notifications page: ${notificationsUrl}` : "",
        loginUrl ? `Direct login link: ${loginUrl}` : "",
        frontendBase ? `Open app: ${frontendBase}` : "",
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
                        contentType: attachment.mimeType,
                    });
                }
                continue;
            }
            catch (error) {
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
            contentType: attachment.mimeType,
        });
    }

    await transporter.sendMail({
        from,
        to,
        subject,
        text: textLines.join("\n"),
        html,
        attachments: attachmentPayload,
    });
    return { success: true };
}

export async function sendInitiatorFreelancerRejectionEmail({
    to,
    initiatorName,
    employee,
    hod,
    amount,
    currency,
    reason,
    rejectedBy,
    requestType,
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
    const when = formatDateTime(new Date());
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
            { label: "When", value: when },
        ].filter(Boolean),
        messageTitle: "Message",
        messageBody: [
            reason
                ? `Reason provided: ${reason}`
                : `${scenarioLabel} request was rejected without an additional comment.`,
        ],
        actionTitle: "Action Required",
        actionBody: [
            `Please review the rejection details and submit a revised ${scenarioLabel.toLowerCase()} request if needed.`,
        ],
        actionLabel: notificationsUrl ? "Open Notifications" : "",
        actionUrl: notificationsUrl,
        links: [
            { label: "Notifications page", url: notificationsUrl },
            { label: "Direct login link", url: loginUrl },
            { label: "Open app", url: frontendBase },
        ],
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
        frontendBase ? `Open app: ${frontendBase}` : "",
    ].filter(Boolean);
    await transporter.sendMail({
        from,
        to,
        subject,
        text: textLines.join("\n"),
        html,
    });
    return { success: true };
}

export async function sendRedemptionRequestEmail({
    to,
    accountName,
    employee,
    amount,
    currency,
    balanceBefore,
    balanceAfter,
    redemptionId,
    timelineLog,
    pdfAttachment,
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
    const formattedBalanceBefore = balanceBefore !== undefined ? formatMoney(balanceBefore, currency) : "";
    const formattedBalanceAfter = balanceAfter !== undefined ? formatMoney(balanceAfter, currency) : "";
    const when = formatDateTime(new Date());
    const logLines = (timelineLog || []).map((entry, index) => {
        const parts = [
            `${index + 1}. ${entry.step || "STEP"}`,
            entry.actorName || entry.actorEmail
                ? `Actor: ${entry.actorName || ""}${entry.actorEmail ? ` (${entry.actorEmail})` : ""}`
                : "",
            entry.role ? `Role: ${entry.role}` : "",
            entry.signatureId ? `Signature: ${entry.signatureId}` : "",
            entry.message ? `Message: ${entry.message}` : "",
            entry.at ? `At: ${formatDateTime(entry.at)}` : "",
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
            { label: "When", value: when },
        ].filter(Boolean),
        messageTitle: "Message",
        messageBody: [
            `A redemption request is pending review and processing for ${employeeName}.`,
        ],
        actionTitle: "Action Required",
        actionBody: [
            "Please validate payout details and process this redemption request.",
        ],
        actionLabel: accountsUrl ? "Open Accounts" : "",
        actionUrl: accountsUrl,
        links: [
            { label: "Notifications page", url: notificationsUrl },
            { label: "Direct login link", url: loginUrl },
            { label: "Open app", url: frontendBase },
        ],
        listTitle: "Timeline Log",
        listItems: logLines,
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
        frontendBase ? `Open app: ${frontendBase}` : "",
    ].filter(Boolean);
    const attachments = [];
    if (pdfAttachment?.content) {
        attachments.push({
            filename: pdfAttachment.filename || "redemption-proof.pdf",
            content: pdfAttachment.content,
            contentType: pdfAttachment.contentType || "application/pdf",
        });
    }
    await transporter.sendMail({
        from,
        to,
        subject,
        text: textLines.join("\n"),
        html,
        attachments,
    });
    return { success: true };
}

export async function sendRedemptionProcessedEmail({
    to,
    employeeName,
    amount,
    currency,
    transactionReference,
    processedBy,
    paymentNotes,
    redemptionId,
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
    const when = formatDateTime(new Date());
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
            { label: "When", value: when },
        ].filter(Boolean),
        messageTitle: "Message",
        messageBody: [
            "Your payout has been completed. Please check your transactions for confirmation.",
        ],
        actionTitle: "Action Required",
        actionBody: [
            "Review your transactions and keep this email for future reference.",
        ],
        actionLabel: transactionsUrl ? "View Transactions" : "",
        actionUrl: transactionsUrl,
        links: [
            { label: "Notifications page", url: notificationsUrl },
            { label: "Direct login link", url: loginUrl },
            { label: "Open app", url: frontendBase },
        ],
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
        frontendBase ? `Open app: ${frontendBase}` : "",
    ].filter(Boolean);
    await transporter.sendMail({
        from,
        to,
        subject,
        text: textLines.join("\n"),
        html,
    });
    return { success: true };
}
