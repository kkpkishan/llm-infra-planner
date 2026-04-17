/**
 * Task 8: Hardware spec updater.
 *
 * Reads data/hardware.yml, validates against GPUSpec schema,
 * and writes updated src/data/gpus.json.
 *
 * Usage: npx tsx scripts/refresh-hardware.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { parseYAML } from "./lib/yaml-parser.js";
import { GPUSpecSchema } from "../src/types/cloud.js";
import type { GPUSpec } from "../src/lib/formulas/types.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const HARDWARE_YML = path.join(ROOT, "data/hardware.yml");
const GPUS_JSON = path.join(ROOT, "src/data/gpus.json");

async function main(): Promise<void> {
  console.log("🔄 Refreshing hardware specs...\n");

  // 1. Load hardware.yml
  if (!fs.existsSync(HARDWARE_YML)) {
    console.error(`❌ hardware.yml not found at ${HARDWARE_YML}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(HARDWARE_YML, "utf-8");
  const data = parseYAML(raw) as { gpus?: GPUSpec[] };
  const gpus: GPUSpec[] = data.gpus ?? [];

  if (gpus.length === 0) {
    console.error("❌ No GPU entries found in hardware.yml");
    process.exit(1);
  }

  console.log(`  Loaded ${gpus.length} GPU entries from hardware.yml`);

  // 2. Validate all entries
  const errors: string[] = [];
  for (const gpu of gpus) {
    const validation = GPUSpecSchema(gpu);
    if (!validation.valid) {
      errors.push(`[${(gpu as Record<string, unknown>).id ?? "unknown"}] ${validation.errors.join("; ")}`);
    }
  }

  if (errors.length > 0) {
    console.error(`\n❌ Validation errors (${errors.length}):`);
    for (const err of errors) {
      console.error(`  • ${err}`);
    }
    process.exit(1);
  }

  // 3. Write updated gpus.json
  fs.writeFileSync(GPUS_JSON, JSON.stringify(gpus, null, 2) + "\n");
  console.log(`✅ Wrote ${gpus.length} GPU specs to src/data/gpus.json`);

  console.log("\n✅ Hardware spec refresh complete.");
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
