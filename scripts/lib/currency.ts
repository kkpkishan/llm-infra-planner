/**
 * Task 6: Currency conversion utility for scripts.
 * Fetches exchange rates from Frankfurter API and caches to src/data/exchange-rates.json.
 */

import * as fs from "node:fs";
import * as path from "node:path";

export const SUPPORTED_CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "INR", "CNY",
  "KRW", "CAD", "AUD", "SGD", "BRL", "CHF", "SEK",
] as const;

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

export interface ExchangeRates {
  base: "USD";
  fetchedAt: string;
  rates: Record<string, number>;
}

const FRANKFURTER_URL = "https://api.frankfurter.app/latest?from=USD";
const CACHE_PATH = path.resolve(process.cwd(), "src/data/exchange-rates.json");

/**
 * Fetches current exchange rates from Frankfurter API (USD base).
 * Caches result to src/data/exchange-rates.json with fetchedAt timestamp.
 *
 * @returns Record of currency code → rate (USD = 1.0 always)
 */
export async function fetchExchangeRates(): Promise<Record<string, number>> {
  let rates: Record<string, number> = { USD: 1 };

  try {
    const res = await fetch(FRANKFURTER_URL);
    if (!res.ok) {
      throw new Error(`Frankfurter API returned ${res.status}`);
    }
    const data = (await res.json()) as { rates: Record<string, number> };
    rates = { USD: 1, ...data.rates };
  } catch (err) {
    console.warn(`[currency] Failed to fetch exchange rates: ${err}. Using fallback rates.`);
    rates = getFallbackRates();
  }

  const payload: ExchangeRates = {
    base: "USD",
    fetchedAt: new Date().toISOString(),
    rates,
  };

  // Ensure directory exists
  const dir = path.dirname(CACHE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(CACHE_PATH, JSON.stringify(payload, null, 2) + "\n");
  console.log(`[currency] Exchange rates cached to ${CACHE_PATH}`);

  return rates;
}

/**
 * Converts a USD amount to the target currency.
 *
 * @param amount         - Amount in USD
 * @param targetCurrency - Target currency code (e.g. "EUR")
 * @param rates          - Exchange rates map (USD base)
 * @returns Converted amount, or original amount if currency not found
 */
export function convertUSD(
  amount: number,
  targetCurrency: string,
  rates: Record<string, number>
): number {
  if (targetCurrency === "USD") return amount;
  const rate = rates[targetCurrency];
  if (rate === undefined || rate === 0) return amount;
  return amount * rate;
}

/**
 * Fallback exchange rates (approximate, used when API is unavailable).
 * Last updated: 2026-04-16
 */
function getFallbackRates(): Record<string, number> {
  return {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 149.5,
    INR: 83.2,
    CNY: 7.24,
    KRW: 1325.0,
    CAD: 1.36,
    AUD: 1.53,
    SGD: 1.34,
    BRL: 4.97,
    CHF: 0.90,
    SEK: 10.42,
  };
}
