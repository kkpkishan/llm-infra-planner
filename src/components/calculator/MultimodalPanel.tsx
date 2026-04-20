import * as React from 'react';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  VISION_ENCODERS,
  AUDIO_ENCODERS,
  computeVisionKVCacheExtra,
  type VisionEncoderSpec,
} from '@/lib/formulas/multimodal';

interface MultimodalPanelProps {
  numLayers: number;
  numKVHeads: number;
  headDim: number;
  bytesPerParam: number;
  batchSize: number;
  className?: string;
}

function KVRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border-subtle last:border-0">
      <span className="text-xs text-fg-muted flex-shrink-0 w-44">{label}</span>
      <span className={cn('text-xs font-mono text-right break-all', highlight ? 'text-accent font-semibold' : 'text-fg-default')}>
        {value}
      </span>
    </div>
  );
}

function getImageTokens(spec: VisionEncoderSpec): number {
  const t = spec.imageTokensPerImage;
  if (typeof t === 'number') return t;
  return Math.round((t.min + t.max) / 2);
}

function formatImageTokens(spec: VisionEncoderSpec): string {
  const t = spec.imageTokensPerImage;
  if (typeof t === 'number') return `${t}`;
  return `${t.min}–${t.max} (dynamic)`;
}

export function MultimodalPanel({
  numLayers,
  numKVHeads,
  headDim,
  bytesPerParam,
  batchSize,
  className,
}: MultimodalPanelProps) {
  const [visionEncoderIdx, setVisionEncoderIdx] = React.useState(0);
  const [audioEnabled, setAudioEnabled] = React.useState(false);
  const [imagesPerBatch, setImagesPerBatch] = React.useState(1);

  const visionEncoder = VISION_ENCODERS[visionEncoderIdx];
  const audioEncoder = AUDIO_ENCODERS[0];

  const imageTokens = getImageTokens(visionEncoder) * imagesPerBatch;
  const kvExtra = computeVisionKVCacheExtra(
    imageTokens,
    numLayers,
    numKVHeads,
    headDim,
    bytesPerParam,
    batchSize
  );

  const totalVRAM = visionEncoder.vramGB + (audioEnabled ? audioEncoder.vramGB : 0) + kvExtra;

  return (
    <div className={cn('rounded-lg border border-border-subtle bg-bg-muted p-4', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Eye size={14} className="text-fg-muted" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
          Multimodal Extras
        </h3>
      </div>

      <div className="space-y-3 mb-4">
        {/* Vision Encoder */}
        <div className="flex flex-col gap-1">
          <label htmlFor="vision-encoder" className="text-xs text-fg-muted">Vision Encoder</label>
          <select
            id="vision-encoder"
            value={visionEncoderIdx}
            onChange={(e) => setVisionEncoderIdx(parseInt(e.target.value, 10))}
            className="h-8 px-2 rounded-md border border-border-subtle bg-bg-muted text-xs text-fg-default focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {VISION_ENCODERS.map((enc, i) => (
              <option key={enc.name} value={i}>{enc.name}</option>
            ))}
          </select>
        </div>

        {/* Images per batch */}
        <div className="flex items-center gap-2">
          <label htmlFor="images-per-batch" className="text-xs text-fg-muted w-44 flex-shrink-0">Images / request</label>
          <input
            id="images-per-batch"
            type="number"
            min={1}
            max={64}
            step={1}
            value={imagesPerBatch}
            onChange={(e) => setImagesPerBatch(parseInt(e.target.value, 10) || 1)}
            className="flex-1 h-8 px-2 rounded-md border border-border-subtle bg-bg-muted text-xs font-mono text-fg-default focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Audio Encoder */}
        <div className="flex items-center justify-between">
          <label htmlFor="audio-encoder" className="text-xs text-fg-muted">
            Audio Encoder ({audioEncoder.name})
          </label>
          <button
            id="audio-encoder"
            role="switch"
            aria-checked={audioEnabled}
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={cn(
              'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              audioEnabled ? 'bg-accent' : 'bg-bg-emphasis'
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                audioEnabled ? 'translate-x-[18px]' : 'translate-x-[2px]'
              )}
            />
          </button>
        </div>
      </div>

      {/* Outputs */}
      <div className="border-t border-border-subtle pt-3 flex flex-col">
        <KVRow label="Vision Encoder VRAM" value={`${visionEncoder.vramGB} GB`} highlight />
        <KVRow label="Image Tokens" value={formatImageTokens(visionEncoder)} />
        <KVRow label="KV Cache Extra" value={`${kvExtra.toFixed(3)} GB`} highlight />
        {audioEnabled && (
          <KVRow label="Audio Encoder VRAM" value={`${audioEncoder.vramGB} GB`} />
        )}
        <KVRow label="Total Multimodal" value={`${totalVRAM.toFixed(2)} GB`} highlight />
      </div>
    </div>
  );
}
