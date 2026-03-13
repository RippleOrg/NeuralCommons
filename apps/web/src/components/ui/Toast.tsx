import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import type { Toast as ToastType } from '../../store/uiStore';

const ICONS = {
  success: <CheckCircle size={16} color="var(--neural-green)" />,
  error: <AlertCircle size={16} color="var(--neural-red)" />,
  warning: <AlertTriangle size={16} color="var(--neural-amber)" />,
  info: <Info size={16} color="var(--neural-cyan)" />,
};

const BORDER_COLORS = {
  success: 'var(--neural-green)',
  error: 'var(--neural-red)',
  warning: 'var(--neural-amber)',
  info: 'var(--neural-cyan)',
};

const ToastItem: React.FC<{ toast: ToastType; onRemove: (id: string) => void }> = ({
  toast,
  onRemove,
}) => (
  <motion.div
    layout
    initial={{ opacity: 0, x: 50, scale: 0.95 }}
    animate={{ opacity: 1, x: 0, scale: 1 }}
    exit={{ opacity: 0, x: 50, scale: 0.95 }}
    style={{
      background: 'var(--bg-elevated)',
      border: `1px solid ${BORDER_COLORS[toast.type]}`,
      borderRadius: 'var(--radius-md)',
      padding: '12px 16px',
      minWidth: '280px',
      maxWidth: '380px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    }}
  >
    <div className="flex items-start gap-3">
      {ICONS[toast.type]}
      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          color: 'var(--text-primary)',
          flex: 1,
          lineHeight: 1.4,
        }}
      >
        {toast.message}
      </p>
      <button
        onClick={() => onRemove(toast.id)}
        aria-label="Dismiss notification"
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: 0,
          flexShrink: 0,
        }}
      >
        <X size={14} />
      </button>
    </div>
  </motion.div>
);

export const Toast: React.FC = () => {
  const { activeToasts, removeToast } = useUIStore();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        alignItems: 'flex-end',
      }}
      aria-live="polite"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {activeToasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );
};
