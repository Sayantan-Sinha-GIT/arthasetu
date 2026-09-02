'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Scheme } from '@/types';

interface DocumentItem {
  id: string;
  name: string;
  category: 'identity' | 'business' | 'financial' | 'social';
  description: string;
  tip?: string;
  isRequired: boolean;
}

const DEFAULT_DOCUMENTS: DocumentItem[] = [
  {
    id: 'aadhaar',
    name: 'Aadhaar Card of Applicant / Partners',
    category: 'identity',
    description: 'Primary government identity & biometric address verification document.',
    tip: 'Ensure mobile number is linked for OTP verification during portal e-sign.',
    isRequired: true,
  },
  {
    id: 'pan',
    name: 'PAN Card (Individual or Business Entity)',
    category: 'identity',
    description: 'Permanent Account Number required for banking and tax compliance.',
    tip: 'Must match name spelled on Aadhaar exactly to avoid rejection.',
    isRequired: true,
  },
  {
    id: 'udyam',
    name: 'Udyam MSME Registration Certificate',
    category: 'business',
    description: 'Official Ministry of MSME registration certificate with 19-digit URN.',
    tip: 'Completely free to generate on udyamregistration.gov.in with Aadhaar in 10 mins.',
    isRequired: true,
  },
  {
    id: 'dpr_quotes',
    name: 'Detailed Project Report (DPR) & Machinery Quotations',
    category: 'financial',
    description: 'Proforma invoices and machinery cost estimates from registered suppliers.',
    tip: 'ArthaSetu’s Financial Plan PDF can be directly submitted as your preliminary project feasibility report.',
    isRequired: true,
  },
  {
    id: 'bank_statement',
    name: 'Bank Account Statement (Past 6 Months)',
    category: 'financial',
    description: 'Operating bank statement showing clean transaction track record and KYC.',
    tip: 'Demonstrates active financial discipline and account history to bank loan officers.',
    isRequired: true,
  },
  {
    id: 'premises_proof',
    name: 'Land Record / Rent / Lease Agreement',
    category: 'business',
    description: 'Proof of legal possession of work shed, retail shop, or agricultural unit premises.',
    tip: 'Lease deed should ideally have remaining tenure covering the loan repayment period.',
    isRequired: false,
  },
  {
    id: 'caste_shg_cert',
    name: 'Social Category Certificate / SHG Proof',
    category: 'social',
    description: 'SC / ST / OBC / Women / Minority certificate or SHG Member passbook.',
    tip: 'Unlocks higher subsidy brackets (e.g. 35% under PMEGP Special Category vs 25% General).',
    isRequired: false,
  },
];

interface DocumentChecklistProps {
  scheme?: Scheme | null;
  className?: string;
}

export default function DocumentChecklist({ scheme, className = '' }: DocumentChecklistProps) {
  const { t } = useLanguage();
  const storageKey = `arthasetu_docs_${scheme?.id || 'general'}`;
  
  // Track checked document IDs
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<'all' | 'identity' | 'business' | 'financial' | 'social'>('all');

  // Load from local storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedChecked = localStorage.getItem(`${storageKey}_checked`);
      if (savedChecked) {
        try {
          setCheckedIds(JSON.parse(savedChecked));
        } catch {}
      }
    }
  }, [storageKey]);

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      if (typeof window !== 'undefined') {
        localStorage.setItem(`${storageKey}_checked`, JSON.stringify(next));
      }
      return next;
    });
  };

  const filteredDocs = DEFAULT_DOCUMENTS.filter((doc) => {
    if (activeCategory === 'all') return true;
    return doc.category === activeCategory;
  });

  const completedCount = checkedIds.length;
  const totalCount = DEFAULT_DOCUMENTS.length;
  const percentComplete = Math.round((completedCount / totalCount) * 100);

  const getDocTranslation = (id: string) => {
    switch(id) {
      case 'aadhaar': return t.schemes.checklist.docs.aadhaar;
      case 'pan': return t.schemes.checklist.docs.pan;
      case 'udyam': return t.schemes.checklist.docs.udyam;
      case 'dpr_quotes': return t.schemes.checklist.docs.dpr;
      case 'bank_statement': return t.schemes.checklist.docs.bankStmt;
      case 'premises_proof': return t.schemes.checklist.docs.premises;
      case 'caste_shg_cert': return t.schemes.checklist.docs.socialCert;
      default: return null;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Progress Card */}
      <div className="p-5 rounded-2xl bg-surface-elevated border border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📁</span>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {t.schemes.checklist.title}
              </h3>
              <p className="text-xs text-muted">
                {t.schemes.checklist.subtitle.replace('{{completed}}', completedCount.toString()).replace('{{total}}', totalCount.toString())}
              </p>
            </div>
          </div>
          <span
            className={`text-xs font-black px-2.5 py-1 rounded-full border ${
              percentComplete === 100
                ? 'bg-success-light border-success text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300'
                : 'bg-primary/10 border-primary/20 text-primary'
            }`}
          >
            {t.schemes.checklist.percentReady.replace('{{percent}}', percentComplete.toString())}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-surface border border-border h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              percentComplete === 100 ? 'bg-success' : 'bg-primary'
            }`}
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: t.schemes.checklist.tabs.all },
          { key: 'identity', label: t.schemes.checklist.tabs.identity },
          { key: 'business', label: t.schemes.checklist.tabs.business },
          { key: 'financial', label: t.schemes.checklist.tabs.financial },
          { key: 'social', label: t.schemes.checklist.tabs.social },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveCategory(tab.key as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeCategory === tab.key
                ? 'bg-primary text-white shadow-sm'
                : 'bg-surface-elevated text-muted hover:text-foreground border border-border'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredDocs.map((doc) => {
          const isChecked = checkedIds.includes(doc.id);
          const tDoc = getDocTranslation(doc.id);

          return (
            <div
              key={doc.id}
              onClick={() => toggleCheck(doc.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                isChecked
                  ? 'bg-success-light/40 border-success/40 dark:bg-green-950/20'
                  : 'bg-surface-elevated border-border hover:border-muted'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}} // Handled by parent div
                    className="mt-1 w-4 h-4 rounded text-primary border-border cursor-pointer"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-bold ${
                          isChecked ? 'text-foreground line-through opacity-80' : 'text-foreground'
                        }`}
                      >
                        {tDoc ? tDoc.name : doc.name}
                      </span>
                      {doc.isRequired ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold">
                          {t.schemes.checklist.mandatory}
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                          {t.schemes.checklist.optional}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted leading-relaxed">{tDoc ? tDoc.desc : doc.description}</p>
                    {(tDoc?.tip || doc.tip) && (
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg inline-block">
                        💡 {tDoc ? tDoc.tip : doc.tip}
                      </p>
                    )}
                  </div>
                </div>

                <div className="shrink-0 pt-0.5">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${
                      isChecked
                        ? 'bg-success text-white border-success'
                        : 'bg-surface text-muted border-border'
                    }`}
                  >
                    {isChecked ? t.schemes.checklist.ready : t.schemes.checklist.markReady}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
