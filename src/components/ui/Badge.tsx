import type { ReactNode } from 'react';

type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'central' | 'state';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  size?: 'sm' | 'md';
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-surface border-border text-foreground font-semibold dark:text-slate-100',
  primary: 'bg-saffron-100 border-saffron-400 text-saffron-900 font-semibold dark:bg-saffron-950/60 dark:border-saffron-600 dark:text-saffron-200',
  secondary: 'bg-navy-100 border-navy-400 text-navy-900 font-semibold dark:bg-navy-950/60 dark:border-navy-600 dark:text-navy-200',
  success: 'bg-emerald-100 border-emerald-400 text-emerald-900 font-semibold dark:bg-emerald-950/60 dark:border-emerald-600 dark:text-emerald-200',
  warning: 'bg-amber-100 border-amber-400 text-amber-900 font-semibold dark:bg-amber-950/60 dark:border-amber-600 dark:text-amber-200',
  danger: 'bg-red-100 border-red-400 text-red-900 font-semibold dark:bg-red-950/60 dark:border-red-600 dark:text-red-200',
  info: 'bg-blue-100 border-blue-400 text-blue-900 font-semibold dark:bg-blue-950/60 dark:border-blue-600 dark:text-blue-200',
  central: 'bg-navy-100 border-navy-400 text-navy-900 font-semibold dark:bg-navy-950/60 dark:border-navy-500 dark:text-navy-200',
  state: 'bg-saffron-100 border-saffron-400 text-saffron-900 font-semibold dark:bg-saffron-950/60 dark:border-saffron-500 dark:text-saffron-200',
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

export default function Badge({
  children,
  variant = 'default',
  className = '',
  size = 'sm',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 font-medium rounded-full border
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
