interface PrefillDecodeBreakdownProps {
  ttftMs: number;
  tpotMs: number;
  avgOutputTokens: number;
}

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

export function PrefillDecodeBreakdown({ ttftMs, tpotMs, avgOutputTokens }: PrefillDecodeBreakdownProps) {
  const decodeTimeMs = tpotMs * avgOutputTokens;
  const totalMs = ttftMs + decodeTimeMs;

  // Calculate proportional widths
  const prefillPct = totalMs > 0 ? (ttftMs / totalMs) * 100 : 30;
  const decodePct = 100 - prefillPct;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-fg-default">Inference Timeline</span>

      {/* Timeline bar */}
      <div className="flex rounded overflow-hidden h-8 text-xs font-medium">
        <div
          className="flex items-center justify-center bg-violet-600 text-white px-2 truncate"
          style={{ width: `${Math.max(prefillPct, 15)}%` }}
          title={`Prefill: ${formatMs(ttftMs)}`}
        >
          Prefill
        </div>
        <div
          className="flex items-center justify-center bg-blue-500 text-white px-2 truncate flex-1"
          style={{ width: `${Math.max(decodePct, 15)}%` }}
          title={`Decode: ${avgOutputTokens} × ${formatMs(tpotMs)}`}
        >
          Decode ({avgOutputTokens} tokens)
        </div>
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between text-[10px] font-mono text-fg-muted">
        <span>TTFT: <span className="text-fg-primary font-semibold">{formatMs(ttftMs)}</span></span>
        <span>TPOT: <span className="text-fg-primary font-semibold">{formatMs(tpotMs)}</span>/token</span>
        <span>E2E: <span className="text-fg-primary font-semibold">{formatMs(totalMs)}</span></span>
      </div>

      {/* Summary line */}
      <p className="text-[10px] text-fg-muted">
        Prefill: {formatMs(ttftMs)} | Decode: {avgOutputTokens} tokens × {formatMs(tpotMs)} = {formatMs(decodeTimeMs)} | Total: {formatMs(totalMs)}
      </p>
    </div>
  );
}
