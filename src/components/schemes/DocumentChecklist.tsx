'use client';

import { useState, useEffect } from 'react';
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
  const storageKey = `arthasetu_docs_${scheme?.id || 'general'}`;
  
  // Track checked document IDs
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  // Track mock uploaded file names
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, { name: string; size: string; timestamp: string }>>({});
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
      const savedFiles = localStorage.getItem(`${storageKey}_files`);
      if (savedFiles) {
        try {
          setUploadedFiles(JSON.parse(savedFiles));
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

  const handleMockUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileInfo = {
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      timestamp: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    };

    setUploadedFiles((prev) => {
      const next = { ...prev, [id]: fileInfo };
      if (typeof window !== 'undefined') {
        localStorage.setItem(`${storageKey}_files`, JSON.stringify(next));
      }
      return next;
    });

    // Automatically check the item when uploaded
    if (!checkedIds.includes(id)) {
      toggleCheck(id);
    }
  };

  const handleRemoveMockUpload = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadedFiles((prev) => {
      const next = { ...prev };
      delete next[id];
      if (typeof window !== 'undefined') {
        localStorage.setItem(`${storageKey}_files`, JSON.stringify(next));
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

  return (
    <div className={`p-6 rounded-3xl bg-surface-elevated border border-border space-y-6 shadow-sm ${className}`}>
      {/* Header & Readiness Meter */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📂</span>
              <h3 className="text-base font-bold text-foreground">
                Scheme Application Document Readiness Checklist
              </h3>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Verify and organize the essential paperwork required for bank loan and subsidy approval
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-black px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              {completedCount} / {totalCount} Ready ({percentComplete}%)
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-surface border border-border h-2.5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-smooth ${
              percentComplete === 100
                ? 'bg-success'
                : percentComplete >= 50
                ? 'bg-primary'
                : 'bg-warning'
            }`}
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {[
          { id: 'all', label: 'All Documents' },
          { id: 'identity', label: '🪪 Identity & KYC' },
          { id: 'business', label: '🏢 Business & Premises' },
          { id: 'financial', label: '📊 Financial & DPR' },
          { id: 'social', label: '👥 Category / SHG' },
        ].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id as any)}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              activeCategory === cat.id
                ? 'bg-primary text-white shadow-sm'
                : 'bg-surface text-muted hover:text-foreground border border-border'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Local storage privacy notice */}
      <div className="text-[11px] text-muted flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface border border-border-subtle">
        <span className="shrink-0">🔒</span>
        <span>Files stay on your device for your own organization only — nothing is uploaded or submitted to any government portal from here.</span>
      </div>

      {/* Checklist Grid */}
      <div className="space-y-3">
        {filteredDocs.map((doc) => {
          const isChecked = checkedIds.includes(doc.id);
          const uploaded = uploadedFiles[doc.id];

          return (
            <div
              key={doc.id}
              onClick={() => toggleCheck(doc.id)}
              className={`
                p-4 rounded-2xl border transition-all cursor-pointer select-none
                ${isChecked
                  ? 'bg-success-light/30 border-success/40 dark:bg-emerald-950/20'
                  : 'bg-surface border-border hover:border-primary/40'
                }
              `}
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
                      <span className={`text-sm font-bold ${isChecked ? 'text-foreground line-through opacity-80' : 'text-foreground'}`}>
                        {doc.name}
                      </span>
                      {doc.isRequired ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold">
                          Mandatory
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                          Optional Bonus
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      {doc.description}
                    </p>
                    {doc.tip && (
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg inline-block">
                        💡 {doc.tip}
                      </p>
                    )}
                  </div>
                </div>

                {/* Upload Action / Attached State */}
                <div className="shrink-0 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {uploaded ? (
                    <div className="flex items-center gap-2 p-1.5 px-3 rounded-xl bg-success-light border border-success/30 text-green-900 dark:text-green-200 text-xs">
                      <span>📄</span>
                      <span className="font-bold max-w-[100px] truncate">{uploaded.name}</span>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveMockUpload(doc.id, e)}
                        className="text-danger font-bold hover:opacity-80 text-xs ml-1"
                        title="Remove attachment"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface border border-border text-foreground text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95">
                      <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      <span>Attach PDF</span>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleMockUpload(doc.id, e)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
