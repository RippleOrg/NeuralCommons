import React from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '../ui/Button';
import { useEEG } from '../../hooks/useEEG';
import { useUIStore } from '../../store/uiStore';
import { getRuntimeConfig } from '../../lib/runtime';
import { WalletButton } from '../wallet/WalletButton';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/vault': 'Neural Vault',
  '/federation': 'Federated Learning',
  '/governance': 'Governance',
  '/adversarial': 'Security Lab',
  '/ops': 'Operations',
  '/onboarding': 'Onboarding',
};

export const Header: React.FC = () => {
  const location = useLocation();
  const { connected, connect: connectEEG, connecting, currentSession, startSession, endSession } = useEEG();
  const uiStore = useUIStore();
  const config = getRuntimeConfig();

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'NeuralCommons';

  const handleConnectEEG = async () => {
    try {
      await connectEEG();
      uiStore.logActivity({
        title: 'EEG connected',
        message: 'Muse-compatible Web Bluetooth stream connected.',
        tone: 'success',
      });
    } catch (error) {
      uiStore.addToast(String(error), 'error');
    }
  };

  const toggleSession = () => {
    if (currentSession) {
      const ended = endSession();
      if (ended) {
        uiStore.logActivity({
          title: 'Session captured',
          message: `Recorded ${ended.features.length} feature windows ready for encryption.`,
          tone: 'success',
        });
      }
      return;
    }

    startSession();
    uiStore.logActivity({
      title: 'Session started',
      message: 'Live EEG capture is now recording feature windows.',
      tone: 'info',
    });
  };

  return (
    <header className="app-header">
      <div className="header-title">{pageTitle}</div>
      <div className="header-actions">
        <div className="ncd-pill">NCD v0.1</div>
        <div className="header-badge">
          <div className="dot" />
          {connected ? 'EEG live · 250Hz' : `${config.storageMode === 'storacha' ? 'Storacha' : 'Local'} vault`}
        </div>
        {!connected ? (
          <Button variant="ghost" size="sm" onClick={handleConnectEEG} loading={connecting}>
            Connect Muse 2
          </Button>
        ) : (
          <Button variant={currentSession ? 'danger' : 'primary'} size="sm" onClick={toggleSession}>
            {currentSession ? 'Stop Session' : 'Start Session'}
          </Button>
        )}
        <WalletButton />
      </div>
    </header>
  );
};
