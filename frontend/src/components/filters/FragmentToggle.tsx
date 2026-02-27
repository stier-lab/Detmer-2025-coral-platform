import clsx from 'clsx';

type FragmentStatus = 'all' | 'Y' | 'N';

interface FragmentToggleProps {
  value: FragmentStatus;
  onChange: (value: FragmentStatus) => void;
  className?: string;
  showWarning?: boolean;
  fragmentPct?: number;
}

/**
 * FragmentToggle - Prominent toggle for separating fragments from colonies
 *
 * Per PRD v2.0: "Separate fragments from colonies - Toggle to analyze separately"
 * This is critical because fragment vs. colony status confounds size-survival relationships.
 */
export function FragmentToggle({
  value,
  onChange,
  className,
  showWarning = true,
  fragmentPct,
}: FragmentToggleProps) {
  return (
    <div className={clsx('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <span id="data-source-label" className="text-sm font-medium text-ocean-deep">Data Source:</span>
        <div role="group" aria-labelledby="data-source-label" className="flex bg-white rounded-lg border border-border-medium p-0.5">
          {(['all', 'N', 'Y'] as const).map((status) => (
            <button
              key={status}
              aria-pressed={value === status}
              onClick={() => onChange(status)}
              className={clsx(
                'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                value === status
                  ? 'bg-ocean-mid text-white shadow-sm'
                  : 'text-text-secondary hover:bg-gray-100'
              )}
            >
              {status === 'all' ? 'All' : status === 'N' ? 'Colonies Only' : 'Fragments Only'}
            </button>
          ))}
        </div>
      </div>

      {/* Show warning when mixed data is displayed */}
      {showWarning && value === 'all' && fragmentPct !== undefined && fragmentPct > 5 && fragmentPct < 95 && (
        <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
          <svg className="w-4 h-4 mt-0.5 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>
            <strong>Mixed data:</strong> {fragmentPct.toFixed(0)}% fragments, {(100 - fragmentPct).toFixed(0)}% colonies.
            Fragment survival differs from colony survival within the same size class.
            {' '}
            <button
              onClick={() => onChange('N')}
              className="underline hover:text-amber-900"
            >
              View colonies only
            </button>
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * InlineFragmentToggle - Compact version for chart headers
 */
interface InlineFragmentToggleProps {
  value: FragmentStatus;
  onChange: (value: FragmentStatus) => void;
  className?: string;
}

export function InlineFragmentToggle({ value, onChange, className }: InlineFragmentToggleProps) {
  return (
    <div role="group" aria-label="Data source filter" className={clsx('inline-flex bg-gray-100 rounded-md p-0.5', className)}>
      {(['all', 'N', 'Y'] as const).map((status) => (
        <button
          key={status}
          aria-pressed={value === status}
          onClick={() => onChange(status)}
          className={clsx(
            'px-2 py-1 rounded text-xs font-medium transition-colors',
            value === status
              ? 'bg-white text-ocean-deep shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
          title={
            status === 'all'
              ? 'Show all data'
              : status === 'N'
              ? 'Show colonies only (intact corals)'
              : 'Show fragments only (coral pieces)'
          }
        >
          {status === 'all' ? 'All' : status === 'N' ? 'Colonies' : 'Fragments'}
        </button>
      ))}
    </div>
  );
}
