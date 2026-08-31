'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SUPPORTED_LANGUAGES } from '@/i18n/languages';
import type { ChatMessage } from '@/types';

interface MessageBubbleProps {
  message: ChatMessage;
  onSave?: (content: string) => void;
  onSpeak?: (content: string) => void;
  isSpeaking?: boolean;
}

export default function MessageBubble({ message, onSave, onSpeak, isSpeaking = false }: MessageBubbleProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  
  // Translation state
  const [showTranslateOptions, setShowTranslateOptions] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [activeTranslationCode, setActiveTranslationCode] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const isUser = message.role === 'user';

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  const handleTranslate = async (langCode: string) => {
    setShowTranslateOptions(false);
    if (activeTranslationCode === langCode) {
      setActiveTranslationCode(null);
      return;
    }
    if (translations[langCode]) {
      setActiveTranslationCode(langCode);
      return;
    }

    setIsTranslating(true);
    try {
      const res = await fetch('/api/translate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message.content,
          targetLangCode: langCode,
        }),
      });
      if (!res.ok) throw new Error('Translation failed');
      const data = await res.json();
      setTranslations((prev) => ({ ...prev, [langCode]: data.translatedText }));
      setActiveTranslationCode(langCode);
    } catch (err) {
      console.error(err);
      alert('Failed to translate message.');
    } finally {
      setIsTranslating(false);
    }
  };

  const displayContent = activeTranslationCode ? translations[activeTranslationCode] : message.content;

  // Simple Markdown renderer for headings, lists, bold, italics, and lines
  const renderFormattedContent = (content: string) => {
    const paragraphs = content.split('\n\n');

    return paragraphs.map((para, pIdx) => {
      const trimmed = para.trim();
      if (!trimmed) return null;

      // Header (### or ## or #)
      if (trimmed.startsWith('### ')) {
        return (
          <h4 key={pIdx} className="text-base font-bold text-foreground mt-3 mb-1.5 first:mt-0">
            {trimmed.replace(/^###\s+/, '')}
          </h4>
        );
      }
      if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
        return (
          <h3 key={pIdx} className="text-lg font-bold text-foreground mt-4 mb-2 first:mt-0">
            {trimmed.replace(/^#+\s+/, '')}
          </h3>
        );
      }

      // Unordered list
      if (trimmed.includes('\n- ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const items = trimmed.split(/\n(?=[-*]\s+)/);
        return (
          <ul key={pIdx} className="space-y-1.5 my-2 pl-4 list-disc marker:text-primary">
            {items.map((item, iIdx) => {
              const cleanItem = item.replace(/^[-*]\s+/, '').trim();
              return (
                <li key={iIdx} className="text-sm leading-relaxed">
                  {renderInlineFormatting(cleanItem)}
                </li>
              );
            })}
          </ul>
        );
      }

      // Ordered list (1. 2. 3.)
      if (/^\d+\.\s+/.test(trimmed)) {
        const items = trimmed.split(/\n(?=\d+\.\s+)/);
        return (
          <ol key={pIdx} className="space-y-1.5 my-2 pl-4 list-decimal marker:text-primary font-medium">
            {items.map((item, iIdx) => {
              const cleanItem = item.replace(/^\d+\.\s+/, '').trim();
              return (
                <li key={iIdx} className="text-sm leading-relaxed font-normal">
                  {renderInlineFormatting(cleanItem)}
                </li>
              );
            })}
          </ol>
        );
      }

      // Regular paragraph
      return (
        <p key={pIdx} className="text-sm leading-relaxed my-1.5 first:mt-0 last:mb-0">
          {renderInlineFormatting(trimmed)}
        </p>
      );
    });
  };

  // Helper to format bold **text** and inline `code`
  const renderInlineFormatting = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-bold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={idx} className="italic text-muted-foreground">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={idx} className="px-1.5 py-0.5 rounded-md bg-surface text-xs font-mono text-primary border border-border">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div
      className={`flex flex-col ${
        isUser ? 'items-end' : 'items-start'
      } space-y-1 animate-fade-in group`}
    >
      <div className="flex items-end gap-2 max-w-[88%] sm:max-w-[78%]">
        {!isUser && (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-saffron-400 to-saffron-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm mb-1">
            अ
          </div>
        )}

        <div
          className={`
            relative p-4 sm:p-5 rounded-3xl text-sm leading-relaxed shadow-sm transition-all
            ${isUser
              ? 'bg-gradient-to-br from-primary to-saffron-600 text-primary-foreground rounded-br-none'
              : 'bg-surface-elevated border border-border text-foreground rounded-bl-none'
            }
          `}
        >
          {/* Top meta tags */}
          {message.isVoice && (
            <div className="flex items-center gap-1 text-[11px] font-semibold opacity-80 mb-2">
              <span>🎙️</span>
              <span>Spoken voice message</span>
            </div>
          )}

          {isTranslating && (
             <div className="flex items-center gap-2 mb-2">
               <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
               <span className="text-xs text-muted-foreground font-medium">Translating...</span>
             </div>
          )}

          {/* Formatted body */}
          <div className="space-y-1">
            {displayContent ? renderFormattedContent(displayContent) : null}
          </div>

          {/* Action buttons (only for AI assistant message) */}
          {!isUser && message.content && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-border-subtle text-xs text-muted relative">
              {/* Translate Dropdown Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTranslateOptions(!showTranslateOptions)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${activeTranslationCode ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-surface text-muted hover:text-foreground'}`}
                  title="Translate this message"
                >
                  <span>🌐</span>
                  <span>{activeTranslationCode ? SUPPORTED_LANGUAGES.find(l => l.code === activeTranslationCode)?.name : 'Translate ▾'}</span>
                </button>
                {showTranslateOptions && (
                  <div className="absolute top-full left-0 mt-1 w-48 max-h-60 overflow-y-auto bg-surface-elevated border border-border rounded-xl shadow-xl z-10 flex flex-col p-1">
                     <button
                        type="button"
                        onClick={() => { setShowTranslateOptions(false); setActiveTranslationCode(null); }}
                        className="text-left px-3 py-2 text-xs hover:bg-surface rounded-lg w-full"
                      >
                        Original
                      </button>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => handleTranslate(lang.code)}
                        className="text-left px-3 py-2 text-xs hover:bg-surface rounded-lg w-full flex items-center justify-between"
                      >
                        <span>{lang.nativeName} ({lang.name})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Read Aloud / Speak button */}
              {onSpeak && (
                <button
                  type="button"
                  onClick={() => onSpeak(displayContent)}
                  className={`
                    inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors
                    ${isSpeaking
                      ? 'bg-saffron-100 dark:bg-saffron-900/40 text-saffron-800 dark:text-saffron-300 font-bold'
                      : 'hover:bg-surface text-muted hover:text-foreground'
                    }
                  `}
                  title={isSpeaking ? 'Stop speech' : 'Listen to this advice'}
                >
                  {isSpeaking ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-saffron-500 animate-pulse" />
                      <span>Stop Listening</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                      <span>Read Aloud</span>
                    </>
                  )}
                </button>
              )}

              {/* Copy button */}
              <button
                type="button"
                onClick={() => handleCopy(displayContent)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-surface text-muted hover:text-foreground transition-colors"
                title="Copy to clipboard"
              >
                {copied ? (
                  <>
                    <span className="text-success">✓</span>
                    <span className="text-success font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Copy</span>
                  </>
                )}
              </button>

              {/* Save Advice button */}
              {onSave && (
                <button
                  type="button"
                  onClick={() => onSave(displayContent)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-primary/10 text-primary font-medium transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <span>{t.advisor.saveAdvice}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Timestamp */}
      <span className="text-[10px] text-muted px-2">
        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}
