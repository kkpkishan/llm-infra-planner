/**
 * Extracts parameter counts from safetensors metadata.
 * Primary: HF API expand=safetensors
 * Fallback: estimate from config
 */

import type { ParsedConfig } from "./config-parser.js";
import { estimateParams } from "./param-estimator.js";

const HF_API_BASE = "https://huggingface.co/api";

/**
 * Gets the total parameter count for a model.
 * Tries HF API safetensors metadata first, then falls back to config estimation.
 */
export async function getParamCount(
  hfModelId: string,
  hfToken?: string,
  config?: ParsedConfig
): Promise<number | null> {
  const token = hfToken ?? process.env.HF_TOKEN;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  // Primary: HF API with safetensors expand
  try {
    const url = `${HF_API_BASE}/models/${encodeURIComponent(hfModelId)}?expand=safetensors`;
    const res = await fetch(url, { headers });
    if (res.ok) {
      const data = (await res.json()) as {
        safetensors?: {
          parameters?: Record<string, number>;
          total?: number;
        };
      };

      if (data.safetensors) {
        // Use total if available
        if (typeof data.safetensors.total === "number") {
          return data.safetensors.total;
        }
        // Sum all dtype counts
        if (data.safetensors.parameters) {
          const total = Object.values(data.safetensors.parameters).reduce(
            (sum, v) => sum + v,
            0
          );
          if (total > 0) return total;
        }
      }
    }
  } catch {
    // fall through to fallback
  }

  // Fallback: estimate from config
  if (config) {
    return estimateParamsFromConfig(config);
  }

  return null;
}

/**
 * Estimates parameter count from config fields.
 * Dense formula: L × (4h² + 4h×d_ff) + 2×vocab×h (with tie_word_embeddings adjustment)
 */
export function estimateParamsFromConfig(config: ParsedConfig): number | null {
  if (
    config.hiddenSize === undefined ||
    config.numLayers === undefined ||
    config.vocabSize === undefined
  ) {
    return null;
  }
  return estimateParams(config);
}
