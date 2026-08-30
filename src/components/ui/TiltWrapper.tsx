'use client';
import type { ReactNode } from 'react';
import { useTilt } from '@/hooks/useTilt';

export default function TiltWrapper({
  children,
  className = '',
  maxTilt = 6,
}: { children: ReactNode; className?: string; maxTilt?: number }) {
  const { ref, style, handleMouseMove, handleMouseLeave } = useTilt(maxTilt);
  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={style}
      className={`tilt-card group relative transition-transform duration-150 ease-out ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background:
            'radial-gradient(240px circle at var(--glow-x, 50%) var(--glow-y, 50%), rgb(217 119 6 / 0.18), transparent 70%)',
        }}
      />
      {children}
    </div>
  );
}
