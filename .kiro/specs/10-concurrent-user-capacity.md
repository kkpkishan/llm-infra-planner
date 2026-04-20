# SPEC 10: Concurrent User Capacity & Prompt/Token Processing Calculator

## Description

Add a comprehensive concurrent-user capacity planner that shows exactly how many users a given hardware configuration can serve simultaneously, with full visibility into both phases of LLM inference — **prompt processing (prefill)** and **token generation (decode)**. Users can adjust the concurrent user count via a slider and watch the hardware requirements, latency metrics, and cost recalculate in real time. This is the "inverse" of the existing calculator: instead of "what hardware do I need for model X?", it answers **"how many users can my hardware serve, and what does each user experience?"**

## Requirements

### Requirement 1: Dual-Phase Inference Breakdown
**User Story:** As a user, I want to see prompt processing (prefill) and token generation (decode) as separate metrics so I understand where my bottleneck is.

**Acceptance Criteria:**
- Displays two distinct phases with clear visual separation:

  **Phase 1 — Prefill (Prompt Processing)**
  - Definition shown: "Processing the user's input prompt. Compute-bound — limited by GPU FLOPS."
  - Formula: `prefill_time_ms = (prompt_tokens × 2 × model_params_active × bytes_per_flop) / (GPU_FLOPS × MFU × 1000)`
  - Simplified roofline: `prefill_tokens_per_sec = GPU_FLOPS_effective / (2 × params_active)`
  - Accounts for batch — prefill is parallelizable across tokens: `prefill_time = prompt_tokens / prefill_tokens_per_sec`
  - Shows: prefill throughput (tokens/s), Time-To-First-Token (TTFT) in ms
  - TTFT formula: `TTFT = prefill_time + scheduling_overhead(~5ms) + network_latency`

  **Phase 2 — Decode (Token Generation)**
  - Definition shown: "Generating output tokens one at a time. Memory-bandwidth-bound — limited by HBM bandwidth."
  - Formula: `decode_tokens_per_sec = memory_bandwidth_GBs / model_size_GB_active × efficiency`
  - Per-token latency: `TPOT = 1000 / decode_tokens_per_sec` (ms)
  - Shows: decode throughput (tokens/s per user), Time-Per-Output-Token (TPOT) in ms
  - Total generation time: `output_tokens × TPOT`

- Visual: horizontal timeline diagram showing:
  ```
  ┌──── Prefill ────┐┌────────── Decode ──────────────────────┐
  │ Processing prompt ││ Token 1 │ Token 2 │ ... │ Token N    │
  │    TTFT: 310ms   ││      TPOT: 16ms per token             │
  └─────────────────┘└───────────────────────────────────────┘
  │◄──── total latency: 310ms + (256 × 16ms) = 4.4s ────────►│
  ```

- End-to-end latency: `E2E = TTFT + (output_tokens × TPOT)`
- Shows all three metrics prominently: TTFT, TPOT, E2E latency

### Requirement 2: Concurrent User Capacity Calculator
**User Story:** As a user, I want to know the maximum number of concurrent users my hardware can serve and what happens as I add more users.

**Acceptance Criteria:**
- Computes max concurrent users from three constraints (bottleneck = minimum):

  **Constraint 1 — KV Cache Memory Budget**
  ```
  free_vram_for_kv = total_vram - weights_vram - activation_overhead - framework_overhead
  kv_per_user = 2 × layers × kv_heads × head_dim × (avg_prompt + avg_output) × kv_bytes
  max_users_memory = floor(free_vram_for_kv / kv_per_user)
  ```
  With PagedAttention: multiply by 1.3-1.5× (reduced fragmentation)

  **Constraint 2 — Decode Throughput Budget**
  ```
  total_decode_throughput = memory_bandwidth / model_size_active × efficiency × batch_scaling
  max_users_throughput = total_decode_throughput / min_acceptable_tpot_tokens_per_sec
  ```
  Where `batch_scaling` accounts for the transition from memory-bound (low batch) to compute-bound (high batch)

  **Constraint 3 — Prefill Compute Budget**
  ```
  prefill_flops_per_user = 2 × params_active × avg_prompt_tokens
  max_concurrent_prefill = GPU_FLOPS_effective / (prefill_flops_per_user / max_ttft_budget_seconds)
  ```
  With chunked prefill: prefill interleaves with decode, reducing head-of-line blocking

  **Final:**
  ```
  max_concurrent_users = min(constraint_memory, constraint_throughput, constraint_prefill)
  bottleneck = whichever constraint is smallest
  ```

- Shows which constraint is the bottleneck with visual indicator:
  - 🟢 Memory: "KV cache allows up to 142 users"
  - 🟡 Throughput: "Decode bandwidth limits to 86 users" ← bottleneck
  - 🟢 Prefill: "Prefill capacity allows up to 200 users"
  - **Result: 86 concurrent users (decode-bound)**

- Shows utilization breakdown pie/bar:
  - Weights: 42.8 GB (53%)
  - KV cache (86 users): 28.4 GB (36%)
  - Activations: 2.1 GB (3%)
  - Overhead: 1.5 GB (2%)
  - Free headroom: 5.2 GB (6%)

### Requirement 3: Interactive User Count Slider
**User Story:** As a user, I want to drag a slider to set my desired concurrent users and see all hardware requirements update instantly.

**Acceptance Criteria:**
- Slider range: 1 to 10,000 (log scale, snap points at 1, 5, 10, 25, 50, 100, 250, 500, 1K, 2.5K, 5K, 10K)
- Also accepts direct numeric input
- As user count changes, these update in real-time (<50ms):
  - Total VRAM required (with KV cache scaled to user count)
  - Required number of GPUs (auto-scales: adds GPUs when VRAM exceeded)
  - Required number of replicas (when single-node maxed)
  - Per-user TTFT and TPOT (degrades gracefully with more users)
  - Aggregate throughput (tokens/s across all users)
  - Cost per user per hour
  - Cost per 1M tokens

- Visual feedback on slider:
  - Green zone: fits current hardware with headroom
  - Yellow zone: fits but tight (>80% VRAM or TPOT > 50ms)
  - Red zone: exceeds current hardware, shows "needs N more GPUs"

- When red zone entered, auto-shows upgrade recommendation:
  "86 users fit on 1× H100. For 200 users, you need either:
   • 2× H100 with TP=2 ($4.98/h) — 200 users at 18ms TPOT
   • 3× RTX 4090 replicas ($1.02/h) — 200 users at 22ms TPOT [only for <24GB models]"

### Requirement 4: Per-User Latency Degradation Curve
**User Story:** As a user, I want to see how latency changes as I add more concurrent users so I can find the sweet spot.

**Acceptance Criteria:**
- Interactive chart (Recharts line chart) with:
  - X-axis: concurrent users (1 → max × 2)
  - Y-axis (left): TPOT in ms
  - Y-axis (right): aggregate throughput in tokens/s
  - Two lines: TPOT (rises with users) and throughput (rises then plateaus)
  - Vertical dashed line at current slider position
  - Horizontal dashed line at SLO target (e.g., TPOT ≤ 50ms)
  - Shaded green region where SLO is met
  - Shaded red region where SLO violated

- Chart annotations:
  - "Sweet spot" marker where throughput/TPOT ratio is optimal
  - "Max capacity" marker where either VRAM or TPOT SLO is hit
  - GPU memory exhaustion cliff (vertical line)

- Latency model:
  ```
  # At low batch (memory-bound decode):
  tpot(n) = tpot(1) × (1 + 0.02 × n)   # ~2% overhead per additional user from scheduling

  # At medium batch (transition):
  tpot(n) = tpot(1) × (1 + n / compute_saturation_point)

  # At high batch (compute-bound):
  tpot(n) = (2 × params_active × n) / GPU_FLOPS_effective × 1000   # linear in batch

  # Transition point:
  compute_saturation = memory_bandwidth / (2 × params_active × bytes_per_flop × GPU_FLOPS)
  ```

### Requirement 5: Prompt/Output Token Configurator
**User Story:** As a user, I want to set my expected prompt length and output length separately because they affect different phases.

**Acceptance Criteria:**
- Two separate inputs:
  - **Average prompt tokens** (input): slider 32 → 131,072, log scale, snap at 128, 256, 512, 1K, 2K, 4K, 8K, 16K, 32K, 64K, 128K. Default: 1024
  - **Average output tokens** (generation): slider 16 → 8,192, linear scale, snap at 32, 64, 128, 256, 512, 1K, 2K, 4K. Default: 256

- Shows how each affects the phases:
  - Prompt tokens → TTFT (longer prompt = longer prefill)
  - Output tokens → total generation time (more output = more decode steps)
  - Both → KV cache size (prompt + output tokens stored)

- Presets for common use cases:
  - "Chat": prompt 512, output 256
  - "Code completion": prompt 2048, output 512
  - "RAG / Document Q&A": prompt 8192, output 512
  - "Summarization": prompt 16384, output 1024
  - "Translation": prompt 4096, output 4096
  - "Long-form writing": prompt 1024, output 4096
  - "Agent / Tool use": prompt 4096, output 256 (but many rounds)
  - "Custom": manual input

- Each preset auto-fills prompt + output tokens and shows a description

### Requirement 6: SLO (Service Level Objective) Configuration
**User Story:** As a user, I want to set my latency targets and see if my hardware meets them.

**Acceptance Criteria:**
- SLO inputs:
  - Max TTFT (p95): dropdown 100ms, 200ms, 500ms, 1000ms, 2000ms, 5000ms. Default: 500ms
  - Max TPOT (p95): dropdown 10ms, 20ms, 30ms, 50ms, 100ms, 200ms. Default: 50ms
  - Target throughput: optional, tokens/s or QPS

- P95 multiplier: `p95 ≈ p50 × 1.5` (scheduling jitter + GC + preemption)

- SLO status display:
  - 🟢 "TTFT p95: 310ms — meets 500ms SLO (38% headroom)"
  - 🔴 "TPOT p95: 72ms — exceeds 50ms SLO (44% over)"
  - Shows: "To meet TPOT SLO, reduce to ≤58 concurrent users OR add 1 more GPU"

- SLO line shown on latency curve chart

### Requirement 7: Multi-GPU / Replica Auto-Scaling View
**User Story:** As a user scaling beyond one GPU, I want to see how replicas and GPUs map to user capacity.

**Acceptance Criteria:**
- When user count exceeds single-GPU/node capacity:
  - Auto-computes required replicas: `replicas = ceil(users / max_users_per_replica × safety_factor)`
  - Shows scaling table:
    ```
    Replicas  GPUs   Users    TPOT    $/hour    $/M tokens
    1         1×H100  86      16ms    $2.49     $0.85
    2         2×H100  172     16ms    $4.98     $0.85
    4         4×H100  344     16ms    $9.96     $0.85
    8         8×H100  688     16ms    $19.92    $0.85
    16        16×H100 1,376   17ms    $39.84    $0.86
    ```
  - Shows when TP is needed vs simple replication:
    - Model fits 1 GPU → replicate (each replica independent)
    - Model needs 2+ GPUs → TP within replica, replicate the TP group
  - Cost efficiency curve: $/user/hour decreases then flattens

- For models too large for one GPU:
  - Shows TP group as base unit: "Base replica = 2× H100 (TP=2). Each serves 43 users."
  - Scaling in TP groups: 2, 4, 6, 8... GPUs

### Requirement 8: User Experience Summary Card
**User Story:** As a user, I want a single summary that tells me exactly what each user experiences.

**Acceptance Criteria:**
- Prominent card showing:
  ```
  ┌─────────────────────────────────────────────────┐
  │  USER EXPERIENCE SUMMARY                         │
  │                                                   │
  │  For 50 concurrent users on 1× H100 80GB          │
  │  Model: Llama-3.1-70B-Instruct (Q4_K_M)          │
  │                                                   │
  │  ⏱ Time to first token:     310 ms    🟢 < SLO    │
  │  ⏱ Token generation speed:  62 tok/s  🟢           │
  │  ⏱ Per-token latency:       16 ms     🟢 < SLO    │
  │  ⏱ Full response time:      4.4 s     (256 tokens)│
  │                                                   │
  │  📊 Effective throughput:    3,100 tok/s (all users)│
  │  📊 Max capacity:           86 users   (you: 58%)  │
  │  📊 VRAM utilization:       68 / 80 GB (85%)       │
  │                                                   │
  │  💰 Cost per user per hour:  $0.050                │
  │  💰 Cost per 1M tokens:      $0.85                 │
  │  💰 Cost per request:        $0.0003               │
  │                                                   │
  │  ⚡ Bottleneck: Memory bandwidth (decode phase)    │
  │  💡 Tip: FP8 KV cache would increase capacity     │
  │     to ~120 users (+40%) with <0.1% quality loss   │
  └─────────────────────────────────────────────────┘
  ```

- Updates in real-time as any input changes
- Shows actionable tips based on bottleneck:
  - Memory-bound: "Try FP8 KV cache" or "Reduce context length"
  - Compute-bound: "Use a faster GPU" or "Use quantized weights"
  - KV-bound: "Enable PagedAttention" or "Use prefix caching"
- Includes a "What if?" section: "With 2× GPUs: 172 users, same latency, $4.98/h"

### Requirement 9: Request Cost Calculator
**User Story:** As a user, I want to know what each request costs me in dollars.

**Acceptance Criteria:**
- Computes cost per request: `cost_per_request = (hourly_cost / 3600) × (TTFT + output_tokens × TPOT) / 1000`
- Computes cost per 1M input tokens: based on prefill throughput and hourly cost
- Computes cost per 1M output tokens: based on decode throughput and hourly cost
- Computes cost per user per hour: `hourly_cost / concurrent_users`
- Computes cost per user per month (assuming 8h/day, 22 days): `cost_per_user_per_hour × 176`
- Shows comparison row: "API equivalent" — what Together/Fireworks/OpenAI would charge for same model at same throughput
- Shows breakeven: "Self-hosting is cheaper than API at >X requests/hour"

### Requirement 10: Batch Processing Mode
**User Story:** As a user doing offline batch processing (not real-time), I want to see maximum throughput without latency constraints.

**Acceptance Criteria:**
- Toggle: "Real-time serving" vs "Batch processing (max throughput)"
- Batch mode removes TPOT/TTFT SLO constraints
- Maximizes batch size to fill all available KV cache VRAM
- Shows: max aggregate tokens/s, time to process N documents, cost per 1M tokens in batch mode
- Batch throughput formula: `max_batch × decode_tok_s_per_seq` (saturates GPU compute at high batch)
- Typical 3-5× cheaper per token than real-time due to higher utilization
- Shows: "Process 1M documents (avg 2K tokens each) in X hours on Y GPUs for $Z"

## Tasks

- [x] 1. Create `src/lib/formulas/prefill.ts` — prefill throughput formula (compute-bound roofline: `GPU_FLOPS / (2 × params_active)`), TTFT computation, chunked-prefill adjustment
- [ ] 2. Create `src/lib/formulas/decode.ts` — decode throughput formula (memory-bandwidth roofline: `BW / model_size_active × efficiency`), TPOT computation, batch-scaling curve (memory-bound → compute-bound transition)
- [ ] 3. Create `src/lib/formulas/concurrency.ts` — three-constraint concurrent-user calculator (KV memory, decode throughput, prefill compute), bottleneck identifier, PagedAttention adjustment
- [ ] 4. Create `src/lib/formulas/latency-curve.ts` — TPOT(n) model: memory-bound linear region → transition → compute-bound quadratic region; compute sweet-spot and max-capacity points
- [ ] 5. Create `src/lib/formulas/request-cost.ts` — cost per request, per 1M input tokens, per 1M output tokens, per user per hour/month, API breakeven point
- [ ] 6. Create `src/lib/formulas/batch-processing.ts` — batch-mode max throughput, time to process N documents, cost estimate
- [ ] 7. Create `src/lib/formulas/auto-scale.ts` — replica calculator for target user count exceeding single GPU, TP-group replication, scaling table generator (1/2/4/8/16 replicas with metrics)
- [ ] 8. Create `src/components/calculator/PrefillDecodeBreakdown.tsx` — horizontal timeline visualization showing prefill and decode phases with TTFT, TPOT, E2E labels
- [ ] 9. Create `src/components/calculator/ConcurrentUserSlider.tsx` — log-scale slider (1→10K) with green/yellow/red zones, numeric input, real-time VRAM/latency recalc, KV cache growth visualization
- [ ] 10. Create `src/components/calculator/LatencyCurveChart.tsx` — Recharts dual-axis line chart (TPOT vs throughput vs user count), SLO lines, sweet-spot marker, GPU memory cliff annotation
- [ ] 11. Create `src/components/calculator/PromptOutputConfig.tsx` — dual slider for avg prompt tokens (32-128K) and avg output tokens (16-8K), use-case presets dropdown (Chat, RAG, Code, Summarization, Translation, Long-form, Agent, Custom)
- [ ] 12. Create `src/components/calculator/SLOConfig.tsx` — TTFT and TPOT SLO dropdowns, SLO status badges (🟢 met / 🔴 exceeded with headroom/overshoot %), remediation hints
- [ ] 13. Create `src/components/calculator/UserExperienceSummary.tsx` — prominent card showing TTFT, TPOT, E2E, throughput, VRAM util, cost metrics, bottleneck identification, actionable tips, "What if?" section
- [ ] 14. Create `src/components/calculator/ReplicaScalingTable.tsx` — table showing 1/2/4/8/16 replicas with users/TPOT/$/hour/$/Mtok columns, TP-group vs simple replication logic
- [ ] 15. Create `src/components/calculator/RequestCostPanel.tsx` — per-request cost, per-M-token cost (input vs output), per-user-per-hour, monthly estimate, API comparison row, breakeven
- [ ] 16. Create `src/components/calculator/BatchModeToggle.tsx` — real-time vs batch toggle, batch-mode metrics (max throughput, time-to-process, cost)
- [ ] 17. Create `src/components/calculator/BottleneckIndicator.tsx` — visual showing which constraint (KV memory, decode BW, prefill compute) is limiting, with capacity number for each
- [ ] 18. Update Zustand store: add `concurrentUsers`, `avgPromptTokens`, `avgOutputTokens`, `sloTTFT`, `sloTPOT`, `batchMode` to calculator state
- [ ] 19. Update URL state serialization (nuqs): add `users`, `prompt`, `output`, `sloTtft`, `sloTpot`, `batch` query params
- [ ] 20. Write unit tests:
  - Llama-3.1-8B FP16 on RTX 4090 (24GB): max ~32 users at 4K context, TPOT ~15ms/user
  - Llama-3.1-70B Q4_K_M on H100 80GB: max ~86 users at 1K prompt + 256 output, TPOT ~16ms
  - DeepSeek-V3 (37B active, MLA) on 8×H100: MLA KV should allow 5×+ more users than equivalent MHA model
  - Batch mode should show 3-5× higher tokens/s than real-time at 50 users
  - Scaling table: 4 replicas should show ~4× users at same TPOT
- [ ] 21. Write Playwright e2e test: drag concurrent user slider from 1 to 200, verify VRAM bar grows, GPU recommendation changes from 1×H100 to 2×H100, latency curve updates, cost recalculates
- [ ] 22. Add parameter tooltips for all new inputs:
  - Concurrent users: "Number of users sending requests simultaneously. KV cache grows linearly — each user needs memory for their conversation context."
  - Average prompt tokens: "Expected input length. Affects prefill time (TTFT) and KV cache. RAG typically 4-8K, chat 256-1K, summarization 8-32K."
  - Average output tokens: "Expected generation length. Affects decode time and KV cache. Chat 128-512, code 256-1K, long-form 1K-4K."
  - TTFT SLO: "Maximum acceptable time before first token appears. Interactive chat needs <500ms; async/batch can tolerate seconds."
  - TPOT SLO: "Maximum acceptable time between generated tokens. <30ms feels instant; >100ms feels sluggish; >200ms is painful."
  - Batch mode: "Removes latency constraints. Maximizes throughput by filling GPU with as many sequences as fit. 3-5× cheaper per token."

## Formulas Reference

### Prefill (compute-bound)
```
prefill_flops = 2 × params_active × prompt_tokens
prefill_time_s = prefill_flops / (GPU_FLOPS × MFU)
TTFT_ms = prefill_time_s × 1000 + scheduling_overhead_ms

# MFU for prefill: 0.50-0.70 on H100, 0.30-0.50 on consumer
# scheduling_overhead: 3-10ms (vLLM/SGLang), 1-3ms (TRT-LLM)

# With chunked prefill (max_num_batched_tokens = 2048-8192):
# Prefill interleaves with decode, preventing head-of-line blocking
# TTFT slightly higher but decode latency for existing users unaffected
```

### Decode (memory-bandwidth-bound at low batch)
```
decode_tok_per_s_per_user = memory_bandwidth_GBs / model_size_GB_active × efficiency

# efficiency by framework:
#   llama.cpp/Metal: 0.55-0.70
#   vLLM/TGI: 0.75-0.90
#   TRT-LLM: 0.85-0.95
#   SGLang: 0.80-0.92

TPOT_ms = 1000 / decode_tok_per_s_per_user
```

### Decode at high batch (compute-bound transition)
```
compute_saturation_batch = memory_bandwidth / (2 × params_active_bytes × GPU_FLOPS_per_byte)

# Below saturation: TPOT ≈ constant (memory-bound, batch just fills idle compute)
# Above saturation: TPOT ∝ batch (compute-bound, each token costs real FLOPs time)

# Transition point examples:
#   Llama-3.1-8B FP16 on H100: ~128 concurrent
#   Llama-3.1-70B Q4_K_M on H100: ~40 concurrent
#   Llama-3.1-8B Q4_K_M on RTX 4090: ~64 concurrent
```

### KV Cache per user
```
kv_per_user_bytes = 2 × layers × kv_heads × head_dim × (prompt_tokens + output_tokens) × kv_precision_bytes

# With PagedAttention: block_size=16, fragmentation < 4%
# Without: fragmentation 60-80% → effective capacity 0.2-0.4× of theoretical

max_users_kv = (total_vram - weights - overhead) / kv_per_user_bytes
```

### Aggregate throughput
```
# At n users (memory-bound regime):
agg_throughput_tok_s = decode_tok_per_s_per_user × n × 0.85  # 85% scheduling efficiency

# At n users (compute-bound regime, n > saturation):
agg_throughput_tok_s = GPU_FLOPS × MFU / (2 × params_active)  # ceiling, independent of n
```

### Cost
```
cost_per_request = (hourly_cost / 3600) × E2E_seconds_per_request
cost_per_M_output_tokens = hourly_cost / (agg_output_tok_per_s × 3.6)
cost_per_user_per_hour = hourly_cost / concurrent_users
cost_per_user_per_month = cost_per_user_per_hour × hours_per_day × workdays

# API breakeven:
breakeven_requests_per_hour = hourly_cost / (api_cost_per_request - self_host_cost_per_request)
```

### Scaling
```
replicas_needed = ceil(target_users / max_users_per_replica × safety_factor)
total_cost = replicas_needed × per_replica_hourly_cost
```
