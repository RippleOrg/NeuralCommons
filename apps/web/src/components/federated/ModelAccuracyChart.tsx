import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ModelAccuracyChartProps {
  accuracyHistory: Array<{ round: number; local: number; global: number }>;
}

export const ModelAccuracyChart: React.FC<ModelAccuracyChartProps> = ({ accuracyHistory }) => {

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={accuracyHistory}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="round" tick={{ fontFamily: 'Space Mono', fontSize: 9, fill: 'var(--text-muted)' }} />
        <YAxis domain={[0, 1]} tick={{ fontFamily: 'Space Mono', fontSize: 9, fill: 'var(--text-muted)' }} />
        <Tooltip
          contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-active)', fontFamily: 'Space Mono', fontSize: 11 }}
          formatter={(v: number) => [`${(v * 100).toFixed(1)}%`]}
        />
        <Line type="monotone" dataKey="local" stroke="var(--neural-cyan)" dot={false} strokeWidth={1.5} name="Local Accuracy" />
        <Line type="monotone" dataKey="global" stroke="var(--neural-green)" dot={false} strokeWidth={1.5} name="Global Accuracy" />
      </LineChart>
    </ResponsiveContainer>
  );
};
