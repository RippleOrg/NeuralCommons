import React from 'react';
import { clsx } from 'clsx';

type BadgeVariant = 'cyan' | 'green' | 'amber' | 'red' | 'violet' | 'teal' | 'muted';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const VARIANT_STYLES: Record<BadgeVariant, React.CSSProperties> = {
  cyan: { background: 'rgba(99,179,237,0.15)', color: 'var(--neural-cyan)', border: '1px solid rgba(99,179,237,0.3)' },
  green: { background: 'rgba(104,211,145,0.15)', color: 'var(--neural-green)', border: '1px solid rgba(104,211,145,0.3)' },
  amber: { background: 'rgba(246,173,85,0.15)', color: 'var(--neural-amber)', border: '1px solid rgba(246,173,85,0.3)' },
  red: { background: 'rgba(252,129,129,0.15)', color: 'var(--neural-red)', border: '1px solid rgba(252,129,129,0.3)' },
  violet: { background: 'rgba(183,148,244,0.15)', color: 'var(--neural-violet)', border: '1px solid rgba(183,148,244,0.3)' },
  teal: { background: 'rgba(79,209,197,0.15)', color: 'var(--neural-teal)', border: '1px solid rgba(79,209,197,0.3)' },
  muted: { background: 'rgba(74,85,104,0.2)', color: 'var(--text-muted)', border: '1px solid rgba(74,85,104,0.3)' },
};

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'cyan', className }) => {
  return (
    <span
      className={clsx('nc-badge', className)}
      style={VARIANT_STYLES[variant]}
    >
      {children}
    </span>
  );
};
