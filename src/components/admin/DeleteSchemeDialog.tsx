'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getErrorMessage } from '@/lib/utils/errors';

interface DeleteSchemeDialogProps {
  scheme: { id: string; name: string };
  onClose: () => void;
  onDeleted: (message: string) => void;
}

/**
 * Confirms and performs a permanent scheme deletion. Shared by the admin
 * dashboard, the schemes directory and the edit page, so all three delete the
 * same way; the dashboard and the edit page used to have no delete at all.
 */
export default function DeleteSchemeDialog({ scheme, onClose, onDeleted }: DeleteSchemeDialogProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deleting, onClose]);

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      if (!user) throw new Error('Admin session expired. Please log in again.');
      const token = await user.getIdToken(true);
      const res = await fetch('/api/admin/schemes/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ schemeId: scheme.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to delete the scheme (status ${res.status}).`);
      }
      onDeleted(data.message || `Scheme "${scheme.name}" was permanently deleted.`);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete the scheme. Please try again.'));
      setDeleting(false);
    }
  };

  // Rendered on document.body: the admin pages animate in with a transform, and a
  // fixed element inside a transformed ancestor is positioned against that
  // ancestor, so on a long page the dialog sat far below the screen while its
  // dark backdrop covered everything.
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={() => !deleting && onClose()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-scheme-title"
        className="w-full max-w-md bg-surface-elevated border border-danger/30 rounded-3xl p-6 shadow-2xl space-y-5 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-danger/10 text-danger flex items-center justify-center text-xl shrink-0">
            🗑️
          </div>
          <div>
            <h3 id="delete-scheme-title" className="text-base font-bold text-foreground">
              {t.admin.deleteSchemeTitle || 'Permanent Scheme Deletion'}
            </h3>
            <p className="text-xs text-muted">
              {t.admin.deleteSchemeSubtitle || 'Destructive action logged to admin audit trail'}
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-danger-light/30 border border-danger/20 text-xs text-danger-dark dark:text-danger space-y-1.5">
          <p className="font-bold">Scheme to delete:</p>
          <p className="font-semibold text-foreground">{scheme.name}</p>
          <p className="font-mono text-[11px] opacity-80">ID: {scheme.id}</p>
          <p className="pt-1 leading-relaxed opacity-95">
            <strong>Warning:</strong> This cannot be undone. The scheme disappears from the directory and the advisor
            straight away, and its pending AI proposals and cached explanations are removed too.
          </p>
        </div>

        {error && (
          <div role="alert" className="p-3 rounded-xl bg-danger-light border border-danger/30 text-danger text-xs flex items-center gap-2">
            <span>⚠️</span>
            <span className="font-bold">{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" size="sm" disabled={deleting} onClick={onClose}>
            {t.common.cancel || 'Cancel'}
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            isLoading={deleting}
            onClick={handleDelete}
            className="shadow-md font-bold"
          >
            {t.admin.confirmDeleteScheme || 'Confirm & Delete Scheme'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
