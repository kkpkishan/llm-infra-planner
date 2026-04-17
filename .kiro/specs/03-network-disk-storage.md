
## Description

Add network bandwidth, disk throughput, and storage capacity calculations for distributed training and large-scale serving. When the calculator recommends multi-GPU/multi-node, also show required network fabric, storage IOPS, and total disk capacity.

## Requirements

### Requirement 1: Network Bandwidth Formulas
**User Story:** As a user planning distributed training, I want to know the required network bandwidth between nodes so I can choose the right interconnect.

**Acceptance Criteria:**
- Implements ring all-reduce formula: `bytes_per_GPU = 2 · (N-1)/N · model_bytes`
- Implements TP communication: `4 · L · (batch · seq · hidden · dtype_bytes)` all-reduces per step
- Implements PP activation transfer: `batch · seq · hidden · dtype_bytes` per micro-batch boundary
- Implements ZeRO-3 comm: `3 × model_bytes` per step (all-gather fwd + all-gather bwd + reduce-scatter grads)
- Implements MoE expert-parallel comm: `2 · batch · seq · hidden · top_k · dtype_bytes` all-to-alls per MoE layer
- Computes `required_bandwidth = bytes_per_step / step_time_budget`
- Outputs: minimum interconnect recommendation (PCIe, 10GbE, 25GbE, 100GbE, HDR 200Gb IB, NDR 400Gb IB, XDR 800Gb IB, NVLink)
- Shows communication overhead as % of step time

### Requirement 2: Interconnect Database
**User Story:** As a user, I want to know what network options exist and which ones my chosen cloud provider offers.

**Acceptance Criteria:**
- Database of interconnect specs:
  - PCIe Gen4 x16: 32 GB/s bidir, ~2µs latency
  - PCIe Gen5 x16: 64 GB/s bidir
  - NVLink 3 (A100): 600 GB/s per GPU
  - NVLink 4 (H100/H200): 900 GB/s per GPU
  - NVLink 5 (B200/GB200): 1.8 TB/s per GPU
  - InfiniBand HDR: 200 Gb/s, ~1µs
  - InfiniBand NDR: 400 Gb/s, ~600ns
  - InfiniBand XDR: 800 Gb/s, ~500ns
  - RoCEv2 (Spectrum-X): 400/800 Gb/s, 1-3µs
  - AWS EFA: 3,200 Gbps aggregate (p5)
  - Google TPU ICI: 4,800 Gb/s/chip (v5p)
- Each cloud instance in DB tagged with its interconnect type
- UI shows interconnect mismatch warnings (e.g., "TP=8 across PCIe will be 50× slower than NVLink")

### Requirement 3: Disk Throughput Calculator
**User Story:** As a user, I want to know the required disk speed for checkpoint saving and data loading.

**Acceptance Criteria:**
- Checkpoint write formula: `checkpoint_bytes / time_budget_seconds`
  - `checkpoint_bytes = params × 16` (BF16 weights + grads + FP32 Adam m+v + master)
  - Default time budget: 60 seconds (configurable)
- Data loading formula: `global_batch × seq_len × bytes_per_token / step_time`
- Recommends storage tier: HDD (~200 MB/s) / SATA SSD (~550 MB/s) / NVMe Gen4 (~7 GB/s) / NVMe Gen5 (~14 GB/s) / parallel FS (100+ GB/s)
- Warns when checkpoint write exceeds disk throughput

### Requirement 4: Storage Capacity Calculator
**User Story:** As a user, I want to estimate total disk needed for training data, checkpoints, and logs.

**Acceptance Criteria:**
- Training data: `num_tokens × bytes_per_token` (2B for uint16, 4B for uint32 if vocab>65536)
- Compression estimate: zstd ~2.5-3.5× on JSONL
- Checkpoint storage: `checkpoint_bytes × num_checkpoints_to_keep`
- Log/monitoring: flat 10 GB estimate
- Total = data + checkpoints + logs + 20% headroom
- Outputs: recommended storage type and capacity in GB/TB

### Requirement 5: Network Topology Visualization
**User Story:** As a user choosing multi-node, I want to see a diagram of the recommended network topology.

**Acceptance Criteria:**
- Generates topology recommendation based on cluster size:
  - ≤8 GPUs single node: NVLink diagram
  - 2-8 nodes: fat-tree single-tier
  - 8-64 nodes: 2-tier fat-tree or rail-optimized
  - 64+ nodes: 3-tier with spine-leaf
- Shows in ClusterTopology component: nodes as boxes, edges labeled with interconnect type and bandwidth
- Labels show: TP groups (intra-node), PP stages, DP replicas

## Tasks

- [ ] 1. Create `src/lib/formulas/network.ts` — all-reduce, TP comm, PP comm, ZeRO-3 comm, MoE EP comm formulas
- [ ] 2. Create `src/lib/formulas/storage.ts` — checkpoint size, data size, total storage formulas
- [ ] 3. Create `src/lib/formulas/disk-iops.ts` — checkpoint write bandwidth, data loading bandwidth, tier recommendation
- [ ] 4. Create `src/types/network.ts` — InterconnectSpec interface, interconnect database as typed constant
- [ ] 5. Create `src/lib/formulas/topology.ts` — decision tree for topology recommendation based on cluster size + workload
- [ ] 6. Update `src/components/calculator/ClusterTopology.tsx` — render network topology with interconnect labels and bandwidth annotations
- [ ] 7. Create `src/components/calculator/NetworkPanel.tsx` — shows required bandwidth, recommended interconnect, comm overhead %
- [ ] 8. Create `src/components/calculator/StoragePanel.tsx` — shows disk capacity breakdown (data + checkpoints + logs), storage tier recommendation
- [ ] 9. Update Zustand store with network/storage state fields
- [ ] 10. Write unit tests for all network and storage formulas with worked examples from the addendum (7B/8×H100, 70B/128GPU, 405B/1024GPU)
- [ ] 11. Add interconnect column to CloudTable component


