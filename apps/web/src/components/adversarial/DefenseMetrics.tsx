import React from 'react';
import { useAdversarial } from '../../hooks/useAdversarial';
import { Card } from '../ui/Card';

export const DefenseMetrics: React.FC = () => {
  const { metrics } = useAdversarial();

  const cards = [
    {
      label: 'Attacks Detected',
      value: metrics.attacksDetected.toString(),
      color: 'var(--neural-amber)',
    },
    {
      label: 'Gradients Rejected',
      value: metrics.gradientsRejected.toString(),
      color: 'var(--neural-red)',
    },
    {
      label: 'Privacy Budget Protected',
      value: `${metrics.privacyBudgetProtected.toFixed(3)} ε`,
      color: 'var(--neural-green)',
    },
    {
      label: 'False Positive Rate',
      value: `${(metrics.falsePositiveRate * 100).toFixed(1)}%`,
      color: 'var(--neural-cyan)',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <Card key={card.label}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '6px',
            }}
          >
            {card.label}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.5rem',
              fontWeight: 700,
              color: card.color,
            }}
            aria-label={`${card.label}: ${card.value}`}
          >
            {card.value}
          </div>
        </Card>
      ))}
    </div>
  );
};
