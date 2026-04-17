/**
 * Task 13: Client-side currency conversion utility.
 * Reads exchange rates from src/data/exchange-rates.json (bundled with app).
 */

import ratesData from "../data/exchange-rates.json";

export const SUPPORTED_CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "INR", "CNY",
  "KRW", "CAD", "AUD", "SGD", "BRL", "CHF", "SEK",
] as const;

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

/** Currency symbols for formatting */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  INR: "₹",
  CNY: "¥",
  KRW: "₩",
  CAD: "CA$",
  AUD: "A$",
  SGD: "S$",
  BRL: "R$",
  CHF: "CHF ",
  SEK: "kr",
};

/** Decimal places per currency (JPY, KRW use 0) */
const CURRENCY_DECIMALS: Record<string, number> = {
  JPY: 0,
  KRW: 0,
};

interface ExchangeRatesFile {
  base: string;
  fetchedAt: string;
  rates: Record<string, number>;
}

const bundledRates = ratesData as ExchangeRatesFile;

/**
 * Converts a USD amount to the target currency using bundled exchange rates.
 * Falls back to USD if the currency is not found.
 *
 * @param amount   - Amount in USD
 * @param currency - Target currency code (e.g. "EUR")
 * @returns Converted amount
 */
export function convertUSD(amount: number, currency: string): number {
  if (currency === "USD") return amount;
  const rate = bundledRates.rates[currency];
  if (rate === undefined || rate === 0) return amount;
  return amount * rate;
}

/**
 * Formats a USD amount as a localized currency string.
 * e.g. formatCurrency(1234.56, "INR") → "₹1,234.56"
 *
 * @param amount   - Amount in USD
 * @param currency - Target currency code
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string): string {
  const converted = convertUSD(amount, currency);
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency + " ";
  const decimals = CURRENCY_DECIMALS[currency] ?? 2;

  const formatted = converted.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  // For currencies where symbol goes after (SEK), handle specially
  if (currency === "SEK") {
    return `${formatted} ${symbol.trim()}`;
  }

  return `${symbol}${formatted}`;
}

/**
 * Returns the exchange rate for a currency vs USD.
 * Returns 1 if currency is USD or not found.
 */
export function getExchangeRate(currency: string): number {
  if (currency === "USD") return 1;
  return bundledRates.rates[currency] ?? 1;
}

/**
 * Returns the date when exchange rates were last fetched.
 */
export function getRatesFetchedAt(): string {
  return bundledRates.fetchedAt;
}
