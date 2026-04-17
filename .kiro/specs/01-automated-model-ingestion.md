
## Description

Build an automated pipeline that discovers, validates, and ingests new LLM models from HuggingFace Hub daily. The system must handle dense transformers, MoE, MLA (DeepSeek), vision-language, SSM/Mamba, and hybrid architectures. It must extract architecture params from `config.json`, parameter counts from safetensors metadata, and GGUF metadata from binary headers — then validate, normalize, and write to `public/data/models.json`.

## Requirements

### Requirement 1: HuggingFace Hub Discovery Service
**User Story:** As a developer, I want the system to automatically discover trending and newly released LLM models so users always see the latest models without manual updates.

**Acceptance Criteria:**
- System queries HF Hub API (`GET /api/models`) with filters: `pipeline_tag=text-generation`, `library=transformers`, sorted by `trendingScore` and `lastModified`
- Supports `expand` params: `safetensors`, `gguf`, `config`, `transformersInfo`, `cardData`, `downloads`, `likes`, `tags`
- Uses `HF_TOKEN` env var for authenticated requests (higher rate limits)
- Handles pagination via `Link: next` header
- Implements exponential backoff on HTTP 429
- Handles gated repos gracefully (marks as `gated: true`, keeps last-known data)
- Discovers models from official org allowlist: `meta-llama`, `mistralai`, `Qwen`, `google`, `microsoft`, `deepseek-ai`, `CohereForAI`, `allenai`, `nvidia`, `ibm-granite`, `tiiuae`, `stabilityai`, `state-spaces`, `internlm`, `THUDM`, `01-ai`, `baichuan-inc`
- Also discovers community models with >1000 downloads in last 30 days

### Requirement 2: config.json Parser
**User Story:** As a developer, I want the parser to extract all architecture fields from any model's config.json so the calculator can compute VRAM accurately for any architecture.

**Acceptance Criteria:**
- Extracts core fields: `num_hidden_layers`, `hidden_size`, `intermediate_size`, `num_attention_heads`, `num_key_value_heads`, `head_dim`, `vocab_size`, `max_position_embeddings`, `model_type`, `architectures`, `tie_word_embeddings`, `torch_dtype`
- Extracts RoPE fields: `rope_theta`, `rope_scaling` (type, factor), `rope_type`
- Extracts sliding window: `sliding_window`, `max_window_layers`
- Computes `head_dim = hidden_size / num_attention_heads` when not explicit
- Handles nested configs: `text_config`, `vision_config`, `language_config`
- Maps `architectures[0]` to internal `modelFamily` enum

### Requirement 3: Architecture Detection Engine
**User Story:** As a developer, I want the system to automatically classify models into architecture types (dense, MoE, MLA, VLM, SSM, hybrid) so the correct VRAM formula is applied.

**Acceptance Criteria:**
- **MoE detection**: presence of `num_local_experts > 1` OR `num_experts > 1` OR `n_routed_experts > 1`; extracts `num_experts_per_tok`, `moe_intermediate_size`, `shared_expert_intermediate_size`, `n_shared_experts`, `first_k_dense_replace`
- **MoE param computation:**
  ```
  routed_total  = n_experts * 3 * d * moe_intermediate_size
  routed_active = experts_per_tok * 3 * d * moe_intermediate_size
  shared_ffn    = 3 * d * shared_expert_intermediate_size
  dense_layers  = first_k_dense_replace (default 0)
  moe_layers    = L - dense_layers
  total_params  = dense_layers*(3*d*d_ff) + moe_layers*(routed_total + shared_ffn) + attn + embed
  active_params = dense_layers*(3*d*d_ff) + moe_layers*(routed_active + shared_ffn) + attn + embed
  ```
- **MLA detection**: presence of `kv_lora_rank` in config; extracts `kv_lora_rank`, `qk_rope_head_dim`, `q_lora_rank`, `v_head_dim`; computes compressed KV dim = `kv_lora_rank + qk_rope_head_dim`
- **VLM detection**: presence of `vision_config` OR `vision_tower` OR `image_token_index` OR architecture ending in `ForConditionalGeneration` with vision config; extracts vision encoder params separately
- **SSM/Mamba detection**: `model_type ∈ {mamba, mamba2, falcon_mamba, recurrent_gemma}`; extracts `state_size`, `conv_kernel`, `expand`, `time_step_rank`
- **Hybrid detection**: `layer_types` list with mixed entries OR `attn_layer_period/offset` + `expert_layer_period/offset` (Jamba, Zamba, Granite-Hybrid)
- All detections are tested against at least 5 real model configs each

### Requirement 4: Parameter Count Extraction
**User Story:** As a developer, I want accurate parameter counts from multiple sources so the calculator never shows wrong VRAM estimates.

**Acceptance Criteria:**
- Primary: HF safetensors metadata via `expand=["safetensors"]` → `safetensors.parameters.BF16` or `.total`
- Secondary: HTTP Range request on first 100KB of `.safetensors` file → parse header JSON → sum `dtype_bytes × prod(shape)` per tensor
- Tertiary: sharded models via `model.safetensors.index.json` → `metadata.total_size`
- Fallback: computed from config using the dense/MoE estimator formulas
- Cross-validation: if `|safetensors_count - estimated_count| / safetensors_count > 0.10` → flag for manual review
- Name-hint extraction: regex `(\d+(?:\.\d+)?)[ ]?[Bb]\b` from repo name → cross-check

### Requirement 5: GGUF Metadata Extraction
**User Story:** As a developer, I want the system to parse GGUF file headers to extract architecture, quantization type, and tokenizer info for llama.cpp-native models.

**Acceptance Criteria:**
- Reads GGUF magic (`0x46554747`), version 3, KV metadata via HTTP Range request (first 4MB covers 99% of headers)
- Extracts: `general.architecture`, `general.file_type` (maps to quant type), `general.name`, `{arch}.block_count`, `{arch}.embedding_length`, `{arch}.feed_forward_length`, `{arch}.context_length`, `{arch}.attention.head_count`, `{arch}.attention.head_count_kv`, `{arch}.rope.freq_base`, `{arch}.expert_count`, `{arch}.expert_used_count`
- Extracts tokenizer: `tokenizer.ggml.model`, `tokenizer.ggml.tokens` count, `tokenizer.ggml.bos_token_id`, `tokenizer.ggml.eos_token_id`
- Maps `general.file_type` int → quant label (7=Q8_0, 15=Q4_K_M, etc.)
- Uses `@huggingface/gguf` npm package or custom binary parser

### Requirement 6: Validation & Normalization
**User Story:** As a developer, I want strict validation so no bad data enters the model database.

**Acceptance Criteria:**
- Zod schema validation for all ModelSpec fields
- Required: `hidden_size`, `num_hidden_layers`, `vocab_size`, `architectures`
- Invariants: `hidden_size % num_attention_heads == 0`, `num_attention_heads % num_key_value_heads == 0`, `num_experts_per_tok <= num_local_experts`
- Sanity ranges: `hidden_size ∈ [64, 65536]`, `num_hidden_layers ∈ [1, 200]`, `vocab_size ∈ [100, 1000000]`, `params ∈ [1M, 2T]`
- Quantized-variant detection: regex for GGUF/GPTQ/AWQ/EXL2/MLX/bnb-4bit in repo name → group by base model, mark `isQuantizedVariant: true`
- Dedup by normalized base name (strip quant suffix, org prefix)

### Requirement 7: CI/CD Pipeline
**User Story:** As a developer, I want a daily GitHub Action that runs the ingestion and opens PRs with changes.

**Acceptance Criteria:**
- GitHub Actions cron: `17 3 * * *` (daily 3:17 UTC)
- Runs `scripts/ingest-models.ts` with Node 24
- Incremental mode: skips models where HF `lastModified` unchanged (caches in `data/.model-cache.json`)
- Full refresh weekly (Sundays)
- Validates output with `scripts/validate-data.ts`
- If diff exists in `public/data/models.json`: creates auto-PR titled `chore(data): update model database — YYYY-MM-DD`
- PR body lists: added models, updated models, removed models (tombstoned)
- 45-minute timeout
- Fails loudly on schema violations (blocks PR merge)
- Stores ingestion log as artifact

## Tasks

- [ ] 1. Create `src/types/model.ts` with full `ModelSpec` TypeScript interface + Zod schema including all MoE, MLA, VLM, SSM, hybrid fields
- [ ] 2. Create `scripts/lib/hf-client.ts` — HuggingFace Hub API client with auth, pagination, rate-limit retry, expand params
- [ ] 3. Create `scripts/lib/config-parser.ts` — parses config.json into normalized `ModelSpec.architecture`, handles all nested config patterns
- [ ] 4. Create `scripts/lib/arch-detector.ts` — classifies architecture type (dense/MoE/MLA/VLM/SSM/hybrid) from parsed config, computes total vs active params for MoE
- [ ] 5. Create `scripts/lib/safetensors-parser.ts` — extracts param counts from safetensors metadata (API expand, Range header, index.json fallback)
- [ ] 6. Create `scripts/lib/gguf-parser.ts` — parses GGUF binary header via Range request, extracts arch/quant/tokenizer metadata
- [ ] 7. Create `scripts/lib/param-estimator.ts` — computes params from config fields using dense and MoE formulas, cross-validates against safetensors count
- [ ] 8. Create `scripts/lib/model-validator.ts` — Zod validation + sanity checks + dedup + quantized-variant grouping
- [ ] 9. Create `scripts/ingest-models.ts` — main orchestrator: reads `data/models.yml` allowlist, discovers via HF API, parses, validates, writes `public/data/models.json` + `data/.model-cache.json`
- [ ] 10. Create `data/models.yml` — curated list of ~100 model HF IDs across all families (Llama, Mistral, Qwen, DeepSeek, Gemma, Phi, Yi, Cohere, Grok, VLMs, embeddings)
- [ ] 11. Create `data/models-override.yml` — manual overrides for fields not in config (MoE active params, MLA d_c, training tokens) with `source:` URL
- [ ] 12. Create `.github/workflows/ingest-models.yml` — daily cron + manual dispatch, incremental/full modes, auto-PR
- [ ] 13. Write unit tests for config-parser covering: Llama-3.1-8B (dense GQA), Mixtral-8x22B (MoE), DeepSeek-V3 (MLA+MoE), Llama-4-Scout (MoE+iRoPE), Qwen2-VL-7B (VLM), Phi-3.5-MoE, Mamba-2.8B (SSM), Jamba-1.5 (hybrid)
- [ ] 14. Write integration test: run full pipeline on 10 models, compare output against hand-verified golden file
- [ ] 15. Create `scripts/validate-data.ts` — CI validation step: JSON Schema check + sanity ranges + cross-model consistency


