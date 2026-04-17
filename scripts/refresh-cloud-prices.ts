/**
 * Task 7: Cloud price refresh orchestrator.
 *
 * Reads data/cloud-overrides.yml, merges with existing src/data/cloud.json,
 * validates all entries, writes updated src/data/cloud.json,
 * fetches exchange rates and writes src/data/exchange-rates.json,
 * and updates src/data/meta.json.
 *
 * Usage: npx tsx scripts/refresh-cloud-prices.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fetchAWSPrices } from "./lib/aws-pricer.js";
import { fetchAzurePrices } from "./lib/azure-pricer.js";
import { fetchGCPPrices } from "./lib/gcp-pricer.js";
import { fetchSpecialtyPrices } from "./lib/specialty-pricers.js";
import { fetchExchangeRates } from "./lib/currency.js";
import { CloudInstanceSchema } from "../src/types/cloud.js";
import type { CloudInstance } from "../src/lib/formulas/types.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const CLOUD_JSON = path.join(ROOT, "src/data/cloud.json");
const META_JSON = path.join(ROOT, "src/data/meta.json");

async function main(): Promise<void> {
  console.log("🔄 Refreshing cloud prices...\n");

  // 1. Fetch from all providers
  const [awsPrices, azurePrices, gcpPrices, specialtyPrices] = await Promise.all([
    fetchAWSPrices(),
    fetchAzurePrices(),
    fetchGCPPrices(),
    fetchSpecialtyPrices(),
  ]);

  const allFetched = [...awsPrices, ...azurePrices, ...gcpPrices, ...specialtyPrices];
  console.log(`  Fetched: ${awsPrices.length} AWS, ${azurePrices.length} Azure, ${gcpPrices.length} GCP, ${specialtyPrices.length} specialty`);

  // 2. Load existing cloud.json
  let existing: CloudInstance[] = [];
  if (fs.existsSync(CLOUD_JSON)) {
    existing = JSON.parse(fs.readFileSync(CLOUD_JSON, "utf-8")) as CloudInstance[];
  }

  // 3. Merge: override existing entries by id, add new ones
  const merged = new Map<string, CloudInstance>();
  for (const inst of existing) {
    merged.set(inst.id, inst);
  }
  for (const inst of allFetched) {
    merged.set(inst.id, inst); // override with fresh data
  }

  const result = Array.from(merged.values());

  // 4. Validate all entries
  const errors: string[] = [];
  for (const inst of result) {
    const validation = CloudInstanceSchema(inst);
    if (!validation.valid) {
      errors.push(`[${inst.id}] ${validation.errors.join("; ")}`);
    }
  }

  if (errors.length > 0) {
    console.error(`\n❌ Validation errors (${errors.length}):`);
    for (const err of errors) {
      console.error(`  • ${err}`);
    }
    process.exit(1);
  }

  // 5. Write updated cloud.json
  fs.writeFileSync(CLOUD_JSON, JSON.stringify(result, null, 2) + "\n");
  console.log(`\n✅ Wrote ${result.length} instances to src/data/cloud.json`);

  // 6. Fetch exchange rates (writes src/data/exchange-rates.json)
  console.log("\n🔄 Fetching exchange rates...");
  await fetchExchangeRates();

  // 7. Update meta.json
  const meta = JSON.parse(fs.readFileSync(META_JSON, "utf-8")) as Record<string, unknown>;
  meta.cloudVersion = bumpVersion(meta.cloudVersion as string | undefined);
  meta.exchangeRatesVersion = bumpVersion(meta.exchangeRatesVersion as string | undefined);
  meta.builtAt = new Date().toISOString();
  fs.writeFileSync(META_JSON, JSON.stringify(meta, null, 2) + "\n");
  console.log(`✅ Updated src/data/meta.json (cloudVersion: ${meta.cloudVersion})`);

  console.log("\n✅ Cloud price refresh complete.");
}

function bumpVersion(current: string | undefined): string {
  if (!current) return "1.0.1";
  const parts = current.split(".").map(Number);
  parts[2] = (parts[2] ?? 0) + 1;
  return parts.join(".");
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
