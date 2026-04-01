import React from 'react';
import { motion } from 'framer-motion';
import { Shield, ExternalLink, Users } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { VaultEntry } from '../../types/vault';

interface VaultCardProps {
  entry: VaultEntry;
  onManageConsent: (entryId: string) => void;
}

export const VaultCard: React.FC<VaultCardProps> = ({ entry, onManageConsent }) => {
  const duration = entry.duration > 0
    ? `${Math.round(entry.duration / 1000)}s`
    : 'In progress';

  const date = new Date(entry.timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const shortCID = `${entry.ipfsCID.slice(0, 12)}...${entry.ipfsCID.slice(-6)}`;

  const stateColors: Record<string, string> = {
    flow: 'cyan',
    focus: 'teal',
    relaxed: 'green',
    stressed: 'red',
    neutral: 'muted',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <Card>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield size={14} color="var(--neural-cyan)" />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
                color: 'var(--text-muted)',
              }}
            >
              {date}
            </span>
          </div>
          <Badge
            variant={(stateColors[entry.flowState] ?? 'muted') as 'cyan' | 'green' | 'amber' | 'red' | 'violet' | 'teal' | 'muted'}
          >
            {entry.flowState.toUpperCase()}
          </Badge>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex justify-between">
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              Duration
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {duration}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              Samples
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {entry.sampleCount.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              IPFS CID
            </span>
            <a
              href={entry.storageUri}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1"
              style={{ fontSize: '0.65rem', color: 'var(--neural-cyan)', fontFamily: 'var(--font-mono)' }}
              aria-label={`View ${entry.ipfsCID} in storage`}
            >
              {shortCID}
              <ExternalLink size={10} />
            </a>
          </div>
          <div className="flex justify-between">
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              Storage
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {entry.storageProvider}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              Active Grants
            </span>
            <div className="flex items-center gap-1">
              <Users size={10} color="var(--neural-amber)" />
              <span style={{ fontSize: '0.7rem', color: 'var(--neural-amber)', fontFamily: 'var(--font-mono)' }}>
                {entry.grantCount}
              </span>
            </div>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => onManageConsent(entry.id)}
          aria-label={`Manage consent for session ${entry.id}`}
          style={{ width: '100%' }}
        >
          Manage Consent
        </Button>
      </Card>
    </motion.div>
  );
};
