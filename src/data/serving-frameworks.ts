export interface ServingFramework {
  id: string;
  name: string;
  hardware: ('nvidia' | 'amd' | 'apple' | 'intel' | 'cpu')[];
  quantizations: string[];
  features: {
    tensorParallel: boolean;
    pipelineParallel: boolean;
    speculativeDecoding: boolean;
    prefixCache: boolean;
    pagedAttention: boolean;
    continuousBatching: boolean;
  };
  efficiencyFactor: { min: number; max: number };
  docsUrl: string;
}

export const SERVING_FRAMEWORKS: ServingFramework[] = [
  {
    id: 'vllm',
    name: 'vLLM',
    hardware: ['nvidia', 'amd', 'cpu'],
    quantizations: ['fp16', 'bf16', 'fp8', 'int8', 'int4', 'awq', 'gptq'],
    features: {
      tensorParallel: true,
      pipelineParallel: true,
      speculativeDecoding: true,
      prefixCache: true,
      pagedAttention: true,
      continuousBatching: true,
    },
    efficiencyFactor: { min: 0.75, max: 0.90 },
    docsUrl: 'https://docs.vllm.ai',
  },
  {
    id: 'sglang',
    name: 'SGLang',
    hardware: ['nvidia', 'amd'],
    quantizations: ['fp16', 'bf16', 'fp8', 'int8', 'awq', 'gptq'],
    features: {
      tensorParallel: true,
      pipelineParallel: false,
      speculativeDecoding: true,
      prefixCache: true,
      pagedAttention: true,
      continuousBatching: true,
    },
    efficiencyFactor: { min: 0.80, max: 0.92 },
    docsUrl: 'https://sgl-project.github.io/start/install.html',
  },
  {
    id: 'trt-llm',
    name: 'TensorRT-LLM',
    hardware: ['nvidia'],
    quantizations: ['fp16', 'bf16', 'fp8', 'int8', 'int4', 'awq', 'gptq'],
    features: {
      tensorParallel: true,
      pipelineParallel: true,
      speculativeDecoding: true,
      prefixCache: true,
      pagedAttention: true,
      continuousBatching: true,
    },
    efficiencyFactor: { min: 0.85, max: 0.95 },
    docsUrl: 'https://nvidia.github.io/TensorRT-LLM',
  },
  {
    id: 'tgi',
    name: 'TGI',
    hardware: ['nvidia', 'amd', 'intel', 'cpu'],
    quantizations: ['fp16', 'bf16', 'int8', 'int4', 'awq', 'gptq', 'eetq'],
    features: {
      tensorParallel: true,
      pipelineParallel: false,
      speculativeDecoding: true,
      prefixCache: false,
      pagedAttention: true,
      continuousBatching: true,
    },
    efficiencyFactor: { min: 0.70, max: 0.85 },
    docsUrl: 'https://huggingface.co/docs/text-generation-inference',
  },
  {
    id: 'llama.cpp',
    name: 'llama.cpp',
    hardware: ['nvidia', 'amd', 'apple', 'intel', 'cpu'],
    quantizations: ['fp16', 'bf16', 'int8', 'int4', 'gguf'],
    features: {
      tensorParallel: false,
      pipelineParallel: false,
      speculativeDecoding: true,
      prefixCache: true,
      pagedAttention: false,
      continuousBatching: false,
    },
    efficiencyFactor: { min: 0.55, max: 0.70 },
    docsUrl: 'https://github.com/ggerganov/llama.cpp',
  },
  {
    id: 'ollama',
    name: 'Ollama',
    hardware: ['nvidia', 'amd', 'apple', 'cpu'],
    quantizations: ['fp16', 'int8', 'int4', 'gguf'],
    features: {
      tensorParallel: false,
      pipelineParallel: false,
      speculativeDecoding: false,
      prefixCache: false,
      pagedAttention: false,
      continuousBatching: false,
    },
    efficiencyFactor: { min: 0.50, max: 0.65 },
    docsUrl: 'https://ollama.com/docs',
  },
  {
    id: 'mlx',
    name: 'MLX',
    hardware: ['apple'],
    quantizations: ['fp16', 'bf16', 'int8', 'int4'],
    features: {
      tensorParallel: false,
      pipelineParallel: false,
      speculativeDecoding: false,
      prefixCache: false,
      pagedAttention: false,
      continuousBatching: false,
    },
    efficiencyFactor: { min: 0.60, max: 0.80 },
    docsUrl: 'https://ml-explore.github.io/mlx-lm',
  },
  {
    id: 'exllamav2',
    name: 'ExLlamaV2',
    hardware: ['nvidia'],
    quantizations: ['fp16', 'int8', 'int4', 'exl2'],
    features: {
      tensorParallel: false,
      pipelineParallel: false,
      speculativeDecoding: true,
      prefixCache: false,
      pagedAttention: false,
      continuousBatching: false,
    },
    efficiencyFactor: { min: 0.65, max: 0.80 },
    docsUrl: 'https://github.com/turboderp/exllamav2',
  },
  {
    id: 'lmdeploy',
    name: 'LMDeploy',
    hardware: ['nvidia'],
    quantizations: ['fp16', 'bf16', 'fp8', 'int8', 'int4', 'awq'],
    features: {
      tensorParallel: true,
      pipelineParallel: true,
      speculativeDecoding: false,
      prefixCache: true,
      pagedAttention: true,
      continuousBatching: true,
    },
    efficiencyFactor: { min: 0.75, max: 0.90 },
    docsUrl: 'https://lmdeploy.readthedocs.io',
  },
  {
    id: 'mlc-llm',
    name: 'MLC-LLM',
    hardware: ['nvidia', 'amd', 'apple', 'intel', 'cpu'],
    quantizations: ['fp16', 'int8', 'int4', 'awq'],
    features: {
      tensorParallel: false,
      pipelineParallel: false,
      speculativeDecoding: false,
      prefixCache: false,
      pagedAttention: false,
      continuousBatching: true,
    },
    efficiencyFactor: { min: 0.60, max: 0.80 },
    docsUrl: 'https://llm.mlc.ai/docs',
  },
  {
    id: 'deepspeed-fastgen',
    name: 'DeepSpeed-FastGen',
    hardware: ['nvidia'],
    quantizations: ['fp16', 'bf16', 'int8', 'int4'],
    features: {
      tensorParallel: true,
      pipelineParallel: true,
      speculativeDecoding: false,
      prefixCache: false,
      pagedAttention: false,
      continuousBatching: true,
    },
    efficiencyFactor: { min: 0.70, max: 0.85 },
    docsUrl: 'https://github.com/microsoft/DeepSpeed/tree/master/blogs/deepspeed-fastgen',
  },
  {
    id: 'aphrodite',
    name: 'Aphrodite',
    hardware: ['nvidia', 'amd', 'cpu'],
    quantizations: ['fp16', 'bf16', 'fp8', 'int8', 'int4', 'awq', 'gptq', 'exl2'],
    features: {
      tensorParallel: true,
      pipelineParallel: false,
      speculativeDecoding: true,
      prefixCache: true,
      pagedAttention: true,
      continuousBatching: true,
    },
    efficiencyFactor: { min: 0.75, max: 0.90 },
    docsUrl: 'https://aphrodite.pygmalion.chat',
  },
];
