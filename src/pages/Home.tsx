import * as React from 'react';
import { ChevronDown, ChevronUp, Share2, ArrowLeftRight, Cpu } from 'lucide-react';
import { useCalculatorStore } from '@/store/calculator-store';
import { useToast } from '@/components/feedback/Toast';
import { ModelPicker } from '@/components/calculator/ModelPicker';
import { PrecisionPicker } from '@/components/calculator/PrecisionPicker';
import { KVPrecisionPicker } from '@/components/calculator/KVPrecisionPicker';
import { ContextSlider } from '@/components/calculator/ContextSlider';
import { BatchConfig } from '@/components/calculator/BatchConfig';
import { KVCurveChart } from '@/components/calculator/KVCurveChart';
import { AdvancedPanel } from '@/components/calculator/AdvancedPanel';
import { KVCacheConfig } from '@/components/calculator/KVCacheConfig';
import { FrameworkPicker } from '@/components/calculator/FrameworkPicker';
import { SpeculativeConfig } from '@/components/calculator/SpeculativeConfig';
import { TokenizerInfo } from '@/components/calculator/TokenizerInfo';
import { VRAMBreakdown } from '@/components/calculator/VRAMBreakdown';
import { MetricsRow } from '@/components/calculator/MetricsRow';
import { FormulaReveal } from '@/components/calculator/FormulaReveal';
import { GPUList } from '@/components/calculator/GPUList';
import { CloudTable } from '@/components/calculator/CloudTable';
import { ClusterPanel } from '@/components/calculator/ClusterPanel';
import { StackPanel } from '@/components/calculator/StackPanel';
import { SkeletonVRAMBreakdown, SkeletonGPUCard } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';

interface HomeProps {
  modelSearchOpen?: boolean;
  onModelSearchClose?: () => void;
}

export function Home({ modelSearchOpen, onModelSearchClose }: HomeProps) {
  const {
    modelDb, selectedModel, precision, kvPrecision, contextLength, batchSize,
    mode, trainingOptions, advancedSettings, breakdown, gpuRecommendations,
    cloudRecommendations, costMetrics, clusterRecommendation, stackRecommendation,
    setModel, setPrecision, setKVPrecision, setContextLength, setBatchSize,
    setTrainingOptions, setAdvancedSettings, recompute,
    addCompareConfig, compareConfigs, getShareURL,
  } = useCalculatorStore();
  const { showToast } = useToast();
  const [inputsExpanded, setInputsExpanded] = React.useState(true);

  React.useEffect(() => { if (!breakdown) recompute(); }, [breakdown, recompute]);

  const topGPU = gpuRecommendations?.allFits.find(f => f.fitStatus !== 'red');
  const kvPrecisionLabel = kvPrecision.toUpperCase();

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

  const PRECISION_BYTES: Record<string, number> = {
    fp32: 4, fp16: 2, bf16: 2, fp8: 1, int8: 1, int4: 0.5, nf4: 0.5,
  };
  const bytesPerParam = PRECISION_BYTES[precision] ?? 2;

  const InputPanel = (
    <div className="flex flex-col gap-5">
      <ModelPicker models={modelDb} value={selectedModel} onSelect={setModel}
        open={modelSearchOpen} onOpenChange={o => { if (!o) onModelSearchClose?.(); }} />
      <PrecisionPicker value={precision} onChange={setPrecision} />
      <KVPrecisionPicker value={kvPrecision} onChange={setKVPrecision} fp16KvCacheGB={breakdown?.kvCacheGB} />
      {selectedModel && (
        <KVCurveChart
          model={selectedModel}
          kvPrecision={kvPrecision}
          currentContext={contextLength}
          batchSize={batchSize}
        />
      )}
      <ContextSlider value={contextLength} max={selectedModel?.architecture.maxContextLength ?? 131072} onChange={setContextLength} />
      <BatchConfig value={batchSize} onChange={setBatchSize} />
      <AdvancedPanel mode={mode} advancedSettings={advancedSettings} trainingOptions={trainingOptions}
        onAdvancedSettingsChange={setAdvancedSettings} onTrainingOptionsChange={setTrainingOptions} />
      {selectedModel && (
        <div className="flex flex-col gap-4 border border-border-subtle rounded-lg p-4">
          <KVCacheConfig
            model={selectedModel}
            kvPrecision={kvPrecision}
            contextLength={contextLength}
            batchSize={batchSize}
          />
          <div className="border-t border-border-subtle pt-4">
            <SpeculativeConfig batchSize={batchSize} contextLength={contextLength} />
          </div>
          <div className="border-t border-border-subtle pt-4">
            <TokenizerInfo model={selectedModel} bytesPerParam={bytesPerParam} />
          </div>
          <div className="border-t border-border-subtle pt-4">
            <FrameworkPicker gpu={topGPU?.gpu} quantization={kvPrecision} mode={mode} />
          </div>
        </div>
      )}
    </div>
  );

  const OutputSection = (
    <div className="flex flex-col gap-6 min-w-0">
      {breakdown ? (
        <>
          <VRAMBreakdown breakdown={breakdown} gpuRef={topGPU?.gpu} kvPrecisionLabel={kvPrecisionLabel} framework={advancedSettings.framework} />
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
      {gpuRecommendations ? <GPUList recommendations={gpuRecommendations} /> : <><SkeletonGPUCard /><SkeletonGPUCard /></>}
    </aside>
  );

  return (
    <div className="max-w-[1760px] mx-auto px-4 md:px-6 py-6 pb-20 md:pb-6">

      {/* ── Desktop xl: 3-column ─────────────────────────────────────── */}
      <div className="hidden xl:grid xl:grid-cols-[280px_1fr_380px] gap-6">
        <aside>{InputPanel}</aside>
        {OutputSection}
        {GPUSection}
      </div>

      {/* ── Tablet md: 2-column ──────────────────────────────────────── */}
      <div className="hidden md:grid xl:hidden grid-cols-2 gap-6">
        <aside>{InputPanel}</aside>
        <div className="flex flex-col gap-6">
          {OutputSection}
          {GPUSection}
        </div>
      </div>

      {/* ── Mobile: single-column ────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:hidden">
        {/* Collapsible inputs with summary */}
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
          <VRAMBreakdown breakdown={breakdown} gpuRef={topGPU?.gpu} kvPrecisionLabel={kvPrecisionLabel} framework={advancedSettings.framework} />
        ) : <SkeletonVRAMBreakdown />}

        {breakdown && <MetricsRow tokensPerSecond={topGPU?.tokensPerSecond} costMetrics={costMetrics} gpuName={topGPU?.gpu.name} contextLength={contextLength} />}

        {/* Top 3 GPU cards on mobile */}
        {gpuRecommendations && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Recommended GPUs</h3>
            {[gpuRecommendations.budget, gpuRecommendations.balanced, gpuRecommendations.performance]
              .filter(Boolean).slice(0, 3)
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

      {/* ── Cloud Table (all breakpoints) ────────────────────────────── */}
      {cloudRecommendations && cloudRecommendations.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-muted mb-3">Cloud Instances</h2>
          <CloudTable recommendations={cloudRecommendations} />
        </section>
      )}
      {cloudRecommendations?.length === 0 && (
        <section className="mt-8">
          <EmptyState icon={<Cpu size={32} />} title="No cloud instances found" description="Try reducing context length or using a smaller model." />
        </section>
      )}

      {/* ── Cluster + Stack panels ────────────────────────────────────── */}
      {(clusterRecommendation || stackRecommendation) && (
        <section className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {clusterRecommendation && <ClusterPanel cluster={clusterRecommendation} />}
          {stackRecommendation && <StackPanel stack={stackRecommendation} />}
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
