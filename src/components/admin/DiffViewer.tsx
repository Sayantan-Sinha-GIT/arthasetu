'use client';

interface DiffViewerProps {
  proposedChanges: Record<string, { old: any; new: any }>;
  schemeName?: string;
}

export default function DiffViewer({ proposedChanges, schemeName }: DiffViewerProps) {
  const changeKeys = Object.keys(proposedChanges || {});

  if (changeKeys.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-surface border border-border text-center text-xs text-muted">
        No modifications detected between the proposed circular and the current live scheme record.
      </div>
    );
  }

  const formatValue = (val: any): string => {
    if (val === undefined || val === null) return 'None';
    if (Array.isArray(val)) return val.join(', ');
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    return String(val);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-saffron-100 text-saffron-800 dark:bg-saffron-950 dark:text-saffron-300 border border-saffron-300 dark:border-saffron-700">
            {changeKeys.length} Modified {changeKeys.length === 1 ? 'Field' : 'Fields'}
          </span>
          {schemeName && (
            <span className="text-xs font-semibold text-foreground">
              for {schemeName}
            </span>
          )}
        </div>
        <span className="text-[11px] text-muted italic">
          💡 Review all changes carefully before approving to live DB
        </span>
      </div>

      <div className="space-y-3">
        {changeKeys.map((fieldKey) => {
          const { old: oldVal, new: newVal } = proposedChanges[fieldKey];
          const isObjectOrArray = Array.isArray(newVal) || (typeof newVal === 'object' && newVal !== null);

          return (
            <div
              key={fieldKey}
              className="rounded-2xl border border-border bg-surface-elevated overflow-hidden shadow-sm"
            >
              {/* Field Header */}
              <div className="px-4 py-2 bg-surface border-b border-border flex items-center justify-between">
                <span className="text-xs font-bold text-foreground font-mono">
                  {fieldKey}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  Modified
                </span>
              </div>

              {/* Side-by-Side Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                {/* BEFORE / CURRENT */}
                <div className="p-3.5 space-y-1 bg-danger-light/20">
                  <span className="text-[10px] font-bold uppercase text-danger tracking-wider block">
                    🔴 Current Live Value (Before)
                  </span>
                  <div className="text-xs text-foreground font-mono leading-relaxed break-words whitespace-pre-wrap">
                    {formatValue(oldVal)}
                  </div>
                </div>

                {/* AFTER / PROPOSED */}
                <div className="p-3.5 space-y-1 bg-emerald-50/50 dark:bg-emerald-950/20">
                  <span className="text-[10px] font-bold uppercase text-success tracking-wider block">
                    🟢 Proposed New Value (After)
                  </span>
                  <div className="text-xs text-foreground font-bold font-mono leading-relaxed break-words whitespace-pre-wrap text-emerald-800 dark:text-emerald-300">
                    {formatValue(newVal)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
