'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { UserProfile } from '@/types';

interface SuggestedQuestionsProps {
  profile: Partial<UserProfile> | null;
  onSelect: (question: string) => void;
}

export default function SuggestedQuestions({ profile, onSelect }: SuggestedQuestionsProps) {
  const { t, language } = useLanguage();
  const isHindi = language === 'hi';

  const business = profile?.businessType || 'business';
  const location = profile?.locality || profile?.district || profile?.state || 'my village';
  const capital = profile?.availableCapital ? `₹${profile.availableCapital.toLocaleString('en-IN')}` : 'my budget';

  const defaultQuestionsEn = [
    `How should I allocate ${capital} to start a ${business} in ${location}?`,
    `What government subsidy schemes apply to ${business} in ${profile?.state || 'India'}?`,
    `What are the most common risks for a new ${business} in the first 6 months?`,
    `How can I find reliable local customers and buyers in ${location}?`,
  ];

  const defaultQuestionsHi = [
    `${location} में ${capital} की लागत से ${business} कैसे शुरू करें?`,
    `${profile?.state || 'भारत'} में ${business} के लिए कौन-सी सरकारी सब्सिडी योजनाएं हैं?`,
    `शुरुआती 6 महीनों में ${business} के मुख्य जोखिम और सावधानियां क्या हैं?`,
    `${location} में स्थानीय ग्राहक और खरीदार कैसे खोजें?`,
  ];

  const questions = isHindi ? defaultQuestionsHi : defaultQuestionsEn;

  return (
    <div className="space-y-2.5 animate-fade-in">
      <p className="text-xs font-semibold text-muted flex items-center gap-1.5">
        <span>✨</span>
        <span>{t.advisor.suggestedQuestions}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {questions.map((q, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(q)}
            className="text-left py-2 px-3.5 rounded-2xl text-xs font-medium bg-surface hover:bg-surface-elevated text-foreground border border-border hover:border-primary/40 transition-all hover:-translate-y-0.5 shadow-sm active:scale-95 leading-relaxed"
          >
            💬 {q}
          </button>
        ))}
      </div>
    </div>
  );
}
