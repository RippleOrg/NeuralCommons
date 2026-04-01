import React from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, Brain, Lock, Network, ShieldAlert, SlidersHorizontal } from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import { useEEGStore } from '../../store/eegStore';
import { useVaultStore } from '../../store/vaultStore';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: Brain },
  { path: '/vault', label: 'Neural Vault', icon: Lock },
  { path: '/federation', label: 'Federation', icon: Network },
  { path: '/governance', label: 'Governance', icon: Activity },
  { path: '/adversarial', label: 'Security Lab', icon: ShieldAlert },
  { path: '/ops', label: 'Operations', icon: SlidersHorizontal },
];

export const Sidebar: React.FC = () => {
  const { connected } = useEEGStore();
  const { peerCount, entries } = useVaultStore();
  const { displayName } = useWallet();

  return (
    <aside className="sidebar">
      <div className="sb-logo">
        <div className="sb-hex">NC</div>
        <div className="sb-brand">
          NeuralCommons
          <span>Cognitive Sovereignty</span>
        </div>
      </div>

      <nav className="sb-nav" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon className="nav-icon" size={16} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="sb-bottom">
        <div className="sb-status">
          <div className={`status-dot ${connected ? 'active' : 'inactive'}`} />
          <span>{connected ? 'EEG live' : 'EEG offline'}</span>
        </div>
        <div className="sb-wallet">{displayName ?? 'Connect wallet'}</div>
        <div className="sb-peers">
          Vault entries: <span>{entries.length}</span> · IPFS peers: <span>{peerCount}</span>
        </div>
      </div>
    </aside>
  );
};
