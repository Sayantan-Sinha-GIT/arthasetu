'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import Logo from '@/components/ui/Logo';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border bg-surface-elevated/90 backdrop-blur-md mt-auto transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Top Row: App Branding & Mission Note */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border-subtle pb-6">
          <div className="flex items-center gap-2.5">
            <Logo size={28} />
            <div>
              <span className="text-sm font-black text-foreground tracking-tight">{t.appName}</span>
              <span className="text-xs text-muted ml-2">— {t.footer.prototype}</span>
            </div>
          </div>

          <p className="text-xs text-muted text-center sm:text-right max-w-lg leading-relaxed">
            {t.footer.disclaimer}
          </p>
        </div>

        {/* Team CoreDumped Credits Banner */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted">
          {/* Team Name & Leadership */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-1.5">
            <span className="px-3 py-0.5 rounded-full font-bold bg-primary/10 text-primary border border-primary/25 text-[11px] shadow-xs">
              🚀 {t.footer.teamName}
            </span>
            <span className="font-semibold text-foreground">
              Deepjoy Mullick <span className="text-muted font-normal">({t.footer.teamLeader})</span>
            </span>
            <span className="text-border-subtle hidden sm:inline">•</span>
            <span className="font-semibold text-foreground">
              Sayantan Sinha <span className="text-muted font-normal">({t.footer.leadDeveloper})</span>
            </span>
          </div>

          {/* Quality Assurance & Testing Team */}
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-2 gap-y-1 text-center md:text-right">
            <span className="text-muted text-[11px] font-medium">{t.footer.testers}:</span>
            <span className="text-foreground font-medium">Adrija Roy</span>
            <span className="text-border-subtle">•</span>
            <span className="text-foreground font-medium">Madhurya Ghosh</span>
            <span className="text-border-subtle">•</span>
            <span className="text-foreground font-medium">Soumyadeep Das</span>
            <span className="text-border-subtle">•</span>
            <span className="text-foreground font-medium">Rupam Ghosh</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
