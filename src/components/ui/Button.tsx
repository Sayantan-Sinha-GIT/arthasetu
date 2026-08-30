'use client';

import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { useMagnetic } from '@/hooks/useMagnetic';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  isLoading?: boolean;
  icon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
  secondary:
    'bg-secondary text-secondary-foreground hover:bg-secondary-hover shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
  ghost:
    'bg-transparent text-foreground hover:bg-surface active:bg-surface-elevated active:scale-[0.98]',
  danger:
    'bg-danger text-white hover:bg-red-600 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
  outline:
    'bg-transparent text-foreground border border-border hover:bg-surface hover:border-primary/50 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-7 py-3.5 text-base rounded-xl gap-2.5',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  isLoading = false,
  icon,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const isPrimaryLg = variant === 'primary' && size === 'lg';
  const isPrimary = variant === 'primary';
  const magnetic = useMagnetic(isPrimaryLg ? 0.4 : 0.25);
  const isMagnetic = isPrimary;

  return (
    <button
      ref={isMagnetic ? magnetic.ref : undefined}
      onMouseMove={isMagnetic ? magnetic.handleMouseMove : undefined}
      onMouseLeave={isMagnetic ? magnetic.handleMouseLeave : undefined}
      className={`
        inline-flex items-center justify-center font-semibold
        transition-all duration-200 ease-smooth
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
