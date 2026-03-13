import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, AlertCircle } from 'lucide-react';
import { useConsent } from '../../hooks/useConsent';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface ConsentManagerProps {
  isOpen: boolean;
  onClose: () => void;
  entryId: string;
}

export const ConsentManager: React.FC<ConsentManagerProps> = ({ isOpen, onClose, entryId }) => {
  const { grants, revokeConsent } = useConsent();
  const [revoking, setRevoking] = useState<string | null>(null);

  const entryGrants = grants.filter((g) => g.vaultEntryId === entryId);

  const handleRevoke = async (grantId: string) => {
    setRevoking(grantId);
    try {
      await revokeConsent(grantId, 'User-initiated revocation');
    } finally {
      setRevoking(null);
    }
  };

  const formatExpiry = (expiry: number) => {
    const ms = expiry * 1000 - Date.now();
    if (ms <= 0) return 'Expired';
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(5,5,8,0.6)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.aside
            role="dialog"
            aria-label="Consent Manager"
            aria-modal="true"
            style={{
              position: 'fixed',
              right: 0,
              top: 0,
              bottom: 0,
              width: '380px',
              background: 'var(--bg-elevated)',
              borderLeft: '1px solid var(--border-active)',
              zIndex: 50,
              overflowY: 'auto',
            }}
            initial={{ x: 380 }}
            animate={{ x: 0 }}
            exit={{ x: 380 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div
              className="flex items-center justify-between p-5"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1rem',
                  fontWeight: 700,
                }}
              >
                Consent Manager
              </h2>
              <button
                onClick={onClose}
                aria-label="Close consent manager"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              {entryGrants.length === 0 ? (
                <div
                  className="flex flex-col items-center py-8"
                  style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
                >
                  <AlertCircle size={24} className="mb-2" />
                  No active grants for this session.
                </div>
              ) : (
                <div className="space-y-3">
                  {entryGrants.map((grant) => (
                    <div
                      key={grant.grantId}
                      style={{
                        background: 'var(--bg-card)',
                        border: `1px solid ${grant.revoked ? 'rgba(252,129,129,0.2)' : 'var(--border-subtle)'}`,
                        borderRadius: 'var(--radius-md)',
                        padding: '12px',
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.65rem',
                            color: 'var(--text-primary)',
                            wordBreak: 'break-all',
                          }}
                        >
                          {grant.grantee.address.slice(0, 10)}...{grant.grantee.address.slice(-6)}
                        </span>
                        {grant.revoked ? (
                          <Badge variant="red">REVOKED</Badge>
                        ) : (
                          <Badge variant="green">ACTIVE</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1 mb-2">
                        <Clock size={10} color="var(--text-muted)" />
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.6rem',
                            color: 'var(--text-muted)',
                          }}
                        >
                          Expires: {formatExpiry(grant.expiry)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-3">
                        {grant.dataTypes.map((dt) => (
                          <Badge key={dt} variant="muted">{dt}</Badge>
                        ))}
                      </div>

                      {!grant.revoked && (
                        <Button
                          variant="danger"
                          size="sm"
                          loading={revoking === grant.grantId}
                          onClick={() => handleRevoke(grant.grantId)}
                          aria-label={`Revoke consent for ${grant.grantee.address}`}
                          style={{ width: '100%' }}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
