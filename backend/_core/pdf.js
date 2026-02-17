import PDFDocument from "pdfkit";
import { formatCurrencyAmount, normalizeCurrency } from "../shared/currency.js";

export async function buildTimelinePdf({
    title,
    employee,
    amount,
    currency,
    timelineLog,
    creditTransactionId,
    redemptionId,
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
