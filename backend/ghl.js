/**
 * GoHighLevel API Integration
 * Handles document creation and contact management
 */
import { formatCurrencyAmount, normalizeCurrency } from "./shared/currency.js";

const GHL_API_KEY = "pit-6e8fd509-31e7-44fd-8182-bf77af82250a";
const GHL_LOCATION_ID = "2xEjfVQAkuHg30MBhtW1";
const GHL_API_VERSION = "2021-07-28";
const GHL_TEMPLATE_ID = "694130d3c3d159014b821858"; // Offer Letter- Shaurya
const API_BASE = "https://services.leadconnectorhq.com";
function ghlHeaders() {
    return {
        Authorization: `Bearer ${GHL_API_KEY}`,
        Version: GHL_API_VERSION,
        "Content-Type": "application/json",
        Accept: "application/json",
        LocationId: GHL_LOCATION_ID,
    };
}
async function ghlJson(path, { method = "GET", body } = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: ghlHeaders(),
        body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data;
    try {
        data = text ? JSON.parse(text) : null;
    }
    catch {
        data = { raw: text };
    }
    if (!res.ok) {
        const msg = data?.message || data?.error || JSON.stringify(data);
        throw new Error(`GHL ${res.status} ${res.statusText}: ${msg}`);
    }
    return data;
}
/**
 * Upsert contact by email and return contact ID
 */
async function upsertContactByEmail(email) {
    const data = await ghlJson("/contacts/upsert", {
        method: "POST",
        body: {
            email,
            locationId: GHL_LOCATION_ID,
        },
    });
    const contactId = data?.contact?.id || data?.contact?._id || data?.id || data?._id;
    if (!contactId) {
        throw new Error(`Upsert succeeded but contactId not found in response: ${JSON.stringify(data)}`);
    }
    return contactId;
}
/**
 * Add tag to contact
 */
async function addTag(contactId, tag) {
    await ghlJson(`/contacts/${contactId}/tags`, {
        method: "POST",
        body: { tags: [tag] },
    });
}
/**
 * Update contact custom fields
 */
async function updateContactCustomFields(contactId, customFields) {
    await ghlJson(`/contacts/${contactId}`, {
        method: "PUT",
        body: {
            customFields,
        },
    });
}
/**
 * Create GHL document for credit request signature
 *
 * @param email - Freelancer email
 * @param name - Freelancer name
 * @param amount - Credit amount
 * @param projectDetails - Project details and notes
 * @returns Contact ID
 */
export async function createFreelancerDocument(email, name, amount, projectDetails, currency) {
    try {
        console.log(`[GHL] Creating document for ${email}`);
        // 1. Upsert contact
        const contactId = await upsertContactByEmail(email);
        console.log(`[GHL] Contact ID: ${contactId}`);
        // 2. Update custom fields
        await updateContactCustomFields(contactId, {
            name: name,
            submit_feedback: `Amount: ${formatCurrencyAmount(amount, normalizeCurrency(currency))} | ${projectDetails}`,
        });
        console.log(`[GHL] Updated custom fields`);
        // 3. Add tag to trigger workflow
        await addTag(contactId, "+offer-letter");
        console.log(`[GHL] Added +offer-letter tag - workflow triggered`);
        return contactId;
    }
    catch (error) {
        console.error(`[GHL] Error creating document:`, error);
        throw error;
    }
}
export async function createSignatureDocument(email, name, amount, currency, projectDetails) {
    return createFreelancerDocument(email, name, amount, projectDetails, currency);
}
/**
 * Get document status (if needed)
 */
export async function getDocumentStatus(contactId) {
    try {
        const data = await ghlJson(`/contacts/${contactId}`);
        return data;
    }
    catch (error) {
        console.error(`[GHL] Error getting document status:`, error);
        throw error;
    }
}
