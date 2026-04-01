import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useEEG } from '../hooks/useEEG';
import { getProviderStatuses } from '../lib/runtime';
import { useUIStore } from '../store/uiStore';

export const Onboarding: React.FC = () => {
  const { connect, connecting, connected } = useEEG();
  const uiStore = useUIStore();
  const providers = getProviderStatuses();

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      uiStore.addToast(String(error), 'error');
    }
  };

  return (
    <div className="onboarding-shell">
      <div className="onboarding-card">
        <div className="sb-hex onboarding-mark">NC</div>
        <h1 className="onboard-title">NeuralCommons</h1>
        <p className="onboard-desc">
          Connect a Muse-compatible EEG device, record encrypted sessions, permission access with Lit envelopes, and coordinate federated rounds from a production-ready control plane.
        </p>

        <div className="stack-sm">
          <div className="provider-row">
            <div>
              <div className="provider-label">EEG capture</div>
              <div className="provider-detail">Web Bluetooth connection for Muse-compatible hardware</div>
            </div>
            <Button variant="primary" size="sm" onClick={handleConnect} loading={connecting}>
              {connected ? 'Connected' : 'Connect device'}
            </Button>
          </div>

          {Object.values(providers).map((provider) => (
            <div key={provider.label} className="provider-row">
              <div>
                <div className="provider-label">{provider.label}</div>
                <div className="provider-detail">{provider.detail}</div>
              </div>
              <span className={`badge ${provider.healthy ? 'badge-green' : 'badge-amber'}`}>
                {provider.healthy ? 'ready' : 'setup'}
              </span>
            </div>
          ))}
        </div>

        <div className="divider" />
        <Link to="/dashboard">
          <Button variant="ghost">Enter Console</Button>
        </Link>
      </div>
    </div>
  );
};
