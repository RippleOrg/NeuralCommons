import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  onClick?: () => void;
  role?: string;
  tabIndex?: number;
}

export const Card: React.FC<CardProps> = ({ children, className, glow, onClick, role, tabIndex }) => {
  return (
    <motion.div
      className={clsx('nc-card p-4', { 'glow-pulse': glow }, className)}
      whileHover={{ scale: 1.01, borderColor: 'var(--border-glow)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={onClick}
      role={role}
      tabIndex={tabIndex}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      {children}
    </motion.div>
  );
};
