/**
 * Task 12: Currency picker dropdown.
 * Persists preference in localStorage, shows exchange rate vs USD.
 */

import { useEffect, useState } from "react";
import { SUPPORTED_CURRENCIES, getExchangeRate, getRatesFetchedAt } from "../../lib/currency";
import type { SupportedCurrency } from "../../lib/currency";

const STORAGE_KEY = "llm-calc-currency";

const CURRENCY_LABELS: Record<string, string> = {
  USD: "USD — US Dollar",
  EUR: "EUR — Euro",
  GBP: "GBP — British Pound",
  JPY: "JPY — Japanese Yen",
  INR: "INR — Indian Rupee",
  CNY: "CNY — Chinese Yuan",
  KRW: "KRW — Korean Won",
  CAD: "CAD — Canadian Dollar",
  AUD: "AUD — Australian Dollar",
  SGD: "SGD — Singapore Dollar",
  BRL: "BRL — Brazilian Real",
  CHF: "CHF — Swiss Franc",
  SEK: "SEK — Swedish Krona",
};

interface CurrencyPickerProps {
  value?: SupportedCurrency;
  onChange?: (currency: SupportedCurrency) => void;
}

export function CurrencyPicker({ value, onChange }: CurrencyPickerProps) {
  const [currency, setCurrency] = useState<SupportedCurrency>(() => {
    if (value) return value;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (SUPPORTED_CURRENCIES as readonly string[]).includes(stored)) {
      return stored as SupportedCurrency;
    }
    return "USD";
  });

  // Sync with external value prop
  useEffect(() => {
    if (value && value !== currency) setCurrency(value);
  }, [value, currency]);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as SupportedCurrency;
    setCurrency(next);
    localStorage.setItem(STORAGE_KEY, next);
    onChange?.(next);
  }

  const rate = getExchangeRate(currency);
  const fetchedAt = getRatesFetchedAt();
  const rateDate = new Date(fetchedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex items-center gap-1.5" title={`Rates as of ${rateDate}`}>
      <select
        value={currency}
        onChange={handleChange}
        className="text-xs bg-transparent border border-border rounded px-1.5 py-0.5 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
        aria-label="Select display currency"
      >
        {SUPPORTED_CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {CURRENCY_LABELS[c] ?? c}
          </option>
        ))}
      </select>
      {currency !== "USD" && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          1 USD = {rate.toLocaleString("en-US", { maximumFractionDigits: 2 })} {currency}
        </span>
      )}
    </div>
  );
}

/**
 * Hook to read/write the persisted currency preference.
 */
export function useCurrency(): [SupportedCurrency, (c: SupportedCurrency) => void] {
  const [currency, setCurrencyState] = useState<SupportedCurrency>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (SUPPORTED_CURRENCIES as readonly string[]).includes(stored)) {
      return stored as SupportedCurrency;
    }
    return "USD";
  });

  function setCurrency(c: SupportedCurrency) {
    setCurrencyState(c);
    localStorage.setItem(STORAGE_KEY, c);
  }

  return [currency, setCurrency];
}
