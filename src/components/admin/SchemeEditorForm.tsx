'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input, { Textarea, Select } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import DiffViewer from '@/components/admin/DiffViewer';
import SchemeAiUpdateModal from '@/components/admin/SchemeAiUpdateModal';
import DeleteSchemeDialog from '@/components/admin/DeleteSchemeDialog';
import { createOrUpdateLiveScheme } from '@/lib/firestore/admin';
import { getAllSchemes, getSchemeById } from '@/lib/firestore/schemes';
import { findLikelyDuplicate } from '@/lib/schemes/identity';
import { useAuth } from '@/contexts/AuthContext';
import { ALL_INDIAN_REGIONS } from '@/lib/constants/states';
import { getErrorMessage } from '@/lib/utils/errors';
import type { Scheme } from '@/types';

const ADMIN_ROUTE_KEY = process.env.NEXT_PUBLIC_ADMIN_ROUTE_KEY || '4632';

const asText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : '';
const asList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((item) => String(item ?? '').trim()).filter(Boolean)
    : typeof value === 'string'
      ? value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean)
      : [];
const asAmount = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(String(value).replace(/[,₹%\s]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

/**
 * Shapes the AI's extraction of a new scheme into the form's preview.
 *
 * The extraction returns a plain scheme object, but the form read
 * `summaryOfChanges`, `proposedChanges` and `updatedScheme` from it — fields only
 * the old existing-scheme prompt produced. So after "Analyze" nothing appeared,
 * and "Load Into Editor Form" loaded nothing. Lists, amounts and the nested
 * blocks are also made safe here: a list sent as one string crashed the form.
 */
function buildNewSchemeDraft(raw: unknown, current: Scheme) {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const eligibility = (data.eligibility && typeof data.eligibility === 'object' ? data.eligibility : {}) as Record<string, unknown>;
  const benefits = (data.benefits && typeof data.benefits === 'object' ? data.benefits : {}) as Record<string, unknown>;
  const text = (value: unknown, fallback: string | undefined) => asText(value) || fallback || '';
  const list = (value: unknown, fallback: string[]) => (asList(value).length ? asList(value) : fallback);
  const level = data.governmentLevel === 'state' || data.governmentLevel === 'central' ? data.governmentLevel : current.governmentLevel;
  const status = ['new', 'existing', 'both'].includes(String(eligibility.businessStatus))
    ? (eligibility.businessStatus as 'new' | 'existing' | 'both')
    : current.eligibility.businessStatus;
  const slug = asText(data.id).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');

  const updatedScheme: Scheme = {
    ...current,
    id: slug || current.id,
    name: text(data.name, current.name),
    shortName: text(data.shortName, current.shortName),
    category: text(data.category, current.category),
    governmentLevel: level,
    state: level === 'state' ? text(data.state, current.state) : '',
    description: text(data.description, current.description),
    targetBusinessTypes: list(data.targetBusinessTypes, current.targetBusinessTypes),
    targetBeneficiaries: list(data.targetBeneficiaries, current.targetBeneficiaries),
    eligibility: {
      ...current.eligibility,
      ageRange: text(eligibility.ageRange, current.eligibility.ageRange),
      incomeLimit: text(eligibility.incomeLimit, current.eligibility.incomeLimit),
      education: text(eligibility.education, current.eligibility.education),
      businessStatus: status,
      otherConditions: list(eligibility.otherConditions, current.eligibility.otherConditions),
    },
    benefits: {
      ...current.benefits,
      subsidyDetails: text(benefits.subsidyDetails, current.benefits.subsidyDetails),
      loanDetails: text(benefits.loanDetails, current.benefits.loanDetails),
      maxSubsidyPercent: asAmount(benefits.maxSubsidyPercent) ?? current.benefits.maxSubsidyPercent,
      maxFundingAmount: asAmount(benefits.maxFundingAmount) ?? current.benefits.maxFundingAmount,
      otherBenefits: list(benefits.otherBenefits, current.benefits.otherBenefits),
    },
    requiredDocuments: list(data.requiredDocuments, current.requiredDocuments),
    applicationProcess: text(data.applicationProcess, current.applicationProcess),
    officialUrl: text(data.officialUrl, current.officialUrl),
    sourceName: text(data.sourceName, current.sourceName),
  };

  const fields = (s: Scheme): Record<string, unknown> => ({
    id: s.id, name: s.name, shortName: s.shortName, category: s.category, governmentLevel: s.governmentLevel,
    state: s.state, description: s.description, targetBusinessTypes: s.targetBusinessTypes,
    targetBeneficiaries: s.targetBeneficiaries, 'eligibility.ageRange': s.eligibility.ageRange,
    'eligibility.incomeLimit': s.eligibility.incomeLimit, 'eligibility.education': s.eligibility.education,
    'eligibility.businessStatus': s.eligibility.businessStatus, 'eligibility.otherConditions': s.eligibility.otherConditions,
    'benefits.subsidyDetails': s.benefits.subsidyDetails, 'benefits.loanDetails': s.benefits.loanDetails,
    'benefits.maxSubsidyPercent': s.benefits.maxSubsidyPercent, 'benefits.maxFundingAmount': s.benefits.maxFundingAmount,
    'benefits.otherBenefits': s.benefits.otherBenefits, requiredDocuments: s.requiredDocuments,
    applicationProcess: s.applicationProcess, officialUrl: s.officialUrl, sourceName: s.sourceName,
  });
  const before = fields(current);
  const after = fields(updatedScheme);
  const proposedChanges = Object.fromEntries(
    Object.keys(after)
      .filter((key) => JSON.stringify(before[key] ?? '') !== JSON.stringify(after[key] ?? ''))
      .map((key) => [key, { old: before[key], new: after[key] }])
  );

  return {
    summaryOfChanges: `Extracted "${updatedScheme.name || 'the scheme'}" from the circular: ${Object.keys(proposedChanges).length} fields filled. Check every value against the notice before publishing.`,
    proposedChanges,
    updatedScheme,
  };
}

interface SchemeEditorFormProps {
  initialData?: Scheme | null;
  isNew?: boolean;
}

export default function SchemeEditorForm({ initialData, isNew = false }: SchemeEditorFormProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [formData, setFormData] = useState<Scheme>({
    id: initialData?.id || '',
    name: initialData?.name || '',
    shortName: initialData?.shortName || '',
    category: initialData?.category || 'Micro-Credit',
    governmentLevel: initialData?.governmentLevel || 'central',
    state: initialData?.state || '',
    description: initialData?.description || '',
    targetBusinessTypes: initialData?.targetBusinessTypes || [],
    targetBeneficiaries: initialData?.targetBeneficiaries || [],
    // Sample values are for a brand-new scheme only. Filled in for an existing one,
    // saving any unrelated edit wrote "18-45 years" and "No limit" into a scheme
    // whose notice says nothing of the kind.
    eligibility: {
      ageRange: initialData ? initialData.eligibility?.ageRange || '' : '18-45 years',
      incomeLimit: initialData ? initialData.eligibility?.incomeLimit || '' : 'No limit',
      education: initialData ? initialData.eligibility?.education || '' : 'None',
      businessStatus: initialData?.eligibility?.businessStatus || 'both',
      otherConditions: initialData?.eligibility?.otherConditions || [],
    },
    benefits: {
      subsidyDetails: initialData?.benefits?.subsidyDetails || '',
      loanDetails: initialData?.benefits?.loanDetails || '',
      maxSubsidyPercent: initialData?.benefits?.maxSubsidyPercent || 0,
      maxFundingAmount: initialData?.benefits?.maxFundingAmount || 0,
      otherBenefits: initialData?.benefits?.otherBenefits || [],
    },
    requiredDocuments: initialData?.requiredDocuments || [],
    applicationProcess: initialData?.applicationProcess || '',
    officialUrl: initialData?.officialUrl || '',
    sourceName: initialData?.sourceName || '',
    lastVerifiedDate: initialData?.lastVerifiedDate || new Date().toISOString().split('T')[0],
    isActive: initialData?.isActive ?? true,
  });

  const [saving, setSaving] = useState(false);
  // A new scheme that looks like one already in the directory. The directory
  // once listed PM SVANidhi four times; the admin now sees the match first.
  const [duplicateWarning, setDuplicateWarning] = useState<{ id: string; name: string; reason: string } | null>(null);
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // AI Assistant Modal State. A new scheme is extracted from a circular into this
  // form; an existing scheme is updated through the shared review flow instead.
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isAiUpdateOpen, setIsAiUpdateOpen] = useState(false);
  const [circularText, setCircularText] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDraftResult, setAiDraftResult] = useState<{
    summaryOfChanges?: string;
    proposedChanges?: Record<string, { old: unknown; new: unknown }>;
    updatedScheme?: Partial<Scheme>;
  } | null>(null);

  // Helper to update top-level fields
  const handleChange = <K extends keyof Scheme>(key: K, val: Scheme[K]) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  // Helper for comma-separated inputs
  const handleCommaSeparatedChange = (key: 'targetBusinessTypes' | 'targetBeneficiaries' | 'requiredDocuments', valStr: string) => {
    const list = valStr.split(',').map((s) => s.trim()).filter(Boolean);
    setFormData((prev) => ({ ...prev, [key]: list }));
  };

  // Trigger AI parsing from official circular text
  const handleRunAiDraft = async () => {
    if (!circularText || circularText.trim().length < 20) {
      setError('Please paste at least 20 characters of the official government circular or notification.');
      return;
    }

    setAiLoading(true);
    setError('');
    try {
      if (!user) {
        throw new Error('Admin session expired. Please log in again.');
      }
      let token = await user.getIdToken(true);
      let res = await fetch('/api/admin/schemes/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          circularText,
          currentScheme: isNew ? null : formData,
          sourceUrl,
        }),
      });

      if (res.status === 401 || res.status === 403) {
        token = await user.getIdToken(true);
        res = await fetch('/api/admin/schemes/draft', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            circularText,
            currentScheme: isNew ? null : formData,
            sourceUrl,
          }),
        });
      }

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to draft scheme update');
      }

      setAiDraftResult(buildNewSchemeDraft(json.data, formData));
    } catch (err) {
      setError(getErrorMessage(err, 'AI parsing failed. Please check the text format.'));
    } finally {
      setAiLoading(false);
    }
  };

  // Apply AI Draft into Editor Form
  const handleApplyAiChanges = () => {
    if (!aiDraftResult) return;
    if (aiDraftResult.updatedScheme) {
      setFormData((prev) => ({
        ...prev,
        ...aiDraftResult.updatedScheme,
      }));
    }
    setIsAiModalOpen(false);
    setSuccessMsg('AI draft changes loaded into form. Review before saving!');
  };

  // Direct Publish to Live Database
  const handleDirectPublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.name) {
      setError('Scheme ID and Name are required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (isNew) {
        // Publishing writes to the ID, so an ID already in use would silently
        // replace that scheme.
        if (await getSchemeById(formData.id.trim(), { fallbackToSeed: false })) {
          setError(`A scheme with the ID "${formData.id}" already exists. Choose a different ID, or edit that scheme instead.`);
          return;
        }
        if (!allowDuplicate) {
          const match = findLikelyDuplicate(formData, await getAllSchemes());
          if (match) {
            setDuplicateWarning({ id: match.scheme.id, name: match.scheme.name, reason: match.reason });
            return;
          }
        }
      }
      await createOrUpdateLiveScheme({
        ...formData,
        lastVerifiedDate: new Date().toISOString().split('T')[0],
      });
      setSuccessMsg('Scheme published directly to live Firestore database!');
      setTimeout(() => {
        router.push(`/${ADMIN_ROUTE_KEY}/admin/schemes`);
      }, 1000);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to publish live scheme.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Top Bar with AI Draft Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface-elevated border border-border">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            {isNew ? 'Create New Government Scheme' : `Edit: ${formData.shortName || formData.name}`}
          </h2>
          <p className="text-xs text-muted">
            {isNew
              ? 'Add a verified central or state government financial scheme'
              : 'Update eligibility criteria, subsidies, and official guidelines'
            }
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (!isNew && initialData) {
              setIsAiUpdateOpen(true);
              return;
            }
            setAiDraftResult(null);
            setIsAiModalOpen(true);
          }}
          className="border-saffron-400 text-saffron-700 dark:text-saffron-300 font-bold shrink-0"
        >
          {isNew ? '✨ AI Parse from Gazette / Circular' : '✨ Update with AI'}
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-danger-light text-danger text-xs font-semibold">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-success text-xs font-semibold">
          ✓ {successMsg}
        </div>
      )}

      {duplicateWarning && (
        <div role="alert" className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs space-y-3">
          <p className="font-semibold">
            ⚠️ This looks like a scheme already in the directory: <strong>{duplicateWarning.name}</strong> ({duplicateWarning.id}) — {duplicateWarning.reason}.
          </p>
          <p>Users would see the same programme twice. Update the existing scheme instead, unless this really is a different programme.</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => router.push(`/${ADMIN_ROUTE_KEY}/admin/schemes/${encodeURIComponent(duplicateWarning.id)}/edit`)}
            >
              Open the existing scheme
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setAllowDuplicate(true);
                setDuplicateWarning(null);
              }}
            >
              It is different — let me publish
            </Button>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleDirectPublish} className="space-y-6">
        {/* Section 1: Basic Identifiers */}
        <Card padding="lg" className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted">
            1. Basic Information & Level
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Scheme ID (Slug)"
              type="text"
              value={formData.id}
              onChange={(e) => handleChange('id', e.target.value)}
              placeholder="e.g. central-pmegp"
              required
              disabled={!isNew}
              hint="Permanent unique identifier"
            />

            <Input
              label="Short Name / Acronym"
              type="text"
              value={formData.shortName}
              onChange={(e) => handleChange('shortName', e.target.value)}
              placeholder="e.g. PMEGP"
              required
            />

            <Select
              label="Government Level"
              value={formData.governmentLevel}
              onChange={(e) => handleChange('governmentLevel', e.target.value as 'central' | 'state')}
              options={[
                { value: 'central', label: 'Central Government' },
                { value: 'state', label: 'State Government' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Scheme Name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Prime Minister Employment Generation Programme"
              required
            />

            {formData.governmentLevel === 'state' && (
              <Select
                label="Target State / Union Territory"
                value={formData.state || ''}
                onChange={(e) => handleChange('state', e.target.value)}
                options={[
                  { value: '', label: 'Select State or Union Territory...' },
                  ...ALL_INDIAN_REGIONS.map((state) => ({
                    value: state,
                    label: state,
                  })),
                ]}
                required
              />
            )}
          </div>

          <Textarea
            label="Scheme Description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Overview of the scheme and primary objective..."
            rows={3}
            required
          />
        </Card>

        {/* Section 2: Financial Benefits & Subsidies */}
        <Card padding="lg" className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted">
            2. Financial Benefits & Subsidies
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Max Subsidy % (Number)"
              type="number"
              value={formData.benefits.maxSubsidyPercent?.toString() || '0'}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  benefits: { ...prev.benefits, maxSubsidyPercent: Number(e.target.value) || 0 },
                }))
              }
              placeholder="e.g. 35"
              hint="Percentage grant (e.g. 35 for 35%)"
            />

            <Input
              label="Max Funding / Project Limit (₹)"
              type="number"
              value={formData.benefits.maxFundingAmount?.toString() || '0'}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  benefits: { ...prev.benefits, maxFundingAmount: Number(e.target.value) || 0 },
                }))
              }
              placeholder="e.g. 5000000 (50 Lakhs)"
            />
          </div>

          <Textarea
            label="Subsidy Details Breakdown"
            value={formData.benefits.subsidyDetails || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                benefits: { ...prev.benefits, subsidyDetails: e.target.value },
              }))
            }
            placeholder="e.g. 35% in rural areas for special categories, 25% for general in urban areas..."
            rows={2}
          />

          <Textarea
            label="Loan & Credit Terms"
            value={formData.benefits.loanDetails || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                benefits: { ...prev.benefits, loanDetails: e.target.value },
              }))
            }
            placeholder="e.g. Term loan from scheduled commercial banks with 3-7 year repayment..."
            rows={2}
          />
        </Card>

        {/* Section 3: Target Beneficiaries & Eligibility */}
        <Card padding="lg" className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted">
            3. Eligibility & Target Beneficiaries
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Target Business Types (Comma-separated)"
              type="text"
              value={formData.targetBusinessTypes.join(', ')}
              onChange={(e) => handleCommaSeparatedChange('targetBusinessTypes', e.target.value)}
              placeholder="Poultry, Livestock, Food Processing, Manufacturing"
              hint="Key business sectors matched by the engine"
            />

            <Input
              label="Age Requirement"
              type="text"
              value={formData.eligibility.ageRange || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  eligibility: { ...prev.eligibility, ageRange: e.target.value },
                }))
              }
              placeholder="e.g. 18-45 years (up to 50 for women)"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Income Limit"
              type="text"
              value={formData.eligibility.incomeLimit || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  eligibility: { ...prev.eligibility, incomeLimit: e.target.value },
                }))
              }
              placeholder="e.g. No ceiling / Below 3 Lakhs"
            />

            <Select
              label="Enterprise Status Allowed"
              value={formData.eligibility.businessStatus || 'both'}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  eligibility: {
                    ...prev.eligibility,
                    businessStatus: e.target.value as 'new' | 'existing' | 'both',
                  },
                }))
              }
              options={[
                { value: 'both', label: 'Both New & Existing' },
                { value: 'new', label: 'New Enterprises Only' },
                { value: 'existing', label: 'Existing Businesses Only' },
              ]}
            />
          </div>
        </Card>

        {/* Section 4: Required Documents & Application Source */}
        <Card padding="lg" className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted">
            4. Documents, Application & Source
          </h3>

          <Input
            label="Required Documents (Comma-separated)"
            type="text"
            value={formData.requiredDocuments.join(', ')}
            onChange={(e) => handleCommaSeparatedChange('requiredDocuments', e.target.value)}
            placeholder="Aadhaar, PAN Card, Project Report, Land Proof, Caste Certificate"
          />

          <Textarea
            label="Step-by-Step Application Process"
            value={formData.applicationProcess}
            onChange={(e) => handleChange('applicationProcess', e.target.value)}
            placeholder="1. Register on portal... 2. Submit DPR... 3. Bank sanction..."
            rows={3}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Official Government Portal URL"
              type="url"
              value={formData.officialUrl}
              onChange={(e) => handleChange('officialUrl', e.target.value)}
              placeholder="https://kviconline.gov.in"
              required
            />

            <Input
              label="Nodal Department / Source"
              type="text"
              value={formData.sourceName}
              onChange={(e) => handleChange('sourceName', e.target.value)}
              placeholder="Ministry of MSME / KVIC"
              required
            />
          </div>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/${ADMIN_ROUTE_KEY}/admin/schemes`)}
            >
              ← Cancel
            </Button>
            {!isNew && initialData && (
              <Button
                type="button"
                variant="danger"
                onClick={() => setIsDeleteOpen(true)}
                disabled={saving}
                className="font-bold"
              >
                🗑️ Delete scheme
              </Button>
            )}
          </div>

          <Button
            type="submit"
            isLoading={saving}
            size="lg"
            className="px-8 font-bold"
          >
            {isNew ? 'Publish Live Scheme' : 'Save & Publish Live Changes'}
          </Button>
        </div>
      </form>

      {/* AI Parsing & Review Modal */}
      <Modal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        title="✨ AI Assistant: Parse Official Government Circular"
        size="lg"
      >
        <div className="space-y-5">
          <p className="text-xs text-muted leading-relaxed">
            Paste the raw text of a newly issued government circular, gazette notification, or press release.
            Our AI model (<strong>Gemini Flash</strong>) will extract updated figures and generate a Before/After diff for human verification.
          </p>

          <div className="space-y-3">
            <Input
              label="Official Source URL (Optional)"
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://msme.gov.in/circulars/2026/04/..."
            />

            <Textarea
              label="Government Circular / Gazette Notification Text"
              value={circularText}
              onChange={(e) => setCircularText(e.target.value)}
              placeholder="Paste notification text here..."
              rows={6}
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleRunAiDraft}
              isLoading={aiLoading}
              disabled={circularText.trim().length < 20}
              size="md"
            >
              Analyze & Generate Diff →
            </Button>
          </div>

          {/* AI Diff Preview if generated */}
          {aiDraftResult && (
            <div className="space-y-4 pt-4 border-t border-border">
              {aiDraftResult.summaryOfChanges && (
                <div className="p-3.5 rounded-xl bg-saffron-50/50 dark:bg-saffron-950/20 border border-saffron-300 dark:border-saffron-700 text-xs text-foreground">
                  <strong>Policy Summary:</strong> {aiDraftResult.summaryOfChanges}
                </div>
              )}

              {aiDraftResult.proposedChanges && (
                <DiffViewer
                  proposedChanges={aiDraftResult.proposedChanges}
                  schemeName={formData.shortName || formData.name}
                />
              )}

              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3">
                <Button
                  type="button"
                  size="md"
                  onClick={handleApplyAiChanges}
                  className="w-full sm:w-auto"
                >
                  ✓ Load Into Editor Form
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {isDeleteOpen && !isNew && initialData && (
        <DeleteSchemeDialog
          scheme={{ id: initialData.id, name: initialData.name }}
          onClose={() => setIsDeleteOpen(false)}
          onDeleted={(message) => {
            setIsDeleteOpen(false);
            setError('');
            setSuccessMsg(`${message} Returning to the schemes directory...`);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => router.push(`/${ADMIN_ROUTE_KEY}/admin/schemes`), 1200);
          }}
        />
      )}

      {isAiUpdateOpen && !isNew && initialData && (
        <SchemeAiUpdateModal
          scheme={initialData}
          onClose={() => setIsAiUpdateOpen(false)}
          onPublished={(message) => {
            setIsAiUpdateOpen(false);
            setSuccessMsg(message);
            setTimeout(() => router.push(`/${ADMIN_ROUTE_KEY}/admin/schemes`), 1200);
          }}
        />
      )}
    </div>
  );
}
