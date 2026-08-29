'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LanguageSelector() {
  const { language, setLanguage, currentMeta, languages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-elevated transition-all duration-200 text-xs font-semibold text-foreground shadow-sm"
        title="Change interface language"
        aria-expanded={isOpen}
      >
        <span>🌐</span>
        <span>{currentMeta.nativeName}</span>
        {currentMeta.isMachineTranslated && (
          <span className="text-[10px] px-1 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono">
            AI
          </span>
        )}
        <svg
          className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 max-h-80 overflow-y-auto rounded-2xl bg-surface-elevated border border-border shadow-xl z-50 p-1 animate-scale-in">
          <div className="px-3 py-2 border-b border-border-subtle text-[11px] font-bold uppercase tracking-wider text-muted flex items-center justify-between">
            <span>22 Scheduled Languages</span>
            <span className="text-[10px] text-amber-600 font-normal">AI = Machine Trans.</span>
          </div>

          <div className="py-1 space-y-0.5">
            {languages.map((lang) => {
              const isSelected = lang.code === language;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl text-left transition-colors
                    ${isSelected
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'text-foreground hover:bg-surface'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{lang.nativeName}</span>
                    <span className="text-[11px] text-muted">({lang.name})</span>
                  </div>
                  {lang.isMachineTranslated && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 font-mono">
                      AI
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
