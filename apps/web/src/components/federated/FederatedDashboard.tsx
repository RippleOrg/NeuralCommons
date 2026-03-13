import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useFederated } from '../../hooks/useFederated';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

export const FederatedDashboard: React.FC = () => {
  const {
    training,
    trainLocal,
    broadcastGradients,
    localAccuracy,
    globalAccuracy,
    localLoss,
    privacyBudget,
    rounds,
    accuracyHistory,
    peers,
  } = useFederated();

  const handleTrainLocal = async () => {
    // Generate some mock training data
    const { extractFeatures } = await import('../../lib/eeg/flowState');
    const mockFeatures = Array.from({ length: 20 }, () =>
      extractFeatures([], 250)
    );
    const labels = mockFeatures.map(() => {
      const states = ['flow', 'focus', 'relaxed', 'stressed', 'neutral'] as const;
      return states[Math.floor(Math.random() * states.length)];
    });
    await trainLocal(mockFeatures, labels);
  };

  const epsilonPercent = Math.min(100, (privacyBudget.totalEpsilon / privacyBudget.maxEpsilon) * 100);

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            LOCAL ACC
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--neural-cyan)' }}>
            {(localAccuracy * 100).toFixed(1)}%
          </div>
        </Card>
        <Card>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            GLOBAL ACC
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--neural-green)' }}>
            {(globalAccuracy * 100).toFixed(1)}%
          </div>
        </Card>
        <Card>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            ROUND
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--neural-amber)' }}>
            #{rounds}
          </div>
        </Card>
      </div>

      {/* Accuracy chart */}
      <Card>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Training History
        </div>
        <div style={{ height: '180px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={accuracyHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="round" tick={{ fontFamily: 'Space Mono', fontSize: 9, fill: 'var(--text-muted)' }} />
              <YAxis domain={[0, 1]} tick={{ fontFamily: 'Space Mono', fontSize: 9, fill: 'var(--text-muted)' }} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-active)', borderRadius: 8, fontFamily: 'Space Mono', fontSize: 11 }}
                formatter={(v: number) => [`${(v * 100).toFixed(1)}%`]}
              />
              <Legend wrapperStyle={{ fontFamily: 'Space Mono', fontSize: 10 }} />
              <Line type="monotone" dataKey="local" stroke="var(--neural-cyan)" dot={false} strokeWidth={1.5} name="Local" />
              <Line type="monotone" dataKey="global" stroke="var(--neural-green)" dot={false} strokeWidth={1.5} name="Global" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Privacy budget */}
      <Card>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Privacy Budget (ε = {privacyBudget.totalEpsilon.toFixed(4)})
        </div>
        <ProgressBar
          value={epsilonPercent}
          label="ε spent"
          color={epsilonPercent > 80 ? 'var(--neural-red)' : 'var(--neural-cyan)'}
          showValue
        />
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '6px' }}>
          Remaining: {privacyBudget.remainingBudget.toFixed(4)} ε
        </div>
      </Card>

      {/* Peer count */}
      <div className="flex items-center gap-2">
        <Badge variant="teal">
          {peers.length} PEERS
        </Badge>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
          libp2p network
        </span>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <Button
          variant="primary"
          onClick={handleTrainLocal}
          loading={training}
          disabled={training}
          aria-label="Train local model"
        >
          Train Local
        </Button>
        <Button
          variant="secondary"
          onClick={() => broadcastGradients()}
          disabled={training}
          aria-label="Broadcast gradients to federation"
        >
          Broadcast Gradients
        </Button>
      </div>
    </div>
  );
};
