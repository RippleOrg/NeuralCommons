import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Shield, Network, Activity } from 'lucide-react';
import { BrainwaveChart } from '../components/eeg/BrainwaveChart';
import { FlowStateIndicator } from '../components/eeg/FlowStateIndicator';
import { Card } from '../components/ui/Card';
import { useEEGStore } from '../store/eegStore';
import { useVaultStore } from '../store/vaultStore';
import { useFederatedStore } from '../store/federatedStore';

interface ActivityEvent {
  id: string;
  timestamp: number;
  type: 'ipfs' | 'consent' | 'gradient' | 'session';
  message: string;
}

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const StatCard: React.FC<{
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}> = ({ label, value, icon, color }) => (
  <Card>
    <div className="flex items-center gap-3">
      <div style={{ color }}>{icon}</div>
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {label}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color }}>
          {value}
        </div>
      </div>
    </div>
  </Card>
);

export const Dashboard: React.FC = () => {
  const { sessions, connected, bandPowers } = useEEGStore();
  const { entries, grants } = useVaultStore();
  const { rounds, privacyBudget } = useFederatedStore();
  const [activityLog, setActivityLog] = useState<ActivityEvent[]>([
    { id: '1', timestamp: Date.now() - 5000, type: 'session', message: 'Session started — EEG simulation active' },
    { id: '2', timestamp: Date.now() - 3000, type: 'ipfs', message: 'Vault initialized — IPFS node connecting' },
  ]);

  useEffect(() => {
    if (connected) {
      const interval = setInterval(() => {
        setActivityLog((prev) => {
          const events: ActivityEvent[] = [
            `Band powers updated: α=${bandPowers.alpha.toFixed(4)}, β=${bandPowers.beta.toFixed(4)}`,
          ].map((msg) => ({
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            type: 'session' as const,
            message: msg,
          }));
          return [...prev.slice(-20), ...events];
        });
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [connected, bandPowers]);

  const activeConsents = grants.filter((g) => !g.revoked).length;
  const remainingBudget = (privacyBudget.remainingBudget / privacyBudget.maxEpsilon) * 100;

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="space-y-6"
    >
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Neural Sessions"
          value={String(sessions.length + entries.length)}
          icon={<Brain size={20} />}
          color="var(--neural-cyan)"
        />
        <StatCard
          label="Privacy Budget"
          value={`${remainingBudget.toFixed(0)}%`}
          icon={<Shield size={20} />}
          color={remainingBudget > 50 ? 'var(--neural-green)' : 'var(--neural-amber)'}
        />
        <StatCard
          label="Fed. Rounds"
          value={String(rounds)}
          icon={<Network size={20} />}
          color="var(--neural-violet)"
        />
        <StatCard
          label="Active Consents"
          value={String(activeConsents)}
          icon={<Activity size={20} />}
          color="var(--neural-teal)"
        />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-3 gap-4">
        {/* Brainwave chart */}
        <div style={{ gridColumn: 'span 2' }}>
          <Card>
            <BrainwaveChart />
          </Card>
        </div>

        {/* Flow state */}
        <Card>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>
            Cognitive State
          </div>
          <div className="flex justify-center">
            <FlowStateIndicator />
          </div>
        </Card>
      </div>

      {/* Activity feed */}
      <Card>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
          Activity Feed
        </div>
        <div
          className="terminal-text"
          aria-live="polite"
          aria-label="Activity log"
          style={{ maxHeight: '200px' }}
        >
          {activityLog.slice().reverse().map((event) => (
            <div key={event.id} className={`log-${event.type === 'session' ? 'info' : event.type === 'ipfs' ? 'warn' : 'info'}`}>
              <span style={{ color: 'var(--text-muted)' }}>
                [{new Date(event.timestamp).toLocaleTimeString()}]
              </span>{' '}
              {event.message}
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
};
