/**
 * Task 4: GCP GPU instance pricing fetcher.
 *
 * Current implementation: reads from data/cloud-overrides.yml (stub).
 *
 * To extend with real GCP Cloud Billing Catalog API:
 *   Endpoint: GET https://cloudbilling.googleapis.com/v1/services/6F81-5844-456A/skus
 *   (6F81-5844-456A is the Compute Engine service ID)
 *   Auth: Bearer token from `gcloud auth print-access-token` or service account
 *   Filter GPU SKUs: A3, A3-Mega, A3-Ultra, A3-High, A4, A2, G2, TPU v5e/v5p/v6e/v7
 *   Extract pricing from: pricingInfo[].pricingExpression.tieredRates[].unitPrice
 *   Preemptible instances: filter by UsageType: Preemptible in description
 *   Regions: us-central1, us-east1, europe-west4, asia-south1
 *   Pagination: follow nextPageToken in response
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { parseYAML } from "./yaml-parser.js";
import type { CloudInstance } from "../../src/lib/formulas/types.js";

const OVERRIDES_PATH = path.resolve(process.cwd(), "data/cloud-overrides.yml");

/**
 * Fetches GCP GPU instance pricing.
 *
 * @param regions - Optional list of GCP regions to filter (default: all)
 * @param token   - Optional GCP API token (for future real API integration)
 * @returns Array of CloudInstance objects for GCP GPU instances
 */
export async function fetchGCPPrices(
  regions?: string[],
  token?: string
): Promise<CloudInstance[]> {
  void token; // reserved for future real API integration

  const raw = fs.readFileSync(OVERRIDES_PATH, "utf-8");
  const data = parseYAML(raw) as { instances?: CloudInstance[] };
  const instances: CloudInstance[] = data.instances ?? [];

  const gcpInstances = instances.filter((i) => i.provider === "gcp");

  if (regions && regions.length > 0) {
    return gcpInstances.filter((i) =>
      i.regions.some((r) => regions.includes(r))
    );
  }

  return gcpInstances;
}
