import * as React from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import type { LatencyCurvePoint } from '@/lib/formulas/latency-curve';

interface LatencyCurveChartProps {
  points: LatencyCurvePoint[];
  currentUsers: number;
  sloTpotMs: number;
  sweetSpotUsers: number;
  maxCapacityUsers: number;
}

function formatUsers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function formatThroughput(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return Math.round(n).toString();
}

export function LatencyCurveChart({
  points,
  currentUsers,
  sloTpotMs,
  sweetSpotUsers,
  maxCapacityUsers,
}: LatencyCurveChartProps) {
  // Limit to reasonable number of points for rendering
  const chartData = React.useMemo(() => {
    if (points.length <= 60) return points;
    // Downsample
    const step = Math.ceil(points.length / 60);
    return points.filter((_, i) => i % step === 0 || i === points.length - 1);
  }, [points]);

  const maxTpot = Math.max(...chartData.map(p => p.tpotMs), sloTpotMs * 1.5, 100);
  const maxThroughput = Math.max(...chartData.map(p => p.aggregateThroughput), 1);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-fg-default">Latency vs Concurrent Users</span>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 8, right: 40, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle, #333)" opacity={0.4} />
          <XAxis
            dataKey="users"
            tick={{ fontSize: 9, fill: 'var(--color-fg-muted, #888)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatUsers}
            label={{ value: 'Users', position: 'insideBottomRight', offset: -4, fontSize: 9, fill: 'var(--color-fg-muted, #888)' }}
          />
          {/* Left Y: TPOT */}
          <YAxis
            yAxisId="tpot"
            orientation="left"
            tick={{ fontSize: 9, fill: 'var(--color-fg-muted, #888)' }}
            tickLine={false}
            axisLine={false}
            width={36}
            domain={[0, Math.ceil(maxTpot / 10) * 10]}
            tickFormatter={v => `${v}ms`}
          />
          {/* Right Y: Throughput */}
          <YAxis
            yAxisId="throughput"
            orientation="right"
            tick={{ fontSize: 9, fill: 'var(--color-fg-muted, #888)' }}
            tickLine={false}
            axisLine={false}
            width={40}
            domain={[0, Math.ceil(maxThroughput / 100) * 100]}
            tickFormatter={formatThroughput}
          />
          <Tooltip
            contentStyle={{ fontSize: 10, padding: '4px 8px', background: 'var(--color-bg-muted)', border: '1px solid var(--color-border-subtle)' }}
            formatter={(value: number, name: string) => {
              if (name === 'TPOT') return [`${value.toFixed(1)}ms`, 'TPOT'];
              return [`${formatThroughput(value)} tok/s`, 'Throughput'];
            }}
            labelFormatter={l => `${l} users`}
          />
          <Legend
            wrapperStyle={{ fontSize: 9, paddingTop: 4 }}
          />

          {/* Current user count vertical line */}
          <ReferenceLine
            yAxisId="tpot"
            x={currentUsers}
            stroke="var(--color-accent, #6366f1)"
            strokeDasharray="4 2"
            strokeWidth={1.5}
            label={{ value: `${formatUsers(currentUsers)}`, position: 'top', fontSize: 8, fill: 'var(--color-accent, #6366f1)' }}
          />

          {/* SLO horizontal line */}
          <ReferenceLine
            yAxisId="tpot"
            y={sloTpotMs}
            stroke="#ef4444"
            strokeDasharray="4 2"
            strokeWidth={1}
            label={{ value: `SLO ${sloTpotMs}ms`, position: 'right', fontSize: 8, fill: '#ef4444' }}
          />

          {/* Sweet spot marker */}
          {sweetSpotUsers > 0 && (
            <ReferenceLine
              yAxisId="tpot"
              x={sweetSpotUsers}
              stroke="#22c55e"
              strokeDasharray="2 2"
              strokeWidth={1}
              label={{ value: '★', position: 'top', fontSize: 10, fill: '#22c55e' }}
            />
          )}

          {/* Max capacity marker */}
          {maxCapacityUsers > 0 && maxCapacityUsers !== sweetSpotUsers && (
            <ReferenceLine
              yAxisId="tpot"
              x={maxCapacityUsers}
              stroke="#f59e0b"
              strokeDasharray="2 2"
              strokeWidth={1}
              label={{ value: 'max', position: 'top', fontSize: 8, fill: '#f59e0b' }}
            />
          )}

          <Line
            yAxisId="tpot"
            type="monotone"
            dataKey="tpotMs"
            name="TPOT"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="throughput"
            type="monotone"
            dataKey="aggregateThroughput"
            name="Throughput"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 text-[9px] text-fg-muted">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-green-500" /> Sweet spot</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-amber-500" /> Max capacity</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-red-500 opacity-60" style={{ borderTop: '1px dashed' }} /> SLO target</span>
      </div>
    </div>
  );
}
