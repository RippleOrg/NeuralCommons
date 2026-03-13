import React from 'react';
import { motion } from 'framer-motion';
import { AdversarialSimulator } from '../components/adversarial/AdversarialSimulator';
import { AttackVisualizer } from '../components/adversarial/AttackVisualizer';
import { DefenseMetrics } from '../components/adversarial/DefenseMetrics';
import { Card } from '../components/ui/Card';
import { useAdversarial } from '../hooks/useAdversarial';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export const Adversarial: React.FC = () => {
  const { logs } = useAdversarial();

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="space-y-4"
    >
      {/* Defense metrics */}
      <DefenseMetrics />

      {/* Simulator + Visualizer */}
      <div className="grid grid-cols-2 gap-4">
        <AdversarialSimulator />
        <Card>
          <AttackVisualizer />
        </Card>
      </div>

      {/* Terminal log */}
      <Card>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '12px',
          }}
        >
          Detection Log
        </div>
        <div
          className="terminal-text"
          aria-live="polite"
          aria-label="Attack detection log"
          style={{ maxHeight: '280px' }}
        >
          {logs.length === 0 ? (
            <span style={{ color: 'var(--text-muted)' }}>
              Awaiting attack simulation...
            </span>
          ) : (
            logs.slice().reverse().map((log, i) => (
              <div
                key={i}
                className={`log-${log.level === 'error' ? 'error' : log.level === 'warn' ? 'warn' : log.level === 'success' ? 'info' : 'info'}`}
                style={{
                  color: log.level === 'error' ? 'var(--neural-red)'
                    : log.level === 'warn' ? 'var(--neural-amber)'
                    : log.level === 'success' ? 'var(--neural-green)'
                    : 'var(--neural-cyan)',
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </span>{' '}
                {log.message}
              </div>
            ))
          )}
        </div>
      </Card>
    </motion.div>
  );
};
