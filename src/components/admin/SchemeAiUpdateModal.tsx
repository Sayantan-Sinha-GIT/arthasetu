'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { publishReviewedSchemeUpdate } from '@/lib/firestore/admin';
import { getErrorMessage } from '@/lib/utils/errors';
import {
  SCHEME_UPDATE_FIELDS,
  formatSchemeValue,
  getPathValue,
  getSchemeUpdateField,
  normaliseSchemeFieldValue,
  schemeValuesEqual,
  validateSchemeChangeValue,
  type SchemeChanges,
  type SchemeFieldDefinition,
} from '@/lib/admin/scheme-update';
import type { Scheme, SchemeUpdateRecord } from '@/types';

/**
 * Updating a scheme with AI, from notice to live directory:
 *   1. the administrator gives the new notice (pasted text, a web page or a PDF link);
 *   2. the AI reports what it changes, quoting the notice;
 *   3. the administrator reviews each change beside the current value, and can edit it,
 *      leave it out, or change a field the AI missed;
 *   4. approving writes the reviewed values to the scheme and records the whole review.
 * Nothing reaches the scheme directory without step 4.
 */

interface SchemeAiUpdateModalProps {
  scheme: Scheme;
  /** A proposal already in the review queue: its changes are reviewed directly, skipping detection. */
  pendingUpdate?: SchemeUpdateRecord | null;
  onClose: () => void;
  onPublished: (message: string) => void;
}

type NoticeSource = 'text' | 'page' | 'pdf';

interface ReviewRow {
  path: string;
  include: boolean;
  /** What the AI proposed; undefined for a field the administrator added. */
  aiValue: unknown;
  /** The editor's text, converted to the field's type when read. */
  draft: string;
  evidence?: string;
}

function toDraft(field: SchemeFieldDefinition, value: unknown): string {
  if (value === undefined || value === null) return field.kind === 'boolean' ? 'true' : '';
  if (field.kind === 'list') return Array.isArray(value) ? value.join('\n') : String(value);
  return String(value);
}

function fromDraft(field: SchemeFieldDefinition, draft: string): unknown {
  switch (field.kind) {
    case 'list':
      return draft.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    case 'number': {
      const cleaned = draft.replace(/[,₹\s]/g, '');
      return cleaned === '' ? Number.NaN : Number(cleaned);
    }
    case 'boolean':
      return draft === 'true';
    default:
      return draft.trim();
  }
}

function rowsFromChanges(changes: SchemeChanges): ReviewRow[] {
  return Object.entries(changes).flatMap(([path, change]) => {
    const field = getSchemeUpdateField(path);
    if (!field) return [];
    const value = normaliseSchemeFieldValue(field, change.new);
    if (value === undefined) return [];
    return [{ path, include: true, aiValue: value, draft: toDraft(field, value), evidence: change.evidence }];
  });
}

const inputClass =
  'w-full rounded-xl bg-surface border border-border px-3 py-2 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary';

export default function SchemeAiUpdateModal({ scheme, pendingUpdate, onClose, onPublished }: SchemeAiUpdateModalProps) {
  const { user } = useAuth();

  const [step, setStep] = useState<'notice' | 'review'>(pendingUpdate ? 'review' : 'notice');
  const [noticeText, setNoticeText] = useState('');
  const [noticeUrl, setNoticeUrl] = useState(pendingUpdate?.sourceUrl || '');
  const [detecting, setDetecting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  const [summary, setSummary] = useState(pendingUpdate?.summaryOfChanges || pendingUpdate?.notes || '');
  const [source, setSource] = useState<NoticeSource | undefined>(pendingUpdate?.source);
  const [ignored, setIgnored] = useState(0);
  const [rows, setRows] = useState<ReviewRow[]>(() =>
    pendingUpdate ? rowsFromChanges(pendingUpdate.proposedChanges || {}) : []
  );
  const [fieldToAdd, setFieldToAdd] = useState('');

  const canDetect = noticeText.trim().length >= 20 || /^https?:\/\/\S+\.\S+/.test(noticeUrl.trim());

  const handleDetect = async () => {
    if (!user) {
      setError('Your admin session has expired. Please sign in again.');
      return;
    }
    setDetecting(true);
    setError('');
    try {
      const send = async (forceRefresh: boolean) =>
        fetch('/api/admin/schemes/draft', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await user.getIdToken(forceRefresh)}`,
          },
          body: JSON.stringify({ currentScheme: scheme, circularText: noticeText, sourceUrl: noticeUrl }),
        });
      let res = await send(false);
      if (res.status === 401 || res.status === 403) res = await send(true);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'The AI could not read this notice.');

      const draft = json.data as { summary: string; changes: SchemeChanges; source: NoticeSource; ignored: number };
      setSummary(draft.summary);
      setSource(draft.source);
      setIgnored(draft.ignored || 0);
      setRows(rowsFromChanges(draft.changes || {}));
      setStep('review');
    } catch (err) {
      setError(getErrorMessage(err, 'The AI could not read this notice. Please try again.'));
    } finally {
      setDetecting(false);
    }
  };

  const updateRow = (path: string, patch: Partial<ReviewRow>) =>
    setRows((prev) => prev.map((row) => (row.path === path ? { ...row, ...patch } : row)));

  const addField = () => {
    const field = getSchemeUpdateField(fieldToAdd);
    if (!field || rows.some((row) => row.path === field.path)) return;
    setRows((prev) => [
      ...prev,
      { path: field.path, include: true, aiValue: undefined, draft: toDraft(field, getPathValue(scheme, field.path)) },
    ]);
    setFieldToAdd('');
  };

  // Every row, read in its field's type and checked.
  const reviewed = rows.flatMap((row) => {
    const field = getSchemeUpdateField(row.path);
    if (!field) return [];
    const current = getPathValue(scheme, row.path);
    const value = fromDraft(field, row.draft);
    return [
      {
        row,
        field,
        current,
        value,
        problem: row.include ? validateSchemeChangeValue(field, value) : null,
        unchanged: schemeValuesEqual(value, current),
        editedFromAi: row.aiValue !== undefined && !schemeValuesEqual(value, row.aiValue),
      },
    ];
  });
  const toPublish = reviewed.filter((item) => item.row.include && !item.problem && !item.unchanged);
  const hasProblems = reviewed.some((item) => item.problem);
  const addableFields = SCHEME_UPDATE_FIELDS.filter((field) => !rows.some((row) => row.path === field.path));

  const handlePublish = async () => {
    if (!user || toPublish.length === 0 || hasProblems) return;
    setPublishing(true);
    setError('');
    try {
      const finalChanges = Object.fromEntries(
        toPublish.map((item) => [item.field.path, { old: item.current ?? null, new: item.value }])
      );
      const aiChanges = Object.fromEntries(
        reviewed
          .filter((item) => item.row.aiValue !== undefined)
          .map((item) => [
            item.field.path,
            {
              old: item.current ?? null,
              new: item.row.aiValue,
              ...(item.row.evidence ? { evidence: item.row.evidence } : {}),
            },
          ])
      );
      const editedByAdmin = reviewed.some(
        (item) => item.row.aiValue === undefined || item.editedFromAi || !item.row.include
      );

      await publishReviewedSchemeUpdate({
        schemeId: scheme.id,
        schemeName: scheme.name,
        adminId: user.uid,
        adminEmail: user.email || 'admin',
        sourceUrl: noticeUrl.trim(),
        source,
        summary,
        aiChanges,
        finalChanges,
        editedByAdmin,
        pendingUpdateId: pendingUpdate?.id,
      });
      const count = toPublish.length;
      onPublished(`"${scheme.name}" updated: ${count} ${count === 1 ? 'field' : 'fields'} changed in the scheme directory.`);
    } catch (err) {
      setError(getErrorMessage(err, 'The scheme could not be updated. Nothing was changed.'));
    } finally {
      setPublishing(false);
    }
  };

  const busy = detecting || publishing;

  // On document.body, so the animated page wrapper cannot push it off screen.
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scheme-ai-update-title"
    >
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-surface-elevated border border-border rounded-3xl shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-border">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              ✨ Update scheme with AI · {step === 'notice' ? 'Step 1 of 2: the notice' : 'Step 2 of 2: review and approve'}
            </p>
            <h3 id="scheme-ai-update-title" className="text-base font-bold text-foreground truncate">
              {scheme.name}
            </h3>
            <p className="text-[11px] text-muted font-mono truncate">{scheme.id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="text-muted hover:text-foreground text-xl font-bold px-2 rounded-lg disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div role="alert" className="p-3 rounded-xl bg-danger-light border border-danger/30 text-danger text-xs font-semibold">
              ⚠️ {error}
            </div>
          )}

          {step === 'notice' ? (
            <div className="space-y-4">
              <p className="text-xs text-muted leading-relaxed">
                Give the AI the new government notice for this scheme. It compares the notice with the scheme&apos;s
                current record and shows every change it finds, with the line of the notice that says so. You can
                edit anything before approving, and nothing is published until you do.
              </p>

              <div className="space-y-1.5">
                <label htmlFor="notice-text" className="text-xs font-bold text-foreground">
                  Notice or circular text
                </label>
                <textarea
                  id="notice-text"
                  rows={9}
                  value={noticeText}
                  onChange={(e) => setNoticeText(e.target.value)}
                  placeholder="Paste the circular, gazette notification or revised guideline here…"
                  className={`${inputClass} font-mono leading-relaxed`}
                />
              </div>

              <div className="flex items-center gap-3 text-[11px] text-muted">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="notice-url" className="text-xs font-bold text-foreground">
                  Link to the notice (web page or PDF)
                </label>
                <input
                  id="notice-url"
                  type="url"
                  value={noticeUrl}
                  onChange={(e) => setNoticeUrl(e.target.value)}
                  placeholder="https://…"
                  className={inputClass}
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] text-muted">
                    The AI reads the page or PDF itself. If you also paste text, the text is used and the link is kept
                    as the source.
                  </p>
                  {scheme.officialUrl && noticeUrl.trim() !== scheme.officialUrl && (
                    <button
                      type="button"
                      onClick={() => setNoticeUrl(scheme.officialUrl)}
                      className="text-[11px] font-bold text-primary hover:underline"
                    >
                      Use the official portal link
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-foreground space-y-1">
                <p className="font-bold">
                  {pendingUpdate ? 'Proposal from the review queue' : 'What the AI found'}
                </p>
                <p className="leading-relaxed">{summary || 'No summary was given.'}</p>
                <p className="text-[11px] text-muted">
                  {source === 'pdf' ? 'Read from a PDF' : source === 'page' ? 'Read from a web page' : source === 'text' ? 'Read from pasted text' : 'Source'}
                  {noticeUrl.trim() ? ` · ${noticeUrl.trim()}` : ''}
                  {ignored > 0 ? ` · ${ignored} reported ${ignored === 1 ? 'change was' : 'changes were'} left out because the field is unknown or the value matches the current record` : ''}
                </p>
              </div>

              {reviewed.length === 0 && (
                <div className="p-5 rounded-2xl border border-dashed border-border text-center text-xs text-muted">
                  The AI found nothing in this notice that changes this scheme. You can still change a field yourself
                  below.
                </div>
              )}

              {reviewed.map(({ row, field, current, problem, unchanged, editedFromAi }) => {
                const inputId = `scheme-change-${field.path}`;
                return (
                  <div
                    key={field.path}
                    className={`rounded-2xl border overflow-hidden ${row.include ? 'border-border' : 'border-border/50 opacity-60'}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-surface border-b border-border">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{field.label}</span>
                        <span className="text-[10px] font-mono text-muted">{field.path}</span>
                        {row.aiValue === undefined ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            Added by you
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            AI detected
                          </span>
                        )}
                        {editedFromAi && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                            Edited
                          </span>
                        )}
                      </div>
                      <label className="flex items-center gap-2 text-[11px] font-semibold text-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={row.include}
                          onChange={(e) => updateRow(row.path, { include: e.target.checked })}
                          className="h-4 w-4 accent-primary cursor-pointer"
                        />
                        Include in update
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                      <div className="p-3.5 space-y-1 bg-danger-light/20">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-danger block">
                          Current value
                        </span>
                        <div className="text-xs text-foreground leading-relaxed break-words whitespace-pre-wrap">
                          {formatSchemeValue(current)}
                        </div>
                      </div>

                      <div className="p-3.5 space-y-1.5 bg-emerald-50/50 dark:bg-emerald-950/20">
                        <label htmlFor={inputId} className="text-[10px] font-bold uppercase tracking-wider text-success block">
                          New value {field.kind === 'list' ? '(one item per line)' : ''}
                        </label>
                        {field.kind === 'longtext' || field.kind === 'list' ? (
                          <textarea
                            id={inputId}
                            rows={field.kind === 'list' ? 5 : 4}
                            value={row.draft}
                            disabled={!row.include}
                            onChange={(e) => updateRow(row.path, { draft: e.target.value })}
                            className={inputClass}
                          />
                        ) : field.kind === 'select' || field.kind === 'boolean' ? (
                          <select
                            id={inputId}
                            value={row.draft}
                            disabled={!row.include}
                            onChange={(e) => updateRow(row.path, { draft: e.target.value })}
                            className={inputClass}
                          >
                            {(field.kind === 'boolean'
                              ? [
                                  { value: 'true', label: 'Yes' },
                                  { value: 'false', label: 'No' },
                                ]
                              : field.options || []
                            ).map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            id={inputId}
                            type="text"
                            inputMode={field.kind === 'number' ? 'decimal' : undefined}
                            value={row.draft}
                            disabled={!row.include}
                            onChange={(e) => updateRow(row.path, { draft: e.target.value })}
                            aria-invalid={Boolean(problem)}
                            className={inputClass}
                          />
                        )}
                        {problem && <p className="text-[11px] font-semibold text-danger">{problem}</p>}
                        {!problem && row.include && unchanged && (
                          <p className="text-[11px] text-muted">Same as the current value, so it will not be changed.</p>
                        )}
                        <div className="flex flex-wrap gap-3">
                          {editedFromAi && (
                            <button
                              type="button"
                              onClick={() => updateRow(row.path, { draft: toDraft(field, row.aiValue) })}
                              className="text-[11px] font-bold text-primary hover:underline"
                            >
                              Reset to the AI&apos;s value
                            </button>
                          )}
                          {row.aiValue === undefined && (
                            <button
                              type="button"
                              onClick={() => setRows((prev) => prev.filter((item) => item.path !== row.path))}
                              className="text-[11px] font-bold text-danger hover:underline"
                            >
                              Remove this change
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {row.evidence && (
                      <p className="px-4 py-2 text-[11px] text-muted border-t border-border bg-surface/40">
                        <span className="font-semibold text-foreground">From the notice:</span> &ldquo;{row.evidence}&rdquo;
                      </p>
                    )}
                  </div>
                );
              })}

              {addableFields.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-end gap-2 p-3.5 rounded-2xl bg-surface border border-border">
                  <div className="flex-1 space-y-1">
                    <label htmlFor="scheme-add-field" className="text-xs font-bold text-foreground">
                      Change another field
                    </label>
                    <select
                      id="scheme-add-field"
                      value={fieldToAdd}
                      onChange={(e) => setFieldToAdd(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Choose a field the AI did not change…</option>
                      {addableFields.map((field) => (
                        <option key={field.path} value={field.path}>
                          {field.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button type="button" variant="outline" size="sm" disabled={!fieldToAdd} onClick={addField}>
                    + Add
                  </Button>
                </div>
              )}

              <p className="text-[11px] text-muted leading-relaxed">
                🛡️ Approving updates the live scheme directory straight away and marks the scheme verified today. The
                audit log keeps what the AI proposed, what you published, and who approved it.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-t border-border">
          <div>
            {step === 'review' && !pendingUpdate && (
              <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setStep('notice')}>
                ← Back to the notice
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onClose}>
              Cancel
            </Button>
            {step === 'notice' ? (
              <Button type="button" size="sm" isLoading={detecting} disabled={!canDetect} onClick={handleDetect}>
                ✨ Detect changes with AI
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                isLoading={publishing}
                disabled={toPublish.length === 0 || hasProblems}
                onClick={handlePublish}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                ✓ Approve &amp; update scheme{toPublish.length ? ` (${toPublish.length})` : ''}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
