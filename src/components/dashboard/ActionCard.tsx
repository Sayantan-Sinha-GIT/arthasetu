'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import TiltWrapper from '@/components/ui/TiltWrapper';

interface ActionCardProps {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  badge?: string;
  badgeVariant?: 'primary' | 'secondary' | 'success';
  gradient: string;
  ctaText?: string;
}

export default function ActionCard({
  href,
  title,
  description,
  icon,
  badge,
  gradient,
  ctaText = 'Get Started',
}: ActionCardProps) {
  return (
    <TiltWrapper maxTilt={5} className="h-full">
      <Link
        href={href}
        className="group relative flex flex-col justify-between p-6 rounded-3xl border border-border bg-surface-elevated hover:shadow-xl hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 overflow-hidden h-full"
      >
        {/* Subtle top gradient accent */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${gradient}`} />

        <div>
          {/* Top bar with icon & optional badge */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform duration-300">
              {icon}
            </div>
            {badge && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-saffron-100 dark:bg-saffron-900/30 text-saffron-800 dark:text-saffron-300 border border-saffron-300 dark:border-saffron-700">
                {badge}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>

          {/* Description */}
          <p className="mt-2 text-sm text-muted leading-relaxed">
            {description}
          </p>
        </div>

        {/* Bottom CTA Arrow */}
        <div className="mt-6 pt-4 border-t border-border-subtle flex items-center justify-between text-xs font-semibold text-primary">
          <span>{ctaText}</span>
          <span className="group-hover:translate-x-1 transition-transform">→</span>
        </div>
      </Link>
    </TiltWrapper>
  );
}
