/**
 * Task 2: AWS EC2 GPU instance pricing fetcher.
 *
 * Current implementation: reads from data/cloud-overrides.yml (stub).
 *
 * To extend with real AWS pricing:
 *   1. Install @aws-sdk/client-ec2 and @aws-sdk/client-pricing
 *   2. Use EC2.DescribeInstanceTypes to get GPU specs per instance family
 *   3. Use EC2.DescribeSpotPriceHistory for trailing 30-day spot data
 *   4. Use the Pricing API (us-east-1 endpoint) to get on-demand prices:
 *      GET https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/{region}/index.json
 *      Filter by instanceType and operatingSystem=Linux
 *   5. GPU instance families to target:
 *      p4d, p4de, p5, p5e, p5en, p6*, g5, g6, g6e, trn1, trn2, inf2, dl1, dl2q
 *   6. Regions: us-east-1, us-west-2, eu-west-1, ap-south-1, ap-northeast-1
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { parseYAML } from "./yaml-parser.js";
import type { CloudInstance } from "../../src/lib/formulas/types.js";

const OVERRIDES_PATH = path.resolve(process.cwd(), "data/cloud-overrides.yml");

/**
 * Fetches AWS EC2 GPU instance pricing.
 *
 * @param regions - Optional list of AWS regions to filter (default: all)
 * @param token   - Optional AWS API token (for future real API integration)
 * @returns Array of CloudInstance objects for AWS GPU instances
 */
export async function fetchAWSPrices(
  regions?: string[],
  token?: string
): Promise<CloudInstance[]> {
  void token; // reserved for future real API integration

  const raw = fs.readFileSync(OVERRIDES_PATH, "utf-8");
  const data = parseYAML(raw) as { instances?: CloudInstance[] };
  const instances: CloudInstance[] = data.instances ?? [];

  const awsInstances = instances.filter((i) => i.provider === "aws");

  if (regions && regions.length > 0) {
    return awsInstances.filter((i) =>
      i.regions.some((r) => regions.includes(r))
    );
  }

  return awsInstances;
}
