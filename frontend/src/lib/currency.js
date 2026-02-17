import {
  CURRENCY_VALUES as SHARED_CURRENCY_VALUES,
  formatCurrencyAmount,
  getCurrencyByEmployeeType,
  normalizeCurrency as normalizeSharedCurrency,
} from "@shared/currency";

export const CURRENCY_VALUES = SHARED_CURRENCY_VALUES;

export const normalizeCurrency = (currency, fallback) =>
  normalizeSharedCurrency(currency, fallback);

export const getUserCurrency = (user, fallback = "INR") =>
  user?.employeeType
    ? getCurrencyByEmployeeType(user.employeeType)
    : normalizeSharedCurrency(user?.currency, normalizeSharedCurrency(fallback));

export const formatCurrencyValue = (amount, currency, fallback = "INR") =>
  formatCurrencyAmount(amount, normalizeSharedCurrency(currency, fallback));

export const formatCurrencyForUser = (amount, user, fallback = "INR") =>
  formatCurrencyValue(amount, getUserCurrency(user, fallback), fallback);
 