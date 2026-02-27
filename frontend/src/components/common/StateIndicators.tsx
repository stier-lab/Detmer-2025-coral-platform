import clsx from 'clsx';

// Reusable icons for state indicators
const EmptyIcon = ({ className }: { className?: string }) => (
  <svg className={clsx('w-12 h-12', className)} viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" opacity="0.3" />
    <path d="M16 24h16M24 16v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
  </svg>
);

const ErrorIcon = ({ className }: { className?: string }) => (
  <svg className={clsx('w-12 h-12', className)} viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" opacity="0.3" />
    <path d="M24 16v10M24 30v2" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const NoDataIcon = ({ className }: { className?: string }) => (
  <svg className={clsx('w-12 h-12', className)} viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <rect x="8" y="12" width="32" height="24" rx="2" stroke="currentColor" strokeWidth="2" opacity="0.3" />
    <path d="M14 22h8M14 28h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    <circle cx="35" cy="25" r="6" stroke="currentColor" strokeWidth="2" opacity="0.5" />
    <path d="M39 29l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
  </svg>
);

const FilterIcon = ({ className }: { className?: string }) => (
  <svg className={clsx('w-12 h-12', className)} viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <path d="M8 12h32l-12 14v10l-8 4V26L8 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
  </svg>
);

export type EmptyStateVariant = 'default' | 'no-data' | 'no-results' | 'filter';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const variantDefaults: Record<EmptyStateVariant, { title: string; description: string; Icon: React.FC<{ className?: string }> }> = {
  default: {
    title: 'No data available',
    description: 'There is no data to display at this time.',
    Icon: EmptyIcon,
  },
  'no-data': {
    title: 'No observations found',
    description: 'No coral observations match the current criteria.',
    Icon: NoDataIcon,
  },
  'no-results': {
    title: 'No results',
    description: 'Try adjusting your search or filter criteria.',
    Icon: NoDataIcon,
  },
  filter: {
    title: 'No matching data',
    description: 'The current filters exclude all available data. Try broadening your selection.',
    Icon: FilterIcon,
  },
};

export function EmptyState({
  variant = 'default',
  title,
  description,
  action,
  className,
  size = 'md',
}: EmptyStateProps) {
  const defaults = variantDefaults[variant];
  const displayTitle = title ?? defaults.title;
  const displayDescription = description ?? defaults.description;
  const Icon = defaults.Icon;

  const sizes = {
    sm: { icon: 'w-8 h-8', title: 'text-sm', desc: 'text-xs', padding: 'py-4 px-3' },
    md: { icon: 'w-12 h-12', title: 'text-base', desc: 'text-sm', padding: 'py-8 px-6' },
    lg: { icon: 'w-16 h-16', title: 'text-lg', desc: 'text-base', padding: 'py-12 px-8' },
  };

  const sizeStyles = sizes[size];

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center text-center',
        sizeStyles.padding,
        className
      )}
      role="status"
      aria-label={displayTitle}
    >
      <Icon className={clsx(sizeStyles.icon, 'text-text-secondary mb-3')} />
      <h3 className={clsx('font-medium text-text-primary mb-1', sizeStyles.title)}>
        {displayTitle}
      </h3>
      <p className={clsx('text-text-secondary max-w-sm', sizeStyles.desc)}>
        {displayDescription}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export type ErrorSeverity = 'warning' | 'error' | 'info';

interface ErrorStateProps {
  severity?: ErrorSeverity;
  title?: string;
  message?: string;
  error?: Error | null;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

const severityStyles: Record<ErrorSeverity, { bg: string; border: string; icon: string; text: string }> = {
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'text-amber-500',
    text: 'text-amber-800',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-500',
    text: 'text-red-800',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-500',
    text: 'text-blue-800',
  },
};

export function ErrorState({
  severity = 'error',
  title,
  message,
  error,
  onRetry,
  className,
  compact = false,
}: ErrorStateProps) {
  const styles = severityStyles[severity];
  const displayTitle = title ?? (severity === 'error' ? 'Something went wrong' : severity === 'warning' ? 'Warning' : 'Information');
  const displayMessage = message ?? error?.message ?? 'An unexpected error occurred. Please try again.';

  if (compact) {
    return (
      <div
        className={clsx(
          'flex items-center gap-3 px-4 py-3 rounded-lg border',
          styles.bg,
          styles.border,
          className
        )}
        role="alert"
      >
        <ErrorIcon className={clsx('w-5 h-5 flex-shrink-0', styles.icon)} />
        <p className={clsx('text-sm', styles.text)}>{displayMessage}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="ml-auto text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ocean-light rounded"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center text-center py-8 px-6',
        className
      )}
      role="alert"
    >
      <div className={clsx('w-16 h-16 rounded-full flex items-center justify-center mb-4', styles.bg)}>
        <ErrorIcon className={clsx('w-8 h-8', styles.icon)} />
      </div>
      <h3 className={clsx('font-semibold text-lg mb-2', styles.text)}>
        {displayTitle}
      </h3>
      <p className="text-text-secondary text-sm max-w-md mb-4">
        {displayMessage}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-ocean-medium text-white rounded-lg hover:bg-ocean-deep transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ocean-light"
        >
          Try again
        </button>
      )}
    </div>
  );
}

// Loading skeleton components for different content types
interface SkeletonCardProps {
  className?: string;
  lines?: number;
}

export function SkeletonCard({ className, lines = 3 }: SkeletonCardProps) {
  return (
    <div className={clsx('bg-white rounded-xl p-6 shadow-soft animate-pulse', className)}>
      <div className="h-5 bg-sand-warm rounded w-1/3 mb-4" />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-sand-warm rounded mb-2"
          style={{ width: `${85 - i * 15}%` }}
        />
      ))}
    </div>
  );
}

interface SkeletonChartProps {
  className?: string;
  height?: number;
}

export function SkeletonChart({ className, height = 300 }: SkeletonChartProps) {
  return (
    <div
      className={clsx('bg-white rounded-xl p-6 shadow-soft animate-pulse', className)}
      style={{ height }}
    >
      <div className="h-5 bg-sand-warm rounded w-1/4 mb-6" />
      <div className="flex items-end justify-around h-[calc(100%-60px)] gap-2">
        {[65, 80, 45, 90, 60, 75, 50].map((h, i) => (
          <div
            key={i}
            className="bg-sand-warm rounded-t flex-1"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

interface SkeletonStatProps {
  className?: string;
}

export function SkeletonStat({ className }: SkeletonStatProps) {
  return (
    <div className={clsx('bg-white rounded-xl p-6 shadow-soft animate-pulse', className)}>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-sand-warm rounded-lg" />
        <div className="flex-1">
          <div className="h-4 bg-sand-warm rounded w-1/2 mb-2" />
          <div className="h-6 bg-sand-warm rounded w-3/4" />
        </div>
      </div>
    </div>
  );
}
