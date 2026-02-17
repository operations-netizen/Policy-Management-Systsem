export const CURRENCY_VALUES = ["USD", "INR"];
export const DEFAULT_CURRENCY = "INR";

const CURRENCY_TO_LOCALE = {
    USD: "en-US",
    INR: "en-IN",
};
 
const CURRENCY_ALIASES = {
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
    "\u20b9": "INR",
};

const EMPLOYEE_TYPE_TO_CURRENCY = {
    permanent_india: "INR",
    permanent_usa: "USD",
    freelancer_india: "INR",
    freelancer_usa: "USD",
    permanent: "INR",
};

export function normalizeCurrency(value, fallback = DEFAULT_CURRENCY) {
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

export function getCurrencyByEmployeeType(employeeType) {
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

export function getCurrencyLocale(currency) {
    return CURRENCY_TO_LOCALE[normalizeCurrency(currency)] || CURRENCY_TO_LOCALE[DEFAULT_CURRENCY];
}

export function formatCurrencyAmount(amount, currency, options = {}) {
    const safeCurrency = normalizeCurrency(currency);
    const locale = getCurrencyLocale(safeCurrency);
    const value = Number.isFinite(Number(amount)) ? Number(amount) : 0;
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: safeCurrency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        ...options,
    }).format(value);
}
