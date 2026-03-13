import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Brain,
  Shield,
  Network,
  Vote,
  AlertTriangle,
  Settings,
} from 'lucide-react';
import { useEEGStore } from '../../store/eegStore';
import { useVaultStore } from '../../store/vaultStore';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: Brain },
  { path: '/vault', label: 'Vault', icon: Shield },
  { path: '/federation', label: 'Federation', icon: Network },
  { path: '/governance', label: 'Governance', icon: Vote },
  { path: '/adversarial', label: 'Adversarial', icon: AlertTriangle },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { connected } = useEEGStore();
  const { peerCount } = useVaultStore();

  return (
    <aside
      style={{
        width: '240px',
        minHeight: '100vh',
        background: 'var(--bg-deep)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 p-5"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <HexLogo />
        <div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: '0.95rem',
              color: 'var(--neural-cyan)',
              letterSpacing: '-0.02em',
            }}
          >
            NeuralCommons
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.55rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
            }}
          >
            v0.1.0 — testnet
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.path}
            {...item}
            isActive={location.pathname === item.path || location.pathname.startsWith(item.path + '/')}
          />
        ))}
      </nav>

      {/* Footer status */}
      <div
        className="p-4 space-y-2"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className={`status-dot ${connected ? 'active' : 'inactive'}`}
            role="status"
            aria-label={connected ? 'EEG connected' : 'EEG disconnected'}
          />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              color: connected ? 'var(--neural-green)' : 'var(--text-muted)',
            }}
          >
            {connected ? 'EEG ACTIVE' : 'EEG OFFLINE'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="status-dot"
            style={{ background: peerCount > 0 ? 'var(--neural-teal)' : 'var(--text-muted)' }}
          />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              color: 'var(--text-muted)',
            }}
          >
            {peerCount} IPFS PEERS
          </span>
        </div>
      </div>
    </aside>
  );
};

interface NavItemProps {
  path: string;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ path, label, icon: Icon, isActive }) => (
  <NavLink
    to={path}
    aria-label={label}
    style={({ isActive: linkActive }) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '10px 20px',
      textDecoration: 'none',
      color: (linkActive || isActive) ? 'var(--text-accent)' : 'var(--text-secondary)',
      background: (linkActive || isActive) ? 'var(--bg-elevated)' : 'transparent',
      borderLeft: `3px solid ${(linkActive || isActive) ? 'var(--neural-cyan)' : 'transparent'}`,
      transition: 'all 0.15s ease',
    })}
  >
    <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.72rem',
        fontWeight: isActive ? 700 : 400,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </span>
  </NavLink>
);

const HexLogo: React.FC = () => (
  <motion.div whileHover={{ scale: 1.1 }} style={{ width: 36, height: 36, flexShrink: 0 }}>
    <svg viewBox="0 0 40 40" width="36" height="36" aria-hidden="true">
      <polygon
        points="20,2 37,11 37,29 20,38 3,29 3,11"
        fill="none"
        stroke="var(--neural-cyan)"
        strokeWidth="2"
        style={{ filter: 'drop-shadow(0 0 4px var(--neural-cyan))' }}
      />
      <text
        x="20"
        y="26"
        textAnchor="middle"
        fill="var(--neural-cyan)"
        fontFamily="Syne, sans-serif"
        fontSize="13"
        fontWeight="800"
      >
        NC
      </text>
    </svg>
  </motion.div>
);
