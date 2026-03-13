import React, { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useEEGStore } from '../../store/eegStore';

interface ChartDataPoint {
  time: string;
  delta: number;
  theta: number;
  alpha: number;
  beta: number;
  gamma: number;
}

const BAND_COLORS = {
  delta: 'var(--neural-violet)',
  theta: 'var(--neural-cyan)',
  alpha: 'var(--neural-green)',
  beta: 'var(--neural-amber)',
  gamma: 'var(--neural-red)',
};

export const BrainwaveChart: React.FC = () => {
  const { bandPowers, connected } = useEEGStore();
  const [data, setData] = useState<ChartDataPoint[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!connected) return;

      const now = new Date();
      const timeLabel = `${now.getSeconds().toString().padStart(2, '0')}s`;

      setData((prev) => {
        const next = [
          ...prev.slice(-59),
          {
            time: timeLabel,
            delta: Number((bandPowers.delta * 1e6).toFixed(3)),
            theta: Number((bandPowers.theta * 1e6).toFixed(3)),
            alpha: Number((bandPowers.alpha * 1e6).toFixed(3)),
            beta: Number((bandPowers.beta * 1e6).toFixed(3)),
            gamma: Number((bandPowers.gamma * 1e6).toFixed(3)),
          },
        ];
        return next;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [bandPowers, connected]);

  return (
    <div style={{ width: '100%', height: '280px' }}>
      <div className="flex items-center gap-2 mb-3">
        <span
          className="status-dot recording"
          role="status"
          aria-label={connected ? 'Recording active' : 'Not recording'}
          style={{ display: connected ? 'inline-block' : 'none' }}
        />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Brainwave Spectrum — Last 30s
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6rem',
            color: 'var(--text-muted)',
          }}
        >
          (µV²)
        </span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            {Object.entries(BAND_COLORS).map(([band, color]) => (
              <linearGradient key={band} id={`grad-${band}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="time"
            tick={{ fontFamily: 'Space Mono', fontSize: 10, fill: 'var(--text-muted)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border-subtle)' }}
            interval={9}
          />
          <YAxis
            tick={{ fontFamily: 'Space Mono', fontSize: 10, fill: 'var(--text-muted)' }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-active)',
              borderRadius: 8,
              fontFamily: 'Space Mono',
              fontSize: 11,
              color: 'var(--text-primary)',
            }}
            formatter={(value: number, name: string) => [
              `${value.toFixed(3)} µV²`,
              name.toUpperCase(),
            ]}
          />
          <Legend
            wrapperStyle={{
              fontFamily: 'Space Mono',
              fontSize: 10,
              paddingTop: 8,
            }}
          />
          {(['delta', 'theta', 'alpha', 'beta', 'gamma'] as const).map((band) => (
            <Area
              key={band}
              type="monotone"
              dataKey={band}
              stroke={BAND_COLORS[band]}
              fill={`url(#grad-${band})`}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              name={band}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
