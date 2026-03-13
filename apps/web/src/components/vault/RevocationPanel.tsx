import React from 'react';
import { useConsent } from '../../hooks/useConsent';

export const RevocationPanel: React.FC = () => {
  const { revocations } = useConsent();

  return (
    <div>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.9rem',
          fontWeight: 700,
          marginBottom: '12px',
          color: 'var(--text-primary)',
        }}
      >
        Revocation History
      </h3>

      {revocations.length === 0 ? (
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
          }}
        >
          No revocations recorded.
        </p>
      ) : (
        <div className="space-y-2">
          {revocations.map((record, i) => (
            <div
              key={i}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid rgba(252,129,129,0.15)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  color: 'var(--neural-red)',
                  marginBottom: '6px',
                }}
              >
                REVOKED — {new Date(record.revokedAt).toLocaleString()}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.6rem',
                  color: 'var(--text-muted)',
                  wordBreak: 'break-all',
                  marginBottom: '4px',
                }}
              >
                Grant: {record.grantId.slice(0, 20)}...
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.55rem',
                  color: 'var(--text-muted)',
                  wordBreak: 'break-all',
                }}
              >
                Key Destruction Proof: {record.keyDestructionProof.slice(0, 24)}...
              </div>
              {record.reason && (
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.6rem',
                    color: 'var(--text-secondary)',
                    marginTop: '4px',
                  }}
                >
                  Reason: {record.reason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
