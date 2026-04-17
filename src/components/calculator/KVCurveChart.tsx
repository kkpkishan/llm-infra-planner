import * as React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceDot, ResponsiveContainer } from 'recharts';
import { computeKVCache } from '@/lib/formulas/kvcache';
import type { ModelSpec } from '@/lib/formulas/types';
import { getKVPrecisionConfig } from '@/lib/formulas/precision';

interface KVCurveChartProps {
  model: ModelSpec;
  kvPrecision: string;
  currentContext: number;
  batchSize: number;
}

// Context lengths to plot (log-spaced)
const PLOT_STEPS = [
  1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072,
  262144, 524288, 1048576, 2097152, 4194304, 10485760,
];

function formatCtxLabel(n: number): string {
  if (n >= 1_000_000) return `${n / 1_000_000}M`;
  if (n >= 1024) return `${n / 1024}K`;
  return String(n);
}

export function KVCurveChart({ model, kvPrecision, currentContext, batchSize }: KVCurveChartProps) {
  const kvConfig = getKVPrecisionConfig(kvPrecision);
  const arch = model.architecture;

  const data = React.useMemo(() => {
    const maxCtx = model.architecture.maxContextLength;
    return PLOT_STEPS
      .filter(s => s <= Math.max(maxCtx, currentContext))
      .map(seqLen => {
        const { kvCacheGB } = computeKVCache({
          numLayers: arch.numLayers,
          batchSize,
          seqLen,
          numKVHeads: arch.numKeyValueHeads,
          headDim: arch.headDim,
          bytesPerParam: kvConfig.bytesPerParam,
          attentionType: arch.attentionType,
          mlaCompressedDim: model.mlaCompressedDim,
        });
        return { ctx: seqLen, kvGB: kvCacheGB, label: formatCtxLabel(seqLen) };
      });
  }, [arch, batchSize, kvConfig.bytesPerParam, model.architecture.maxContextLength, model.mlaCompressedDim, currentContext]);

  const currentKV = React.useMemo(() => {
    const { kvCacheGB } = computeKVCache({
      numLayers: arch.numLayers,
      batchSize,
      seqLen: currentContext,
      numKVHeads: arch.numKeyValueHeads,
      headDim: arch.headDim,
      bytesPerParam: kvConfig.bytesPerParam,
      attentionType: arch.attentionType,
      mlaCompressedDim: model.mlaCompressedDim,
    });
    return kvCacheGB;
  }, [arch, batchSize, currentContext, kvConfig.bytesPerParam, model.mlaCompressedDim]);

  if (data.length < 2) return null;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium text-fg-muted">KV Cache vs Context</span>
      <ResponsiveContainer width="100%" height={80}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 8, fill: 'var(--color-fg-muted, #888)' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 8, fill: 'var(--color-fg-muted, #888)' }}
            tickLine={false}
            axisLine={false}
            width={28}
            tickFormatter={v => `${v}G`}
          />
          <Tooltip
            contentStyle={{ fontSize: 10, padding: '2px 6px' }}
            formatter={(v: number) => [`${v.toFixed(2)} GB`, 'KV']}
            labelFormatter={l => `ctx: ${l}`}
          />
          <Line
            type="monotone"
            dataKey="kvGB"
            stroke="var(--color-accent, #6366f1)"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          <ReferenceDot
            x={formatCtxLabel(data.reduce((prev, curr) =>
              Math.abs(curr.ctx - currentContext) < Math.abs(prev.ctx - currentContext) ? curr : prev
            ).ctx)}
            y={currentKV}
            r={3}
            fill="var(--color-accent, #6366f1)"
            stroke="white"
            strokeWidth={1}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
