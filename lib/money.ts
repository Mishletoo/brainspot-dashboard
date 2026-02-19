// ─── Currency configuration ───────────────────────────────────────────────────
// Change CURRENCY / LOCALE here to switch formatting app-wide.
export const CURRENCY = "EUR" as const;
export const LOCALE = "en-IE" as const; // en-IE → €1,200.00 (symbol-first, comma thousands)

// Singleton formatters — created once, reused on every call.
const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Formats a number as EUR currency.
 * e.g. formatEUR(1200)   → "€1,200.00"
 *      formatEUR(18.5)   → "€18.50"
 */
export function formatEUR(amount: number): string {
  return currencyFormatter.format(amount);
}

/**
 * Formats a plain number without a currency symbol.
 * e.g. formatNumber(1200.5) → "1,200.5"
 */
export function formatNumber(amount: number, decimals = 2): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(amount);
}

// Keep a reference so callers can show the symbol directly if needed.
export const CURRENCY_SYMBOL = "€";
