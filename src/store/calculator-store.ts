import { create } from 'zustand';
import type {
  ModelSpec, GPUSpec, CloudInstance,
  VRAMBreakdown, GPURecommendations, CloudRecommendation,
  CostMetricsResult, ClusterRecommendation, StackRecommendation,
  WorkloadMode, TrainingOptions, AdvancedSettings, CalculatorState,
} from '@/lib/formulas/types';
import {
  getPrecisionConfig, getKVPrecisionConfig,
  computeTotalVRAM, computeThroughput, computeCostMetrics,
  recommendGPUs, recommendCloudInstances,
  recommendCluster, recommendStack,
} from '@/lib/formulas';
import { serializeState, parseState, getDefaultState } from '@/lib/url-serializer';

// ── Static data (loaded once) ─────────────────────────────────────────────────
import modelsData from '@/data/models.json';
import gpusData from '@/data/gpus.json';
import cloudData from '@/data/cloud.json';

const MODEL_DB = modelsData as ModelSpec[];
const GPU_DB = gpusData as GPUSpec[];
const CLOUD_DB = cloudData as CloudInstance[];

// ── Default values ────────────────────────────────────────────────────────────
const DEFAULT_EFFICIENCY = 0.8; // vLLM default

// ── Store interface ───────────────────────────────────────────────────────────
export interface CalculatorStore {
  // ── Static data
  modelDb: ModelSpec[];
  gpuDb: GPUSpec[];
  cloudDb: CloudInstance[];

  // ── Inputs
  selectedModel: ModelSpec | null;
  precision: string;
  kvPrecision: string;
  contextLength: number;
  batchSize: number;
  mode: WorkloadMode;
  trainingOptions: TrainingOptions;
  advancedSettings: AdvancedSettings;

  // ── Network / Storage inputs
  numGPUs: number;
  parallelismType: 'tp' | 'pp' | 'zero3' | 'moe';

  // ── Computed results
  breakdown: VRAMBreakdown | null;
  gpuRecommendations: GPURecommendations | null;
  cloudRecommendations: CloudRecommendation[] | null;
  costMetrics: CostMetricsResult | null;
  clusterRecommendation: ClusterRecommendation | null;
  stackRecommendation: StackRecommendation | null;

  // ── Concurrent user capacity (Spec 10)
  concurrentUsers: number;
  avgPromptTokens: number;
  avgOutputTokens: number;
  sloTTFTMs: number;
  sloTPOTMs: number;
  batchMode: boolean;

  // ── Compare configs (up to 3)
  compareConfigs: CalculatorState[];

  // ── Actions
  setModel: (model: ModelSpec) => void;
  setPrecision: (precision: string) => void;
  setKVPrecision: (kvPrecision: string) => void;
  setContextLength: (ctx: number) => void;
  setBatchSize: (batch: number) => void;
  setMode: (mode: WorkloadMode) => void;
  setTrainingOptions: (opts: Partial<TrainingOptions>) => void;
  setAdvancedSettings: (settings: Partial<AdvancedSettings>) => void;
  setNumGPUs: (n: number) => void;
  setParallelismType: (t: 'tp' | 'pp' | 'zero3' | 'moe') => void;
  setConcurrentUsers: (n: number) => void;
  setAvgPromptTokens: (n: number) => void;
  setAvgOutputTokens: (n: number) => void;
  setSloTTFT: (ms: number) => void;
  setSloTPOT: (ms: number) => void;
  setBatchMode: (b: boolean) => void;
  addCompareConfig: () => void;
  removeCompareConfig: (index: number) => void;
  loadFromURL: (queryString: string) => void;
  getShareURL: () => string;
  recompute: () => void;
}

// ── Default training options ──────────────────────────────────────────────────
const defaultTrainingOptions: TrainingOptions = {
  mode: 'lora',
  gradientCheckpointing: true,
  loraRank: 8,
};

const defaultAdvancedSettings: AdvancedSettings = {
  framework: 'vLLM',
  overheadMultiplier: 1.0,
  tokenizer: 'default',
};

// ── Store implementation ──────────────────────────────────────────────────────
export const useCalculatorStore = create<CalculatorStore>((set, get) => {
  // Read URL on init — but never default to 'reverse' (that's a separate page)
  const urlState = typeof window !== 'undefined' && window.location.search
    ? parseState(window.location.search, MODEL_DB)
    : null;
  const rawInitState = urlState ?? getDefaultState(MODEL_DB);
  // Force inference if mode is reverse/scale/finetune (legacy modes)
  const initialState = {
    ...rawInitState,
    mode: (['reverse', 'finetune', 'scale'].includes(rawInitState.mode)
      ? rawInitState.mode === 'finetune' ? 'train' : 'inference'
      : rawInitState.mode) as WorkloadMode,
  };
  const initialModel = MODEL_DB.find(m => m.id === initialState.model) ?? MODEL_DB[0] ?? null;

  return {
    // Static data
    modelDb: MODEL_DB,
    gpuDb: GPU_DB,
    cloudDb: CLOUD_DB,

    // Inputs
    selectedModel: initialModel,
    precision: initialState.precision,
    kvPrecision: initialState.kvPrecision,
    contextLength: initialState.ctx,
    batchSize: initialState.batch,
    mode: initialState.mode,
    trainingOptions: defaultTrainingOptions,
    advancedSettings: defaultAdvancedSettings,

    // Network / Storage
    numGPUs: 1,
    parallelismType: 'tp' as const,

    // Concurrent user capacity (Spec 10)
    concurrentUsers: 10,
    avgPromptTokens: 1024,
    avgOutputTokens: 256,
    sloTTFTMs: 500,
    sloTPOTMs: 50,
    batchMode: false,

    // Computed (null until first recompute)
    breakdown: null,
    gpuRecommendations: null,
    cloudRecommendations: null,
    costMetrics: null,
    clusterRecommendation: null,
    stackRecommendation: null,

    // Compare
    compareConfigs: [],

    // ── Actions ────────────────────────────────────────────────────────────

    setModel: (model) => {
      // Clamp context to model's max
      const { contextLength } = get();
      const clampedCtx = Math.min(contextLength, model.architecture.maxContextLength);
      set({ selectedModel: model, contextLength: clampedCtx });
      get().recompute();
    },

    setPrecision: (precision) => {
      set({ precision });
      get().recompute();
    },

    setKVPrecision: (kvPrecision) => {
      set({ kvPrecision });
      get().recompute();
    },

    setContextLength: (ctx) => {
      const { selectedModel } = get();
      // Allow values beyond model's native max (user gets a warning in UI)
      // Hard cap at 10M tokens (largest step)
      const hardMax = 10_485_760;
      set({ contextLength: Math.max(512, Math.min(ctx, hardMax)) });
      get().recompute();
    },

    setBatchSize: (batch) => {
      set({ batchSize: Math.max(1, Math.min(32, batch)) });
      get().recompute();
    },

    setMode: (mode) => {
      // Map legacy modes: finetune → train, scale → inference
      const resolved = mode === 'finetune' ? 'train'
        : mode === 'scale' ? 'inference'
        : mode;
      set({ mode: resolved });
      get().recompute();
    },

    setTrainingOptions: (opts) => {
      set(state => ({ trainingOptions: { ...state.trainingOptions, ...opts } }));
      get().recompute();
    },

    setAdvancedSettings: (settings) => {
      set(state => ({ advancedSettings: { ...state.advancedSettings, ...settings } }));
      get().recompute();
    },

    setNumGPUs: (n) => {
      set({ numGPUs: Math.max(1, n) });
      get().recompute();
    },

    setParallelismType: (t) => {
      set({ parallelismType: t });
      get().recompute();
    },

    setConcurrentUsers: (n) => {
      set({ concurrentUsers: Math.max(1, Math.min(10000, n)) });
    },

    setAvgPromptTokens: (n) => {
      set({ avgPromptTokens: Math.max(32, Math.min(131072, n)) });
    },

    setAvgOutputTokens: (n) => {
      set({ avgOutputTokens: Math.max(16, Math.min(8192, n)) });
    },

    setSloTTFT: (ms) => {
      set({ sloTTFTMs: ms });
    },

    setSloTPOT: (ms) => {
      set({ sloTPOTMs: ms });
    },

    setBatchMode: (b) => {
      set({ batchMode: b });
    },

    addCompareConfig: () => {
      const { compareConfigs, selectedModel, precision, kvPrecision, contextLength, batchSize, mode } = get();
      if (compareConfigs.length >= 3 || !selectedModel) return;
      const config: CalculatorState = {
        model: selectedModel.id,
        precision,
        kvPrecision,
        ctx: contextLength,
        batch: batchSize,
        mode,
      };
      set({ compareConfigs: [...compareConfigs, config] });
    },

    removeCompareConfig: (index) => {
      set(state => ({
        compareConfigs: state.compareConfigs.filter((_, i) => i !== index),
      }));
    },

    loadFromURL: (queryString) => {
      const parsed = parseState(queryString, MODEL_DB);
      const model = MODEL_DB.find(m => m.id === parsed.model) ?? MODEL_DB[0] ?? null;
      set({
        selectedModel: model,
        precision: parsed.precision,
        kvPrecision: parsed.kvPrecision,
        contextLength: parsed.ctx,
        batchSize: parsed.batch,
        mode: parsed.mode,
      });
      if (parsed.trainingMethod) {
        set(state => ({
          trainingOptions: {
            ...state.trainingOptions,
            trainingMethodId: parsed.trainingMethod,
          },
        }));
      }
      // Spec 10: Concurrent user capacity
      if (parsed.users !== undefined) set({ concurrentUsers: parsed.users });
      if (parsed.avgPrompt !== undefined) set({ avgPromptTokens: parsed.avgPrompt });
      if (parsed.avgOutput !== undefined) set({ avgOutputTokens: parsed.avgOutput });
      if (parsed.sloTtft !== undefined) set({ sloTTFTMs: parsed.sloTtft });
      if (parsed.sloTpot !== undefined) set({ sloTPOTMs: parsed.sloTpot });
      if (parsed.batch10 !== undefined) set({ batchMode: parsed.batch10 });
      get().recompute();
    },

    getShareURL: () => {
      const { selectedModel, precision, kvPrecision, contextLength, batchSize, mode, trainingOptions,
        concurrentUsers, avgPromptTokens, avgOutputTokens, sloTTFTMs, sloTPOTMs, batchMode } = get();
      if (!selectedModel) return window.location.href;
      const state: CalculatorState = {
        model: selectedModel.id,
        precision,
        kvPrecision,
        ctx: contextLength,
        batch: batchSize,
        mode,
        trainingMethod: trainingOptions.trainingMethodId,
        users: concurrentUsers !== 10 ? concurrentUsers : undefined,
        avgPrompt: avgPromptTokens !== 1024 ? avgPromptTokens : undefined,
        avgOutput: avgOutputTokens !== 256 ? avgOutputTokens : undefined,
        sloTtft: sloTTFTMs !== 500 ? sloTTFTMs : undefined,
        sloTpot: sloTPOTMs !== 50 ? sloTPOTMs : undefined,
        batch10: batchMode || undefined,
      };
      return window.location.origin + window.location.pathname + serializeState(state);
    },

    recompute: () => {
      const {
        selectedModel, precision, kvPrecision, contextLength, batchSize,
        mode, trainingOptions, gpuDb, cloudDb, numGPUs,
      } = get();

      if (!selectedModel) return;

      const precisionConfig = getPrecisionConfig(precision);
      const kvPrecisionConfig = getKVPrecisionConfig(kvPrecision);

      // VRAM breakdown (total across all GPUs)
      const breakdown = computeTotalVRAM(
        selectedModel,
        precisionConfig,
        kvPrecisionConfig,
        contextLength,
        batchSize,
        mode,
        trainingOptions
      );

      // Per-GPU VRAM needed (tensor parallelism splits weights evenly)
      const vramPerGPU = breakdown.totalGB / Math.max(1, numGPUs);

      // Active weights for throughput (use paramsActive for MoE)
      const activeParams = selectedModel.paramsActive ?? selectedModel.paramsTotal;
      const activeWeightsGB = (activeParams * precisionConfig.bytesPerParam) / 1e9;
      const activeWeightsPerGPU = activeWeightsGB / Math.max(1, numGPUs);

      // GPU recommendations — based on per-GPU VRAM requirement
      const gpuRecommendations = recommendGPUs(
        vramPerGPU,
        gpuDb,
        { activeWeightsGB: activeWeightsPerGPU, efficiencyFactor: DEFAULT_EFFICIENCY }
      );

      // Cloud recommendations — based on total VRAM (multi-GPU instances)
      const cloudRecommendations = recommendCloudInstances(
        breakdown.totalGB,
        cloudDb,
        gpuDb
      );

      // Cost metrics (use cheapest cloud instance, scale throughput by numGPUs)
      const cheapestCloud = cloudRecommendations[0];
      const topGPU = gpuRecommendations.allFits.find(f => f.fitStatus !== 'red');
      let costMetrics: CostMetricsResult | null = null;

      if (topGPU && cheapestCloud) {
        const throughput = computeThroughput({
          memoryBandwidthGBs: topGPU.gpu.memoryBandwidthGBs,
          activeWeightsGB: activeWeightsPerGPU,
          efficiencyFactor: DEFAULT_EFFICIENCY,
        });
        // Scale throughput by number of GPUs (tensor parallel scales linearly)
        const scaledThroughput = throughput.tokensPerSecond * numGPUs;
        costMetrics = computeCostMetrics({
          tokensPerSecond: scaledThroughput,
          hourlyCloudCost: cheapestCloud.onDemandPerHour,
          contextLength,
          activeWeightsGB,
          computeTFLOPS: topGPU.gpu.flops.fp16 * numGPUs,
        });
      }

      // Cluster recommendation
      const clusterRecommendation = recommendCluster(breakdown.totalGB, mode, gpuDb);

      // Stack recommendation (use top fitting GPU or first in DB)
      const stackGPU = topGPU?.gpu ?? gpuDb[0];
      const stackRecommendation = stackGPU
        ? recommendStack(stackGPU, mode)
        : null;

      set({
        breakdown,
        gpuRecommendations,
        cloudRecommendations,
        costMetrics,
        clusterRecommendation,
        stackRecommendation,
      });
    },
  };
});
