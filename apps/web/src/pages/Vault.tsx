import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Lock } from 'lucide-react';
import { VaultCard } from '../components/vault/VaultCard';
import { ConsentManager } from '../components/vault/ConsentManager';
import { RevocationPanel } from '../components/vault/RevocationPanel';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useConsent } from '../hooks/useConsent';
import { useEEGStore } from '../store/eegStore';
import { useUIStore } from '../store/uiStore';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export const Vault: React.FC = () => {
  const { entries, createVaultEntry } = useConsent();
  const { endSession, currentSession } = useEEGStore();
  const uiStore = useUIStore();
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [showNewSession, setShowNewSession] = useState(false);
  const [pinning, setPinning] = useState(false);

  const handleNewSession = async () => {
    setPinning(true);
    try {
      let session = currentSession;
      if (!session) {
        // Create a mock session if none active
        session = {
          id: crypto.randomUUID(),
          startTime: Date.now() - 30000,
          endTime: Date.now(),
          sampleCount: 7500,
          features: [],
          dominantState: 'neutral',
          encrypted: false,
        };
      } else {
        endSession();
      }
      await createVaultEntry(session);
      setShowNewSession(false);
    } catch (error) {
      uiStore.addToast(`Failed to create vault entry: ${String(error)}`, 'error');
    } finally {
      setPinning(false);
    }
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Encrypted Neural Sessions
          </h2>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            {entries.length} sessions stored on IPFS
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowNewSession(true)}
          aria-label="Create new encrypted session"
        >
          <Plus size={12} className="mr-1" />
          New Session
        </Button>
      </div>

      {/* Vault entries */}
      {entries.length === 0 ? (
        <div
          className="flex flex-col items-center py-16"
          style={{ color: 'var(--text-muted)' }}
        >
          <Lock size={40} className="mb-4" style={{ opacity: 0.3 }} />
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
            No sessions yet. Connect your EEG device and start a session.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {entries.map((entry) => (
            <VaultCard
              key={entry.id}
              entry={entry}
              onManageConsent={setSelectedEntryId}
            />
          ))}
        </div>
      )}

      {/* Revocation panel */}
      <RevocationPanel />

      {/* Consent slide-out panel */}
      {selectedEntryId && (
        <ConsentManager
          isOpen={!!selectedEntryId}
          onClose={() => setSelectedEntryId(null)}
          entryId={selectedEntryId}
        />
      )}

      {/* New session modal */}
      <Modal
        isOpen={showNewSession}
        onClose={() => setShowNewSession(false)}
        title="Encrypt & Store Session"
      >
        <div className="space-y-4">
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Your EEG session will be encrypted with AES-GCM-256 and stored on IPFS. The encryption key stays in your browser and is never transmitted.
          </p>
          <div
            style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              color: 'var(--text-secondary)',
            }}
          >
            <div>Encryption: AES-GCM-256</div>
            <div>Key storage: In-memory only</div>
            <div>Network: IPFS (decentralized)</div>
          </div>
          <Button
            variant="primary"
            onClick={handleNewSession}
            loading={pinning}
            style={{ width: '100%' }}
            aria-label="Encrypt and pin session to IPFS"
          >
            <Lock size={12} className="mr-1" />
            Encrypt &amp; Store
          </Button>
        </div>
      </Modal>
    </motion.div>
  );
};
