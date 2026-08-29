'use client';

import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  wrapperClassName?: string;
  showPasswordToggle?: boolean;
  showPasswordAriaLabel?: string;
  hidePasswordAriaLabel?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      icon,
      type = 'text',
      wrapperClassName = '',
      className = '',
      id,
      showPasswordToggle = true,
      showPasswordAriaLabel,
      hidePasswordAriaLabel,
      ...props
    },
    ref
  ) => {
    let t: any = null;
    try {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const lang = useLanguage();
      t = lang?.t;
    } catch {}

    const resolvedShowLabel = showPasswordAriaLabel || t?.auth?.showPassword || 'Show password';
    const resolvedHideLabel = hidePasswordAriaLabel || t?.auth?.hidePassword || 'Hide password';

    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const isPasswordField = type === 'password';
    const effectiveType = isPasswordField && isPasswordVisible ? 'text' : type;
    const hasPasswordToggle = isPasswordField && showPasswordToggle;

    return (
      <div className={`space-y-1.5 ${wrapperClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            type={effectiveType}
            className={`
              w-full rounded-xl border bg-surface-elevated text-foreground
              placeholder:text-muted-foreground
              transition-all duration-200 ease-smooth
              focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
              disabled:opacity-50 disabled:cursor-not-allowed
              ${icon ? 'pl-10' : 'pl-4'}
              ${hasPasswordToggle ? 'pr-11' : 'pr-4'}
              py-2.5 text-sm
              ${error
                ? 'border-danger focus:ring-danger/40 focus:border-danger'
                : 'border-border hover:border-muted'
              }
              ${className}
            `}
            {...props}
          />
          {hasPasswordToggle && (
            <button
              type="button"
              onClick={() => setIsPasswordVisible((prev) => !prev)}
              aria-label={isPasswordVisible ? resolvedHideLabel : resolvedShowLabel}
              aria-pressed={isPasswordVisible}
              className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] p-2 flex items-center justify-center rounded-lg text-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors cursor-pointer"
              tabIndex={0}
            >
              {isPasswordVisible ? (
                <svg
                  className="w-4 h-4 sm:w-4.5 sm:h-4.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 sm:w-4.5 sm:h-4.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          )}
        </div>
        {error && (
          <p className="text-xs text-danger flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-xs text-muted">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;

// ─── Select Component ───
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  wrapperClassName?: string;
}

export function Select({
  label,
  error,
  options,
  wrapperClassName = '',
  className = '',
  id,
  ...props
}: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`space-y-1.5 ${wrapperClassName}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-foreground"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`
          w-full rounded-xl border border-border bg-surface-elevated text-foreground
          px-4 py-2.5 text-sm appearance-none
          transition-all duration-200 ease-smooth
          focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
          hover:border-muted
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-danger' : ''}
          ${className}
        `}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-xs text-danger">{error}</p>
      )}
    </div>
  );
}

// ─── Textarea Component ───
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
}

export function Textarea({
  label,
  error,
  wrapperClassName = '',
  className = '',
  id,
  ...props
}: TextareaProps) {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`space-y-1.5 ${wrapperClassName}`}>
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`
          w-full rounded-xl border border-border bg-surface-elevated text-foreground
          placeholder:text-muted-foreground
          px-4 py-2.5 text-sm min-h-[100px] resize-y
          transition-all duration-200 ease-smooth
          focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
          hover:border-muted
          ${error ? 'border-danger' : ''}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

// ─── NumberInput Component ───
interface NumberInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: string;
  wrapperClassName?: string;
}

export function NumberInput({
  label,
  error,
  hint,
  prefix,
  wrapperClassName = '',
  className = '',
  id,
  ...props
}: NumberInputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`space-y-1.5 ${wrapperClassName}`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        {prefix && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted font-semibold text-xs">
            {prefix}
          </span>
        )}
        <input
          type="number"
          id={inputId}
          className={`
            w-full rounded-xl border border-border bg-surface-elevated text-foreground
            placeholder:text-muted-foreground
            transition-all duration-200 ease-smooth
            focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
            hover:border-muted
            disabled:opacity-50 disabled:cursor-not-allowed
            ${prefix ? 'pl-8' : 'pl-4'} pr-4 py-2.5 text-sm
            ${error ? 'border-danger focus:ring-danger/40' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
