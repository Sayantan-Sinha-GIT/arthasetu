'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import {
  formatIsoToDisplay,
  formatToIso,
  getAgeFromDob,
  getSelectableYearRange,
  MIN_AGE_YEARS,
  MAX_AGE_YEARS,
} from '@/lib/utils/date';

interface DatePickerProps {
  label?: string;
  value?: string; // ISO string: YYYY-MM-DD
  onChange: (isoValue: string) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  value,
  onChange,
  error,
  helperText,
  required,
  disabled,
  placeholder = 'DD-MM-YYYY',
  className = '',
  id: customId,
}) => {
  const autoId = useId();
  const id = customId || autoId;
  const containerRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);

  // Year bounds derived strictly from MIN_AGE (18) and MAX_AGE (100)
  const { minYear, maxYear } = getSelectableYearRange();

  // Parse current selected value or default viewing date
  const parsedDate = value ? new Date(value + 'T00:00:00') : null;
  const initialYear = parsedDate && !isNaN(parsedDate.getTime())
    ? parsedDate.getFullYear()
    : maxYear; // Default view to latest eligible year (e.g. 18-year-old)
  const initialMonth = parsedDate && !isNaN(parsedDate.getTime())
    ? parsedDate.getMonth()
    : 0;

  const [viewYear, setViewYear] = useState<number>(initialYear);
  const [viewMonth, setViewMonth] = useState<number>(initialMonth);

  // Sync view when `value` changes externally. Adjusted during render (React's
  // recommended pattern for "state derived from a prop") rather than in an
  // effect, since this has no async/subscription component — see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }

  // Close calendar popover on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Generate selectable year list (descending from maxYear down to minYear)
  const selectableYears: number[] = [];
  for (let y = maxYear; y >= minYear; y--) {
    selectableYears.push(y);
  }

  // Calculate calendar grid days
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  // Max selectable date: exactly 18 years ago today
  const today = new Date();
  const maxSelectableDate = new Date(
    today.getFullYear() - MIN_AGE_YEARS,
    today.getMonth(),
    today.getDate()
  );
  // Min selectable date: exactly 100 years ago today
  const minSelectableDate = new Date(
    today.getFullYear() - MAX_AGE_YEARS,
    today.getMonth(),
    today.getDate()
  );

  const handleSelectDay = (day: number) => {
    const selectedDate = new Date(viewYear, viewMonth, day);
    if (selectedDate > maxSelectableDate || selectedDate < minSelectableDate) {
      return;
    }
    const isoString = formatToIso(viewYear, viewMonth, day);
    onChange(isoString);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      if (viewYear > minYear) {
        setViewYear(viewYear - 1);
        setViewMonth(11);
      }
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      if (viewYear < maxYear) {
        setViewYear(viewYear + 1);
        setViewMonth(0);
      }
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const displayValue = formatIsoToDisplay(value);
  const derivedAge = getAgeFromDob(value);

  return (
    <div className={`relative flex flex-col gap-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </span>
          {derivedAge !== null && (
            <span className="text-xs font-normal text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Age: {derivedAge} yrs
            </span>
          )}
        </label>
      )}

      {/* Trigger Input Box */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`w-full text-left px-3.5 py-2.5 rounded-xl border bg-white dark:bg-surface text-slate-900 dark:text-slate-100 font-medium transition-all shadow-sm flex items-center justify-between ${
          error
            ? 'border-red-500 focus:ring-2 focus:ring-red-500/20'
            : isOpen
            ? 'border-emerald-600 ring-2 ring-emerald-600/20'
            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : 'cursor-pointer'}`}
      >
        <span className={displayValue ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}>
          {displayValue || placeholder}
        </span>
        <span className="text-slate-400 dark:text-slate-500 text-lg select-none" aria-hidden="true">
          📅
        </span>
      </button>

      {/* Popover Calendar Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Date of Birth Picker"
          className="absolute z-50 top-full left-0 mt-2 w-full min-w-[290px] sm:min-w-[320px] max-w-[340px] bg-white dark:bg-surface rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header Controls (Month & Year Dropdowns + Navigation Arrows) */}
          <div className="flex items-center justify-between gap-1 mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold transition-colors text-sm"
              aria-label="Previous Month"
            >
              ◀
            </button>

            <div className="flex items-center gap-1.5">
              {/* Month Dropdown */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold py-1 px-2 rounded-lg border-0 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                aria-label="Select Month"
              >
                {MONTH_NAMES.map((name, index) => (
                  <option key={name} value={index}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Year Dropdown (Strictly bounded from 18 to 100 years old) */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold py-1 px-2 rounded-lg border-0 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                aria-label="Select Year"
              >
                {selectableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold transition-colors text-sm"
              aria-label="Next Month"
            >
              ▶
            </button>
          </div>

          {/* Weekday Column Headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-1">
            {DAY_LABELS.map((day) => (
              <div key={day} className="py-0.5">
                {day}
              </div>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Blank offset days */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`blank-${i}`} className="h-8" />
            ))}

            {/* Days of current month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const cellDate = new Date(viewYear, viewMonth, dayNum);
              const isEligible = cellDate <= maxSelectableDate && cellDate >= minSelectableDate;
              const isSelected =
                parsedDate &&
                parsedDate.getFullYear() === viewYear &&
                parsedDate.getMonth() === viewMonth &&
                parsedDate.getDate() === dayNum;

              return (
                <button
                  key={dayNum}
                  type="button"
                  disabled={!isEligible}
                  onClick={() => handleSelectDay(dayNum)}
                  className={`h-8 w-8 mx-auto rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-md font-bold'
                      : isEligible
                      ? 'text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-300'
                      : 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-40'
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Footer Notice */}
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Min age: 18 yrs</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs font-medium text-red-500 mt-0.5">{error}</p>}
      {helperText && !error && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{helperText}</p>
      )}
    </div>
  );
};
