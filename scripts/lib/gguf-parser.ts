/**
 * Minimal GGUF metadata extractor.
 * Uses HTTP Range request (first 256KB) to read GGUF header.
 * Returns null on any parse error (graceful degradation).
 */

const GGUF_MAGIC = 0x46554747; // "GGUF" in little-endian
const RANGE_BYTES = 256 * 1024; // 256KB

// file_type int → quant label mapping
const FILE_TYPE_MAP: Record<number, string> = {
  0: "F32",
  1: "F16",
  2: "Q4_0",
  3: "Q4_1",
  6: "Q5_0",
  7: "Q5_1",
  8: "Q8_0",
  10: "Q2_K",
  11: "Q3_K_S",
  12: "Q3_K_M",
  13: "Q3_K_L",
  14: "Q4_K_S",
  15: "Q4_K_M",
  16: "Q5_K_S",
  17: "Q5_K_M",
  18: "Q6_K",
  19: "Q8_K",
  20: "IQ2_XXS",
  21: "IQ2_XS",
  22: "IQ3_XXS",
  23: "IQ1_S",
  24: "IQ4_NL",
  25: "IQ3_S",
  26: "IQ2_S",
  27: "IQ4_XS",
  28: "IQ1_M",
  29: "BF16",
};

export interface GGUFMetadata {
  architecture: string;
  quantType: string | null;
  contextLength: number | null;
  numLayers: number | null;
  hiddenSize: number | null;
}

/**
 * Parses GGUF metadata from a HuggingFace model file via HTTP Range request.
 * Returns null on any parse error.
 */
export async function parseGGUFMetadata(
  hfModelId: string,
  filename: string,
  hfToken?: string
): Promise<GGUFMetadata | null> {
  const token = hfToken ?? process.env.HF_TOKEN;
  const headers: Record<string, string> = {
    Range: `bytes=0-${RANGE_BYTES - 1}`,
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const url = `https://huggingface.co/${hfModelId}/resolve/main/${filename}`;

  try {
    const res = await fetch(url, { headers });
    if (!res.ok && res.status !== 206) return null;

    const buffer = await res.arrayBuffer();
    return parseGGUFBuffer(buffer);
  } catch {
    return null;
  }
}

/**
 * Parses a GGUF binary buffer and extracts metadata.
 * Exported for testing.
 */
export function parseGGUFBuffer(buffer: ArrayBuffer): GGUFMetadata | null {
  try {
    const view = new DataView(buffer);
    let offset = 0;

    // Check magic bytes (little-endian uint32)
    const magic = view.getUint32(offset, true);
    if (magic !== GGUF_MAGIC) return null;
    offset += 4;

    // Version (uint32)
    const _version = view.getUint32(offset, true);
    offset += 4;

    // Tensor count (uint64 — read as two uint32s, low + high)
    const _tensorCountLow = view.getUint32(offset, true);
    const _tensorCountHigh = view.getUint32(offset + 4, true);
    offset += 8;

    // KV count (uint64)
    const kvCountLow = view.getUint32(offset, true);
    const _kvCountHigh = view.getUint32(offset + 4, true);
    offset += 8;

    const kvCount = kvCountLow; // assume < 2^32 KV pairs

    // Parse KV metadata
    const kv: Record<string, unknown> = {};

    for (let i = 0; i < kvCount && offset < buffer.byteLength - 8; i++) {
      const keyResult = readGGUFString(view, offset, buffer.byteLength);
      if (!keyResult) break;
      offset = keyResult.nextOffset;
      const key = keyResult.value;

      const typeResult = readGGUFValue(view, offset, buffer.byteLength);
      if (!typeResult) break;
      offset = typeResult.nextOffset;
      kv[key] = typeResult.value;
    }

    // Extract fields
    const arch = typeof kv["general.architecture"] === "string"
      ? kv["general.architecture"]
      : "unknown";

    const fileType = typeof kv["general.file_type"] === "number"
      ? kv["general.file_type"]
      : null;
    const quantType = fileType !== null ? (FILE_TYPE_MAP[fileType] ?? `type_${fileType}`) : null;

    const contextLength =
      typeof kv[`${arch}.context_length`] === "number"
        ? (kv[`${arch}.context_length`] as number)
        : null;

    const numLayers =
      typeof kv[`${arch}.block_count`] === "number"
        ? (kv[`${arch}.block_count`] as number)
        : null;

    const hiddenSize =
      typeof kv[`${arch}.embedding_length`] === "number"
        ? (kv[`${arch}.embedding_length`] as number)
        : null;

    return { architecture: arch, quantType, contextLength, numLayers, hiddenSize };
  } catch {
    return null;
  }
}

// ─── GGUF Binary Parsing Helpers ─────────────────────────────────────

// GGUF value types
const GGUF_TYPE = {
  UINT8: 0,
  INT8: 1,
  UINT16: 2,
  INT16: 3,
  UINT32: 4,
  INT32: 5,
  FLOAT32: 6,
  BOOL: 7,
  STRING: 8,
  ARRAY: 9,
  UINT64: 10,
  INT64: 11,
  FLOAT64: 12,
} as const;

interface ParseResult<T> {
  value: T;
  nextOffset: number;
}

function readGGUFString(
  view: DataView,
  offset: number,
  limit: number
): ParseResult<string> | null {
  if (offset + 8 > limit) return null;
  const lenLow = view.getUint32(offset, true);
  // const lenHigh = view.getUint32(offset + 4, true); // ignore high 32 bits
  offset += 8;

  if (lenLow > 65536 || offset + lenLow > limit) return null;

  const bytes = new Uint8Array(view.buffer, offset, lenLow);
  const value = new TextDecoder().decode(bytes);
  return { value, nextOffset: offset + lenLow };
}

function readGGUFValue(
  view: DataView,
  offset: number,
  limit: number
): ParseResult<unknown> | null {
  if (offset + 4 > limit) return null;
  const type = view.getUint32(offset, true);
  offset += 4;

  switch (type) {
    case GGUF_TYPE.UINT8:
      if (offset + 1 > limit) return null;
      return { value: view.getUint8(offset), nextOffset: offset + 1 };
    case GGUF_TYPE.INT8:
      if (offset + 1 > limit) return null;
      return { value: view.getInt8(offset), nextOffset: offset + 1 };
    case GGUF_TYPE.UINT16:
      if (offset + 2 > limit) return null;
      return { value: view.getUint16(offset, true), nextOffset: offset + 2 };
    case GGUF_TYPE.INT16:
      if (offset + 2 > limit) return null;
      return { value: view.getInt16(offset, true), nextOffset: offset + 2 };
    case GGUF_TYPE.UINT32:
      if (offset + 4 > limit) return null;
      return { value: view.getUint32(offset, true), nextOffset: offset + 4 };
    case GGUF_TYPE.INT32:
      if (offset + 4 > limit) return null;
      return { value: view.getInt32(offset, true), nextOffset: offset + 4 };
    case GGUF_TYPE.FLOAT32:
      if (offset + 4 > limit) return null;
      return { value: view.getFloat32(offset, true), nextOffset: offset + 4 };
    case GGUF_TYPE.BOOL:
      if (offset + 1 > limit) return null;
      return { value: view.getUint8(offset) !== 0, nextOffset: offset + 1 };
    case GGUF_TYPE.STRING: {
      const result = readGGUFString(view, offset, limit);
      if (!result) return null;
      return result;
    }
    case GGUF_TYPE.UINT64:
      if (offset + 8 > limit) return null;
      return { value: view.getUint32(offset, true), nextOffset: offset + 8 };
    case GGUF_TYPE.INT64:
      if (offset + 8 > limit) return null;
      return { value: view.getInt32(offset, true), nextOffset: offset + 8 };
    case GGUF_TYPE.FLOAT64:
      if (offset + 8 > limit) return null;
      return { value: view.getFloat64(offset, true), nextOffset: offset + 8 };
    case GGUF_TYPE.ARRAY: {
      // Array: element type (uint32) + count (uint64) + elements
      if (offset + 12 > limit) return null;
      const elemType = view.getUint32(offset, true);
      const countLow = view.getUint32(offset + 4, true);
      offset += 12;

      // Skip array elements (we don't need array values for our use case)
      const elemSize = getGGUFTypeSize(elemType);
      if (elemSize > 0) {
        offset += countLow * elemSize;
      } else {
        // Variable-size elements (strings) — skip by parsing
        for (let j = 0; j < countLow && offset < limit; j++) {
          const r = readGGUFValue(view, offset - 4, limit);
          if (!r) break;
          // We need to re-read with the type prefix
          const r2 = readGGUFValueByType(view, elemType, offset, limit);
          if (!r2) break;
          offset = r2.nextOffset;
        }
      }
      return { value: null, nextOffset: offset };
    }
    default:
      // Unknown type — can't continue parsing
      return null;
  }
}

function readGGUFValueByType(
  view: DataView,
  type: number,
  offset: number,
  limit: number
): ParseResult<unknown> | null {
  switch (type) {
    case GGUF_TYPE.UINT8:
      if (offset + 1 > limit) return null;
      return { value: view.getUint8(offset), nextOffset: offset + 1 };
    case GGUF_TYPE.INT8:
      if (offset + 1 > limit) return null;
      return { value: view.getInt8(offset), nextOffset: offset + 1 };
    case GGUF_TYPE.UINT16:
      if (offset + 2 > limit) return null;
      return { value: view.getUint16(offset, true), nextOffset: offset + 2 };
    case GGUF_TYPE.INT16:
      if (offset + 2 > limit) return null;
      return { value: view.getInt16(offset, true), nextOffset: offset + 2 };
    case GGUF_TYPE.UINT32:
      if (offset + 4 > limit) return null;
      return { value: view.getUint32(offset, true), nextOffset: offset + 4 };
    case GGUF_TYPE.INT32:
      if (offset + 4 > limit) return null;
      return { value: view.getInt32(offset, true), nextOffset: offset + 4 };
    case GGUF_TYPE.FLOAT32:
      if (offset + 4 > limit) return null;
      return { value: view.getFloat32(offset, true), nextOffset: offset + 4 };
    case GGUF_TYPE.BOOL:
      if (offset + 1 > limit) return null;
      return { value: view.getUint8(offset) !== 0, nextOffset: offset + 1 };
    case GGUF_TYPE.STRING:
      return readGGUFString(view, offset, limit);
    case GGUF_TYPE.UINT64:
      if (offset + 8 > limit) return null;
      return { value: view.getUint32(offset, true), nextOffset: offset + 8 };
    case GGUF_TYPE.INT64:
      if (offset + 8 > limit) return null;
      return { value: view.getInt32(offset, true), nextOffset: offset + 8 };
    case GGUF_TYPE.FLOAT64:
      if (offset + 8 > limit) return null;
      return { value: view.getFloat64(offset, true), nextOffset: offset + 8 };
    default:
      return null;
  }
}

function getGGUFTypeSize(type: number): number {
  switch (type) {
    case GGUF_TYPE.UINT8:
    case GGUF_TYPE.INT8:
    case GGUF_TYPE.BOOL:
      return 1;
    case GGUF_TYPE.UINT16:
    case GGUF_TYPE.INT16:
      return 2;
    case GGUF_TYPE.UINT32:
    case GGUF_TYPE.INT32:
    case GGUF_TYPE.FLOAT32:
      return 4;
    case GGUF_TYPE.UINT64:
    case GGUF_TYPE.INT64:
    case GGUF_TYPE.FLOAT64:
      return 8;
    case GGUF_TYPE.STRING:
    case GGUF_TYPE.ARRAY:
      return 0; // variable size
    default:
      return 0;
  }
}
