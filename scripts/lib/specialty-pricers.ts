/**
 * Task 5: Specialty cloud provider pricing fetchers.
 * Covers: Lambda Labs, RunPod, Vast.ai, CoreWeave, and others.
 *
 * Current implementation: reads from data/cloud-overrides.yml (stub).
 *
 * Real API integration notes:
 *
 * Lambda Labs:
 *   REST: GET https://cloud.lambdalabs.com/api/v1/instance-types
 *   Auth: Bearer token (API key from Lambda Labs dashboard)
 *   Response: { data: { [instanceType]: { instance_type: { name, price_cents_per_hour, specs: { gpus, vcpus, memory_gib } } } } }
 *
 * RunPod:
 *   GraphQL: POST https://api.runpod.io/graphql
 *   Query: { gpuTypes { id displayName memoryInGb securePrice communityPrice } }
 *   Auth: Bearer token (API key)
 *
 * Vast.ai:
 *   REST: GET https://vast.ai/api/v0/bundles/
 *   No auth for public listings
 *   Aggregates marketplace offers — compute p25/median/p75 per GPU type
 *
 * CoreWeave:
 *   Scrape: https://www.coreweave.com/gpu-cloud-compute-pricing
 *   Use Playwright for headless extraction (structured selectors)
 *
 * Crusoe:
 *   REST: GET https://api.crusoecloud.com/v1alpha5/
 *   Auth: API key
 *
 * Modal:
 *   Scrape: https://modal.com/pricing
 *
 * Together AI:
 *   REST: GET https://api.together.xyz/v1/models
 *   Extract per-token pricing from model metadata
 *
 * Fireworks AI:
 *   Scrape: https://fireworks.ai/pricing
 *
 * Replicate:
 *   REST: GET https://api.replicate.com/v1/hardware
 *
 * TensorDock:
 *   REST: GET https://marketplace.tensordock.com/api/v0/client/deploy/hostnodes
 *
 * Hyperstack:
 *   REST: GET https://infrahub-api.nexgencloud.com/v1/core/flavors
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { parseYAML } from "./yaml-parser.js";
import type { CloudInstance } from "../../src/lib/formulas/types.js";

const OVERRIDES_PATH = path.resolve(process.cwd(), "data/cloud-overrides.yml");

const SPECIALTY_PROVIDERS = ["lambda", "runpod", "vast", "coreweave", "together", "crusoe", "modal", "fireworks", "replicate", "tensordock", "hyperstack"];

function loadOverrides(): CloudInstance[] {
  const raw = fs.readFileSync(OVERRIDES_PATH, "utf-8");
  const data = parseYAML(raw) as { instances?: CloudInstance[] };
  return data.instances ?? [];
}

/**
 * Fetches all specialty provider pricing.
 * @returns Array of CloudInstance objects for all specialty providers
 */
export async function fetchSpecialtyPrices(): Promise<CloudInstance[]> {
  const instances = loadOverrides();
  return instances.filter((i) => SPECIALTY_PROVIDERS.includes(i.provider));
}

/**
 * Fetches Lambda Labs instance pricing.
 * Real API: GET https://cloud.lambdalabs.com/api/v1/instance-types (requires API key)
 */
export async function fetchLambdaPrices(): Promise<CloudInstance[]> {
  const instances = loadOverrides();
  return instances.filter((i) => i.provider === "lambda");
}

/**
 * Fetches RunPod instance pricing.
 * Real API: GraphQL POST https://api.runpod.io/graphql (requires API key)
 */
export async function fetchRunPodPrices(): Promise<CloudInstance[]> {
  const instances = loadOverrides();
  return instances.filter((i) => i.provider === "runpod");
}

/**
 * Fetches Vast.ai marketplace pricing.
 * Real API: GET https://vast.ai/api/v0/bundles/ (public, no auth)
 */
export async function fetchVastPrices(): Promise<CloudInstance[]> {
  const instances = loadOverrides();
  return instances.filter((i) => i.provider === "vast");
}

/**
 * Fetches CoreWeave instance pricing.
 * Real: Playwright scraper for https://www.coreweave.com/gpu-cloud-compute-pricing
 */
export async function fetchCoreWeavePrices(): Promise<CloudInstance[]> {
  const instances = loadOverrides();
  return instances.filter((i) => i.provider === "coreweave");
}

/**
 * Fetches Together AI serverless pricing.
 * Real API: GET https://api.together.xyz/v1/models
 */
export async function fetchTogetherPrices(): Promise<CloudInstance[]> {
  const instances = loadOverrides();
  return instances.filter((i) => i.provider === "together");
}
