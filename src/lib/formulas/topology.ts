/**
 * Cluster topology recommendation based on GPU count and workload.
 */

export interface TopologyRecommendation {
  description: string;   // e.g. "2-tier fat-tree"
  interconnect: string;  // recommended interconnect
  notes: string;
}

/**
 * Recommend network topology based on cluster size and workload type.
 *
 * Decision tree:
 * - ≤8 GPUs (single node): NVLink
 * - 2-8 nodes (9-64 GPUs): fat-tree single-tier
 * - 8-64 nodes (65-512 GPUs): 2-tier fat-tree or rail-optimized
 * - 64+ nodes (513+ GPUs): 3-tier with spine-leaf
 */
export function recommendTopology(
  numGPUs: number,
  workload: 'training' | 'inference',
): TopologyRecommendation {
  if (numGPUs <= 8) {
    return {
      description: 'Single node',
      interconnect: 'NVLink',
      notes: workload === 'training'
        ? 'All GPUs connected via NVLink switch; use TP=8 for full bandwidth'
        : 'Tensor parallelism across all GPUs; NVLink provides ~900 GB/s',
    };
  }

  if (numGPUs <= 64) {
    return {
      description: 'Fat-tree single-tier',
      interconnect: 'InfiniBand NDR (400 Gb/s)',
      notes: workload === 'training'
        ? 'Single-tier fat-tree; use DP + TP within nodes; PP across nodes'
        : 'Low-latency single-tier fabric; suitable for disaggregated prefill/decode',
    };
  }

  if (numGPUs <= 512) {
    return {
      description: '2-tier fat-tree or rail-optimized',
      interconnect: 'InfiniBand NDR/XDR (400-800 Gb/s)',
      notes: workload === 'training'
        ? '2-tier fat-tree with rail-optimized routing; use ZeRO-3 or 3D parallelism'
        : 'Rail-optimized for all-to-all traffic patterns in MoE inference',
    };
  }

  return {
    description: '3-tier spine-leaf',
    interconnect: 'InfiniBand XDR (800 Gb/s) + NVLink intra-node',
    notes: workload === 'training'
      ? '3-tier spine-leaf with 1:1 oversubscription; pipeline parallelism across pods'
      : 'Hierarchical fabric; route inference requests to GPU pods by model shard',
  };
}
