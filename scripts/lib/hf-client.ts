/**
 * HuggingFace Hub API client.
 * Uses Node.js built-in fetch (Node 18+). No extra HTTP libraries.
 */

export interface HFModelEntry {
  id: string;
  modelId?: string;
  lastModified?: string;
  downloads?: number;
  likes?: number;
  tags?: string[];
  pipeline_tag?: string;
  safetensors?: {
    parameters?: Record<string, number>;
    total?: number;
  };
  config?: Record<string, unknown>;
  cardData?: Record<string, unknown>;
  gated?: boolean | string;
  trendingScore?: number;
}

export interface FetchModelsOptions {
  /** HF API token — defaults to process.env.HF_TOKEN */
  token?: string;
  /** Max pages to fetch (default: 5) */
  maxPages?: number;
  /** pipeline_tag filter (default: text-generation) */
  pipelineTag?: string;
  /** Sort field (default: trendingScore) */
  sort?: string;
  /** Limit per page (default: 100) */
  limit?: number;
}

const HF_API_BASE = "https://huggingface.co/api";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  headers: Record<string, string>,
  retries = MAX_RETRIES
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, { headers });

    if (res.status === 429) {
      if (attempt === retries) {
        throw new Error(`HTTP 429 after ${retries} retries: ${url}`);
      }
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      console.warn(`[hf-client] Rate limited (429). Retrying in ${delay}ms…`);
      await sleep(delay);
      continue;
    }

    return res;
  }
  // unreachable
  throw new Error("fetchWithRetry: exhausted retries");
}

/**
 * Extracts the next-page URL from a `Link` header, if present.
 * Format: `<https://...>; rel="next"`
 */
function extractNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
  return match ? match[1] : null;
}

/**
 * Fetches models from the HuggingFace Hub API.
 * Handles pagination via Link header and exponential backoff on 429.
 */
export async function fetchModels(options: FetchModelsOptions = {}): Promise<HFModelEntry[]> {
  const token = options.token ?? process.env.HF_TOKEN;
  const maxPages = options.maxPages ?? 5;
  const pipelineTag = options.pipelineTag ?? "text-generation";
  const sort = options.sort ?? "trendingScore";
  const limit = options.limit ?? 100;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const expand = [
    "safetensors",
    "config",
    "cardData",
    "downloads",
    "likes",
    "tags",
    "trendingScore",
  ].join("&expand=");

  const initialUrl =
    `${HF_API_BASE}/models?` +
    `pipeline_tag=${encodeURIComponent(pipelineTag)}` +
    `&sort=${encodeURIComponent(sort)}` +
    `&limit=${limit}` +
    `&expand=${expand}`;

  const results: HFModelEntry[] = [];
  let nextUrl: string | null = initialUrl;
  let page = 0;

  while (nextUrl && page < maxPages) {
    const res = await fetchWithRetry(nextUrl, headers);

    if (!res.ok) {
      console.error(`[hf-client] HTTP ${res.status} fetching ${nextUrl}`);
      break;
    }

    const data = (await res.json()) as HFModelEntry[];
    results.push(...data);

    nextUrl = extractNextLink(res.headers.get("Link"));
    page++;
  }

  return results;
}

/**
 * Fetches a single model's config.json from HuggingFace.
 */
export async function fetchModelConfig(
  modelId: string,
  token?: string
): Promise<Record<string, unknown> | null> {
  const hfToken = token ?? process.env.HF_TOKEN;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (hfToken) headers["Authorization"] = `Bearer ${hfToken}`;

  const url = `https://huggingface.co/${modelId}/resolve/main/config.json`;
  try {
    const res = await fetchWithRetry(url, headers);
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Fetches a single model's metadata from the HF API.
 */
export async function fetchModelMeta(
  modelId: string,
  token?: string
): Promise<HFModelEntry | null> {
  const hfToken = token ?? process.env.HF_TOKEN;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (hfToken) headers["Authorization"] = `Bearer ${hfToken}`;

  const expand = "safetensors&expand=config&expand=cardData&expand=tags";
  const url = `${HF_API_BASE}/models/${encodeURIComponent(modelId)}?expand=${expand}`;
  try {
    const res = await fetchWithRetry(url, headers);
    if (!res.ok) return null;
    return (await res.json()) as HFModelEntry;
  } catch {
    return null;
  }
}
