/**
 * Decode (token generation) formulas — memory-bandwidth-bound roofline.
 *
 * Decode is memory-bandwidth-bound at low batch sizes.
 * Formula: decode_tokens_per_sec = memory_bandwidth_GBs / model_size_active_GB × efficiency
 */

export interface DecodeResult {
  /** BW / model_size_active × efficiency */
  decodeTokensPerSecPerUser: number;
  /** 1000 / decode_tok_per_s */
  tpotMs: number;
  /** Transition point from memory-bound to compute-bound (batch size) */
  computeSaturationBatch: number;
}

/**
 * Compute decode throughput and TPOT.
 *
 * @param memoryBandwidthGBs  - GPU memory bandwidth in GB/s
 * @param modelSizeActiveGB   - Active model weights in GB
 * @param efficiency          - Memory bandwidth efficiency (default 0.80)
 * @param gpuFlopsTFLOPS      - GPU peak FLOPS in TFLOPS (for saturation calc)
 * @param bytesPerParam       - Bytes per parameter (for saturation calc)
 */
export function computeDecode(
  memoryBandwidthGBs: number,
  modelSizeActiveGB: number,
  efficiency: number = 0.80,
  gpuFlopsTFLOPS?: number,
  bytesPerParam?: number,
): DecodeResult {
  const decodeTokensPerSecPerUser = modelSizeActiveGB > 0
    ? (memoryBandwidthGBs / modelSizeActiveGB) * efficiency
    : 0;

  const tpotMs = decodeTokensPerSecPerUser > 0
    ? 1000 / decodeTokensPerSecPerUser
    : Infinity;

  // Compute saturation batch: transition from memory-bound to compute-bound
  // compute_saturation = memory_bandwidth / (2 × params_active_bytes × GPU_FLOPS_per_byte)
  // = memory_bandwidth_GBs / (model_size_GB × GPU_FLOPS_per_byte)
  // GPU_FLOPS_per_byte = GPU_FLOPS_TFLOPS × 1e12 / (model_size_GB × 1e9)
  let computeSaturationBatch = 64; // default fallback
  if (gpuFlopsTFLOPS && bytesPerParam && modelSizeActiveGB > 0) {
    const gpuFlopsPerSec = gpuFlopsTFLOPS * 1e12;
    const modelSizeBytes = modelSizeActiveGB * 1e9;
    // saturation_batch = (BW_bytes_per_sec) / (2 × params × bytes_per_param × FLOPS_per_byte)
    // Simplified: BW / (model_size_bytes × FLOPS_per_byte)
    // FLOPS_per_byte = FLOPS / BW_bytes
    const bwBytesPerSec = memoryBandwidthGBs * 1e9;
    const flopsPerByte = gpuFlopsPerSec / bwBytesPerSec;
    computeSaturationBatch = Math.max(1, Math.round(flopsPerByte / (2 * (modelSizeBytes / (modelSizeActiveGB * 1e9 / bytesPerParam)))));
    // Simpler: arithmetic intensity = FLOPS / BW
    // saturation_batch ≈ FLOPS_TFLOPS × 1e12 / (BW_GBs × 1e9)
    computeSaturationBatch = Math.max(1, Math.round((gpuFlopsTFLOPS * 1e12) / (memoryBandwidthGBs * 1e9)));
  }

  return {
    decodeTokensPerSecPerUser,
    tpotMs,
    computeSaturationBatch,
  };
}

/**
 * Compute TPOT at a given batch size (concurrent users).
 *
 * At low batch (memory-bound): TPOT ≈ constant
 * At high batch (compute-bound): TPOT ∝ batch
 *
 * @param decodeResult      - Result from computeDecode
 * @param concurrentUsers   - Number of concurrent users
 * @param gpuFlopsTFLOPS    - GPU peak FLOPS in TFLOPS
 * @param paramsActive      - Active parameters
 * @param bytesPerParam     - Bytes per parameter
 * @returns TPOT in ms
 */
export function computeTPOTAtBatch(
  decodeResult: DecodeResult,
  concurrentUsers: number,
  gpuFlopsTFLOPS: number,
  paramsActive: number,
  _bytesPerParam: number,
): number {
  const { tpotMs, computeSaturationBatch } = decodeResult;
  const n = Math.max(1, concurrentUsers);

  if (n <= computeSaturationBatch) {
    // Memory-bound regime: TPOT grows slowly (~2% per user from scheduling)
    return tpotMs * (1 + 0.02 * (n - 1));
  } else {
    // Compute-bound regime: TPOT grows linearly with batch
    // tpot(n) = (2 × params_active × n) / GPU_FLOPS_effective × 1000
    const gpuFlopsPerSec = gpuFlopsTFLOPS * 1e12;
    const mfu = 0.65; // default MFU
    const computeBoundTpot = (2 * paramsActive * n) / (gpuFlopsPerSec * mfu) * 1000;
    // Transition: use max of memory-bound and compute-bound
    return Math.max(tpotMs * (1 + n / computeSaturationBatch), computeBoundTpot);
  }
}
