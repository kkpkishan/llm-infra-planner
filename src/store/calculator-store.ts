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

  // ── Computed results
  breakdown: VRAMBreakdown | null;
  gpuRecommendations: GPURecommendations | null;
  cloudRecommendations: CloudRecommendation[] | null;
  costMetrics: CostMetricsResult | null;
  clusterRecommendation: ClusterRecommendation | null;
  stackRecommendation: StackRecommendation | null;

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
  const initialState = getDefaultState(MODEL_DB);
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
      const max = selectedModel?.architecture.maxContextLength ?? 131072;
      set({ contextLength: Math.max(1024, Math.min(ctx, max)) });
      get().recompute();
    },

    setBatchSize: (batch) => {
      set({ batchSize: Math.max(1, Math.min(32, batch)) });
      get().recompute();
    },

    setMode: (mode) => {
      set({ mode });
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
      get().recompute();
    },

    getShareURL: () => {
      const { selectedModel, precision, kvPrecision, contextLength, batchSize, mode, trainingOptions } = get();
      if (!selectedModel) return window.location.href;
      const state: CalculatorState = {
        model: selectedModel.id,
        precision,
        kvPrecision,
        ctx: contextLength,
        batch: batchSize,
        mode,
        trainingMethod: trainingOptions.trainingMethodId,
      };
      return window.location.origin + window.location.pathname + serializeState(state);
    },

    recompute: () => {
      const {
        selectedModel, precision, kvPrecision, contextLength, batchSize,
        mode, trainingOptions, gpuDb, cloudDb,
      } = get();

      if (!selectedModel) return;

      const precisionConfig = getPrecisionConfig(precision);
      const kvPrecisionConfig = getKVPrecisionConfig(kvPrecision);

      // VRAM breakdown
      const breakdown = computeTotalVRAM(
        selectedModel,
        precisionConfig,
        kvPrecisionConfig,
        contextLength,
        batchSize,
        mode,
        trainingOptions
      );

      // Active weights for throughput (use paramsActive for MoE)
      const activeParams = selectedModel.paramsActive ?? selectedModel.paramsTotal;
      const activeWeightsGB = (activeParams * precisionConfig.bytesPerParam) / 1e9;

      // GPU recommendations
      const gpuRecommendations = recommendGPUs(
        breakdown.totalGB,
        gpuDb,
        { activeWeightsGB, efficiencyFactor: DEFAULT_EFFICIENCY }
      );

      // Cloud recommendations
      const cloudRecommendations = recommendCloudInstances(
        breakdown.totalGB,
        cloudDb,
        gpuDb
      );

      // Cost metrics (use cheapest cloud instance)
      const cheapestCloud = cloudRecommendations[0];
      const topGPU = gpuRecommendations.allFits.find(f => f.fitStatus !== 'red');
      let costMetrics: CostMetricsResult | null = null;

      if (topGPU && cheapestCloud) {
        const throughput = computeThroughput({
          memoryBandwidthGBs: topGPU.gpu.memoryBandwidthGBs,
          activeWeightsGB,
          efficiencyFactor: DEFAULT_EFFICIENCY,
        });
        costMetrics = computeCostMetrics({
          tokensPerSecond: throughput.tokensPerSecond,
          hourlyCloudCost: cheapestCloud.onDemandPerHour,
          contextLength,
          activeWeightsGB,
          computeTFLOPS: topGPU.gpu.flops.fp16,
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
