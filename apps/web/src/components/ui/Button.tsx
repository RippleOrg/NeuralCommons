import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}) => {
  const classes = clsx(
    'nc-btn',
    {
      'nc-btn-primary': variant === 'primary',
      'nc-btn-danger': variant === 'danger',
      'opacity-50 pointer-events-none': disabled || loading,
      'text-xs px-3 py-1': size === 'sm',
      'text-sm px-5 py-2.5': size === 'lg',
    },
    className
  );

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="animate-spin inline-block w-3 h-3 border border-current border-t-transparent rounded-full" />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
};
