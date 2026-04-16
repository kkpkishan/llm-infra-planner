# LLM Hardware Calculator — Full Build Specification

---

## Table of Contents

1. [Executive Summary & Vision](#1-executive-summary--vision)
2. [Competitive Analysis](#2-competitive-analysis)
3. [Feature List — MVP vs Full](#3-feature-list--mvp-vs-full)
4. [User Personas & Use Cases](#4-user-personas--use-cases)
5. [Detailed Calculation Formulas](#5-detailed-calculation-formulas)
6. [Model Database Schema + Sample Entries](#6-model-database-schema--sample-entries)
7. [Hardware Database Schema + Sample Entries](#7-hardware-database-schema--sample-entries)
8. [Cloud Provider Database Schema + Sample Entries](#8-cloud-provider-database-schema--sample-entries)
9. [Clustering Logic / Decision Tree](#9-clustering-logic--decision-tree)
10. [OS & Software Stack Recommendations](#10-os--software-stack-recommendations)
11. [UI/UX Specification](#11-uiux-specification)
12. [Tech Stack Recommendation](#12-tech-stack-recommendation)
13. [Data Sources & Update Strategy](#13-data-sources--update-strategy)
14. [API / Backend](#14-api--backend)
15. [Roadmap (MVP → v1 → v2)](#15-roadmap-mvp--v1--v2)
16. [References & Citations](#16-references--citations)

---

## 1. Executive Summary & Vision

### 1.1 What we are building
A production-quality, accuracy-first web application that helps users answer three questions:

1. **"What hardware do I need to run / fine-tune / train model X?"**
2. **"Should I buy hardware, or rent in the cloud — and what exactly should I buy or rent?"**
3. **"How much will it cost me per hour, per request, and per million tokens?"**

The app covers four workloads across the full LLM lifecycle:
- **Inference (single user)** — chat, coding assistants, local experimentation
- **Inference at scale** — multi-user APIs, throughput-oriented serving
- **Fine-tuning** — LoRA, QLoRA, full-parameter fine-tuning
- **Pre-training from scratch** — multi-node distributed training

### 1.2 Why it exists
Existing calculators (see §2) solve slices of the problem:
- Some compute VRAM only; none integrate buy-vs-rent decisions.
- None cover end-to-end from "single RTX 3060 for 7B inference" to "512× H200 for pretraining a 70B model."
- None give current cloud pricing across AWS/Azure/GCP/specialty providers with spot discounts.
- None suggest OS, driver, framework, and clustering topology.

### 1.3 Core design principles
1. **Accuracy over convenience.** Every formula cites a source. Numbers can be reproduced by hand.
2. **Transparency.** Every output shows its inputs, formulas, and assumptions.
3. **No hallucinated numbers.** All model specs are fetched from HuggingFace configs or official model cards. All GPU specs from NVIDIA/AMD/Apple datasheets. All cloud prices from official pricing pages.
4. **Local-first.** Calculator runs fully client-side; database shipped as static JSON.
5. **Evergreen.** Data layer is versioned and separated from logic; a weekly job can refresh prices.

---

## 2. Competitive Analysis

### 2.1 Alex Ziskind — `llm-inference-calculator`
**URL:** `https://llm-inference-calculator-rki02.kinsta.page/`
**Repo:** `https://github.com/alexziskind1/llm-inference-calculator`

**What it does well:**
- Focused on **inference on consumer/Apple Silicon hardware.**
- Model dropdown → quantization picker → shows fit on selected device.
- Includes Apple Silicon (unified memory) as a first-class citizen — rare and valuable.
- Memory-bandwidth-based tokens/sec estimate.

**Limitations:**
- Single-user inference only; no batching, no training, no cloud.
- No KV-cache breakdown vs weights vs overhead.
- No MoE handling (active vs total params).

**Takeaway for us:** Adopt their approach of making Apple Silicon first-class and showing device-fit badges (🟢 fits / 🟡 tight / 🔴 over budget).

### 2.2 Ray Fernando — `llm-calc`
**URL:** `https://llm-calc.rayfernando.ai/?ram=24`

**What it does well:**
- **Shareable URLs via query params** — `?ram=24` prefills state. Excellent UX.
- Very fast, minimal, mobile-friendly.
- Inverts the question: *"Given I have X GB, what models can I run?"* — great for buyers with fixed hardware.

**Limitations:**
- Simplified formulas (no KV cache, no GQA).
- No training, no cloud.

**Takeaway for us:** Ship shareable URLs on day 1. Support **both directions** of the query (hardware → models AND model → hardware).

### 2.3 Alexander Smirnov — `vram-calculator`
**URL:** `https://vram.asmirnov.xyz/`
**Repo:** `https://github.com/furiousteabag/vram-calculator`
**Core file:** `app/_lib/index.ts`

**What it does well (and what we will inherit directly):**
- **The most rigorous open-source VRAM formula.** Separates weights, KV cache, activations, gradients, optimizer states, CUDA/framework overhead.
- Handles inference and training modes.
- Handles GQA (Grouped Query Attention) via `num_key_value_heads`.
- Supports FP32 / FP16/BF16 / INT8 / INT4 precisions with exact byte counts.
- Adam optimizer states (2× params in FP32 = 8 bytes/param).
- Mixed precision training accounting.

**Its core math (which we adopt as baseline):**

```
weights_bytes    = num_params * bytes_per_param(precision)
kv_cache_bytes   = 2 * num_layers * batch * seq_len * num_kv_heads * head_dim * bytes_per_param
activations_bytes (training, no checkpointing)
                 = batch * seq_len * hidden_size * num_layers * (34 + 5 * seq_len * num_heads / hidden_size)
                   * bytes_per_param  [approximation from Korthikanti et al. 2022]
gradients_bytes  = num_params * bytes_per_param   (training only)
optimizer_bytes  = num_params * 8                  (Adam, mixed precision: fp32 master + m + v)
overhead_bytes   ≈ 1 GB (CUDA context) + framework-specific
total_bytes      = sum of the above
```

**Limitations:**
- No cloud suggestions, no tokens/sec, no multi-GPU planning, no MoE active-params handling, no fine-tuning variants (LoRA/QLoRA).

**Takeaway for us:** Use this as the VRAM kernel. Extend with everything else.

### 2.4 Feature superset (what *we* ship)

| Feature | Ziskind | Ray Fernando | Smirnov | **Ours** |
|---|---|---|---|---|
| Weights-only VRAM | ✅ | ✅ | ✅ | ✅ |
| KV cache (GQA-aware) | ❌ | ❌ | ✅ | ✅ |
| Activation memory | ❌ | ❌ | ✅ | ✅ |
| Training (full FT) | ❌ | ❌ | ✅ | ✅ |
| LoRA / QLoRA | ❌ | ❌ | ❌ | ✅ |
| Pre-training / FLOPs | ❌ | ❌ | ❌ | ✅ |
| MoE active params | ❌ | ❌ | ❌ | ✅ |
| Multi-user throughput | ❌ | ❌ | ❌ | ✅ |
| Tokens/sec estimate | ✅ | partial | ❌ | ✅ |
| Consumer + datacenter GPUs | ❌ | ❌ | ❌ | ✅ |
| Apple Silicon | ✅ | ❌ | ❌ | ✅ |
| Cloud instance picker | ❌ | ❌ | ❌ | ✅ |
| Price per M tokens | ❌ | ❌ | ❌ | ✅ |
| Multi-GPU / clustering | ❌ | ❌ | ❌ | ✅ |
| OS & framework recs | ❌ | ❌ | ❌ | ✅ |
| Shareable URLs | ❌ | ✅ | ❌ | ✅ |
| Comparison mode | ❌ | ❌ | ❌ | ✅ |

---

## 3. Feature List — MVP vs Full

### 3.1 MVP (v0.1 — ship in 4–6 weeks)

**Inputs**
- Model picker (dropdown with search, ~40 popular models)
- Precision picker (FP16, BF16, INT8, INT4, GGUF Q4_K_M, Q5_K_M, Q8_0)
- Context length slider (1k → 128k)
- Batch size (1 → 32)
- Use case toggle (Inference / Fine-tune / Train)

**Outputs**
- Total VRAM required (GB) with stacked-bar breakdown: weights / KV cache / activations / overhead
- Fit status against every GPU in the DB (green/yellow/red)
- 3 recommended GPUs (Budget / Balanced / Performance tier)
- 3 recommended cloud instances (AWS / GCP / specialty) with $/hour
- Tokens/second estimate (roofline)
- Shareable URL

### 3.2 v1 (3 months)
- Fine-tuning mode with LoRA/QLoRA toggles, trainable-param-ratio slider
- Inference-at-scale mode: concurrent users, target QPS → replicas needed
- Multi-GPU / multi-node suggestions (TP / PP / ZeRO / FSDP)
- Cost-per-million-tokens output
- Comparison mode (side-by-side 3 configs)
- Custom model architecture input (advanced mode)
- Dark mode, responsive, a11y (WCAG AA)

### 3.3 v2 (6 months+)
- Full pre-training mode with Chinchilla-optimal calculator, MFU slider, wall-clock time estimate
- MoE-aware calculations (DeepSeek-V3 style)
- Vision-language / embedding / diffusion model support
- Live cloud pricing via backend API (daily refresh)
- "What can I run on my hardware?" reverse mode
- Saved scenarios (account + sync, optional)
- Export to PDF / JSON / Terraform-starter

---

## 4. User Personas & Use Cases

### P1 — Hobbyist Hakim (Ahmedabad)
"I have ₹2 lakh to spend on a desktop for running local LLMs. What GPU gives me the best bang for buck for Llama-3.1-8B and Qwen-2.5-14B at 32k context?"
→ Needs: consumer GPU DB, INR pricing hints, power draw / PSU guidance.

### P2 — Startup Engineer Sarah
"We're serving 50 concurrent users on a Llama-3.3-70B chat API. What instance on AWS / RunPod is cheapest, and do I need one GPU or four?"
→ Needs: throughput math (continuous batching, vLLM), cloud price comparison, replicas.

### P3 — ML Researcher Ravi
"I want to QLoRA fine-tune Qwen-2.5-72B on a 50k-sample dataset. Will it fit on 2× H100 80GB? How long and how much?"
→ Needs: training memory math, LoRA-specific overheads, runtime estimate, spot-price options.

### P4 — Enterprise Architect Elena
"Board wants to pretrain a 70B model in-house. Budget, timeline, cluster size, network topology?"
→ Needs: `6·N·D` FLOPs, MFU, Chinchilla tokens, node count, InfiniBand guidance, training framework pick.

### P5 — Buyer Bao
"I already own a 4090 and 64 GB RAM. Show me every model I can run well."
→ Needs: reverse mode — hardware-first.

---

## 5. Detailed Calculation Formulas

> **All formulas below are derived from published papers and framework docs.** Sources cited inline. Every output in the UI must show the formula used and the inputs plugged in.

### 5.1 Model weights

```
weights_GB = num_params × bytes_per_param / 1e9
```

| Precision | Bytes / param | Notes |
|---|---|---|
| FP32 | 4.0 | Full precision, legacy training |
| TF32 | 4.0 (stored) | NVIDIA Ampere+ compute format |
| FP16 | 2.0 | IEEE half, can overflow |
| BF16 | 2.0 | Brain float, preferred for training |
| FP8 (E4M3 / E5M2) | 1.0 | H100+, B200 |
| INT8 | 1.0 | Post-training quantization (PTQ) |
| INT4 (GPTQ / AWQ) | 0.5 | ~0.5 bits overhead for scales/zeros ⇒ ~4.25–4.5 effective |
| GGUF Q2_K | ~2.56 bits = 0.32 | Aggressive, quality loss |
| GGUF Q3_K_M | ~3.91 bits = 0.49 | |
| GGUF Q4_0 | 4.5 bits = 0.5625 | |
| GGUF Q4_K_M | ~4.85 bits = 0.606 | **Default sweet-spot** |
| GGUF Q5_K_M | ~5.69 bits = 0.711 | |
| GGUF Q6_K | ~6.56 bits = 0.820 | |
| GGUF Q8_0 | 8.5 bits = 1.0625 | Near-lossless |

*Bit widths from the `llama.cpp` k-quants reference; include 0.06–0.5 bits for block-wise scales/mins depending on quant type.*

**MoE handling.** For Mixture-of-Experts models (Mixtral, DeepSeek-V3, Qwen3-MoE):
- **Weights on disk / VRAM** use **total parameters** (all experts loaded).
- **Compute (tokens/sec, FLOPs)** uses **activated parameters** only (typically 2 of N experts).
- Example DeepSeek-V3: 671 B total / 37 B active → VRAM budget sized to 671 B, speed estimated from 37 B.

### 5.2 KV cache (inference)

The canonical formula, GQA-aware:

```
kv_cache_bytes = 2 × num_layers × batch × seq_len × num_kv_heads × head_dim × bytes_per_param

where:
  2              = one K + one V
  num_kv_heads   = num_attention_heads for MHA;
                 = num_attention_heads / groups for GQA;
                 = 1 for MQA (Multi-Query Attention)
  head_dim       = hidden_size / num_attention_heads
  bytes_per_param = precision of KV cache (often FP16 even when weights are INT4)
```

**Example — Llama-3.1-8B at 32k context, batch=1, FP16 KV:**
- layers=32, num_kv_heads=8 (GQA), head_dim=128
- KV = 2 × 32 × 1 × 32768 × 8 × 128 × 2 = **4.29 GB**

**MLA (Multi-head Latent Attention, DeepSeek-V2/V3).** Much smaller KV cache:
```
kv_cache_bytes_MLA ≈ num_layers × batch × seq_len × d_c × bytes
  where d_c (compressed latent dim) ≈ 512 for DeepSeek-V2 vs ~16k effective in MHA
```
Store `d_c` per model in DB; fall back to GQA formula when unknown.

### 5.3 Activations (training)

Korthikanti et al. 2022 ("Reducing Activation Recomputation in Large Transformer Models"):

```
# Per-layer activation memory, FP16/BF16
act_per_layer = s·b·h·(34 + 5·s·a/h) × 2 bytes

where s = seq_len, b = batch, h = hidden_size, a = num_attention_heads
```

**With selective activation recomputation** (default in Megatron, FSDP):
```
act_per_layer ≈ s·b·h·34 × 2 bytes      (drops the 5·s·a/h term)
```

**With full gradient checkpointing:**
```
act_total ≈ sqrt(num_layers) × act_per_layer   (classic checkpointing)
```

### 5.4 Gradients + Optimizer states (training)

| Strategy | Extra memory |
|---|---|
| Full FP32 Adam | grads (4·N) + m (4·N) + v (4·N) = **12·N bytes** on top of weights |
| Mixed precision (FP16 + FP32 master, Adam) | grads (2·N) + FP32 master (4·N) + m (4·N) + v (4·N) = **14·N bytes** above FP16 weights |
| ZeRO-1 (optimizer shard) | optimizer states ÷ DP_world_size |
| ZeRO-2 (optimizer + grads) | (optimizer + grads) ÷ DP_world_size |
| ZeRO-3 / FSDP (full shard) | (optimizer + grads + weights) ÷ DP_world_size |
| 8-bit Adam (bitsandbytes) | m,v in 8-bit: grads (2N) + master (4N) + m (N) + v (N) = **8·N bytes** |

Sources: DeepSpeed ZeRO paper (Rajbhandari et al. 2020), PyTorch FSDP docs.

### 5.5 LoRA / QLoRA

**LoRA** (Hu et al. 2021): freeze base, train rank-r adapters on selected modules.

```
trainable_params = Σ_modules (r × (d_in + d_out))

# Typical defaults: r=8 or 16, target = q_proj, k_proj, v_proj, o_proj (sometimes MLP too)
# Trainable fraction is usually 0.1%–1% of base params.

training_memory ≈ base_weights (frozen, forward only)
               + activations (full)
               + gradients (only for trainable params)
               + optimizer states (only for trainable params)
```

**QLoRA** (Dettmers et al. 2023): base weights in 4-bit NF4, LoRA adapters in BF16.

```
base_weights_GB   = N_base × 0.5 + overhead (NF4 blockwise scales)
adapter_weights   = trainable_params × 2 bytes
gradients         = trainable_params × 2 bytes (BF16)
optimizer (paged AdamW 8-bit, default) = trainable_params × ~2 bytes
activations       = full (dominant cost — use gradient checkpointing!)
```

**Rule of thumb (verified with bitsandbytes/HF-PEFT defaults):**
- 7 B model QLoRA: ~10 GB VRAM @ 4k context → fits on 1× RTX 3090/4090.
- 13 B model QLoRA: ~16 GB → tight on 24 GB.
- 70 B model QLoRA: ~48 GB → 1× A100 80GB or 2× 4090 with FSDP.

### 5.6 Inference throughput (roofline)

For memory-bound decoding (the usual case):

```
tokens_per_sec_per_request ≈ memory_bandwidth_GB/s / weights_GB_active
```

Where `weights_GB_active` = weights actually read per forward pass (use **active** params for MoE).

**Examples:**
- Llama-3.1-8B FP16 (16 GB) on RTX 4090 (1008 GB/s) → ~63 tok/s (single batch). Matches empirical ~55–70.
- Llama-3.1-8B Q4_K_M (~4.8 GB) on RTX 4090 → ~210 tok/s theoretical; empirical ~140–180 (kernel overhead).
- DeepSeek-V3 (37 B active, FP8 ≈ 37 GB) on 8× H100 (3.35 TB/s each, but ~sharded) → complex; use per-GPU active share.

Apply a **practical efficiency factor** of 0.6–0.85 depending on framework:
- llama.cpp / Metal: 0.55–0.70
- vLLM / TGI (batched): 0.75–0.90 (higher due to compute utilization)
- TensorRT-LLM: 0.85–0.95

### 5.7 Continuous batching & PagedAttention (vLLM)

Throughput scales near-linearly with batch size until KV-cache VRAM runs out.

```
max_concurrent_seqs ≈ free_VRAM_for_kv / kv_per_seq(seq_len_avg)
throughput_total_tok_s ≈ single_seq_tok_s × min(batch, max_concurrent_seqs) × 0.7
```

With **PagedAttention**, KV memory fragmentation drops to <4% vs 60–80% naive → roughly 3–5× more concurrent sequences at same VRAM.

### 5.8 Required replicas for target QPS

```
required_GPUs = ceil( target_output_tok_s / throughput_per_GPU_tok_s )
target_output_tok_s = QPS × avg_output_tokens
```

Add 20–30% headroom for P99 latency.

### 5.9 Pre-training compute (6·N·D rule)

Kaplan et al. 2020 / Hoffmann et al. 2022 (Chinchilla):

```
training_FLOPs ≈ 6 × N × D
  N = non-embedding params
  D = training tokens

Chinchilla-optimal: D ≈ 20 × N   (for compute-optimal loss at fixed budget)
```

**Wall-clock time:**

```
time_seconds = training_FLOPs / (num_GPUs × peak_FLOPS_per_GPU × MFU)

MFU (Model FLOPs Utilization) typical values:
  - Dense transformer, well-tuned Megatron-LM on H100:  45–55%
  - FSDP/PyTorch, reasonable tuning:                     35–45%
  - MoE models:                                          25–35%
  - First attempt, small team:                           20–30%
```

**Worked example — Llama-3-70B pretraining:**
- N = 70 B, D = 15 T tokens (what Meta used)
- FLOPs = 6 × 70e9 × 15e12 = 6.3e24
- 16,000× H100 (Meta's cluster) × 989 TFLOPS BF16 × 40% MFU = 6.33e18 FLOP/s
- Time = 6.3e24 / 6.33e18 = 995,000 s ≈ **11.5 days** (matches Meta's reported ~30M H100-hours).

### 5.10 Vector DB / RAG storage

```
vector_DB_GB = num_chunks × (embedding_dim × 4 + metadata_bytes) / 1e9
  e.g. 10M chunks × (1024 × 4 + 500B) = ~46 GB

index_overhead: HNSW ~1.5×, IVF-PQ ~0.3×
```

### 5.11 Network bandwidth for distributed training

Per ZeRO-3 / FSDP all-gather + reduce-scatter per step:
```
bytes_moved_per_step ≈ 2 × model_size_GB (all-gather forward + reduce-scatter backward)
time_for_collective = bytes / effective_bisection_bandwidth
```

Rule: **InfiniBand NDR (400 Gb/s) or better** required above ~8 nodes for FSDP to not bottleneck; NVLink/NVSwitch within-node is essential above 13B dense.

---

## 6. Model Database Schema + Sample Entries

### 6.1 Schema (TypeScript)

```ts
interface ModelSpec {
  id: string;                          // "meta-llama/Llama-3.1-8B"
  family: "llama" | "mistral" | "qwen" | "deepseek" | "gemma"
        | "phi" | "yi" | "command-r" | "grok" | "vlm" | "embedding"
        | "diffusion" | "closed";
  displayName: string;
  releaseDate: string;                 // ISO
  license: string;                     // "Llama 3.1 Community" | "Apache-2.0" | ...
  paramsTotal: number;                 // 8_030_000_000
  paramsActive?: number;               // for MoE
  architecture: {
    numLayers: number;                 // hidden layers
    hiddenSize: number;
    intermediateSize: number;
    numAttentionHeads: number;
    numKeyValueHeads: number;          // GQA
    headDim: number;                   // usually hidden/heads
    vocabSize: number;
    tieWordEmbeddings: boolean;
    attentionType: "mha" | "gqa" | "mqa" | "mla";
    maxContextLength: number;
    positionalEmbedding: "rope" | "alibi" | "yarn" | "learned";
  };
  moe?: {
    numExperts: number;
    expertsPerToken: number;
    sharedExperts?: number;
  };
  trainingTokens?: number;             // 15e12 for Llama-3
  notes?: string;
  huggingfaceId?: string;
  apiOnly?: boolean;                   // true for GPT-4, Claude, Gemini
}
```

### 6.2 Sample entries (authoritative — from HF configs and model cards)

> **Important:** numbers below reflect public HF `config.json` values as of research date. The DB ingestion script should re-fetch these on build to guarantee accuracy.

**Llama family (Meta)**
| Model | Total params | Layers | Hidden | Heads | KV heads | Ctx | Attn |
|---|---|---|---|---|---|---|---|
| Llama-2-7B | 6.74 B | 32 | 4096 | 32 | 32 | 4 k | MHA |
| Llama-2-13B | 13.02 B | 40 | 5120 | 40 | 40 | 4 k | MHA |
| Llama-2-70B | 68.98 B | 80 | 8192 | 64 | 8 | 4 k | GQA |
| Llama-3-8B | 8.03 B | 32 | 4096 | 32 | 8 | 8 k | GQA |
| Llama-3-70B | 70.55 B | 80 | 8192 | 64 | 8 | 8 k | GQA |
| Llama-3.1-8B | 8.03 B | 32 | 4096 | 32 | 8 | 128 k | GQA+RoPE-scaled |
| Llama-3.1-70B | 70.55 B | 80 | 8192 | 64 | 8 | 128 k | GQA |
| Llama-3.1-405B | 405.85 B | 126 | 16384 | 128 | 16 | 128 k | GQA |
| Llama-3.2-1B | 1.24 B | 16 | 2048 | 32 | 8 | 128 k | GQA |
| Llama-3.2-3B | 3.21 B | 28 | 3072 | 24 | 8 | 128 k | GQA |
| Llama-3.2-11B-Vision | 11 B | 32 | 4096 | 32 | 8 | 128 k | GQA+ViT |
| Llama-3.2-90B-Vision | 90 B | 80 | 8192 | 64 | 8 | 128 k | GQA+ViT |
| Llama-3.3-70B | 70.55 B | 80 | 8192 | 64 | 8 | 128 k | GQA |
| Llama-4-Scout (17B-A-16E) | 109 B total / 17 B active | 48 | 5120 | 40 | 8 | 10 M | GQA+MoE |
| Llama-4-Maverick (17B-A-128E) | 400 B total / 17 B active | 48 | 5120 | 40 | 8 | 1 M | GQA+MoE |

**Mistral**
| Model | Total | Active | Layers | Hidden | Heads | KV heads | Ctx |
|---|---|---|---|---|---|---|---|
| Mistral-7B-v0.3 | 7.25 B | — | 32 | 4096 | 32 | 8 | 32 k |
| Mixtral-8x7B | 46.7 B | 12.9 B | 32 | 4096 | 32 | 8 | 32 k |
| Mixtral-8x22B | 141 B | 39 B | 56 | 6144 | 48 | 8 | 64 k |
| Mistral-Nemo-12B | 12.2 B | — | 40 | 5120 | 32 | 8 | 128 k |
| Mistral-Small-3 (24B) | 24 B | — | 40 | 5120 | 32 | 8 | 32 k |
| Mistral-Large-2 | 123 B | — | 88 | 12288 | 96 | 8 | 128 k |

**Qwen**
| Model | Total | Active | Layers | Hidden | KV heads | Ctx |
|---|---|---|---|---|---|---|
| Qwen2.5-0.5B | 0.49 B | — | 24 | 896 | 2 | 32 k |
| Qwen2.5-1.5B | 1.54 B | — | 28 | 1536 | 2 | 32 k |
| Qwen2.5-3B | 3.09 B | — | 36 | 2048 | 2 | 32 k |
| Qwen2.5-7B | 7.61 B | — | 28 | 3584 | 4 | 128 k |
| Qwen2.5-14B | 14.7 B | — | 48 | 5120 | 8 | 128 k |
| Qwen2.5-32B | 32.5 B | — | 64 | 5120 | 8 | 128 k |
| Qwen2.5-72B | 72.7 B | — | 80 | 8192 | 8 | 128 k |
| Qwen3-30B-A3B | 30.5 B | 3.3 B | 48 | 2048 | 4 | 32 k |
| Qwen3-235B-A22B | 235 B | 22 B | 94 | 4096 | 4 | 128 k |
| Qwen2-VL-7B | 8.3 B | — | 28 | 3584 | 4 | 32 k |

**DeepSeek**
| Model | Total | Active | Layers | Attn | Ctx | Notes |
|---|---|---|---|---|---|---|
| DeepSeek-V2 | 236 B | 21 B | 60 | MLA | 128 k | d_c=512 |
| DeepSeek-V2.5 | 236 B | 21 B | 60 | MLA | 128 k | |
| DeepSeek-V3 | 671 B | 37 B | 61 | MLA | 128 k | FP8-trained |
| DeepSeek-R1 | 671 B | 37 B | 61 | MLA | 128 k | reasoning |
| DeepSeek-R1-Distill-Qwen-32B | 32.5 B | — | 64 | GQA | 128 k | dense distill |

**Gemma (Google)**
| Model | Params | Layers | Hidden | KV heads | Ctx |
|---|---|---|---|---|---|
| Gemma-2-2B | 2.6 B | 26 | 2304 | 4 | 8 k |
| Gemma-2-9B | 9.24 B | 42 | 3584 | 8 | 8 k |
| Gemma-2-27B | 27.2 B | 46 | 4608 | 16 | 8 k |
| Gemma-3-1B | 1 B | 26 | 1152 | 4 | 32 k |
| Gemma-3-4B | 4.3 B | 34 | 2560 | 4 | 128 k |
| Gemma-3-12B | 12.2 B | 48 | 3840 | 8 | 128 k |
| Gemma-3-27B | 27 B | 62 | 5376 | 16 | 128 k |

**Phi (Microsoft)**
| Model | Params | Layers | Ctx |
|---|---|---|---|
| Phi-3-mini-4k | 3.82 B | 32 | 4 k |
| Phi-3-mini-128k | 3.82 B | 32 | 128 k |
| Phi-3-medium-14B | 14 B | 40 | 128 k |
| Phi-3.5-MoE | 42 B / 6.6 B active | 32 | 128 k |
| Phi-4 | 14.7 B | 40 | 16 k |
| Phi-4-multimodal | 5.6 B | 32 | 128 k |

**Others**
- **Yi-1.5** 6B / 9B / 34B — dense, GQA, 4–200k ctx.
- **Command-R** 35B, **Command-R+** 104B — Cohere, GQA, 128k.
- **Grok-1** 314B (MoE, 8 experts, 2 active ≈ 78.5 B active).
- **Grok-2** ~270B (closed initially, weights expected).
- **Yi-VL** , **LLaVA-1.6**, **Pixtral-12B**, **Qwen2-VL**, **InternVL2**.
- **Embedding**: BGE-large (335M), E5-mistral-7B, Nomic-embed (137M), Jina-v3 (572M), MixedBread-Large (335M).
- **Diffusion**: SD1.5 (0.98B UNet), SDXL (2.6B UNet+VAE+TEs ≈ 6.6B total), SD3-Medium (2B), SD3.5-Large (8B), Flux.1-dev (12B).
- **Closed / API-only**: GPT-4 / GPT-4o / GPT-5, Claude-3/4/Opus, Gemini-1.5/2.5 — flag `apiOnly: true`, route user to pricing calculator instead of hardware picker.

### 6.3 Ingestion pipeline

Build-time script (`scripts/build-model-db.ts`):
1. Read `models.yml` (curated list of HF IDs).
2. For each ID, fetch `config.json` from HF Hub.
3. Parse and emit `public/data/models.json`.
4. Fail build if any model's schema is missing required fields.
5. Manual override file `models-override.yml` for values not in config (MoE active params, MLA d_c, training tokens).

---

## 7. Hardware Database Schema + Sample Entries

### 7.1 Schema

```ts
interface GPUSpec {
  id: string;                  // "nvidia-h100-sxm-80gb"
  vendor: "nvidia" | "amd" | "apple" | "intel" | "google-tpu";
  name: string;
  category: "consumer" | "workstation" | "datacenter" | "apple-silicon" | "tpu";
  memoryGB: number;
  memoryBandwidthGBs: number;
  flops: {
    fp32: number;              // TFLOPS
    fp16: number;              // TFLOPS (or BF16)
    fp8?: number;
    int8: number;              // TOPS
    sparsity?: boolean;        // whether advertised uses 2:4 sparsity
  };
  tdpWatts: number;
  pcieGen?: number;
  pcieLanes?: number;
  nvlink?: { perGPU_GBs: number; } | null;
  formFactor: "pcie" | "sxm" | "oam" | "integrated" | "mxm";
  msrpUSD?: number;
  streetUSD?: number;
  releaseYear: number;
  nvcudaCapability?: string;   // "9.0" for Hopper, "10.0" Blackwell
  notes?: string;
}
```

### 7.2 Populated table (research — verify each row against vendor datasheet before shipping)

**NVIDIA Consumer (GeForce RTX)**
| GPU | VRAM | BW GB/s | FP16 TFLOPS | TDP W | MSRP USD | Street (Apr 2026) |
|---|---|---|---|---|---|---|
| RTX 3060 12GB | 12 | 360 | 25.6 | 170 | $329 | ~$260 |
| RTX 3090 | 24 | 936 | 71 | 350 | $1499 | ~$700 used |
| RTX 3090 Ti | 24 | 1008 | 80 | 450 | $1999 | ~$800 used |
| RTX 4060 Ti 16GB | 16 | 288 | 22 | 165 | $499 | ~$430 |
| RTX 4070 | 12 | 504 | 29 | 200 | $599 | ~$540 |
| RTX 4070 Ti Super | 16 | 672 | 44 | 285 | $799 | ~$750 |
| RTX 4080 | 16 | 717 | 49 | 320 | $1199 | |
| RTX 4080 Super | 16 | 736 | 52 | 320 | $999 | ~$950 |
| RTX 4090 | 24 | 1008 | 83 | 450 | $1599 | ~$1800 |
| RTX 5080 | 16 | 960 | 56 | 360 | $999 | ~$1000 |
| RTX 5090 | 32 | 1792 | 105 | 575 | $1999 | ~$2200 |

**NVIDIA Workstation (RTX Ada / RTX Pro)**
| GPU | VRAM | BW GB/s | FP16 TFLOPS | TDP W | Street USD |
|---|---|---|---|---|---|
| RTX A6000 (Ampere) | 48 | 768 | 38.7 | 300 | ~$4000 |
| RTX 6000 Ada | 48 | 960 | 91.1 | 300 | ~$6800 |
| RTX 5000 Ada | 32 | 576 | 65.3 | 250 | ~$4500 |
| RTX 6000 Pro Blackwell | 96 | 1792 | 125 | 600 | ~$8500 |

**NVIDIA Datacenter**
| GPU | VRAM | BW GB/s | FP16/BF16 TFLOPS | FP8 TFLOPS | TDP W |
|---|---|---|---|---|---|
| T4 | 16 | 320 | 65 | — | 70 |
| L4 | 24 | 300 | 121 | 242 | 72 |
| L40S | 48 | 864 | 362 | 733 | 350 |
| A10 | 24 | 600 | 125 | — | 150 |
| A40 | 48 | 696 | 150 | — | 300 |
| A100 40GB | 40 | 1555 | 312 | — | 400 |
| A100 80GB SXM | 80 | 2039 | 312 | — | 400 |
| H100 PCIe 80GB | 80 | 2000 | 756 | 1513 | 350 |
| H100 SXM 80GB | 80 | 3350 | 989 | 1979 | 700 |
| H200 SXM 141GB | 141 | 4800 | 989 | 1979 | 700 |
| B100 SXM | 192 | 8000 | 1800 | 3500 | 700 |
| B200 SXM | 192 | 8000 | 2250 | 4500 | 1000 |
| GB200 (per-GPU, superchip) | 192 | 8000 | 2500 | 5000 | 1200 |

*FLOPs are non-sparse dense unless noted. Sparsity doubles advertised numbers but rarely realizable on LLMs.*

**AMD**
| GPU | VRAM | BW GB/s | FP16 TFLOPS | FP8 TFLOPS | TDP W |
|---|---|---|---|---|---|
| RX 7900 XTX | 24 | 960 | 122 | — | 355 |
| W7900 | 48 | 864 | 122 | — | 295 |
| MI210 | 64 | 1638 | 181 | — | 300 |
| MI250X | 128 | 3277 | 383 | — | 560 |
| MI300X | 192 | 5300 | 1307 | 2615 | 750 |
| MI325X | 256 | 6000 | 1307 | 2615 | 1000 |
| MI355X | 288 | 8000 | 2500 | 5000 | 1400 |

**Apple Silicon** (unified memory — treat as VRAM for inference)
| SoC | Memory options | BW GB/s | Neural/FP16 TFLOPS (approx) | TDP |
|---|---|---|---|---|
| M1 | 8/16 | 68 | 5 | 20 |
| M1 Pro | 16/32 | 200 | 10 | 30 |
| M1 Max | 32/64 | 400 | 21 | 60 |
| M1 Ultra | 64/128 | 800 | 42 | 120 |
| M2 Pro | 16/32 | 200 | 13 | 30 |
| M2 Max | 32/64/96 | 400 | 27 | 60 |
| M2 Ultra | 64/128/192 | 800 | 54 | 120 |
| M3 Pro | 18/36 | 150 | 14 | 30 |
| M3 Max | 36/48/64/128 | 300/400 | 28 | 60 |
| M4 | 16/24/32 | 120 | 16 | 22 |
| M4 Pro | 24/48/64 | 273 | 17 | 40 |
| M4 Max | 36/48/64/128 | 410/546 | 34 | 60 |

*Apple Silicon excels at inference due to huge unified-memory pools; training is viable up to ~13B with MLX but slow vs NVIDIA.*

**Intel**
| Device | Memory | BW | BF16 TFLOPS | Notes |
|---|---|---|---|---|
| Gaudi 2 | 96 GB | 2450 | 432 | Native PyTorch, SynapseAI |
| Gaudi 3 | 128 GB | 3700 | 1835 | |
| Arc B580 | 12 GB | 456 | ~20 | Consumer, OpenVINO |

**Google TPU** (cloud only)
| TPU | HBM per chip | Pod size | Peak BF16 TFLOPS |
|---|---|---|---|
| v4 | 32 GB | 4096 | 275 |
| v5e | 16 GB | 256 | 197 |
| v5p | 95 GB | 8960 | 459 |
| v6 (Trillium) | 32 GB | 256 | 918 |

### 7.3 Tier classification helper

The UI classifies GPUs automatically:
- **Budget**: price < $1000, VRAM ≥ 12 GB
- **Balanced**: price $1000–$3000, VRAM 16–48 GB
- **Performance**: price > $3000 or datacenter SKU

---

## 8. Cloud Provider Database Schema + Sample Entries

### 8.1 Schema

```ts
interface CloudInstance {
  id: string;                        // "aws-p5.48xlarge"
  provider: "aws" | "azure" | "gcp" | "lambda" | "runpod" | "vast"
          | "coreweave" | "crusoe" | "together" | "modal" | "replicate"
          | "fireworks" | "fal";
  instanceType: string;              // "p5.48xlarge"
  gpus: { id: string; count: number }[];   // references GPUSpec.id
  vcpus: number;
  ramGB: number;
  storageGB: number;
  networkGbps: number;
  interconnect?: "nvlink" | "nvswitch" | "infiniband-400" | "infiniband-800" | "rocev2" | "pcie";
  pricing: {
    onDemandUSDPerHour: number;
    spotUSDPerHour?: number;          // preemptible/spot
    reserved1yUSDPerHour?: number;
    reserved3yUSDPerHour?: number;
  };
  regions: string[];                 // ["us-east-1", "ap-south-1", ...]
  notes?: string;
  lastPriceUpdate: string;           // ISO date
}
```

### 8.2 Key instances (research — prices **illustrative**; backend refresh required)

> **⚠ Cloud pricing changes continuously.** The table below is a snapshot for the spec; the build **must** include a live-refresh step (see §13). Never hard-code these in UI.

**AWS** (USD/hour, on-demand, us-east-1 unless noted)
| Instance | GPUs | Hourly | Spot ~ | Notes |
|---|---|---|---|---|
| g5.xlarge | 1× A10G 24GB | $1.006 | $0.35 | Entry inference |
| g5.12xlarge | 4× A10G | $5.672 | $2.00 | |
| g6.xlarge | 1× L4 24GB | $0.805 | $0.30 | Cheapest modern |
| g6e.xlarge | 1× L40S 48GB | $1.861 | $0.70 | Best mid-tier inf |
| g6e.12xlarge | 4× L40S | $10.49 | $3.80 | |
| p4d.24xlarge | 8× A100 40GB | $32.77 | $10–12 | |
| p4de.24xlarge | 8× A100 80GB | $40.96 | $13–15 | |
| p5.48xlarge | 8× H100 80GB | $98.32 | $25–35 | Training |
| p5e.48xlarge | 8× H200 141GB | $120–130 | $30–40 | |
| p6-b200.48xlarge | 8× B200 | $170–200 | $45–60 | 2025+ |
| trn1.32xlarge | 16× Trainium | $21.50 | $7 | Custom silicon |
| trn2.48xlarge | 16× Trainium 2 | $50–60 | | |
| inf2.48xlarge | 12× Inferentia 2 | $12.98 | | |
| ap-south-1 (Mumbai) | all above +5–10% | | | User-relevant |

**Azure** (USD/hour, East US)
| Instance | GPUs | Hourly | Spot ~ |
|---|---|---|---|
| NC24ads A100 v4 | 1× A100 80GB | $3.67 | $1.10 |
| ND96amsr A100 v4 | 8× A100 80GB | $32.77 | $10–12 |
| ND H100 v5 | 8× H100 80GB | $98.32 | $30 |
| ND H200 v5 | 8× H200 141GB | $127 | $38 |
| ND GB200 v6 | 4× GB200 | ~$95 | |
| NV36ads A10 v5 | 1× A10 (partial) | $1.52 | $0.45 |
| Central India region | +5% vs East US | | |

**GCP** (USD/hour, us-central1)
| Instance | GPUs | Hourly | Spot ~ |
|---|---|---|---|
| g2-standard-4 | 1× L4 | $0.71 | $0.30 |
| g2-standard-96 | 8× L4 | $8.39 | $3.60 |
| a2-ultragpu-1g | 1× A100 80GB | $3.67 | $1.30 |
| a2-highgpu-8g | 8× A100 40GB | $29.39 | $10 |
| a2-ultragpu-8g | 8× A100 80GB | $40.22 | $13 |
| a3-highgpu-8g | 8× H100 80GB | $88.49 | $26 |
| a3-ultragpu-8g | 8× H200 | $115 | $34 |
| a3-megagpu-8g | 8× H100 (9.6 Tbps net) | $98 | |
| TPU v5e-8 | 8 chips | $4.20 | $1.60 |
| TPU v5p-8 | 8 chips | $19.84 | $8 |
| asia-south1 (Mumbai) | +10–15% | | |

**Specialty providers — generally cheaper but less SLA**
| Provider | GPU | Hourly USD | Notes |
|---|---|---|---|
| **Lambda Labs** 1-Click Cluster | 1× H100 80GB | $2.49 | No-commit, pay-as-you-go |
| Lambda | 8× H100 | $23.92 | |
| Lambda | 8× H200 | $28.80 | |
| **RunPod Secure Cloud** | 1× RTX 4090 | $0.34 | |
| RunPod | 1× A100 80GB | $1.64 | |
| RunPod | 1× H100 80GB | $2.49 | |
| RunPod | 1× H200 | $3.39 | |
| RunPod Community | 1× 4090 | $0.24 | Lower reliability |
| **Vast.ai** | 1× 4090 | $0.35–0.50 | Marketplace |
| Vast.ai | 1× H100 | $1.80–2.50 | Wide spread |
| **CoreWeave** | 8× H100 | ~$40 (reserved) | Enterprise |
| **Crusoe** | 1× H100 | $2.25 | Green data centers |
| **Together AI** (serverless) | per-token pricing | $0.88 / M tok (Llama-3.1-70B) | No infra mgmt |
| **Modal** | 1× A100 80GB | $3.40 | Per-second billing |
| **Replicate** | per-second GPU | $0.001525/s A100 | Serverless |
| **Fireworks** | per-token | $0.90 / M tok (70B) | |
| **Fal** | per-second (images/video) | | Diffusion-focused |

### 8.3 Provider picker decision tree

```
if workload == "dev / experimentation":
  → RunPod / Vast.ai (cheapest spot)
elif workload == "serverless inference, low volume":
  → Together / Fireworks / Replicate (per-token)
elif workload == "steady-state production inference":
  → AWS g6e / Azure NC / GCP g2 (L4/L40S) with reserved
elif workload == "large training run":
  → Lambda 1CC / CoreWeave / AWS p5 cluster (reserved or capacity blocks)
elif workload == "compliance / enterprise":
  → AWS / Azure / GCP only
elif user.region == "India":
  → prefer ap-south-1 (Mumbai) / asia-south1 / Central India for latency
```

---

## 9. Clustering Logic / Decision Tree

### 9.1 When multi-GPU?

```
if total_vram_needed <= largest_single_gpu_vram (in DB):
    → single GPU
elif total_vram_needed <= 8 × gpu_vram AND gpu has NVLink/NVSwitch:
    → single node, Tensor Parallelism (TP)
elif total_vram_needed > 8 × 192GB (1.5 TB):
    → multi-node cluster: TP within node + PP/FSDP across nodes
```

### 9.2 Parallelism recommendations

| Workload | Recommended |
|---|---|
| Inference ≤ 80 GB | 1 GPU |
| Inference 80–192 GB | 2–4 GPUs, TP (vLLM `--tensor-parallel-size`) |
| Inference > 192 GB or MoE | TP intra-node + Expert Parallelism for MoE |
| LoRA fine-tuning, fits in 1 GPU | 1 GPU |
| LoRA on 70B+ | 2–8 GPUs, FSDP |
| Full fine-tuning 7B | 1× A100/H100 80GB or ZeRO-2 on 2× 4090 |
| Full fine-tuning 70B | 8× H100 minimum, ZeRO-3 / FSDP |
| Full fine-tuning 405B | 32–64× H100 with TP=8, PP=4, DP=rest |
| Pretraining ≤ 7B | 8–64× H100 |
| Pretraining 70B | 1024–8192× H100 |
| Pretraining 400B+ | 10k+ H100/H200 with 3D parallelism + ZeRO-1 |

### 9.3 Interconnect requirements

| Scale | Required |
|---|---|
| Single node, up to 8 GPUs | NVLink + NVSwitch |
| 2–8 nodes | InfiniBand NDR 400 Gb/s per GPU minimum |
| 8+ nodes | NDR 400 or XDR 800 Gb/s; rail-optimized topology |
| 1000+ GPUs | Custom fabric (Meta's Grand Teton, NVIDIA SpectrumX) |

### 9.4 Framework picker

| Scenario | Framework |
|---|---|
| Local chat / laptop | **llama.cpp** (GGUF) or **Ollama** / **LM Studio** / **MLX** (Apple) |
| Python single-GPU inference | **transformers** + bitsandbytes, or **ExLlamaV2** |
| Production serving | **vLLM** (default), **SGLang** (advanced), **TGI**, **TensorRT-LLM** (fastest on NVIDIA), **llama.cpp server** |
| LoRA fine-tuning | **HuggingFace TRL + PEFT + accelerate** |
| Full fine-tuning, multi-GPU | **FSDP (PyTorch)** or **DeepSpeed ZeRO-3** |
| Multi-node training | **DeepSpeed** or **Megatron-LM** |
| Hyperscale pretraining | **Megatron-DeepSpeed**, **NVIDIA NeMo**, or **Colossal-AI** |
| TPU | **JAX / MaxText / Pallas** |
| AMD | **vLLM-ROCm**, **PyTorch-ROCm** |

---

## 10. OS & Software Stack Recommendations

### 10.1 Operating system

| Scenario | OS |
|---|---|
| Datacenter / training | **Ubuntu 22.04 LTS** or **24.04 LTS** (x86_64) |
| Desktop consumer with NVIDIA | **Ubuntu 24.04** or **Pop!_OS 22.04** (pre-bundled drivers) |
| Windows users | **Windows 11 + WSL2** (Ubuntu 24.04); limitations: no passthrough of all CUDA features; NCCL multi-GPU sometimes fragile |
| Apple Silicon | **macOS 14+** (Sonoma) or **15+** (Sequoia) |
| AMD consumer | **Ubuntu 24.04** with ROCm 6.2+ |
| Containers | any OS + **NVIDIA Container Toolkit** |

### 10.2 Driver / CUDA matrix (as of April 2026)

| GPU generation | Min driver | CUDA toolkit | Notes |
|---|---|---|---|
| Ampere (30xx, A100) | 525+ | CUDA 11.8 – 12.8 | Mature, stable |
| Ada (40xx, L40S) | 535+ | CUDA 12.1+ | |
| Hopper (H100/H200) | 535+ | CUDA 12.1+ (12.4+ for FP8) | |
| Blackwell (B100/B200/5090) | 560+ | CUDA 12.6+ | |
| RTX 6000 Pro Blackwell | 570+ | CUDA 12.8+ | |

Other essentials:
- **cuDNN 9.x** with matching CUDA
- **NCCL 2.22+** for multi-GPU/multi-node collectives
- **PyTorch 2.4+** for H100, **2.6+** for Blackwell, with `torch.compile`
- **Python 3.11 or 3.12** (avoid 3.13 until ecosystem catches up)

### 10.3 Recommended stacks

**Local desktop inference (Linux/NVIDIA)**
```
Ubuntu 24.04 + nvidia-driver-550 + CUDA 12.4 + Docker 26 + NVIDIA Container Toolkit
LLM runtime: Ollama (quickest) OR llama.cpp (most control) OR vLLM (throughput)
UI: Open WebUI or LibreChat
```

**macOS local inference**
```
macOS 15 Sequoia + Homebrew + LM Studio / Ollama / MLX
```

**Cloud training cluster**
```
Ubuntu 22.04 LTS + NVIDIA driver 550 + CUDA 12.4 + NCCL 2.22 + Pyxis/Enroot/Slurm
Framework: NeMo or Megatron-LM or DeepSpeed
Storage: Lustre/WekaFS for checkpoints; S3 for data
Monitoring: DCGM + Prometheus + Grafana + W&B for runs
```

---

## 11. UI/UX Specification

### 11.1 Information architecture

```
/                         — Home (calculator)
/compare                  — Side-by-side (up to 3 configs)
/reverse                  — "What can I run on my hardware?"
/models                   — Model catalog (browsable)
/hardware                 — GPU / cloud catalog
/guides                   — Markdown articles: formulas, glossary
/about                    — About / methodology
```

### 11.2 Home page layout

Three-column desktop, stacked mobile:

```
┌──────────────────────────────────────────────────────────────┐
│  Header: Logo · Mode tabs [Inference|Scale|Fine-tune|Train]  │
├──────────────┬──────────────────────┬────────────────────────┤
│ INPUTS       │  VRAM BREAKDOWN       │  RECOMMENDATIONS       │
│              │  (stacked bar)        │                        │
│ Model ▾      │  ▓▓▓ weights   8 GB   │  🟢 RTX 4090   $1800   │
│ Precision ▾  │  ▓▓ KV cache   4 GB   │  🟢 L40S       $1.86/h │
│ Ctx [----]   │  ▓ overhead    1 GB   │  🟡 RTX 4070   (tight) │
│ Batch [-]    │  ───────────          │  🔴 RTX 3060   (no)    │
│ + Advanced   │  Total:       13 GB   │                        │
├──────────────┴──────────────────────┴────────────────────────┤
│ METRICS ROW:  Tok/s: 142   Memory BW: 67%   $/M tok: $0.22    │
├──────────────────────────────────────────────────────────────┤
│ CLOUD TABLE  (sortable): Provider · Instance · $/h · Spot · ▢│
├──────────────────────────────────────────────────────────────┤
│ CLUSTERING (if triggered): topology diagram + framework reco │
├──────────────────────────────────────────────────────────────┤
│ OS / SOFTWARE STACK                                          │
├──────────────────────────────────────────────────────────────┤
│ Share button (URL) · Export PDF · Compare                    │
└──────────────────────────────────────────────────────────────┘
```

### 11.3 Components (React)

- `<ModelPicker>` — combobox with fuzzy search (Fuse.js), badges for family/MoE.
- `<PrecisionPicker>` — segmented control; shows byte-per-param hint.
- `<ContextSlider>` — log-scale 1k → 1M, snap points.
- `<VRAMBreakdown>` — stacked bar (Recharts).
- `<GPUList>` — cards; `<GPUCard>` with fit badge (🟢🟡🔴), price tiers.
- `<CloudTable>` — TanStack Table; columns: provider, instance, gpus, $/h, spot, region filter.
- `<ClusterTopology>` — SVG diagram (custom or react-flow).
- `<FormulaReveal>` — expandable "How is this calculated?" block with LaTeX (KaTeX).
- `<ShareButton>` — serializes state to URL.
- `<CompareDrawer>` — pinned configs for side-by-side.

### 11.4 Design tokens

Minimal, technical aesthetic. Base on shadcn/ui + Tailwind.

- Font: Inter (UI) + JetBrains Mono (numbers, formulas)
- Colors: neutral gray base, a single accent (blue or violet), semantic green/amber/red for fit badges
- Dark mode: CSS var swap; default = system
- Motion: 150ms ease for state changes; no gratuitous animation

### 11.5 Accessibility

- All inputs keyboard-navigable; custom comboboxes follow ARIA 1.2 patterns.
- Color is never the only information carrier (fit badges include icon + text).
- WCAG AA contrast minimum, AAA for body text.
- Reduced-motion respects `prefers-reduced-motion`.

### 11.6 Shareable URL schema

```
?model=meta-llama/Llama-3.1-8B
&precision=q4_k_m
&ctx=32768
&batch=1
&mode=inference
&compare=qwen2.5-7b:fp16:32768,mistral-7b:int8:8192
```

---

## 12. Tech Stack Recommendation

### 12.1 Frontend

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **React 18 + Vite 5 + TypeScript** | Fast dev loop; no SSR needed (fully client-side calc); easy static hosting. |
| Styling | **Tailwind CSS 3 + shadcn/ui** | Rapid, consistent, accessible primitives. |
| State | **Zustand** (+ `useSyncExternalStore`) | Simple, no boilerplate; URL sync via middleware. |
| URL sync | **nuqs** (query-state) | Native URL state for shareable links. |
| Forms | **react-hook-form + zod** | Validated inputs. |
| Tables | **TanStack Table v8** | Sortable cloud instances. |
| Charts | **Recharts** or **visx** | VRAM stacked bars. |
| Math rendering | **KaTeX** | Formulas in "How is this calculated?" panels. |
| Search | **Fuse.js** | Client-side fuzzy model search. |
| Testing | **Vitest + React Testing Library + Playwright** | Unit + e2e. |
| Lint/format | **ESLint + Prettier + TypeScript strict** | |

### 12.2 Optional backend (v2)

| Layer | Choice |
|---|---|
| Runtime | Node 20 / Bun / Cloudflare Workers |
| Framework | Hono or tRPC |
| DB | SQLite (Turso) or Postgres (Neon) |
| Cache | KV (Cloudflare/Upstash) |
| Jobs | GitHub Actions (daily price refresh) + Cloudflare Cron |
| Observability | Sentry + Axiom/Logflare |

### 12.3 Hosting

- **Frontend**: Cloudflare Pages, Vercel, or Netlify (all free tier fine for MVP).
- **Backend** (if added): Cloudflare Workers or Fly.io.
- **Analytics**: Plausible or Umami (privacy-friendly).

### 12.4 Repo layout

```
llm-hardware-calculator/
├── apps/
│   └── web/                    # React + Vite
│       ├── src/
│       │   ├── components/
│       │   ├── lib/
│       │   │   ├── formulas/   # Pure TS — the calculation kernel
│       │   │   │   ├── vram.ts
│       │   │   │   ├── kvcache.ts
│       │   │   │   ├── training.ts
│       │   │   │   ├── throughput.ts
│       │   │   │   └── index.ts
│       │   │   └── pricing.ts
│       │   ├── data/           # Typed JSON imports
│       │   └── pages/
│       └── public/
│           └── data/
│               ├── models.json
│               ├── gpus.json
│               └── cloud.json
├── packages/
│   └── formulas/               # Shared calc lib (testable in isolation)
├── scripts/
│   ├── build-model-db.ts       # Pulls HF configs
│   ├── refresh-cloud-prices.ts # Daily job
│   └── validate-data.ts
├── data/
│   ├── models.yml              # Curated model list
│   └── hardware.yml            # Curated GPU list
├── docs/                       # MDX guides
└── tests/
```

---

## 13. Data Sources & Update Strategy

### 13.1 Sources of truth

| Data | Source | Update frequency |
|---|---|---|
| Model architecture | HuggingFace `config.json` | On new model release |
| Model param counts | HF model cards + `safetensors` metadata | Same |
| NVIDIA GPU specs | nvidia.com datasheets, whitepapers | Quarterly |
| AMD GPU specs | amd.com product pages, ROCm docs | Quarterly |
| Apple Silicon specs | apple.com, reported benchmarks | On release |
| AWS pricing | `https://pricing.us-east-1.amazonaws.com/...` API | Daily |
| Azure pricing | Azure Retail Prices REST API | Daily |
| GCP pricing | Cloud Billing API | Daily |
| RunPod / Lambda / Vast | scrape or published rates | Weekly |

### 13.2 Data ingestion jobs

- **`scripts/build-model-db.ts`**: runs at build time; fetches `config.json` for each curated HF ID; writes `models.json`; fails build on schema mismatch.
- **`scripts/refresh-cloud-prices.ts`**: GitHub Action cron (UTC 00:00 daily); hits each provider's pricing API; writes `cloud.json`; commits if diff.
- **`scripts/validate-data.ts`**: CI step; checks all numbers against JSON Schema and sanity ranges (e.g., VRAM between 1 GB and 1 TB).

### 13.3 Manual override layer

Some data isn't in configs (MoE active params, MLA d_c, unofficial leaked specs). These live in `data/models-override.yml` with a `source:` URL field for auditability.

### 13.4 Versioning

`public/data/meta.json` contains `{ modelsVersion, gpusVersion, cloudVersion, builtAt }` so the UI can show "Prices updated 4 hours ago" and tell users they are looking at snapshot X.

---

## 14. API / Backend

### 14.1 MVP: no backend

Everything is static JSON + client-side TypeScript. Deploy to Cloudflare Pages.

### 14.2 v2: thin backend for live prices

```
GET  /api/models                  # proxies static models.json, CDN-cached
GET  /api/gpus
GET  /api/cloud?provider=aws&region=ap-south-1
POST /api/share                   # stores a saved scenario, returns short URL
GET  /api/share/:id
```

### 14.3 (Future) LLM-powered explainer

Use Anthropic's Claude API (see system docs) to generate plain-English explanations of a configuration on demand. Implemented as a feature-flagged panel; cacheable per (model, mode, ctx) tuple.

---

## 15. Roadmap (MVP → v1 → v2)

**Week 0 — spec sign-off, repo scaffold**
**Weeks 1–2 — Calculation kernel**
- `packages/formulas` with unit tests covering every formula in §5.
- Golden-file tests: reproduce `vram.asmirnov.xyz` outputs for 10 scenarios.

**Weeks 3–4 — Data layer**
- Model DB ingestion script; ship 40 models.
- GPU DB manual populate; ship 30 GPUs.
- Cloud DB snapshot; 25 instances.

**Weeks 5–6 — UI MVP**
- Inference mode only; model/precision/ctx/batch inputs.
- VRAM breakdown, GPU recommendations, basic cloud table.
- Shareable URLs.
- Deploy to Cloudflare Pages.

**Weeks 7–10 — v1**
- Fine-tune mode (LoRA / QLoRA / full).
- Inference-at-scale mode (QPS → replicas).
- Comparison mode.
- Dark mode, a11y pass.
- Guides / methodology pages.

**Weeks 11–16 — v2**
- Pre-training mode + Chinchilla + wall-clock estimate.
- MoE-native handling.
- VLM / embedding / diffusion support.
- Backend for live pricing.
- Reverse-mode ("what can I run").
- LLM-powered explainer.
- Export to PDF / Terraform starter.

---

## 16. References & Citations

**Formulas & scaling laws**
- Kaplan et al., "Scaling Laws for Neural Language Models" (2020).
- Hoffmann et al., "Training Compute-Optimal Large Language Models" (Chinchilla, 2022).
- Korthikanti et al., "Reducing Activation Recomputation in Large Transformer Models" (2022).
- Rajbhandari et al., "ZeRO: Memory Optimizations Toward Training Trillion Parameter Models" (2020).
- Shoeybi et al., "Megatron-LM" (2019) + later papers.
- Dettmers et al., "QLoRA: Efficient Finetuning of Quantized LLMs" (2023).
- Hu et al., "LoRA: Low-Rank Adaptation of Large Language Models" (2021).
- Dao et al., "FlashAttention-2/3" (2023–2024).
- Ainslie et al., "GQA: Training Generalized Multi-Query Transformer Models" (2023).
- DeepSeek-AI, "DeepSeek-V2 / V3 Technical Reports" (2024).
- Kwon et al., "Efficient Memory Management for LLM Serving with PagedAttention" (vLLM, SOSP 2023).

**Reference applications**
- Alex Ziskind, `llm-inference-calculator`, github.com/alexziskind1/llm-inference-calculator.
- Ray Fernando, `llm-calc.rayfernando.ai`.
- Alexander Smirnov, `vram-calculator`, github.com/furiousteabag/vram-calculator (`app/_lib/index.ts`).

**Hardware datasheets**
- NVIDIA H100, H200, B100/B200 whitepapers; Ada Lovelace whitepaper.
- AMD Instinct MI300X / MI325X product briefs.
- Apple M-series chip product pages.
- Google TPU v5e/v5p/v6 technical docs.

**Model cards / configs**
- HuggingFace Hub — meta-llama/*, mistralai/*, Qwen/*, deepseek-ai/*, google/gemma-*, microsoft/phi-*.
- Meta "Introducing Llama 3.1/3.3/4" blog posts.
- DeepSeek-V3 technical report.

**Cloud pricing**
- aws.amazon.com/ec2/pricing + official Pricing API.
- azure.microsoft.com/pricing + Retail Prices API.
- cloud.google.com/compute/gpus-pricing.
- lambdalabs.com/service/gpu-cloud, runpod.io/pricing, coreweave.com, vast.ai, together.ai, modal.com, replicate.com, fireworks.ai, fal.ai.

**Frameworks**
- vLLM, SGLang, TGI, TensorRT-LLM, llama.cpp, Ollama, MLX, ExLlamaV2 — respective GitHub READMEs and docs.
- PyTorch FSDP docs; DeepSpeed docs; NVIDIA NeMo docs; Megatron-LM repo.

---

## Appendix A — Worked example output (what the UI should print)

**Inputs**
- Model: `meta-llama/Llama-3.1-70B-Instruct`
- Precision: GGUF Q4_K_M (~4.85 bits/param)
- Context: 32,768 tokens
- Batch: 1
- Mode: Inference (single-user)

**Computed**
- Weights: 70.55 B × 0.606 B = **42.8 GB**
- KV cache: 2 × 80 × 1 × 32768 × 8 × 128 × 2 B = **10.7 GB**
- Activations (inference): ~0.8 GB
- CUDA/framework overhead: ~1.5 GB
- **Total ≈ 55.8 GB**

**GPU fit**
- 🟢 1× H100 80 GB (69% utilized)
- 🟢 1× A100 80 GB (70%)
- 🟢 1× RTX 6000 Pro Blackwell 96 GB (58%)
- 🟡 2× RTX 4090 24 GB (needs TP=2, 116% single — doesn't fit single; 2-way fits with TP)
- 🔴 1× RTX 4090 24 GB (229% — overflow)
- 🟢 Mac Studio M2 Ultra 192 GB (29%)

**Cloud options (on-demand)**
- AWS `g6e.12xlarge` 4× L40S 192GB total — **$10.49/h** (overprovisioned)
- Lambda 1× H100 PCIe 80GB — **$2.49/h** ← recommended
- RunPod Secure 1× H100 80GB — **$2.49/h**
- Together AI Llama-3.1-70B serverless — **$0.88/M tokens** (no infra)
- Azure NC H100 v5 — **$6.98/h** (single GPU slice)

**Tokens/sec estimate**
- H100 SXM @ 3350 GB/s ÷ 42.8 GB × 0.8 efficiency ≈ **62 tok/s** (single user)

**OS / software**
- Ubuntu 24.04 + driver 550 + CUDA 12.4
- Runtime: **vLLM 0.6+** with `--tensor-parallel-size 1 --quantization gguf --max-model-len 32768`
- Alternative: llama.cpp CUDA build (easier, ~15% slower)

**Estimated cost per million output tokens**
- On H100 @ $2.49/h, 62 tok/s → 223,200 tok/h → **$11.15 / M output tokens** (solo); at batch 32 via vLLM, ~$0.80/M (matches Together's serverless price).

---