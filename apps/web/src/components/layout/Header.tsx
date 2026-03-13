import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import { useEEGStore } from '../../store/eegStore';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/vault': 'Neural Vault',
  '/federation': 'Federated Learning',
  '/governance': 'Data DAO',
  '/adversarial': 'Adversarial Lab',
  '/settings': 'Settings',
  '/onboarding': 'Getting Started',
};

export const Header: React.FC = () => {
  const location = useLocation();
  const { displayName, isConnected, connect } = useWallet();
  const { connected: eegConnected } = useEEGStore();

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'NeuralCommons';

  return (
    <header
      style={{
        height: '64px',
        background: 'var(--bg-deep)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        flexShrink: 0,
      }}
    >
      {/* Left: Page title */}
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.125rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
        }}
      >
        {pageTitle}
      </h1>

      {/* Right: Status + wallet */}
      <div className="flex items-center gap-4">
        {eegConnected && (
          <Badge variant="green" aria-label="EEG device connected">
            ● EEG LIVE
          </Badge>
        )}

        <button
          aria-label="Notifications"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <Bell size={18} />
        </button>

        {isConnected ? (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              color: 'var(--neural-cyan)',
              padding: '4px 10px',
              border: '1px solid var(--border-active)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {displayName}
          </div>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={connect}
            aria-label="Connect wallet"
          >
            Connect Wallet
          </Button>
        )}
      </div>
    </header>
  );
};
