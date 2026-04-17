
## Description

Expand all input parameters to their full range and variety — context length up to 10M, all quantization types including GGUF IQ/TQ and EXL2, batch size with continuous batching, and KV cache precision options.

## Requirements

### Requirement 1: Extended Context Length
**User Story:** As a user, I want context length support from 1K to 10M tokens with accurate KV scaling.

**Acceptance Criteria:**
- Slider range: 512 → 10,485,760 (10M) on log scale
- Snap points at: 512, 1K, 2K, 4K, 8K, 16K, 32K, 64K, 128K, 256K, 512K, 1M, 2M, 4M, 10M
- Model-specific max shown as vertical indicator on slider
- KV cache curve visualization: small chart showing KV memory vs context length
- Context extension method dropdown (for contexts beyond model default): None, YaRN, Dynamic NTK, NTK-aware, Linear PI, Continued Pretraining
- Warning when context > model's trained max: "Quality may degrade beyond {max}K without fine-tuning"
- Ring Attention toggle for >1M contexts (distributes KV across GPUs via sequence parallelism)

### Requirement 2: Full Quantization Coverage
**User Story:** As a user, I want every quantization format available so I can find the optimal VRAM/quality point.

**Acceptance Criteria:**
- **Native**: FP32 (4.0), TF32 (4.0), FP16 (2.0), BF16 (2.0), FP8 E4M3 (1.0), FP8 E5M2 (1.0), FP6 (0.75), MXFP4 (0.53), NVFP4 (0.56), INT8 (1.0), INT4 (0.5)
- **GPTQ**: 2-bit (0.25), 3-bit (0.375), 4-bit (0.5), 8-bit (1.0) — with group_size option
- **AWQ**: 4-bit (0.5)
- **GGUF K-quants**: Q2_K (0.32), Q3_K_S (0.43), Q3_K_M (0.49), Q3_K_L (0.50), Q4_0 (0.56), Q4_1 (0.63), Q4_K_S (0.57), Q4_K_M (0.61), Q5_0 (0.69), Q5_1 (0.75), Q5_K_S (0.69), Q5_K_M (0.71), Q6_K (0.82), Q8_0 (1.06)
- **GGUF I-quants**: IQ1_S (0.20), IQ1_M (0.22), IQ2_XXS (0.26), IQ2_XS (0.29), IQ2_S (0.31), IQ2_M (0.34), IQ3_XXS (0.38), IQ3_XS (0.41), IQ3_S (0.43), IQ3_M (0.46), IQ4_XS (0.53), IQ4_NL (0.56)
- **GGUF T-quants**: TQ1_0 (0.21), TQ2_0 (0.26)
- **EXL2**: variable BPW slider 2.0-8.0 with 0.25 steps
- **bitsandbytes**: NF4 (0.5), INT8-LLM (1.0)
- **Other**: SmoothQuant W8A8 (1.0 weights + 1.0 activations), HQQ (variable)
- Picker UI: grouped by family (Native / GGUF / PTQ / EXL2 / Other), searchable
- Each option shows: bytes/param, quality hint (⭐⭐⭐⭐⭐ to ⭐), hardware requirements note

### Requirement 3: Batch Size with Continuous Batching
**User Story:** As a user, I want both static and continuous batching modes with accurate memory and throughput estimates.

**Acceptance Criteria:**
- Static batch mode: slider 1-256, integer steps
- Continuous batching mode: input `max_concurrent_seqs` (1-1024) and `avg_output_tokens` (16-4096)
- Continuous batching formula: `max_concurrent = free_VRAM_for_KV / kv_per_seq(avg_ctx)`
- Throughput with CB: `single_tok_s × min(max_concurrent, requested) × 0.7`
- Chunked prefill toggle: `max_num_batched_tokens` input (2048-65536)
- Shows: max achievable concurrency given VRAM, total throughput tok/s, throughput per request

### Requirement 4: KV Cache Precision Selector
**User Story:** As a user, I want to independently set KV cache precision to optimize long-context memory.

**Acceptance Criteria:**
- Options: FP32 (4B), FP16/BF16 (2B), FP8 E4M3 (1B), FP8 E5M2 (1B), INT8 (1B), INT4 (0.5B)
- Default: FP16 (even when weights are INT4)
- Shows quality impact tooltip: "FP8 KV: <0.1% ppl increase. INT4 KV: 0.5-2% ppl, visible degradation in retrieval tasks >32K context"
- Framework support matrix shown in tooltip: which framework supports which KV precision
- VRAM savings displayed: "FP8 KV saves 5.35 GB vs FP16 at 32K context"

## Tasks

- [ ] 1. Update `src/lib/formulas/vram.ts` — support all quantization bytes-per-param values
- [ ] 2. Create `src/data/quantization-types.ts` — comprehensive typed constant with all quant types, bytes/param, quality rating, hardware requirements
- [ ] 3. Update `src/components/calculator/PrecisionPicker.tsx` — grouped expandable picker for all quant families
- [ ] 4. Update `src/components/calculator/ContextSlider.tsx` — extend to 10M, add model-max indicator, context extension method dropdown
- [ ] 5. Create `src/components/calculator/BatchConfig.tsx` — static vs continuous batching toggle, max_concurrent_seqs, chunked prefill
- [ ] 6. Create `src/components/calculator/KVPrecisionPicker.tsx` — independent KV precision selector with savings display
- [ ] 7. Create `src/components/calculator/KVCurveChart.tsx` — small chart showing KV memory vs context length for current config
- [ ] 8. Update URL state to include: quantType, kvPrecision, batchMode, maxConcurrent, contextExtension
- [ ] 9. Write tests: Q4_K_M should compute 0.606 B/param, IQ2_XXS should compute 0.26 B/param, EXL2 4.65bpw should compute 0.581 B/param
- [ ] 10. Write test: KV cache at 128K context FP16 vs FP8 should show exactly 2× difference


