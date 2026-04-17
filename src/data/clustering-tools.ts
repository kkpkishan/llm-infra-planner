/**
 * Clustering tool matrix for distributed LLM inference and training.
 */

export interface ClusteringTool {
  id: string;
  name: string;
  scenario: string;
  group: 'production' | 'hpc' | 'lightweight' | 'consumer';
  setupComplexity: 1 | 2 | 3 | 4 | 5;  // 1=easy, 5=hard
  supportedHardware: string[];
  maxClusterSize: string;
  latencyOverhead: string;
  description: string;
  docsUrl: string;
}

export const CLUSTERING_TOOLS: ClusteringTool[] = [
  {
    id: 'k8s-gpu-operator',
    name: 'Kubernetes + GPU Operator',
    scenario: 'Production multi-tenant serving',
    group: 'production',
    setupComplexity: 4,
    supportedHardware: ['NVIDIA A100', 'H100', 'H200', 'L40S', 'A10G'],
    maxClusterSize: '10,000+ GPUs',
    latencyOverhead: '1-5 ms (pod scheduling)',
    description: 'NVIDIA GPU Operator automates GPU driver/plugin lifecycle in K8s. Pair with Volcano or Kueue for gang scheduling. Best for multi-tenant production.',
    docsUrl: 'https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/',
  },
  {
    id: 'slurm-enroot',
    name: 'Slurm + Enroot + Pyxis',
    scenario: 'HPC long-running training jobs',
    group: 'hpc',
    setupComplexity: 3,
    supportedHardware: ['NVIDIA A100', 'H100', 'H200', 'AMD MI300X'],
    maxClusterSize: '100,000+ GPUs',
    latencyOverhead: '< 1 ms (bare-metal)',
    description: 'Industry-standard HPC scheduler. Enroot provides rootless container runtime; Pyxis is the Slurm plugin. Optimal for large training runs with predictable job queues.',
    docsUrl: 'https://github.com/NVIDIA/enroot',
  },
  {
    id: 'ray-serve-vllm',
    name: 'Ray Serve + vLLM',
    scenario: 'Distributed inference with autoscaling',
    group: 'production',
    setupComplexity: 3,
    supportedHardware: ['NVIDIA A100', 'H100', 'H200', 'L40S', 'A10G', 'AMD MI300X'],
    maxClusterSize: '1,000+ GPUs',
    latencyOverhead: '2-10 ms (Ray overhead)',
    description: 'Ray Serve handles request routing and autoscaling; vLLM provides PagedAttention and continuous batching. Supports multi-node tensor parallelism natively.',
    docsUrl: 'https://docs.vllm.ai/en/latest/serving/distributed_serving.html',
  },
  {
    id: 'nomad',
    name: 'Nomad + NVIDIA Plugin',
    scenario: 'Lightweight orchestration',
    group: 'lightweight',
    setupComplexity: 2,
    supportedHardware: ['NVIDIA (any)', 'AMD (any)'],
    maxClusterSize: '1,000+ nodes',
    latencyOverhead: '1-3 ms',
    description: 'HashiCorp Nomad with the NVIDIA device plugin. Simpler than Kubernetes, supports GPU scheduling with less operational overhead. Good for smaller teams.',
    docsUrl: 'https://developer.hashicorp.com/nomad/plugins/devices/nvidia',
  },
  {
    id: 'exo',
    name: 'exo',
    scenario: 'Consumer / Apple Silicon heterogeneous cluster',
    group: 'consumer',
    setupComplexity: 1,
    supportedHardware: ['Apple Silicon (M1/M2/M3/M4)', 'NVIDIA consumer', 'AMD consumer'],
    maxClusterSize: '~20 devices',
    latencyOverhead: '50-200 ms (Ethernet/TB5)',
    description: 'Ring pipeline parallelism over mDNS-discovered peers. Supports Thunderbolt 5 RDMA for reduced latency. Ideal for running 70B+ models across multiple Mac Studios or consumer GPUs.',
    docsUrl: 'https://github.com/exo-explore/exo',
  },
  {
    id: 'petals',
    name: 'Petals',
    scenario: 'Public swarm / collaborative inference',
    group: 'consumer',
    setupComplexity: 1,
    supportedHardware: ['NVIDIA consumer', 'AMD consumer', 'Apple Silicon'],
    maxClusterSize: 'Unlimited (public swarm)',
    latencyOverhead: '200-2000 ms (internet)',
    description: 'BitTorrent-style distributed inference. Each peer hosts a few transformer layers. ~5-6 tok/s for 70B, ~4 tok/s for 180B. Best for experimentation, not production SLOs.',
    docsUrl: 'https://github.com/bigscience-workshop/petals',
  },
  {
    id: 'gpustack',
    name: 'GPUStack',
    scenario: 'Multi-backend GPU orchestration',
    group: 'lightweight',
    setupComplexity: 2,
    supportedHardware: ['NVIDIA (any)', 'AMD (any)', 'Apple Silicon', 'Intel Arc'],
    maxClusterSize: '100+ GPUs',
    latencyOverhead: '5-20 ms',
    description: 'Unified management plane for vLLM, SGLang, and TRT-LLM backends. Provides a single API endpoint across heterogeneous GPU clusters with automatic backend selection.',
    docsUrl: 'https://github.com/gpustack/gpustack',
  },
  {
    id: 'localai',
    name: 'LocalAI',
    scenario: 'Local federation with llama.cpp workers',
    group: 'consumer',
    setupComplexity: 1,
    supportedHardware: ['NVIDIA consumer', 'AMD consumer', 'Apple Silicon', 'CPU'],
    maxClusterSize: '~10 nodes',
    latencyOverhead: '100-500 ms (LAN)',
    description: 'OpenAI-compatible API server using llama.cpp RPC workers for distributed inference. Supports CPU offload. Best for home labs and offline deployments.',
    docsUrl: 'https://localai.io/features/distribute/',
  },
];

/** Get tools filtered by group */
export function getToolsByGroup(group: ClusteringTool['group']): ClusteringTool[] {
  return CLUSTERING_TOOLS.filter(t => t.group === group);
}
