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
        className="group relative flex flex-col justify-between p-6 sm:p-8 rounded-3xl border border-border/40 glass hover:shadow-2xl hover:border-primary/50 hover:-translate-y-2 transition-all duration-500 overflow-hidden h-full"
      >
        {/* Subtle top gradient accent */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${gradient}`} />

        <div>
          {/* Top bar with icon & optional badge */}
          <div className="flex items-center justify-between gap-2 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-surface/50 backdrop-blur-sm border border-border/50 flex items-center justify-center text-3xl shadow-md group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
              {icon}
            </div>
            {badge && (
              <span className="px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-widest">
                {badge}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-xl sm:text-2xl font-display font-bold text-foreground group-hover:text-primary transition-colors tracking-tight uppercase">
            {title}
          </h3>

          {/* Description */}
          <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed font-serif">
            {description}
          </p>
        </div>

        {/* Bottom CTA Arrow */}
        <div className="mt-8 pt-6 border-t border-border/40 flex items-center justify-between text-xs font-bold text-primary uppercase tracking-widest">
          <span>{ctaText}</span>
          <span className="group-hover:translate-x-2 transition-transform duration-300">→</span>
        </div>
      </Link>
    </TiltWrapper>
  );
}
