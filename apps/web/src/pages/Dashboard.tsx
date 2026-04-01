import React, { useMemo, useState } from 'react';
import { Activity, Brain, Lock, Network } from 'lucide-react';
import { BrainwaveChart } from '../components/eeg/BrainwaveChart';
import { FlowStateIndicator } from '../components/eeg/FlowStateIndicator';
import { Button } from '../components/ui/Button';
import { useEEGStore } from '../store/eegStore';
import { useVaultStore } from '../store/vaultStore';
import { useFederatedStore } from '../store/federatedStore';
import { useUIStore } from '../store/uiStore';
import { getProviderStatuses } from '../lib/runtime';
import { runImpulseInference } from '../lib/ai/impulse';
import type { ImpulseInference } from '../types/runtime';

const providerStatuses = getProviderStatuses();

export const Dashboard: React.FC = () => {
  const eeg = useEEGStore();
  const vault = useVaultStore();
  const federated = useFederatedStore();
  const ui = useUIStore();
  const [inference, setInference] = useState<ImpulseInference | null>(null);
  const [runningInference, setRunningInference] = useState(false);

  const remainingBudget = useMemo(() => {
    const { remainingBudget, maxEpsilon } = federated.privacyBudget;
    return maxEpsilon > 0 ? (remainingBudget / maxEpsilon) * 100 : 0;
  }, [federated.privacyBudget]);

  const latestCompletedSession = eeg.sessions[eeg.sessions.length - 1];
  const latestFeature =
    eeg.currentSession?.features[eeg.currentSession.features.length - 1] ??
    latestCompletedSession?.features[latestCompletedSession.features.length - 1] ??
    null;
  const activeConsents = vault.grants.filter((grant) => !grant.revoked).length;

  const handleImpulseInference = async () => {
    if (!latestFeature) {
      ui.addToast('Capture a session first so there is a feature window to analyze.', 'warning');
      return;
    }

    try {
      setRunningInference(true);
      const result = await runImpulseInference(latestFeature);
      setInference(result);

      if (result) {
        ui.logActivity({
          title: 'Impulse inference',
          message: `Remote model predicted ${result.label} at ${(result.confidence * 100).toFixed(1)}% confidence.`,
          tone: 'info',
        });
      }
    } catch (error) {
      ui.addToast(`Impulse inference failed: ${String(error)}`, 'error');
    } finally {
      setRunningInference(false);
    }
  };

  return (
    <div className="page-grid">
      <section className="stat-grid">
        <StatCard
          icon={<Brain size={16} />}
          label="Neural Sessions"
          value={String(eeg.sessions.length)}
          tone="cyan"
          detail={`${vault.entries.length} sealed vault packages`}
        />
        <StatCard
          icon={<Lock size={16} />}
          label="Privacy Budget"
          value={`${remainingBudget.toFixed(0)}%`}
          tone={remainingBudget > 50 ? 'green' : 'amber'}
          detail={`ε spent ${federated.privacyBudget.totalEpsilon.toFixed(3)}`}
        />
        <StatCard
          icon={<Network size={16} />}
          label="Fed Rounds"
          value={String(federated.rounds)}
          tone="violet"
          detail={`${federated.peers.length} contributors tracked`}
        />
        <StatCard
          icon={<Activity size={16} />}
          label="Active Consents"
          value={String(activeConsents)}
          tone="amber"
          detail={`${vault.revocations.length} revocations recorded`}
        />
      </section>

      <section className="two-col">
        <div className="card card-accent">
          <div className="card-header">
            <div>
              <div className="card-title">Live Brainwave Signal</div>
              <div className="card-sub">8-channel EEG · 4s rolling window · local processing</div>
            </div>
            <div className="header-badge">
              <div className="dot" />
              {eeg.connected ? 'Connected' : 'Awaiting device'}
            </div>
          </div>
          <BrainwaveChart />
        </div>

        <div className="column-stack">
          <div className="card">
            <div className="card-header">
              <div className="card-title">Flow State</div>
              <div className={`badge badge-${eeg.flowState?.state === 'stressed' ? 'red' : 'green'}`}>
                {(eeg.flowState?.state ?? 'neutral').toUpperCase()}
              </div>
            </div>
            <FlowStateIndicator />
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Provider Mesh</div>
            </div>
            <div className="stack-sm">
              {Object.values(providerStatuses).map((provider) => (
                <div key={provider.label} className="provider-row">
                  <div>
                    <div className="provider-label">{provider.label}</div>
                    <div className="provider-detail">{provider.detail}</div>
                  </div>
                  <span className={`badge ${provider.healthy ? 'badge-green' : 'badge-amber'}`}>
                    {provider.healthy ? 'ready' : 'config'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="two-col">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Activity Feed</div>
            <span className="badge badge-cyan">{ui.activityFeed.length} events</span>
          </div>
          <div className="feed">
            {ui.activityFeed.length === 0 ? (
              <div className="empty-copy">Connect your device and start a session to populate the operational feed.</div>
            ) : (
              ui.activityFeed.map((event) => (
                <div className="feed-item" key={event.id}>
                  <div className={`feed-dot tone-${event.tone}`} />
                  <div className="feed-text">
                    <strong>{event.title}</strong> {event.message}
                  </div>
                  <div className="feed-time">
                    {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Impulse Cognitive Interface</div>
            <span className={`badge ${providerStatuses.impulse.configured ? 'badge-violet' : 'badge-amber'}`}>
              {providerStatuses.impulse.configured ? 'online' : 'setup'}
            </span>
          </div>
          <p className="card-copy">
            Run a remote Impulse model over the latest captured feature window to compare external cognition inference with the local flow-state classifier.
          </p>
          <div className="stack-sm">
            <div className="metric-row">
              <span>Local state</span>
              <strong>{(eeg.flowState?.state ?? 'neutral').toUpperCase()}</strong>
            </div>
            <div className="metric-row">
              <span>Remote prediction</span>
              <strong>{inference ? `${inference.label} · ${(inference.confidence * 100).toFixed(1)}%` : 'Not requested'}</strong>
            </div>
            <div className="metric-row">
              <span>Feature window</span>
              <strong>{latestFeature ? new Date(latestFeature.timestamp).toLocaleTimeString() : 'No session data'}</strong>
            </div>
          </div>
          <div className="divider" />
          <Button variant="primary" size="sm" onClick={handleImpulseInference} loading={runningInference}>
            Run Impulse Inference
          </Button>
        </div>
      </section>
    </div>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: 'cyan' | 'green' | 'amber' | 'violet';
}> = ({ icon, label, value, detail, tone }) => (
  <div className="stat-card">
    <div className={`stat-icon tone-${tone}`}>{icon}</div>
    <div className="stat-label">{label}</div>
    <div className={`stat-num tone-${tone}`}>{value}</div>
    <div className="stat-change">{detail}</div>
  </div>
);
