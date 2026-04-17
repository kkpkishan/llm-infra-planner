/**
 * Task 14: Tests for pricers and currency utilities.
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import { fetchAWSPrices } from "./aws-pricer.js";
import { fetchAzurePrices } from "./azure-pricer.js";
import { fetchGCPPrices } from "./gcp-pricer.js";
import { fetchSpecialtyPrices } from "./specialty-pricers.js";
import { convertUSD, SUPPORTED_CURRENCIES } from "./currency.js";
import { CloudInstanceSchema } from "../../src/types/cloud.js";

// Ensure we run from the project root so YAML paths resolve correctly
beforeAll(() => {
  const root = path.resolve(import.meta.dirname, "../..");
  process.chdir(root);
});

// ─── AWS Pricer ──────────────────────────────────────────────────────

describe("fetchAWSPrices", () => {
  it("returns an array of CloudInstance objects", async () => {
    const instances = await fetchAWSPrices();
    expect(Array.isArray(instances)).toBe(true);
    expect(instances.length).toBeGreaterThan(0);
  });

  it("all returned instances have provider=aws", async () => {
    const instances = await fetchAWSPrices();
    for (const inst of instances) {
      expect(inst.provider).toBe("aws");
    }
  });

  it("all returned instances pass CloudInstanceSchema validation", async () => {
    const instances = await fetchAWSPrices();
    for (const inst of instances) {
      const result = CloudInstanceSchema(inst);
      expect(result.valid, `${inst.id}: ${result.errors.join(", ")}`).toBe(true);
    }
  });

  it("filters by region when regions param is provided", async () => {
    const instances = await fetchAWSPrices(["us-east-1"]);
    for (const inst of instances) {
      expect(inst.regions).toContain("us-east-1");
    }
  });

  it("returns empty array for unknown region", async () => {
    const instances = await fetchAWSPrices(["xx-unknown-99"]);
    expect(instances).toHaveLength(0);
  });
});

// ─── Azure Pricer ────────────────────────────────────────────────────

describe("fetchAzurePrices", () => {
  it("returns an array of CloudInstance objects", async () => {
    const instances = await fetchAzurePrices();
    expect(Array.isArray(instances)).toBe(true);
    expect(instances.length).toBeGreaterThan(0);
  });

  it("all returned instances have provider=azure", async () => {
    const instances = await fetchAzurePrices();
    for (const inst of instances) {
      expect(inst.provider).toBe("azure");
    }
  });

  it("all returned instances pass CloudInstanceSchema validation", async () => {
    const instances = await fetchAzurePrices();
    for (const inst of instances) {
      const result = CloudInstanceSchema(inst);
      expect(result.valid, `${inst.id}: ${result.errors.join(", ")}`).toBe(true);
    }
  });
});

// ─── GCP Pricer ──────────────────────────────────────────────────────

describe("fetchGCPPrices", () => {
  it("returns an array of CloudInstance objects", async () => {
    const instances = await fetchGCPPrices();
    expect(Array.isArray(instances)).toBe(true);
    expect(instances.length).toBeGreaterThan(0);
  });

  it("all returned instances have provider=gcp", async () => {
    const instances = await fetchGCPPrices();
    for (const inst of instances) {
      expect(inst.provider).toBe("gcp");
    }
  });

  it("all returned instances pass CloudInstanceSchema validation", async () => {
    const instances = await fetchGCPPrices();
    for (const inst of instances) {
      const result = CloudInstanceSchema(inst);
      expect(result.valid, `${inst.id}: ${result.errors.join(", ")}`).toBe(true);
    }
  });
});

// ─── Specialty Pricers ───────────────────────────────────────────────

describe("fetchSpecialtyPrices", () => {
  it("returns an array of CloudInstance objects", async () => {
    const instances = await fetchSpecialtyPrices();
    expect(Array.isArray(instances)).toBe(true);
    expect(instances.length).toBeGreaterThan(0);
  });

  it("all returned instances pass CloudInstanceSchema validation", async () => {
    const instances = await fetchSpecialtyPrices();
    for (const inst of instances) {
      const result = CloudInstanceSchema(inst);
      expect(result.valid, `${inst.id}: ${result.errors.join(", ")}`).toBe(true);
    }
  });

  it("includes lambda, runpod, and coreweave providers", async () => {
    const instances = await fetchSpecialtyPrices();
    const providers = new Set(instances.map((i) => i.provider));
    expect(providers.has("lambda")).toBe(true);
    expect(providers.has("runpod")).toBe(true);
    expect(providers.has("coreweave")).toBe(true);
  });
});

// ─── Currency Conversion ─────────────────────────────────────────────

describe("convertUSD", () => {
  it("converts 100 USD to EUR correctly", () => {
    const result = convertUSD(100, "EUR", { EUR: 0.92 });
    expect(result).toBeCloseTo(92, 5);
  });

  it("returns original amount for USD", () => {
    const result = convertUSD(100, "USD", { USD: 1 });
    expect(result).toBe(100);
  });

  it("returns original amount for unknown currency", () => {
    const result = convertUSD(100, "XYZ", { EUR: 0.92 });
    expect(result).toBe(100);
  });

  it("handles zero rate gracefully (returns original)", () => {
    const result = convertUSD(100, "EUR", { EUR: 0 });
    expect(result).toBe(100);
  });

  it("converts 1000 USD to JPY", () => {
    const result = convertUSD(1000, "JPY", { JPY: 149.5 });
    expect(result).toBeCloseTo(149500, 0);
  });

  it("converts 50 USD to INR", () => {
    const result = convertUSD(50, "INR", { INR: 83.2 });
    expect(result).toBeCloseTo(4160, 0);
  });
});

// ─── Exchange Rates File ─────────────────────────────────────────────

describe("exchange-rates.json", () => {
  it("exists and is valid JSON", () => {
    const ratesPath = path.resolve(process.cwd(), "src/data/exchange-rates.json");
    expect(fs.existsSync(ratesPath)).toBe(true);
    const raw = fs.readFileSync(ratesPath, "utf-8");
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it("has USD rate of 1", () => {
    const ratesPath = path.resolve(process.cwd(), "src/data/exchange-rates.json");
    const data = JSON.parse(fs.readFileSync(ratesPath, "utf-8")) as { rates: Record<string, number> };
    expect(data.rates.USD).toBe(1);
  });

  it("contains all supported currencies", () => {
    const ratesPath = path.resolve(process.cwd(), "src/data/exchange-rates.json");
    const data = JSON.parse(fs.readFileSync(ratesPath, "utf-8")) as { rates: Record<string, number> };
    for (const currency of SUPPORTED_CURRENCIES) {
      expect(data.rates[currency], `Missing rate for ${currency}`).toBeDefined();
    }
  });

  it("has fetchedAt timestamp", () => {
    const ratesPath = path.resolve(process.cwd(), "src/data/exchange-rates.json");
    const data = JSON.parse(fs.readFileSync(ratesPath, "utf-8")) as { fetchedAt: string };
    expect(typeof data.fetchedAt).toBe("string");
    expect(data.fetchedAt.length).toBeGreaterThan(0);
  });
});

// ─── Client-side currency lib ────────────────────────────────────────

describe("src/lib/currency formatCurrency", async () => {
  const { formatCurrency } = await import("../../src/lib/currency.js");

  it("formatCurrency(1234.56, 'INR') contains ₹", () => {
    const result = formatCurrency(1234.56, "INR");
    expect(result).toContain("₹");
  });

  it("formatCurrency(100, 'USD') contains $", () => {
    const result = formatCurrency(100, "USD");
    expect(result).toContain("$");
  });

  it("formatCurrency(100, 'EUR') contains €", () => {
    const result = formatCurrency(100, "EUR");
    expect(result).toContain("€");
  });

  it("formatCurrency(100, 'GBP') contains £", () => {
    const result = formatCurrency(100, "GBP");
    expect(result).toContain("£");
  });

  it("formatCurrency(100, 'JPY') has no decimal places", () => {
    const result = formatCurrency(100, "JPY");
    // JPY should not have .XX decimal
    expect(result).not.toMatch(/\.\d{2}$/);
  });
});
