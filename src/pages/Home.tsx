import * as React from 'react';
import { ChevronDown, ChevronUp, Share2, ArrowLeftRight, Cpu } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/primitives/tabs';
import { useCalculatorStore } from '@/store/calculator-store';
import { useToast } from '@/components/feedback/Toast';

// ── Input components ──────────────────────────────────────────────────────────
import { ModelPicker } from '@/components/calculator/ModelPicker';
import { PrecisionPicker } from '@/components/calculator/PrecisionPicker';
import { KVPrecisionPicker } from '@/components/calculator/KVPrecisionPicker';
import { ContextSlider } from '@/components/calculator/ContextSlider';
import { BatchConfig } from '@/components/calculator/BatchConfig';
import { KVCurveChart } from '@/components/calculator/KVCurveChart';
import { AdvancedPanel } from '@/components/calculator/AdvancedPanel';

// ── Spec 05: KV Cache / Serving ───────────────────────────────────────────────
import { KVCacheConfig } from '@/components/calculator/KVCacheConfig';
import { FrameworkPicker } from '@/components/calculator/FrameworkPicker';
import { SpeculativeConfig } from '@/components/calculator/SpeculativeConfig';
import { TokenizerInfo } from '@/components/calculator/TokenizerInfo';

// ── Spec 04: Training Methodologies ──────────────────────────────────────────
import { TrainingMethodPicker } from '@/components/calculator/TrainingMethodPicker';
import { LoRAConfig } from '@/components/calculator/LoRAConfig';
import { DatasetEstimator } from '@/components/calculator/DatasetEstimator';
import { FormatRecommendation } from '@/components/calculator/FormatRecommendation';
import { AdvancedTrainingPanel } from '@/components/calculator/AdvancedTrainingPanel';

// ── Output components ─────────────────────────────────────────────────────────
import { VRAMBreakdown } from '@/components/calculator/VRAMBreakdown';
import { MetricsRow } from '@/components/calculator/MetricsRow';
import { FormulaReveal } from '@/components/calculator/FormulaReveal';
import { GPUList } from '@/components/calculator/GPUList';
import { CloudTable } from '@/components/calculator/CloudTable';
import { ClusterPanel } from '@/components/calculator/ClusterPanel';
import { StackPanel } from '@/components/calculator/StackPanel';

// ── Spec 03: Network / Storage ────────────────────────────────────────────────
import { NetworkPanel } from '@/components/calculator/NetworkPanel';
import { StoragePanel } from '@/components/calculator/StoragePanel';
import { ClusterTopology } from '@/components/calculator/ClusterTopology';

// ── Spec 07: Scale-Out Clustering ─────────────────────────────────────────────
import { ParallelismPanel } from '@/components/calculator/ParallelismPanel';
import { RAMPanel } from '@/components/calculator/RAMPanel';
import { ClusteringTools } from '@/components/calculator/ClusteringTools';
import { ScaleEstimator } from '@/components/calculator/ScaleEstimator';

// ── Spec 08: Missing Parameters ───────────────────────────────────────────────
import { PowerPanel } from '@/components/calculator/PowerPanel';
import { TCOPanel } from '@/components/calculator/TCOPanel';
import { MultimodalPanel } from '@/components/calculator/MultimodalPanel';
import { WarmupPanel } from '@/components/calculator/WarmupPanel';
import { FailoverPanel } from '@/components/calculator/FailoverPanel';

// ── Spec 02: Currency ─────────────────────────────────────────────────────────
import { CurrencyPicker } from '@/components/calculator/CurrencyPicker';

// ── Spec 10: Concurrent User Capacity ────────────────────────────────────────
import { UserExperienceSummary } from '@/components/calculator/UserExperienceSummary';
import { PrefillDecodeBreakdown } from '@/components/calculator/PrefillDecodeBreakdown';
import { ConcurrentUserSlider } from '@/components/calculator/ConcurrentUserSlider';
import { PromptOutputConfig } from '@/components/calculator/PromptOutputConfig';
import { SLOConfig } from '@/components/calculator/SLOConfig';
import { LatencyCurveChart } from '@/components/calculator/LatencyCurveChart';
import { BottleneckIndicator } from '@/components/calculator/BottleneckIndicator';
import { ReplicaScalingTable } from '@/components/calculator/ReplicaScalingTable';
import { RequestCostPanel } from '@/components/calculator/RequestCostPanel';
import { BatchModeToggle } from '@/components/calculator/BatchModeToggle';
import { computePrefill } from '@/lib/formulas/prefill';
import { computeDecode } from '@/lib/formulas/decode';
import { computeMaxConcurrentUsers } from '@/lib/formulas/concurrency';
import { computeLatencyCurve } from '@/lib/formulas/latency-curve';
import { computeRequestCost } from '@/lib/formulas/request-cost';
import { computeBatchMode } from '@/lib/formulas/batch-processing';
import { computeScalingTable } from '@/lib/formulas/auto-scale';

// ── Feedback ──────────────────────────────────────────────────────────────────
import { SkeletonVRAMBreakdown, SkeletonGPUCard } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';

// ── Collapsible section wrapper ───────────────────────────────────────────────
function Section({ title, defaultOpen = false, children }: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="border border-border-subtle rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-bg-subtle text-sm font-medium text-fg-default hover:bg-bg-muted transition-colors"
        aria-expanded={open}
      >
        <span>{title}</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && <div className="p-4 flex flex-col gap-4">{children}</div>}
    </div>
  );
}

// ── Advanced Panels Tabbed Interface ─────────────────────────────────────────
function AdvancedTabs({
  selectedModel, breakdown, topGPU, numGPUs, setNumGPUs,
  modelGB, modelBytes, bytesPerParam, isTrainingMode, mode,
  costMetrics, cloudRecommendations, contextLength, batchSize,
  concurrencyData, concurrentUsers, setConcurrentUsers,
  avgPromptTokens, avgOutputTokens, setAvgPromptTokens, setAvgOutputTokens,
  sloTTFTMs, sloTPOTMs, setSloTTFT, setSloTPOT, batchMode, setBatchMode,
}: {
  selectedModel: any; breakdown: any; topGPU: any; numGPUs: number;
  setNumGPUs: (n: number) => void; modelGB: number; modelBytes: number;
  bytesPerParam: number; isTrainingMode: boolean; mode: string;
  costMetrics: any; cloudRecommendations: any; contextLength: number;
  batchSize: number; concurrencyData: any; concurrentUsers: number;
  setConcurrentUsers: (n: number) => void; avgPromptTokens: number;
  avgOutputTokens: number; setAvgPromptTokens: (n: number) => void;
  setAvgOutputTokens: (n: number) => void; sloTTFTMs: number;
  sloTPOTMs: number; setSloTTFT: (n: number) => void;
  setSloTPOT: (n: number) => void; batchMode: boolean;
  setBatchMode: (b: boolean) => void;
}) {
  const [activeTab, setActiveTab] = React.useState('parallelism');

  // Reset to first available tab when mode changes
  React.useEffect(() => {
    const available = tabs.map(t => t.id);
    if (!available.includes(activeTab)) setActiveTab(available[0] ?? 'parallelism');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const tabs = [
    { id: 'parallelism', label: 'Parallelism', showFor: ['inference', 'scale', 'finetune', 'train'] },
    { id: 'scale', label: 'Scale / QPS', showFor: ['inference', 'scale'] },
    { id: 'clustering', label: 'Clustering', showFor: ['inference', 'scale', 'finetune', 'train'] },
    { id: 'concurrency', label: 'Concurrency', showFor: ['inference', 'scale'] },
    { id: 'network', label: 'Network & Storage', showFor: ['inference', 'scale', 'finetune', 'train'] },
    { id: 'power', label: 'Power & TCO', showFor: ['inference', 'scale', 'finetune', 'train'] },
    { id: 'deployment', label: 'Deployment', showFor: ['inference', 'scale'] },
  ].filter(t => t.showFor.includes(mode));

  return (
    <section className="mt-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto">
          <TabsList className="flex flex-row w-full border-b border-border-subtle">
            {tabs.map(t => (
              <TabsTrigger
                key={t.id}
                value={t.id}
                className="flex-shrink-0 px-4 py-2.5 text-xs font-medium whitespace-nowrap"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="mt-3 border border-border-subtle rounded-lg p-4">

          <TabsContent value="parallelism">
            {breakdown ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-fg-default">Number of GPUs</label>
                  <div className="flex items-center gap-3">
                    <input type="range" min={1} max={512} step={1} value={numGPUs}
                      onChange={e => setNumGPUs(parseInt(e.target.value))}
                      className="flex-1 cursor-pointer appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-bg-emphasis [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:-mt-[7px]"
                      aria-label="Number of GPUs" />
                    <span className="text-sm font-mono text-fg-primary w-12 text-right">{numGPUs}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ParallelismPanel totalGPUs={numGPUs} gpusPerNode={Math.min(8, numGPUs)}
                    gpuMemGB={topGPU?.gpu.memoryGB ?? 80} modelGB={modelGB}
                    numKVHeads={selectedModel.architecture.numKeyValueHeads} />
                  <RAMPanel mode={isTrainingMode ? 'training' : 'inference'} modelBytes={modelBytes}
                    numGPUsPerNode={Math.min(8, numGPUs)} vramPerGPUGB={topGPU?.gpu.memoryGB ?? 80} />
                </div>
                {numGPUs > 1 && (
                  <ClusterTopology numGPUs={numGPUs} workload={isTrainingMode ? 'training' : 'inference'} />
                )}
              </div>
            ) : <p className="text-sm text-fg-muted">Select a model to see parallelism options.</p>}
          </TabsContent>

          <TabsContent value="scale">
            {(mode === 'inference' || mode === 'scale') && topGPU && costMetrics ? (
              <ScaleEstimator tokensPerSecond={topGPU.tokensPerSecond ?? 100}
                gpusPerReplica={numGPUs} costPerGPUHour={cloudRecommendations?.[0]?.onDemandPerHour ?? 2.49} />
            ) : <p className="text-sm text-fg-muted">Switch to Inference or Scale mode to see QPS sizing.</p>}
          </TabsContent>

          <TabsContent value="clustering">
            <ClusteringTools />
          </TabsContent>

          <TabsContent value="concurrency">
            {topGPU && concurrencyData ? (
              <div className="flex flex-col gap-4">
                <UserExperienceSummary modelName={selectedModel.displayName} gpuName={topGPU.gpu.name}
                  concurrentUsers={concurrentUsers} ttftMs={concurrencyData.prefillResult.ttftMs}
                  tpotMs={concurrencyData.tpotAtCurrentUsers} avgOutputTokens={avgOutputTokens}
                  aggregateThroughput={concurrencyData.aggregateThroughput}
                  maxConcurrentUsers={concurrencyData.concurrencyResult.maxConcurrentUsers}
                  totalVRAMGB={topGPU.gpu.memoryGB} usedVRAMGB={concurrencyData.usedVRAMGB}
                  costPerUserPerHour={concurrencyData.requestCost.costPerUserPerHour}
                  costPerMTokens={concurrencyData.requestCost.costPerMOutputTokens}
                  costPerRequest={concurrencyData.requestCost.costPerRequest}
                  bottleneck={concurrencyData.concurrencyResult.bottleneck}
                  sloTTFTMs={sloTTFTMs} sloTPOTMs={sloTPOTMs}
                  doubleGPUMaxUsers={concurrencyData.concurrencyResult.maxConcurrentUsers * 2}
                  doubleGPUCostPerHour={concurrencyData.hourlyCloudCost * 2} />
                <PrefillDecodeBreakdown ttftMs={concurrencyData.prefillResult.ttftMs}
                  tpotMs={concurrencyData.tpotAtCurrentUsers} avgOutputTokens={avgOutputTokens} />
                <ConcurrentUserSlider value={concurrentUsers} onChange={setConcurrentUsers}
                  maxCapacity={concurrencyData.concurrencyResult.maxConcurrentUsers}
                  totalVRAMGB={topGPU.gpu.memoryGB} usedVRAMGB={concurrencyData.usedVRAMGB} />
                <PromptOutputConfig promptTokens={avgPromptTokens} outputTokens={avgOutputTokens}
                  onPromptChange={setAvgPromptTokens} onOutputChange={setAvgOutputTokens} />
                <SLOConfig sloTTFTMs={sloTTFTMs} sloTPOTMs={sloTPOTMs}
                  actualTTFTMs={concurrencyData.prefillResult.ttftMs}
                  actualTPOTMs={concurrencyData.tpotAtCurrentUsers}
                  onSloTTFTChange={setSloTTFT} onSloTPOTChange={setSloTPOT} />
                <LatencyCurveChart points={concurrencyData.latencyCurve.points}
                  currentUsers={concurrentUsers} sloTpotMs={sloTPOTMs}
                  sweetSpotUsers={concurrencyData.latencyCurve.sweetSpotUsers}
                  maxCapacityUsers={concurrencyData.latencyCurve.maxCapacityUsers} />
                <BottleneckIndicator maxUsersMemory={concurrencyData.concurrencyResult.maxUsersMemory}
                  maxUsersThroughput={concurrencyData.concurrencyResult.maxUsersThroughput}
                  maxUsersPrefill={concurrencyData.concurrencyResult.maxUsersPrefill}
                  bottleneck={concurrencyData.concurrencyResult.bottleneck} currentUsers={concurrentUsers} />
                <ReplicaScalingTable rows={concurrencyData.scalingRows} currentReplicas={1}
                  gpusPerReplica={numGPUs} gpuName={topGPU.gpu.name} />
                <RequestCostPanel result={concurrencyData.requestCost}
                  hourlyCloudCost={concurrencyData.hourlyCloudCost} />
                <BatchModeToggle batchMode={batchMode} onToggle={setBatchMode}
                  batchResult={concurrencyData.batchResult} />
              </div>
            ) : <p className="text-sm text-fg-muted">Select a model and GPU to see concurrency estimates.</p>}
          </TabsContent>

          <TabsContent value="network">
            {breakdown ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <NetworkPanel numGPUs={numGPUs} numParams={selectedModel.paramsTotal}
                  numLayers={selectedModel.architecture.numLayers}
                  hiddenSize={selectedModel.architecture.hiddenSize}
                  batchSize={batchSize} seqLen={contextLength} bytesPerParam={bytesPerParam}
                  parallelismType="tp" stepTimeBudgetMs={500} />
                <StoragePanel numTokens={1e9} numCheckpoints={5} numParams={selectedModel.paramsTotal} />
              </div>
            ) : <p className="text-sm text-fg-muted">Select a model to see network and storage estimates.</p>}
          </TabsContent>

          <TabsContent value="power">
            {topGPU ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PowerPanel gpuCount={numGPUs} gpuTDPWatts={topGPU.gpu.tdpWatts} />
                <TCOPanel cloudHourlyCostUSD={cloudRecommendations?.[0]?.onDemandPerHour ?? 2.49}
                  gpuCount={numGPUs} gpuTDPWatts={topGPU.gpu.tdpWatts} />
              </div>
            ) : <p className="text-sm text-fg-muted">Select a model to see power and TCO estimates.</p>}
          </TabsContent>

          <TabsContent value="deployment">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <WarmupPanel modelBytes={modelBytes} numParams={selectedModel.paramsTotal} />
              <FailoverPanel baseCostPerHour={cloudRecommendations?.[0]?.onDemandPerHour ?? 2.49} />
            </div>
          </TabsContent>

        </div>
      </Tabs>
    </section>
  );
}

export function Home() {
  const {
    modelDb, selectedModel, precision, kvPrecision, contextLength, batchSize,
    mode, trainingOptions, advancedSettings, breakdown, gpuRecommendations,
    cloudRecommendations, costMetrics, clusterRecommendation, stackRecommendation,
    setModel, setPrecision, setKVPrecision, setContextLength, setBatchSize,
    setTrainingOptions, setAdvancedSettings, recompute,
    addCompareConfig, compareConfigs, getShareURL,
    numGPUs, setNumGPUs,
    concurrentUsers, avgPromptTokens, avgOutputTokens, sloTTFTMs, sloTPOTMs, batchMode,
    setConcurrentUsers, setAvgPromptTokens, setAvgOutputTokens, setSloTTFT, setSloTPOT, setBatchMode,
  } = useCalculatorStore();
  const { showToast } = useToast();
  const [inputsExpanded, setInputsExpanded] = React.useState(true);

  React.useEffect(() => { if (!breakdown) recompute(); }, [breakdown, recompute]);

  const topGPU = gpuRecommendations?.allFits.find(f => f.fitStatus !== 'red');
  const kvPrecisionLabel = kvPrecision.toUpperCase();
  const isTrainingMode = mode === 'train';
  const isVLM = !!(selectedModel as any)?.architecture?.visionConfig;

  const PRECISION_BYTES: Record<string, number> = {
    fp32: 4, fp16: 2, bf16: 2, fp8: 1, fp8_e4m3: 1, fp8_e5m2: 1,
    int8: 1, int4: 0.5, nf4: 0.5,
  };
  const bytesPerParam = PRECISION_BYTES[precision] ?? 2;
  const modelBytes = (selectedModel?.paramsTotal ?? 0) * bytesPerParam;
  const modelGB = modelBytes / 1e9;

  // ── Spec 10: Concurrent user capacity computations ──────────────────────────
  const concurrencyData = React.useMemo(() => {
    if (!selectedModel || !topGPU) return null;
    const gpu = topGPU.gpu;
    const activeParams = selectedModel.paramsActive ?? selectedModel.paramsTotal;
    const activeWeightsGB = (activeParams * bytesPerParam) / 1e9;
    const weightsGB = (selectedModel.paramsTotal * bytesPerParam) / 1e9;
    const overheadGB = Math.max(1, weightsGB * 0.05); // ~5% overhead
    const kvBytesPerParam = PRECISION_BYTES[kvPrecision] ?? 2;

    const prefillResult = computePrefill(
      gpu.flops.fp16,
      activeParams,
      avgPromptTokens,
    );

    const decodeResult = computeDecode(
      gpu.memoryBandwidthGBs,
      activeWeightsGB,
      0.80,
      gpu.flops.fp16,
      bytesPerParam,
    );

    const concurrencyResult = computeMaxConcurrentUsers(
      gpu.memoryGB,
      weightsGB,
      overheadGB,
      selectedModel.architecture.numLayers,
      selectedModel.architecture.numKeyValueHeads,
      selectedModel.architecture.headDim,
      avgPromptTokens,
      avgOutputTokens,
      kvBytesPerParam,
      decodeResult.decodeTokensPerSecPerUser,
      sloTPOTMs,
      gpu.flops.fp16,
      activeParams,
      sloTTFTMs,
    );

    const tpotAtCurrentUsers = decodeResult.tpotMs * (1 + 0.02 * Math.max(0, concurrentUsers - 1));
    const aggregateThroughput = concurrentUsers * decodeResult.decodeTokensPerSecPerUser * 0.85;

    const latencyCurve = computeLatencyCurve(
      decodeResult,
      gpu.flops.fp16,
      activeParams,
      bytesPerParam,
      concurrencyResult.maxConcurrentUsers,
    );

    const hourlyCloudCost = cloudRecommendations?.[0]?.onDemandPerHour ?? 2.49;

    const requestCost = computeRequestCost(
      hourlyCloudCost,
      concurrentUsers,
      prefillResult.ttftMs,
      tpotAtCurrentUsers,
      avgOutputTokens,
      prefillResult.prefillThroughputTokensPerSec,
      aggregateThroughput,
    );

    const batchResult = computeBatchMode(
      concurrencyResult.freeVRAMForKVGB,
      concurrencyResult.kvPerUserGB,
      decodeResult.decodeTokensPerSecPerUser,
      hourlyCloudCost,
    );

    const scalingRows = computeScalingTable(
      concurrencyResult.maxConcurrentUsers,
      tpotAtCurrentUsers,
      numGPUs,
      hourlyCloudCost / numGPUs,
      decodeResult.decodeTokensPerSecPerUser,
      avgOutputTokens,
    );

    const usedVRAMGB = weightsGB + overheadGB + concurrencyResult.kvPerUserGB * concurrentUsers;

    return {
      prefillResult,
      decodeResult,
      concurrencyResult,
      tpotAtCurrentUsers,
      aggregateThroughput,
      latencyCurve,
      requestCost,
      batchResult,
      scalingRows,
      usedVRAMGB,
      hourlyCloudCost,
      weightsGB,
    };
  }, [selectedModel, topGPU, bytesPerParam, kvPrecision, avgPromptTokens, avgOutputTokens,
    sloTPOTMs, sloTTFTMs, concurrentUsers, cloudRecommendations, numGPUs]);

  const mobileSummary = selectedModel
    ? `${selectedModel.displayName} · ${precision.toUpperCase()} · ${contextLength >= 1024 ? `${contextLength / 1024}k` : contextLength} · batch ${batchSize}`
    : 'No model selected';

  const handleMobileShare = async () => {
    const url = getShareURL();
    try { await navigator.clipboard.writeText(url); } catch { /* ignore */ }
    showToast('Link copied', 'success');
  };

  const handleMobileCompare = () => {
    if (compareConfigs.length >= 3) { showToast('Maximum 3 configurations', 'error'); return; }
    addCompareConfig();
    showToast('Added to compare', 'success');
  };

  // ── Input panel ─────────────────────────────────────────────────────────────
  const InputPanel = (
    <div className="flex flex-col gap-5">
      <ModelPicker models={modelDb} value={selectedModel} onSelect={setModel} />
      <PrecisionPicker value={precision} onChange={setPrecision} />

      {/* KV precision + curve — inference & scale only */}
      {(mode === 'inference' || mode === 'scale') && (
        <KVPrecisionPicker value={kvPrecision} onChange={setKVPrecision} fp16KvCacheGB={breakdown?.kvCacheGB} />
      )}
      {(mode === 'inference' || mode === 'scale') && selectedModel && (
        <KVCurveChart model={selectedModel} kvPrecision={kvPrecision} currentContext={contextLength} batchSize={batchSize} />
      )}

      <ContextSlider value={contextLength} max={selectedModel?.architecture.maxContextLength ?? 131072} onChange={setContextLength} />

      {/* Batch size — inference & scale only */}
      {(mode === 'inference' || mode === 'scale') && (
        <BatchConfig value={batchSize} onChange={setBatchSize} />
      )}

      <AdvancedPanel mode={mode} advancedSettings={advancedSettings} trainingOptions={trainingOptions}
        onAdvancedSettingsChange={setAdvancedSettings} onTrainingOptionsChange={setTrainingOptions} />

      {/* KV Cache & Serving — inference & scale only */}
      {(mode === 'inference' || mode === 'scale') && selectedModel && (
        <Section title="KV Cache & Serving">
          <KVCacheConfig model={selectedModel} kvPrecision={kvPrecision} contextLength={contextLength} batchSize={batchSize} />
          <SpeculativeConfig batchSize={batchSize} contextLength={contextLength} />
          <TokenizerInfo model={selectedModel} bytesPerParam={bytesPerParam} />
          <FrameworkPicker gpu={topGPU?.gpu} quantization={precision} mode={mode} />
        </Section>
      )}

      {isTrainingMode && selectedModel && (
        <Section title="Training Configuration" defaultOpen={true}>
          {/* Method sub-toggle: Full Fine-tune / LoRA / QLoRA */}
          <div className="flex gap-1 p-1 bg-bg-subtle rounded-lg border border-border-subtle">
            {(['full', 'lora', 'qlora'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setTrainingOptions({ mode: m })}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  trainingOptions.mode === m
                    ? 'bg-bg-base text-fg-primary shadow-sm'
                    : 'text-fg-muted hover:text-fg-default'
                }`}
              >
                {m === 'full' ? 'Full Fine-tune' : m === 'lora' ? 'LoRA' : 'QLoRA'}
              </button>
            ))}
          </div>
          <TrainingMethodPicker
            value={trainingOptions.trainingMethodId as any ?? ''}
            onChange={(method) => setTrainingOptions({ trainingMethodId: method || undefined })}
          />
          <LoRAConfig
            rank={trainingOptions.loraRank ?? 8}
            alpha={trainingOptions.loraRank ?? 8}
            selectedModules={['q_proj', 'k_proj', 'v_proj', 'o_proj']}
            hiddenSize={selectedModel.architecture.hiddenSize}
            intermediateSize={selectedModel.architecture.intermediateSize}
            numLayers={selectedModel.architecture.numLayers}
            numParams={selectedModel.paramsTotal}
            fullFinetuneGB={(selectedModel.paramsTotal * 16) / 1e9}
            onRankChange={(rank) => setTrainingOptions({ loraRank: rank })}
            onAlphaChange={() => {}}
            onModulesChange={() => {}}
          />
          <AdvancedTrainingPanel
            numLayers={selectedModel.architecture.numLayers}
            numHeads={selectedModel.architecture.numAttentionHeads}
            seqLen={contextLength}
            batchSize={batchSize}
            bytesPerParam={bytesPerParam}
            activationsGB={breakdown?.activationsGB ?? 0}
          />
          <DatasetEstimator
            numParams={selectedModel.paramsTotal}
            trainingMethod={trainingOptions.mode === 'full' ? 'full' : 'lora'}
          />
          <FormatRecommendation />
        </Section>
      )}

      {isVLM && selectedModel && (
        <Section title="Multimodal">
          <MultimodalPanel
            numLayers={selectedModel.architecture.numLayers}
            numKVHeads={selectedModel.architecture.numKeyValueHeads}
            headDim={selectedModel.architecture.headDim}
            bytesPerParam={bytesPerParam}
            batchSize={batchSize}
          />
        </Section>
      )}
    </div>
  );

  // ── Output section ──────────────────────────────────────────────────────────
  const OutputSection = (
    <div className="flex flex-col gap-6 min-w-0">
      {breakdown ? (
        <>
          <VRAMBreakdown breakdown={breakdown} gpuRef={topGPU?.gpu} kvPrecisionLabel={kvPrecisionLabel} framework={advancedSettings.framework} numGPUs={numGPUs} />
          <MetricsRow tokensPerSecond={topGPU?.tokensPerSecond} costMetrics={costMetrics} gpuName={topGPU?.gpu.name} contextLength={contextLength} />
          <div className="flex flex-col gap-2">
            <FormulaReveal title="Weight Memory" formula={`W = \\frac{N_{params} \\times B_{precision}}{10^9}`}
              inputs={[{ label: 'Parameters', value: (selectedModel?.paramsTotal ?? 0).toLocaleString() }, { label: 'Bytes/param', value: precision.toUpperCase() }]}
              result={`${breakdown.weightsGB.toFixed(1)} GB`} source="Hugging Face — Model Memory Calculator"
              sourceUrl="https://huggingface.co/docs/accelerate/usage_guides/model_size_estimator" />
            {breakdown.kvCacheGB > 0 && (
              <FormulaReveal title="KV Cache" formula={`KV = \\frac{2 \\cdot L \\cdot B \\cdot S \\cdot H_{kv} \\cdot D_{head} \\cdot B_{kv}}{10^9}`}
                inputs={[{ label: 'Layers', value: selectedModel?.architecture.numLayers ?? 0 }, { label: 'Seq length', value: contextLength.toLocaleString() }, { label: 'KV heads', value: selectedModel?.architecture.numKeyValueHeads ?? 0 }]}
                result={`${breakdown.kvCacheGB.toFixed(2)} GB`} source="Efficient Transformers: A Survey (Tay et al., 2022)" />
            )}
            {breakdown.activationsGB > 0 && (
              <FormulaReveal title="Activation Memory" formula={`A = L \\cdot S \\cdot B \\cdot H \\cdot \\left(34 + \\frac{5 \\cdot S \\cdot N_h}{H}\\right) \\cdot 2`}
                inputs={[{ label: 'Layers', value: selectedModel?.architecture.numLayers ?? 0 }, { label: 'Hidden size', value: selectedModel?.architecture.hiddenSize ?? 0 }]}
                result={`${breakdown.activationsGB.toFixed(2)} GB`} source="Reducing Activation Recomputation (Korthikanti et al., 2022)"
                sourceUrl="https://arxiv.org/abs/2205.05198" />
            )}
          </div>
        </>
      ) : <SkeletonVRAMBreakdown />}
    </div>
  );

  const GPUSection = (
    <aside className="flex flex-col gap-4">
      {gpuRecommendations
        ? <GPUList recommendations={gpuRecommendations} numGPUs={numGPUs} />
        : <><SkeletonGPUCard /><SkeletonGPUCard /></>}
    </aside>
  );

  return (
    <div className="max-w-[1760px] mx-auto px-4 md:px-6 py-6 pb-20 md:pb-6">

      {/* ── Desktop xl: adaptive layout ──────────────────────────────── */}
      <div className={`hidden xl:grid gap-6 ${isTrainingMode ? 'xl:grid-cols-[420px_1fr]' : 'xl:grid-cols-[280px_1fr_380px]'}`}>
        <aside>{InputPanel}</aside>
        {isTrainingMode ? (
          /* Training: full-width output (no GPU sidebar) */
          <div className="flex flex-col gap-6 min-w-0">
            {OutputSection}
          </div>
        ) : (
          <>
            {OutputSection}
            {GPUSection}
          </>
        )}
      </div>

      {/* ── Tablet md: 2-column ──────────────────────────────────────── */}
      <div className="hidden md:grid xl:hidden grid-cols-2 gap-6">
        <aside>{InputPanel}</aside>
        <div className="flex flex-col gap-6">
          {OutputSection}
          {!isTrainingMode && GPUSection}
        </div>
      </div>

      {/* ── Mobile: single-column ────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:hidden">
        <div className="rounded-lg border border-border-subtle overflow-hidden">
          <button onClick={() => setInputsExpanded(e => !e)}
            className="w-full flex items-center justify-between px-4 py-3 bg-bg-muted text-sm"
            aria-expanded={inputsExpanded} aria-controls="mobile-inputs">
            <span className="truncate text-left text-xs text-fg-muted font-mono">{mobileSummary}</span>
            {inputsExpanded ? <ChevronUp size={16} className="flex-shrink-0 ml-2" /> : <ChevronDown size={16} className="flex-shrink-0 ml-2" />}
          </button>
          {inputsExpanded && <div id="mobile-inputs" className="p-4">{InputPanel}</div>}
        </div>
        {breakdown ? (
          <VRAMBreakdown breakdown={breakdown} gpuRef={topGPU?.gpu} kvPrecisionLabel={kvPrecisionLabel} framework={advancedSettings.framework} numGPUs={numGPUs} />
        ) : <SkeletonVRAMBreakdown />}
        {breakdown && <MetricsRow tokensPerSecond={topGPU?.tokensPerSecond} costMetrics={costMetrics} gpuName={topGPU?.gpu.name} contextLength={contextLength} />}
        {gpuRecommendations && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Recommended GPUs</h3>
            {[gpuRecommendations.budget, gpuRecommendations.balanced, gpuRecommendations.performance]
              .filter((fit): fit is NonNullable<typeof fit> => fit !== null).slice(0, 3)
              .map(fit => fit && (
                <div key={fit.gpu.id} className="rounded-lg border border-border-subtle p-3 flex items-center justify-between gap-3 min-h-[44px]">
                  <div>
                    <p className="text-sm font-medium text-fg-primary">{fit.gpu.name}</p>
                    <p className="text-xs font-mono text-fg-muted">{fit.gpu.memoryGB} GB · {fit.utilizationPercent}% used</p>
                  </div>
                  {fit.tokensPerSecond && <span className="text-xs font-mono text-fg-default">~{fit.tokensPerSecond.toLocaleString()} tok/s</span>}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* ── Cluster + Stack ───────────────────────────────────────────── */}
      {(clusterRecommendation || stackRecommendation) && (
        <section className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {clusterRecommendation && <ClusterPanel cluster={clusterRecommendation} />}
          {stackRecommendation && <StackPanel stack={stackRecommendation} />}
        </section>
      )}

      {/* ── Advanced Panels — Tabbed ─────────────────────────────────── */}
      {selectedModel && (
        <AdvancedTabs
          selectedModel={selectedModel}
          breakdown={breakdown}
          topGPU={topGPU}
          numGPUs={numGPUs}
          setNumGPUs={setNumGPUs}
          modelGB={modelGB}
          modelBytes={modelBytes}
          bytesPerParam={bytesPerParam}
          isTrainingMode={isTrainingMode}
          mode={mode}
          costMetrics={costMetrics}
          cloudRecommendations={cloudRecommendations}
          contextLength={contextLength}
          batchSize={batchSize}
          concurrencyData={concurrencyData}
          concurrentUsers={concurrentUsers}
          setConcurrentUsers={setConcurrentUsers}
          avgPromptTokens={avgPromptTokens}
          avgOutputTokens={avgOutputTokens}
          setAvgPromptTokens={setAvgPromptTokens}
          setAvgOutputTokens={setAvgOutputTokens}
          sloTTFTMs={sloTTFTMs}
          sloTPOTMs={sloTPOTMs}
          setSloTTFT={setSloTTFT}
          setSloTPOT={setSloTPOT}
          batchMode={batchMode}
          setBatchMode={setBatchMode}
        />
      )}

      {/* ── Cloud Table ───────────────────────────────────────────────── */}
      {cloudRecommendations && cloudRecommendations.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Cloud Instances</h2>
            <CurrencyPicker />
          </div>
          <CloudTable recommendations={cloudRecommendations} />
        </section>
      )}
      {cloudRecommendations?.length === 0 && (
        <section className="mt-8">
          <EmptyState icon={<Cpu size={32} />} title="No cloud instances found" description="Try reducing context length or using a smaller model." />
        </section>
      )}

      {/* ── Mobile sticky bottom action bar ──────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden z-30 bg-bg-base border-t border-border-subtle px-4 py-3 flex gap-3">
        <button onClick={handleMobileShare}
          className="flex-1 h-11 rounded-md text-sm font-medium flex items-center justify-center gap-2 bg-bg-muted border border-border-subtle text-fg-primary hover:bg-bg-emphasis transition-colors"
          aria-label="Copy share link">
          <Share2 size={16} /> Share
        </button>
        <button onClick={handleMobileCompare}
          className="flex-1 h-11 rounded-md text-sm font-medium flex items-center justify-center gap-2 bg-bg-muted border border-border-subtle text-fg-primary hover:bg-bg-emphasis transition-colors"
          aria-label="Add to compare">
          <ArrowLeftRight size={16} /> Compare
        </button>
      </div>
    </div>
  );
}
