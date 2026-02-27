import { ReactNode } from 'react';
import clsx from 'clsx';

// Premium loading skeleton with shimmer - defined outside component to avoid re-creation on each render
function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-8 w-20 rounded-lg skeleton-premium" />
      <div className="h-3 w-16 rounded skeleton-premium" />
    </div>
  );
}

interface StatCardProps {
  value: string | number;
  label: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  format?: 'number' | 'percent' | 'string';
  suffix?: string;
  isLoading?: boolean;
  className?: string;
  valueClassName?: string;
  variant?: 'default' | 'compact' | 'featured';
}

export function StatCard({
  value,
  label,
  icon,
  trend,
  format = 'number',
  suffix,
  isLoading = false,
  className,
  valueClassName,
  variant = 'default',
}: StatCardProps) {
  const formatValue = (val: string | number): string => {
    if (typeof val === 'string') return val;
    if (format === 'percent') return `${(val * 100).toFixed(0)}%`;
    if (format === 'number') return val.toLocaleString();
    return String(val);
  };

  if (variant === 'featured') {
    return (
      <div
        className={clsx(
          'relative overflow-hidden',
          'bg-gradient-to-br from-white via-white to-ocean-light/5',
          'rounded-2xl p-6',
          'border border-border-medium/50',
          'shadow-sm hover:shadow-lg',
          'transition-all duration-300 ease-out',
          'group',
          className
        )}
      >
        {/* Decorative accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-reef-green via-bioluminescent to-ocean-light opacity-80" />

        {/* Background glow on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-bioluminescent/0 to-ocean-light/0 group-hover:from-bioluminescent/5 group-hover:to-ocean-light/5 transition-all duration-500" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <LoadingSkeleton />
            ) : (
              <>
                <p
                  className={clsx(
                    'text-3xl font-display font-semibold text-ocean-deep tracking-tight',
                    valueClassName
                  )}
                >
                  {formatValue(value)}
                  {suffix && <span className="text-lg text-text-secondary ml-1">{suffix}</span>}
                </p>
                <p className="text-sm text-text-secondary mt-2 font-body">
                  {label}
                </p>
              </>
            )}
          </div>

          {icon && !isLoading && (
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-ocean-light/10 to-reef-green/10 flex items-center justify-center text-ocean-mid group-hover:scale-110 transition-transform duration-300">
              {icon}
            </div>
          )}
        </div>

        {trend && !isLoading && (
          <div
            className={clsx(
              'mt-4 pt-3 border-t border-border-light/50',
              'text-sm font-medium flex items-center gap-2',
              trend === 'up' && 'text-reef-green',
              trend === 'down' && 'text-coral-warm',
              trend === 'neutral' && 'text-text-muted'
            )}
          >
            <span className={clsx(
              'w-6 h-6 rounded-full flex items-center justify-center',
              trend === 'up' && 'bg-reef-green/10',
              trend === 'down' && 'bg-coral-warm/10',
              trend === 'neutral' && 'bg-text-muted/10'
            )}>
              {trend === 'up' && (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {trend === 'down' && (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </span>
            <span>{trend === 'up' ? 'Above' : trend === 'down' ? 'Below' : 'At'} regional average</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'relative overflow-hidden group',
        'bg-gradient-to-br from-white to-sand-warm/50',
        'rounded-xl',
        variant === 'compact' ? 'p-4' : 'p-5',
        'border border-border-light/80',
        'hover:border-ocean-light/30',
        'shadow-sm hover:shadow-md',
        'transition-all duration-300 ease-out',
        className
      )}
    >
      {/* Subtle top accent on hover */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-ocean-light/0 to-transparent group-hover:via-ocean-light/40 transition-all duration-300" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <>
              <div className="h-7 w-20 rounded-lg skeleton-premium mb-2" />
              <div className="h-3 w-14 rounded skeleton-premium" />
            </>
          ) : (
            <>
              <p
                className={clsx(
                  variant === 'compact' ? 'text-xl' : 'text-2xl',
                  'font-display font-semibold text-ocean-deep tracking-tight truncate',
                  valueClassName
                )}
              >
                {formatValue(value)}
                {suffix && <span className="text-sm text-text-secondary ml-0.5">{suffix}</span>}
              </p>
              <p className="text-xs text-text-muted uppercase tracking-wider mt-1.5 font-medium">
                {label}
              </p>
            </>
          )}
        </div>

        {icon && !isLoading && (
          <div className={clsx(
            'flex-shrink-0 rounded-lg flex items-center justify-center',
            'bg-gradient-to-br from-ocean-light/10 to-reef-green/5',
            'text-ocean-mid/70 group-hover:text-ocean-mid',
            'transition-all duration-300 group-hover:scale-105',
            variant === 'compact' ? 'w-9 h-9' : 'w-10 h-10'
          )}>
            {icon}
          </div>
        )}
      </div>

      {trend && !isLoading && (
        <div
          className={clsx(
            'mt-3 text-xs font-medium flex items-center gap-1.5',
            trend === 'up' && 'text-reef-green',
            trend === 'down' && 'text-coral-warm',
            trend === 'neutral' && 'text-text-muted'
          )}
        >
          {trend === 'up' && (
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          )}
          {trend === 'down' && (
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
          <span>{trend === 'up' ? 'Above' : trend === 'down' ? 'Below' : 'At'} avg</span>
        </div>
      )}
    </div>
  );
}
