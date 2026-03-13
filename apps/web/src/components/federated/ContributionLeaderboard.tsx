import React from 'react';
import { useFederated } from '../../hooks/useFederated';
import { Card } from '../ui/Card';

export const ContributionLeaderboard: React.FC = () => {
  const { contributions, peers } = useFederated();

  const entries = Array.from(contributions.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const allPeers = [...new Set([...peers, ...entries.map(([id]) => id)])].slice(0, 10);

  return (
    <div>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.9rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: '12px',
        }}
      >
        Contribution Leaderboard
      </h3>

      {allPeers.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          No peers connected yet.
        </p>
      ) : (
        <div className="space-y-2">
          {allPeers.map((peerId, i) => {
            const score = contributions.get(peerId) ?? 0;
            const maxScore = Math.max(...Array.from(contributions.values()), 0.1);
            const pct = Math.min(100, (score / maxScore) * 100);
            const shortId = peerId.slice(0, 8).toUpperCase();

            return (
              <div
                key={peerId}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.65rem',
                    color: 'var(--text-muted)',
                    width: '20px',
                    flexShrink: 0,
                  }}
                >
                  #{i + 1}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.7rem',
                    color: 'var(--neural-cyan)',
                    width: '80px',
                    flexShrink: 0,
                  }}
                >
                  {shortId}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: '4px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: 'var(--neural-teal)',
                      borderRadius: '2px',
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.6rem',
                    color: 'var(--text-secondary)',
                    width: '40px',
                    textAlign: 'right',
                    flexShrink: 0,
                  }}
                >
                  {score.toFixed(1)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
