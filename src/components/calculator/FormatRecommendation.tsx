import * as React from 'react';
import { cn } from '@/lib/utils';

interface FormatInfo {
  id: string;
  name: string;
  tool: string;
  description: string;
  timeEstimates: { size: string; time: string }[];
  notes?: string;
}

const FORMATS: FormatInfo[] = [
  {
    id: 'safetensors',
    name: 'SafeTensors',
    tool: 'huggingface/safetensors',
    description: 'Default — zero conversion cost, safe loading',
    timeEstimates: [
      { size: '7B', time: '< 1 min' },
      { size: '13B', time: '< 1 min' },
      { size: '70B', time: '2–5 min' },
    ],
  },
  {
    id: 'gguf',
    name: 'GGUF',
    tool: 'llama.cpp convert_hf_to_gguf.py + llama-quantize',
    description: 'CPU/GPU inference via llama.cpp, Ollama, LM Studio',
    timeEstimates: [
      { size: '7B', time: '10–30 min' },
      { size: '13B', time: '20–60 min' },
      { size: '70B', time: '2–4 h' },
    ],
  },
  {
    id: 'onnx',
    name: 'ONNX',
    tool: 'optimum-cli export onnx / torch.onnx.export',
    description: 'Cross-platform inference, ONNX Runtime',
    timeEstimates: [
      { size: '7B', time: '15–45 min' },
      { size: '13B', time: '30 min–1.5 h' },
      { size: '70B', time: '2–6 h' },
    ],
  },
  {
    id: 'tensorrt',
    name: 'TensorRT Engine',
    tool: 'trtllm-build (TensorRT-LLM)',
    description: 'NVIDIA GPU-specific, highest throughput',
    timeEstimates: [
      { size: '7B', time: '10–30 min' },
      { size: '13B', time: '20–60 min' },
      { size: '70B', time: '2–6 h' },
    ],
    notes: 'Engine is GPU-arch specific — must rebuild for each GPU family',
  },
  {
    id: 'coreml',
    name: 'CoreML',
    tool: 'coremltools + apple/coremltools',
    description: 'Apple Silicon (M-series), on-device inference',
    timeEstimates: [
      { size: '7B', time: '20–60 min' },
      { size: '13B', time: '1–2 h' },
      { size: '70B', time: '4–8 h' },
    ],
    notes: 'macOS only',
  },
  {
    id: 'mlx',
    name: 'MLX',
    tool: 'mlx-lm.convert',
    description: 'Apple Silicon optimized, fast on M-series',
    timeEstimates: [
      { size: '7B', time: '5–15 min' },
      { size: '13B', time: '10–30 min' },
      { size: '70B', time: '1–3 h' },
    ],
    notes: 'macOS only',
  },
];

interface FormatRecommendationProps {
  className?: string;
}

export function FormatRecommendation({ className }: FormatRecommendationProps) {
  const [selected, setSelected] = React.useState<string>('safetensors');

  const activeFormat = FORMATS.find((f) => f.id === selected) ?? FORMATS[0];

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <label className="text-xs font-medium text-fg-default">Export Format</label>

      {/* Format grid */}
      <div className="grid grid-cols-3 gap-1">
        {FORMATS.map((fmt) => (
          <button
            key={fmt.id}
            onClick={() => setSelected(fmt.id)}
            className={cn(
              'px-2 py-1.5 rounded-md border text-xs font-medium transition-colors text-center',
              selected === fmt.id
                ? 'bg-accent text-white border-accent'
                : 'bg-bg-muted border-border-subtle text-fg-default hover:bg-bg-emphasis'
            )}
          >
            {fmt.name}
          </button>
        ))}
      </div>

      {/* Detail card */}
      <div className="rounded-md border border-border-subtle bg-bg-subtle p-3 space-y-2">
        <div>
          <p className="text-xs font-semibold text-fg-default">{activeFormat.name}</p>
          <p className="text-[10px] text-fg-muted mt-0.5">{activeFormat.description}</p>
        </div>

        <div>
          <p className="text-[10px] font-medium text-fg-muted mb-1">Conversion tool</p>
          <code className="text-[10px] bg-bg-emphasis px-1.5 py-0.5 rounded text-fg-default break-all">
            {activeFormat.tool}
          </code>
        </div>

        <div>
          <p className="text-[10px] font-medium text-fg-muted mb-1">Estimated conversion time (A100)</p>
          <div className="flex gap-2">
            {activeFormat.timeEstimates.map(({ size, time }) => (
              <div key={size} className="flex-1 text-center rounded bg-bg-emphasis px-2 py-1">
                <p className="text-[10px] font-bold text-fg-default">{size}</p>
                <p className="text-[10px] text-fg-muted">{time}</p>
              </div>
            ))}
          </div>
        </div>

        {activeFormat.notes && (
          <p className="text-[10px] text-amber-500">{activeFormat.notes}</p>
        )}
      </div>
    </div>
  );
}
