/**
 * Task 1: Cloud + GPU TypeScript interfaces and runtime validators.
 * Re-exports from src/lib/formulas/types.ts and adds manual runtime validation.
 */

// Re-export shared types
export type { CloudInstance, GPUSpec } from "../lib/formulas/types";

import type { CloudInstance, GPUSpec } from "../lib/formulas/types";

// ─── Runtime Validators ──────────────────────────────────────────────

function isString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function isNumber(v: unknown): v is number {
  return typeof v === "number" && !Number.isNaN(v) && isFinite(v);
}

function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Runtime validator for CloudInstance objects.
 * Validates required fields and sanity ranges.
 */
export function CloudInstanceSchema(data: unknown): ValidationResult {
  const errors: string[] = [];
  const d = data as Record<string, unknown>;

  if (!d || typeof d !== "object") {
    return { valid: false, errors: ["data must be an object"] };
  }

  if (!isString(d.id)) errors.push("id: required string");
  if (!isString(d.provider)) errors.push("provider: required string");
  if (!isString(d.instanceType)) errors.push("instanceType: required string");

  if (!isArray(d.gpus)) {
    errors.push("gpus: required array");
  } else {
    for (let i = 0; i < d.gpus.length; i++) {
      const g = d.gpus[i] as Record<string, unknown>;
      if (!isString(g?.id)) errors.push(`gpus[${i}].id: required string`);
      if (!isNumber(g?.count) || (g.count as number) < 1) errors.push(`gpus[${i}].count: must be >= 1`);
    }
  }

  if (!isNumber(d.vcpus) || (d.vcpus as number) < 0) errors.push("vcpus: must be >= 0");
  if (!isNumber(d.ramGB) || (d.ramGB as number) < 0) errors.push("ramGB: must be >= 0");
  if (!isNumber(d.storageGB) || (d.storageGB as number) < 0) errors.push("storageGB: must be >= 0");
  if (!isNumber(d.networkGbps) || (d.networkGbps as number) < 0) errors.push("networkGbps: must be >= 0");

  const pricing = d.pricing as Record<string, unknown> | undefined;
  if (!pricing || typeof pricing !== "object") {
    errors.push("pricing: required object");
  } else {
    if (!isNumber(pricing.onDemandUSDPerHour) || (pricing.onDemandUSDPerHour as number) < 0) {
      errors.push("pricing.onDemandUSDPerHour: must be >= 0");
    }
    if (pricing.spotUSDPerHour !== undefined && (!isNumber(pricing.spotUSDPerHour) || (pricing.spotUSDPerHour as number) < 0)) {
      errors.push("pricing.spotUSDPerHour: must be >= 0 if provided");
    }
    if (pricing.reserved1yUSDPerHour !== undefined && (!isNumber(pricing.reserved1yUSDPerHour) || (pricing.reserved1yUSDPerHour as number) < 0)) {
      errors.push("pricing.reserved1yUSDPerHour: must be >= 0 if provided");
    }
    if (pricing.reserved3yUSDPerHour !== undefined && (!isNumber(pricing.reserved3yUSDPerHour) || (pricing.reserved3yUSDPerHour as number) < 0)) {
      errors.push("pricing.reserved3yUSDPerHour: must be >= 0 if provided");
    }
  }

  if (!isArray(d.regions) || (d.regions as unknown[]).length === 0) {
    errors.push("regions: required non-empty array");
  }

  if (!isString(d.lastPriceUpdate)) errors.push("lastPriceUpdate: required string (YYYY-MM-DD)");

  return { valid: errors.length === 0, errors };
}

/**
 * Runtime validator for GPUSpec objects.
 * Validates required fields and sanity ranges.
 */
export function GPUSpecSchema(data: unknown): ValidationResult {
  const errors: string[] = [];
  const d = data as Record<string, unknown>;

  if (!d || typeof d !== "object") {
    return { valid: false, errors: ["data must be an object"] };
  }

  const VALID_VENDORS = ["nvidia", "amd", "apple", "intel", "google-tpu"];
  const VALID_CATEGORIES = ["consumer", "workstation", "datacenter", "apple-silicon", "tpu"];
  const VALID_FORM_FACTORS = ["pcie", "sxm", "oam", "integrated", "mxm"];

  if (!isString(d.id)) errors.push("id: required string");
  if (!isString(d.vendor) || !VALID_VENDORS.includes(d.vendor as string)) {
    errors.push(`vendor: must be one of ${VALID_VENDORS.join(", ")}`);
  }
  if (!isString(d.name)) errors.push("name: required string");
  if (!isString(d.category) || !VALID_CATEGORIES.includes(d.category as string)) {
    errors.push(`category: must be one of ${VALID_CATEGORIES.join(", ")}`);
  }

  if (!isNumber(d.memoryGB) || (d.memoryGB as number) < 1 || (d.memoryGB as number) > 1024) {
    errors.push("memoryGB: must be in range [1, 1024]");
  }
  if (!isNumber(d.memoryBandwidthGBs) || (d.memoryBandwidthGBs as number) < 1) {
    errors.push("memoryBandwidthGBs: must be >= 1");
  }

  const flops = d.flops as Record<string, unknown> | undefined;
  if (!flops || typeof flops !== "object") {
    errors.push("flops: required object");
  } else {
    if (!isNumber(flops.fp32) || (flops.fp32 as number) < 0) errors.push("flops.fp32: must be >= 0");
    if (!isNumber(flops.fp16) || (flops.fp16 as number) < 0) errors.push("flops.fp16: must be >= 0");
    if (!isNumber(flops.int8) || (flops.int8 as number) < 0) errors.push("flops.int8: must be >= 0");
  }

  if (!isNumber(d.tdpWatts) || (d.tdpWatts as number) < 1 || (d.tdpWatts as number) > 5000) {
    errors.push("tdpWatts: must be in range [1, 5000]");
  }
  if (!isString(d.formFactor) || !VALID_FORM_FACTORS.includes(d.formFactor as string)) {
    errors.push(`formFactor: must be one of ${VALID_FORM_FACTORS.join(", ")}`);
  }
  if (!isNumber(d.releaseYear) || (d.releaseYear as number) < 2000 || (d.releaseYear as number) > 2035) {
    errors.push("releaseYear: must be in range [2000, 2035]");
  }

  return { valid: errors.length === 0, errors };
}

// Type guard helpers using the validators
export function isValidCloudInstance(data: unknown): data is CloudInstance {
  return CloudInstanceSchema(data).valid;
}

export function isValidGPUSpec(data: unknown): data is GPUSpec {
  return GPUSpecSchema(data).valid;
}
