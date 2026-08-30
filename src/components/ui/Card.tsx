'use client';
import type { ReactNode } from 'react';
import { useTilt } from '@/hooks/useTilt';

interface CardProps {
  children: ReactNode;
  className?: string;
  glass?: boolean;
  hover?: boolean;
  tilt?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const paddingClasses = { sm: 'p-4', md: 'p-6', lg: 'p-8' };

export default function Card({
  children,
  className = '',
  glass = false,
  hover = false,
  tilt = true,
  padding = 'md',
  onClick,
}: CardProps) {
  const { ref, style, handleMouseMove, handleMouseLeave } = useTilt(6);
  const useTiltEffect = hover && tilt;

  return (
    <div
      ref={useTiltEffect ? ref : undefined}
      onMouseMove={useTiltEffect ? handleMouseMove : undefined}
      onMouseLeave={useTiltEffect ? handleMouseLeave : undefined}
      style={useTiltEffect ? style : undefined}
      onClick={onClick}
      className={`
        group relative rounded-2xl border border-border
        ${useTiltEffect ? 'tilt-card' : ''}
        ${glass ? 'glass' : 'bg-surface-elevated'}
        ${paddingClasses[padding]}
        ${hover ? 'hover:shadow-md hover:border-primary/40 hover:-translate-y-1 cursor-pointer' : 'shadow-sm'}
        transition-all duration-300 ease-smooth
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {useTiltEffect && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"
          style={{ background: 'radial-gradient(240px circle at var(--glow-x, 50%) var(--glow-y, 50%), rgb(217 119 6 / 0.15), transparent 70%)' }}
        />
      )}
      {children}
    </div>
  );
}

// ─── Sub-components for structured cards ───

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h3 className={`text-lg font-bold text-foreground tracking-tight ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-sm text-muted mt-1 leading-relaxed ${className}`}>{children}</p>;
}

export function CardContent({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function CardFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mt-4 pt-4 border-t border-border-subtle flex items-center gap-3 ${className}`}>{children}</div>;
}
