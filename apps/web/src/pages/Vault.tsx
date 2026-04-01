import React, { useMemo, useState } from 'react';
import { Lock, Upload } from 'lucide-react';
import { VaultCard } from '../components/vault/VaultCard';
import { ConsentManager } from '../components/vault/ConsentManager';
import { RevocationPanel } from '../components/vault/RevocationPanel';
import { Button } from '../components/ui/Button';
import { useConsent } from '../hooks/useConsent';
import { useEEGStore } from '../store/eegStore';
import { getProviderStatuses } from '../lib/runtime';

export const Vault: React.FC = () => {
  const { entries, createVaultEntry } = useConsent();
  const sessions = useEEGStore((state) => state.sessions);
  const currentSession = useEEGStore((state) => state.currentSession);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [sealing, setSealing] = useState(false);

  const sealableSession = useMemo(
    () => sessions.find((session) => session.endTime && !entries.some((entry) => entry.sessionId === session.id)),
    [entries, sessions]
  );

  const handleSealLatestSession = async () => {
    if (!sealableSession) {
      return;
    }

    try {
      setSealing(true);
      await createVaultEntry(sealableSession);
    } finally {
      setSealing(false);
    }
  };

  const storageStatus = getProviderStatuses().storage;

  return (
    <div className="page-grid">
      <section className="section-head">
        <div>
          <h2 className="page-title">Neural Vault</h2>
          <p className="page-subtitle">
            Encrypted neural session bundles with consent manifests, revocation records, and long-term storage receipts.
          </p>
        </div>
        <div className="header-actions">
          <div className={`badge ${storageStatus.healthy ? 'badge-green' : 'badge-amber'}`}>
            {storageStatus.label}
          </div>
          <Button variant="primary" size="sm" onClick={handleSealLatestSession} loading={sealing} disabled={!sealableSession}>
            <Upload size={12} />
            Seal Latest Session
          </Button>
        </div>
      </section>

      <section className="two-col">
        <div>
          <div className="section-label">Stored Sessions ({entries.length})</div>
          {entries.length === 0 ? (
            <div className="card empty-card">
              <Lock size={40} />
              <p>No encrypted sessions yet. Connect a Muse device, record a session, then seal it into the vault.</p>
              {currentSession && <span className="empty-footnote">A session is recording right now. Stop it from the header when you are ready to seal.</span>}
            </div>
          ) : (
            <div className="vault-grid">
              {entries.map((entry) => (
                <VaultCard key={entry.id} entry={entry} onManageConsent={setSelectedEntryId} />
              ))}
            </div>
          )}
        </div>

        <div className="column-stack">
          <div className="card">
            <div className="card-header">
              <div className="card-title">Vault Posture</div>
            </div>
            <div className="stack-sm">
              <div className="metric-row">
                <span>Unsealed captured sessions</span>
                <strong>{sealableSession ? 1 : 0}</strong>
              </div>
              <div className="metric-row">
                <span>Storage target</span>
                <strong>{storageStatus.label}</strong>
              </div>
              <div className="metric-row">
                <span>Consent manifests</span>
                <strong>{entries.length}</strong>
              </div>
            </div>
          </div>
          <RevocationPanel />
        </div>
      </section>

      {selectedEntryId && (
        <ConsentManager
          isOpen={Boolean(selectedEntryId)}
          onClose={() => setSelectedEntryId(null)}
          entryId={selectedEntryId}
        />
      )}
    </div>
  );
};
