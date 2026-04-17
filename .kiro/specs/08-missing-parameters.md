
## Description

Add all remaining parameters that affect hardware requirements: power/cooling (PUE), TCO, GPU utilization, memory fragmentation, PCIe bottlenecks, gradient accumulation, sequence packing, FlashAttention, speculative decoding, multimodal extras, warmup time, and failover.

## Requirements

### Requirement 1: Power & Cooling Calculator
**User Story:** As a user buying hardware, I want to know electricity costs and cooling requirements.

**Acceptance Criteria:**
- Inputs: GPU TDP (auto-filled from GPU selection), duty cycle slider (0.3-1.0), PUE selector (1.1 hyperscale / 1.4 colo / 1.8 enterprise / 2.2 office / custom), electricity cost $/kWh (default $0.10, range $0.03-$0.50)
- Computes: `facility_power_kW = GPU_count × GPU_TDP × PUE × duty_cycle / 1000`
- Annual kWh and annual cost
- Shows per-GPU hourly electricity cost
- PSU recommendation: total wattage + 25% headroom

### Requirement 2: Total Cost of Ownership (TCO)
**User Story:** As a decision maker, I want a buy-vs-rent comparison showing when on-prem breaks even against cloud.

**Acceptance Criteria:**
- On-prem inputs: hardware capex, depreciation years (3/5/7), PUE, electricity $/kWh, colo $/rack/month (or home/office $0), maintenance % of capex/year, staff cost
- Cloud: selected instances from cloud table
- Computes: `TCO_per_GPU_hr = (capex/dep_years + annual_power + colo + maintenance + staff) / (GPU_count × 8760 × utilization)`
- Breakeven chart: shows month where on-prem cumulative cost crosses cloud cumulative cost
- Factors in utilization: on-prem 60-80% typical vs cloud pay-per-use

### Requirement 3: Advanced Training Parameters
**User Story:** As a ML engineer, I want gradient accumulation, sequence packing, and FlashAttention to be reflected in VRAM estimates.

**Acceptance Criteria:**
- **Gradient accumulation**: input steps (1-256); shows 0 extra VRAM but K× effective batch
- **Sequence packing**: toggle on/off; shows efficiency improvement (unpacked 20-40% → packed 85-95%)
- **FlashAttention**: toggle on/off (default on); when off adds O(N²) attention score memory; shows savings in GB
- **Activation checkpointing**: full / selective / none; selective drops `5·s·a/h` term; full reduces to `sqrt(L) × per-layer`

### Requirement 4: Multimodal Model Extras
**User Story:** As a user running VLMs, I want vision encoder memory accounted for separately.

**Acceptance Criteria:**
- Auto-detected from model config when VLM
- Shows vision encoder VRAM separately: CLIP ViT-L (0.6 GB), SigLIP-SO400M (0.8 GB), InternViT-6B (12 GB)
- Shows image token count impact on KV cache: LLaVA-1.5 (576 tokens/image), Qwen2-VL (256-16384 dynamic)
- Audio encoder support: Whisper-large-v3 (3 GB)

### Requirement 5: Warmup & Load Time Estimates
**User Story:** As a user, I want to know how long it takes to load my model and start serving.

**Acceptance Criteria:**
- Estimates: model load time based on model size ÷ storage bandwidth (NVMe Gen4 ~7 GB/s)
- Framework compile/warmup: vLLM/SGLang 30s-3min, CUDA graph capture ~10s for 70B, TRT-LLM engine build 5-30min (one-time)
- Shows cold-start total = load + compile + warmup

### Requirement 6: Failover & Redundancy
**User Story:** As an ops engineer, I want to know how many spare GPUs to budget for reliability.

**Acceptance Criteria:**
- Redundancy options: None, N+1 (+12% cost), N+2 (+25% cost), multi-AZ (2× cost)
- Shows checkpoint frequency recommendation based on MTBF
- Reference: "Llama-3 training had ~8 interruptions/day on 16K H100s"
- Adds redundancy cost to total cost calculation

## Tasks

- [ ] 1. Create `src/lib/formulas/power.ts` — power draw, cooling, PUE, electricity cost, PSU sizing
- [ ] 2. Create `src/lib/formulas/tco.ts` — buy-vs-rent TCO, breakeven month, utilization-adjusted hourly cost
- [ ] 3. Create `src/lib/formulas/training-advanced.ts` — grad accumulation, sequence packing efficiency, FlashAttention savings, activation checkpointing
- [ ] 4. Create `src/lib/formulas/multimodal.ts` — vision/audio encoder VRAM, image token count
- [ ] 5. Create `src/lib/formulas/warmup.ts` — load time, compile time, cold-start total
- [ ] 6. Create `src/lib/formulas/failover.ts` — redundancy cost multiplier, checkpoint frequency
- [ ] 7. Create `src/components/calculator/PowerPanel.tsx` — power/cooling/electricity inputs and outputs
- [ ] 8. Create `src/components/calculator/TCOPanel.tsx` — buy-vs-rent comparison with breakeven chart
- [ ] 9. Create `src/components/calculator/AdvancedTrainingPanel.tsx` — grad accum, packing, FA, checkpointing toggles
- [ ] 10. Create `src/components/calculator/MultimodalPanel.tsx` — vision/audio encoder VRAM display (auto for VLMs)
- [ ] 11. Create `src/components/calculator/WarmupPanel.tsx` — cold-start estimate
- [ ] 12. Create `src/components/calculator/FailoverPanel.tsx` — redundancy selector with cost impact
- [ ] 13. Write tests for TCO: H100 on-prem at $30k should breakeven vs $2.49/h Lambda at ~14-18 months at 70% util


