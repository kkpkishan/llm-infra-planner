
## Description

Add comprehensive KV cache optimization techniques, a serving framework comparison matrix, speculative decoding overhead, and tokenizer impact calculations.

## Requirements

### Requirement 1: KV Cache Variant Selector
**User Story:** As a user, I want to select my KV cache strategy so the memory estimate reflects actual serving conditions.

**Acceptance Criteria:**
- KV cache modes:
  - **Standard** (baseline): `2 × L × h_kv × head_dim × seq × batch × bytes`
  - **GQA** (auto-detected from model): h_kv < h → automatic reduction
  - **MQA** (h_kv=1): maximum KV savings
  - **MLA** (DeepSeek): `(kv_lora_rank + qk_rope_head_dim) × L × seq × batch × bytes`
  - **Sliding window** (Mistral): `min(seq, window_size)` instead of seq
  - **PagedAttention**: same total but fragmentation drops from 60-80% to <4% → show effective capacity gain
  - **Prefix caching**: show KV reuse % input (0-90%), reduces allocated KV for shared-prefix workloads
  - **KV quantization**: FP16 → FP8 (2× savings, <0.1% ppl) → INT8 (2× savings, ~0.1% ppl) → INT4 (4× savings, 0.5-2% ppl degradation)
- Auto-selects based on model config (GQA/MQA/MLA/SWA detected from architecture fields)
- Shows KV per token reference table (from addendum §5.1)

### Requirement 2: Serving Framework Comparison
**User Story:** As a user, I want to see which serving framework works best for my model/GPU combo.

**Acceptance Criteria:**
- Framework matrix covering: vLLM, SGLang, TRT-LLM, TGI, llama.cpp, Ollama, MLX, ExLlamaV2, LMDeploy, MLC-LLM, DeepSpeed-FastGen, Aphrodite
- For each framework: supported hardware (NV/AMD/Intel/Apple/TPU), supported quantizations (FP8/INT8/INT4/AWQ/GPTQ/GGUF/EXL2), TP support, PP support, speculative decoding, prefix cache, PagedAttention
- Shows framework-specific efficiency factor for tokens/sec calculation (llama.cpp 0.55-0.70, vLLM 0.75-0.90, TRT-LLM 0.85-0.95)
- Recommends framework based on: GPU vendor + quantization format + workload type
- Links to framework docs

### Requirement 3: Speculative Decoding Calculator
**User Story:** As a user, I want to know the memory overhead and speedup of speculative decoding.

**Acceptance Criteria:**
- Input: toggle speculative decoding ON/OFF
- If ON: select draft method (Draft model 1B, Medusa, EAGLE-2, EAGLE-3, Lookahead, Prompt Lookup)
- Computes extra VRAM: draft model params + draft KV cache (~60 MB per 4k seq for 1B draft)
- Shows estimated speedup range (1.5-3× for draft-target, 3-6.5× for EAGLE-3)
- Warns: "Only effective at batch ≤ 8; diminishes at large batch"

### Requirement 4: Tokenizer Impact
**User Story:** As a user, I want to understand how my model's tokenizer affects VRAM and throughput.

**Acceptance Criteria:**
- Shows tokenizer info from model config: type (BPE/SentencePiece/tiktoken), vocab size, special tokens
- Computes embedding layer VRAM: `vocab_size × hidden_size × (2 if not tied else 1) × bytes_per_param`
- Shows vocab size as % of total params (Gemma-2 2B: vocab layer = ~30% of model!)
- Shows fertility metric: tokens/word for English (~1.1-1.3), CJK (~2-3), other languages
- Tooltip: "Larger vocab = bigger embedding layer but fewer tokens per document = faster processing per word"

## Tasks

- [ ] 1. Create `src/lib/formulas/kv-cache.ts` — all KV variants: standard, GQA, MQA, MLA, sliding-window, paged, prefix-cache, quantized
- [ ] 2. Create `src/lib/formulas/speculative.ts` — draft model VRAM, KV overhead, speedup estimates
- [ ] 3. Create `src/lib/formulas/tokenizer.ts` — embedding VRAM, vocab % of model, fertility lookup
- [ ] 4. Create `src/data/serving-frameworks.ts` — typed constant with framework matrix data
- [ ] 5. Create `src/components/calculator/KVCacheConfig.tsx` — KV variant selector (auto-detected + manual override), KV quant picker
- [ ] 6. Create `src/components/calculator/FrameworkPicker.tsx` — framework recommendation with comparison table
- [ ] 7. Create `src/components/calculator/SpeculativeConfig.tsx` — toggle + draft method picker + overhead display
- [ ] 8. Create `src/components/calculator/TokenizerInfo.tsx` — shows tokenizer stats, embedding VRAM, fertility
- [ ] 9. Update VRAMBreakdown to show KV cache with variant-specific formula
- [ ] 10. Update throughput formula to use framework-specific efficiency factor
- [ ] 11. Write tests: Llama-3 8B KV at 32k should be ~1.0 GB (GQA), DeepSeek-V3 KV at 8k should be ~550 MB (MLA), Mistral 7B SWA at 32k should cap at ~512 MB


