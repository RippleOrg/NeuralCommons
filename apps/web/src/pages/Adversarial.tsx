import React from 'react';
import { AdversarialSimulator } from '../components/adversarial/AdversarialSimulator';
import { AttackVisualizer } from '../components/adversarial/AttackVisualizer';
import { DefenseMetrics } from '../components/adversarial/DefenseMetrics';
import { useAdversarial } from '../hooks/useAdversarial';

export const Adversarial: React.FC = () => {
  const { logs } = useAdversarial();

  return (
    <div className="page-grid">
      <section className="section-head">
        <div>
          <h2 className="page-title">Security Lab</h2>
          <p className="page-subtitle">
            Audit model inversion exposure, contributor concentration, and privacy-budget drift against the live runtime configuration.
          </p>
        </div>
      </section>

      <DefenseMetrics />

      <section className="two-col">
        <div className="card">
          <AdversarialSimulator />
        </div>
        <div className="card">
          <AttackVisualizer />
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div className="card-title">Audit Log</div>
        </div>
        <div className="terminal-text" style={{ maxHeight: '280px' }}>
          {logs.length === 0 ? (
            <span style={{ color: 'var(--text-muted)' }}>
              Run an audit to inspect the current configuration.
            </span>
          ) : (
            logs
              .slice()
              .reverse()
              .map((log, index) => (
                <div key={`${log.timestamp}-${index}`} className={`log-${log.level === 'error' ? 'error' : log.level === 'warn' ? 'warn' : 'info'}`}>
                  <span style={{ color: 'var(--text-muted)' }}>
                    [{new Date(log.timestamp).toLocaleTimeString()}]
                  </span>{' '}
                  {log.message}
                </div>
              ))
          )}
        </div>
      </section>
    </div>
  );
};
