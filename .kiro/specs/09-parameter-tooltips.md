
## Description

Add an informational tooltip to every parameter in the calculator. Each tooltip shows: plain-English definition, how it affects the calculation, recommended values, and common pitfalls.

## Requirements

### Requirement 1: Tooltip Component
**User Story:** As a user, I want to hover/tap any parameter label and see a helpful explanation.

**Acceptance Criteria:**
- Tooltip appears on hover (desktop: 500ms delay) or tap (mobile: opens as bottom sheet)
- Max width: 320px desktop, full-width mobile
- Structure: title (bold) → definition → impact → recommended values → pitfall (amber callout)
- Dismiss: mouse leave (desktop), tap outside (mobile), Escape key
- Keyboard accessible: visible on focus via Tab
- Screen reader: content linked via `aria-describedby`
- No tooltip covers the input it describes

### Requirement 2: Tooltip Content Database
**User Story:** As a user, I want accurate, concise explanations for every parameter.

**Acceptance Criteria:**
Tooltips for every parameter (content from addendum §9):

- **Model**: "The LLM to calculate requirements for. VRAM scales linearly with parameter count. MoE models load all experts but only activate a subset per token."
- **Parameters (N)**: "Total trainable parameters. Llama-3-70B = 70 billion. Weights = N × bytes_per_param. Training adds 2-12× more for gradients and optimizer. Pitfall: MoE total vs active — Mixtral 8×22B = 141B total but only 39B active per forward pass."
- **Context length**: "Max tokens the model processes at once. KV cache grows linearly: doubling context doubles KV memory. Pitfall: Prefill compute is O(N²) — doubling context quadruples prefill time. Beyond trained max requires RoPE scaling."
- **Batch size**: "Concurrent sequences processed. Larger = higher throughput but more VRAM for KV cache. Use continuous batching instead of static for serving. Pitfall: Batch 32 at 128K context can need >100 GB KV alone."
- **Weight precision**: "Bits per parameter. FP16=2 bytes, INT4=0.5 bytes. Halving precision ~halves VRAM and ~doubles throughput. Pitfall: FP8 needs Hopper+; 4-bit can drop 1-5 pts on reasoning benchmarks."
- **KV cache precision**: "Dtype for cached Key/Value tensors. Independent from weight precision. FP8 halves KV with <0.1% quality loss. Pitfall: INT4 KV causes retrieval failures beyond 32K context."
- **Number of GPUs**: "Total accelerators. TP splits layers (needs NVLink), PP splits stages (adds bubble), DP replicates (scales throughput). Pitfall: 8→16 GPUs rarely doubles speed — 70-90% efficiency within rack, 50-80% across racks."
- **GPU model**: "Determines FLOPS, HBM, supported dtypes. Pitfall: H100 PCIe has same FLOPS as SXM but lower bandwidth and no NVLink."
- **Tensor parallel (TP)**: "Splits each matrix multiply across GPUs. Needs NVLink. Pitfall: TP bounded by KV-head count — Llama-3-70B has 8 KV heads → max TP=8."
- **Pipeline parallel (PP)**: "Splits model by layer stages. Pitfall: Bubble waste = (PP-1)/(microbatches+PP-1) — avoid PP for inference."
- **Quantization method**: "Algorithm used: AWQ (fast, 4-bit), GPTQ (Hessian-based), GGUF Q4_K_M (llama.cpp default), EXL2 (variable BPW). Pitfall: AWQ/GPTQ need calibration data; GGUF fast on CPU but slower on GPU than AWQ."
- **Serving framework**: "vLLM (PagedAttention), SGLang (RadixAttention), TRT-LLM (NVIDIA-only fastest), llama.cpp (CPU+GPU). 2-5× throughput difference at same hardware. Pitfall: TRT-LLM engines are GPU-arch specific."
- **Training method**: "Pre-training (full weights), SFT, LoRA (0.1-1% params), QLoRA (4-bit base), DPO (2 models), RLHF-PPO (4 models). Pitfall: RLHF-PPO needs 4× model memory."
- **LoRA rank**: "Adapter matrix rank (4-128). Higher = more capacity but more VRAM. Default 8-16 for most tasks. Pitfall: r>64 often overfits without proportionally more data."
- **Gradient accumulation**: "Accumulates K micro-batches before optimizer step. Zero extra VRAM. Pitfall: Iteration time grows linearly; with FSDP use no_sync() on non-final steps."
- **Optimizer**: "Adam (+8 bytes/param for m,v), 8-bit Adam (~2 B/param, 75% savings), Lion (+4 B/param). Pitfall: Adam state = 2× FP32 weights — dominates training VRAM."
- **Learning rate**: "Peak LR: 1e-4 to 3e-4 pretrain, 1e-5 to 5e-5 SFT, 5e-7 to 5e-6 DPO. Pitfall: Too-short warmup → divergence at large batch."
- **Token budget**: "Total training tokens. Chinchilla-optimal: D ≈ 20×N. Production uses 100-300×. Pitfall: Over-training hits data-repetition ceiling."
- **Spot vs on-demand**: "Spot: 40-80% cheaper, reclaimable on 30s-2min notice. Pitfall: Fine for stateless inference and checkpointable training; unsafe for latency-SLA serving."
- **PUE**: "Power Usage Effectiveness = total facility power / IT power. Multiplies electricity bill. Hyperscale: 1.1, colo: 1.4, enterprise: 1.8, office: 2.2."
- **Electricity cost**: "$/kWh. H100 at 70% duty ≈ $430/year at $0.10/kWh. Pitfall: Demand charges on kW peak add 20-40%."
- **Cloud provider**: "Hyperscalers (AWS/Azure/GCP) 30-70% premium but include compliance. Specialists (Lambda/RunPod) cheaper. Pitfall: Egress $0.05-0.09/GB can dominate; verify exact GPU SKU (SXM vs PCIe)."
- **FlashAttention**: "Reduces attention memory from O(N²) to O(N). Standard in all modern frameworks. Pitfall: Disabling adds gigabytes of attention score memory at 32K+ context."
- **Activation checkpointing**: "Trades compute for memory: recomputes activations in backward pass. Full: reduces to sqrt(L) × per-layer. Selective: drops attention scores only."
- **Sequence packing**: "Packs multiple short sequences into one full-length sequence. Improves GPU utilization from 20-40% to 85-95%. Requires FlashAttention varlen/cu_seqlens."

## Tasks

- [x] 1. Create `src/components/primitives/InfoTooltip.tsx` — Radix Tooltip with structured content (title, definition, impact, recommended, pitfall callout), mobile bottom-sheet variant
- [x] 2. Create `src/data/parameter-tooltips.ts` — typed constant mapping `parameterKey → TooltipContent` for all 25+ parameters
- [x] 3. Create `src/types/tooltip.ts` — `TooltipContent` interface with fields: `title`, `definition`, `impact`, `recommended`, `pitfall?`, `learnMoreUrl?`
- [x] 4. Add `<InfoTooltip paramKey="...">` wrapper to every parameter label in all input components
- [x] 5. Style tooltips: max-w-[320px], bg-muted border-subtle, title in semibold, pitfall in amber callout box
- [x] 6. Add keyboard support: tooltip visible on Tab+focus, dismiss on Escape
- [x] 7. Add mobile support: tap opens bottom sheet with full tooltip content, tap outside dismisses
- [x] 8. Add `aria-describedby` linking each input to its tooltip content for screen readers
- [ ] 9. Write Playwright test: hover every parameter label → verify tooltip appears with non-empty content
- [x] 10. Add "Learn more" links in tooltips that point to `/guides` articles


