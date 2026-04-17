/**
 * Task 3: Azure VM GPU instance pricing fetcher.
 *
 * Current implementation: reads from data/cloud-overrides.yml (stub).
 *
 * To extend with real Azure Retail Prices API (no auth required):
 *   Base URL: https://prices.azure.com/api/retail/prices
 *   OData filter examples:
 *     - On-demand: serviceName eq 'Virtual Machines' and contains(productName, 'H100') and priceType eq 'Consumption'
 *     - Spot:      serviceName eq 'Virtual Machines' and endswith(skuName, 'Spot')
 *     - Reserved:  priceType eq 'Reservation'
 *   GPU keywords: H100, H200, A100, A10, GB200, MI300X, T4, L4, L40S
 *   Pagination: follow response.NextPageLink until null
 *   Regions: eastus, westus2, westeurope, centralindia
 *   Map armSkuName → GPU id using hardware database
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { parseYAML } from "./yaml-parser.js";
import type { CloudInstance } from "../../src/lib/formulas/types.js";

const OVERRIDES_PATH = path.resolve(process.cwd(), "data/cloud-overrides.yml");

/**
 * Fetches Azure VM GPU instance pricing.
 *
 * @param regions - Optional list of Azure regions to filter (default: all)
 * @param token   - Optional Azure API token (not required for Retail Prices API)
 * @returns Array of CloudInstance objects for Azure GPU VMs
 */
export async function fetchAzurePrices(
  regions?: string[],
  token?: string
): Promise<CloudInstance[]> {
  void token; // Azure Retail Prices API is anonymous

  const raw = fs.readFileSync(OVERRIDES_PATH, "utf-8");
  const data = parseYAML(raw) as { instances?: CloudInstance[] };
  const instances: CloudInstance[] = data.instances ?? [];

  const azureInstances = instances.filter((i) => i.provider === "azure");

  if (regions && regions.length > 0) {
    return azureInstances.filter((i) =>
      i.regions.some((r) => regions.includes(r))
    );
  }

  return azureInstances;
}
