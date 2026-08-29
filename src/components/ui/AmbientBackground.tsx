'use client';

interface AmbientBackgroundProps {
  className?: string;
  variant?: 'hero' | 'card' | 'subtle';
}

/**
 * Reusable Ambient Atmosphere Background Component
 *
 * Renders 3 softly drifting, blurred gradient orbs behind content sections.
 * - Uses keyframes from globals.css (`animate-ambient-drift`, `animate-ambient-drift-slow`).
 * - Low opacity (8-15%) ensures zero impact on WCAG AA contrast or text legibility.
 * - Reduced motion override in globals.css automatically freezes orbs in place.
 * - Non-interactive (`pointer-events-none`, `absolute inset-0`).
 */
export default function AmbientBackground({
  className = '',
  variant = 'hero',
}: AmbientBackgroundProps) {
  if (variant === 'card') {
    return (
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 -z-0 overflow-hidden rounded-3xl ${className}`}
      >
        <div className="absolute top-0 right-0 w-72 h-72 bg-saffron-500/15 rounded-full blur-3xl animate-ambient-drift" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-blue-500/15 rounded-full blur-2xl animate-ambient-drift-slow" />
      </div>
    );
  }

  if (variant === 'subtle') {
    return (
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}
      >
        <div className="absolute top-10 left-10 w-60 h-60 bg-saffron-400/8 rounded-full blur-3xl animate-ambient-drift" />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-navy-500/8 rounded-full blur-3xl animate-ambient-drift-slow" />
      </div>
    );
  }

  // Default 'hero' variant
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}
    >
      <div className="absolute top-16 left-8 w-72 h-72 sm:w-96 sm:h-96 bg-saffron-400/10 dark:bg-saffron-500/10 rounded-full blur-3xl animate-ambient-drift" />
      <div className="absolute bottom-16 right-8 w-80 h-80 sm:w-96 sm:h-96 bg-navy-500/10 dark:bg-navy-400/10 rounded-full blur-3xl animate-ambient-drift-slow" />
      <div className="absolute top-36 right-1/3 w-48 h-48 sm:w-64 sm:h-64 bg-saffron-300/8 dark:bg-saffron-300/5 rounded-full blur-2xl animate-ambient-drift" />
    </div>
  );
}
