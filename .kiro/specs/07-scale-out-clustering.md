
## Description

Add proper multi-GPU scaling math, RAM/NUMA requirements, open-source clustering tools, consumer GPU clustering (exo, Petals), and large-user-base serving calculations with auto-scaling guidance.

## Requirements

### Requirement 1: Parallelism Strategy Calculator
**User Story:** As a user, I want the calculator to recommend the optimal TP/PP/DP split for my model and cluster.

**Acceptance Criteria:**
- Auto-computes parallelism split:
  ```
  TP = min(8, GPUs_per_node, ceil(model_GB / GPU_mem_GB))
  PP = ceil(model_GB / (TP × GPU_mem_GB × 0.6))
  DP = total_GPUs / (TP × PP)
  ```
- TP bounded by KV-head count for GQA models (Llama-3-70B: TP ≤ 8)
- Shows scaling efficiency estimate: 0.92-0.97 at 8 GPUs, 0.85-0.92 at 64, 0.75-0.85 at 512, 0.55-0.70 at 16k
- Shows communication overhead % for chosen parallelism
- Warns on suboptimal splits: "PP=4 with only 2 micro-batches creates 60% bubble"

### Requirement 2: System RAM Calculator
**User Story:** As a user, I want to know how much system RAM I need alongside GPU VRAM.

**Acceptance Criteria:**
- Inference: RAM ≥ 1.2-1.5× model bytes (mmap loading)
- Load peak: RAM ≥ 2× model bytes
- Training (standard): RAM ≥ 1.5× aggregate VRAM per node
- ZeRO-Infinity offload: CPU RAM ≈ 16 × N_params bytes
- NUMA guidance: pin GPUs 0-3 to NUMA 0, 4-7 to NUMA 1 on 2-socket
- CPU core recommendation: 1 physical core/GPU for dataloaders + 4-8 for tokenization
- Output: minimum RAM, recommended RAM, NUMA layout

### Requirement 3: Open-Source Clustering Recommendations
**User Story:** As a user with hardware that doesn't natively support clustering, I want to know what software can help.

**Acceptance Criteria:**
- Recommends clustering tools based on scenario:
  - Production multi-tenant: Kubernetes + NVIDIA GPU Operator + Volcano/Kueue
  - HPC long training: Slurm + Enroot + Pyxis
  - Distributed inference: Ray Serve + vLLM multi-node
  - Lightweight: Nomad + NVIDIA plugin
  - Apple/consumer heterogeneous: exo (ring pipeline, mDNS, TB5 RDMA)
  - Public swarm: Petals (BitTorrent-style)
  - Multi-backend orchestration: GPUStack (vLLM/SGLang/TRT-LLM)
  - Local federation: LocalAI (llama.cpp RPC workers)
- Each recommendation shows: setup complexity (1-5), supported hardware, max cluster size, latency overhead

### Requirement 4: Consumer GPU Clustering
**User Story:** As a hobbyist, I want to know if I can cluster my consumer GPUs (RTX 4090s, Mac Studios) and what to expect.

**Acceptance Criteria:**
- Shows PCIe bandwidth limitations: Gen4 x16 = 32 GB/s, Gen5 = 64 GB/s
- NVLink Bridge availability: only RTX 3090 (removed on 4090/5090)
- Ethernet-based training: shows achievable throughput (only viable for <13B)
- exo sizing estimates: 2× M2 Ultra 192GB + 10GbE → Llama-70B 4-bit → ~8-12 tok/s
- Petals throughput: ~5-6 tok/s for 70B, ~4 tok/s for 180B
- Thunderbolt 5 RDMA latency reduction note
- Warning: "Consumer clustering has 5-20× latency overhead vs NVLink; best for experimentation, not production"

### Requirement 5: Large-Scale Serving Calculator
**User Story:** As an enterprise user, I want to size infrastructure for thousands of concurrent users.

**Acceptance Criteria:**
- Inputs: target QPS, avg output tokens, SLO (p95 TTFT, p95 TPOT), region(s)
- Formula: `replicas = ceil(peak_QPS / per_replica_QPS × safety_factor)`
- Safety factor slider: 1.2-2.0 (default 1.4)
- Shows: total GPUs needed, cost/hour, cost/day, cost/month
- Load balancing recommendation: round-robin vs least-connections vs cache-affinity
- Auto-scaling guidance: scale-up triggers (GPU util ≥70%, cache ≥80%, queue depth), cooldowns
- Multi-region: show per-region replica distribution
- Cost optimization: spot% slider (0-80%), shows blended cost with fallback pool

## Tasks

- [ ] 1. Create `src/lib/formulas/parallelism.ts` — TP/PP/DP split calculator with GQA-aware TP bound, scaling efficiency, comm overhead
- [ ] 2. Create `src/lib/formulas/system-ram.ts` — RAM requirements for inference, training, ZeRO-offload, NUMA layout
- [ ] 3. Create `src/lib/formulas/replicas.ts` — QPS-to-replicas formula, cost projections, auto-scaling thresholds
- [ ] 4. Create `src/data/clustering-tools.ts` — typed constant with clustering tool matrix (K8s, Slurm, Ray, exo, Petals, etc.)
- [ ] 5. Create `src/components/calculator/ParallelismPanel.tsx` — shows recommended TP/PP/DP, scaling efficiency, comm overhead
- [ ] 6. Create `src/components/calculator/RAMPanel.tsx` — shows system RAM, CPU cores, NUMA recommendations
- [ ] 7. Create `src/components/calculator/ClusteringTools.tsx` — recommends clustering software with setup complexity
- [ ] 8. Create `src/components/calculator/ScaleEstimator.tsx` — QPS input, replica count, total cost, auto-scaling guidance
- [ ] 9. Update GPU recommendation to include consumer clustering options when relevant
- [ ] 10. Write tests: 70B on 128 GPUs should output TP=8 PP=2 DP=8; QPS=10000 for 70B should compute ~778 replicas at TP=4 FP8


