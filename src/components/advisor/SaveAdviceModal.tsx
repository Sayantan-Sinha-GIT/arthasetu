'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input, { Select } from '@/components/ui/Input';
import { useLanguage } from '@/contexts/LanguageContext';
import { saveAdvice } from '@/lib/firestore/advice';

interface SaveAdviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  content: string;
  businessContext: string;
  onSaved?: () => void;
}

export default function SaveAdviceModal({
  isOpen,
  onClose,
  userId,
  content,
  businessContext,
  onSaved,
}: SaveAdviceModalProps) {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('business-strategy');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const categories = [
    { value: 'business-strategy', label: t.advisor.catBusiness },
    { value: 'financial-guidance', label: t.advisor.catFinancial },
    { value: 'government-schemes', label: t.advisor.catSchemes },
    { value: 'market-customers', label: t.advisor.catMarket },
    { value: 'general', label: t.advisor.catGeneral },
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !content) return;
    setSaving(true);
    setError('');

    try {
      await saveAdvice(userId, {
        title: title.trim() || t.advisor.defaultTitle,
        category,
        content,
        businessContext,
      });
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save advice:', err);
      setError(t.errors.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.advisor.saveAdvice}
      size="md"
    >
      <form onSubmit={handleSave} className="space-y-4">
        <Input
          label={t.advisor.adviceTitle}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t.advisor.adviceTitlePlaceholder}
          required
        />

        <Select
          label={t.advisor.category}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={categories}
        />

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-muted">
            {t.advisor.snippetPreview}
          </label>
          <div className="p-3 rounded-xl bg-surface border border-border text-xs text-muted max-h-32 overflow-y-auto leading-relaxed whitespace-pre-wrap">
            {content}
          </div>
        </div>

        {error && (
          <p className="text-xs text-danger">{error}</p>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            {t.common.cancel}
          </Button>
          <Button type="submit" isLoading={saving}>
            {t.common.save}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
