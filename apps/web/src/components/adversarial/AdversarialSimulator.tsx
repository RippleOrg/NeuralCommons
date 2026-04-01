import React from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAdversarial } from '../../hooks/useAdversarial';
import type { AttackType } from '../../hooks/useAdversarial';
import { Card } from '../ui/Card';

const ATTACKS: { type: AttackType; label: string; description: string }[] = [
  {
    type: 'data_poisoning',
    label: 'Data Poisoning',
    description: 'Inject malicious gradients into the federation pool',
  },
  {
    type: 'model_inversion',
    label: 'Model Inversion',
    description: 'Attempt to reconstruct EEG signals from model outputs',
  },
  {
    type: 'gradient_leakage',
    label: 'Gradient Leakage',
    description: 'Deep Leakage from Gradients (DLG) attack',
  },
];

export const AdversarialSimulator: React.FC = () => {
  const { simulating, currentAttack, simulateAttack } = useAdversarial();

  return (
    <div className="space-y-3">
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.95rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: '4px',
        }}
      >
        Security Audits
      </h3>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
        Run live configuration audits against the current vault, privacy budget, and federation state
      </p>

      {ATTACKS.map((attack) => (
        <Card key={attack.type}>
          <div className="flex items-start justify-between gap-3">
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: currentAttack === attack.type ? 'var(--neural-red)' : 'var(--text-primary)',
                  marginBottom: '4px',
                }}
              >
                {attack.label}
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {attack.description}
              </p>
            </div>
            <Button
              variant={currentAttack === attack.type ? 'danger' : 'secondary'}
              size="sm"
              loading={simulating && currentAttack === attack.type}
              disabled={simulating}
              onClick={() => simulateAttack(attack.type)}
              aria-label={`Run ${attack.label} audit`}
            >
              <Zap size={10} className="mr-1" />
              Audit
            </Button>
          </div>

          {currentAttack === attack.type && simulating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2"
              style={{
                padding: '6px 8px',
                background: 'rgba(252,129,129,0.08)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6rem',
                color: 'var(--neural-red)',
              }}
            >
              Inspecting current system posture...
            </motion.div>
          )}
        </Card>
      ))}
    </div>
  );
};
