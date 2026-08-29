'use client';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
  onStepClick?: (step: number) => void;
}

export default function ProgressBar({
  currentStep,
  totalSteps,
  stepTitles,
  onStepClick,
}: ProgressBarProps) {
  const percentage = Math.round(((currentStep + 1) / totalSteps) * 100);

  return (
    <div className="w-full mb-8">
      {/* Top indicator & percentage */}
      <div className="flex items-center justify-between text-xs font-semibold text-muted mb-2">
        <span className="text-primary font-bold">
          Step {currentStep + 1} of {totalSteps}: {stepTitles[currentStep]}
        </span>
        <span>{percentage}% completed</span>
      </div>

      {/* Progress Bar Track */}
      <div className="w-full bg-surface-elevated border border-border h-2.5 rounded-full overflow-hidden">
        <div
          className="bg-gradient-to-r from-saffron-500 to-primary h-full rounded-full transition-all duration-500 ease-smooth"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Step Pills */}
      <div className="grid grid-cols-4 gap-2 mt-4">
        {stepTitles.map((title, idx) => {
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onStepClick && idx <= currentStep && onStepClick(idx)}
              disabled={idx > currentStep}
              className={`
                flex items-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium text-left transition-all
                ${isCurrent
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : isCompleted
                  ? 'bg-surface text-foreground hover:bg-surface-elevated cursor-pointer'
                  : 'text-muted-foreground opacity-50 cursor-not-allowed'
                }
              `}
            >
              <span
                className={`
                  w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0
                  ${isCurrent
                    ? 'bg-primary text-primary-foreground'
                    : isCompleted
                    ? 'bg-success text-white'
                    : 'bg-border text-muted'
                  }
                `}
              >
                {isCompleted ? '✓' : idx + 1}
              </span>
              <span className="truncate hidden sm:inline">{title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
