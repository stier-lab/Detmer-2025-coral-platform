
import { ReactNode } from 'react';
import clsx from 'clsx';
import { Button } from './Button';


const CoralIcon = ({ className }: { className?: string }) => (
  <svg className={clsx('w-16 h-16', className)} viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <path
      d="M32 56V32m0 0c-4-8-12-12-16-10m16 10c4-8 12-12 16-10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.4"
    />
    <path
      d="M32 32c-2-6-8-10-12-8m12 8c2-6 8-10 12-8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.5"
    />
    <path
      d="M32 32c-1-4-4-7-6-6m6 6c1-4 4-7 6-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.6"
    />
    <ellipse cx="32" cy="58" rx="8" ry="2" fill="currentColor" opacity="0.2" />
  </svg>
);

const SearchIcon = ({ className }: { className?: string }) => (
  <svg className={clsx('w-16 h-16', className)} viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <circle cx="28" cy="28" r="12" stroke="currentColor" strokeWidth="2" opacity="0.4" />
    <path d="M37 37l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
    <path d="M22 28h12M28 22v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
  </svg>
);

const FilterIcon = ({ className }: { className?: string }) => (
  <svg className={clsx('w-16 h-16', className)} viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <path
      d="M12 16h40l-14 18v12l-12 6V34L12 16z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.4"
    />
    <circle cx="44" cy="44" r="10" fill="currentColor" opacity="0.1" />
    <path d="M40 40l8 8M48 40l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
  </svg>
);

const MapPinIcon = ({ className }: { className?: string }) => (
  <svg className={clsx('w-16 h-16', className)} viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <path
      d="M32 8c-9.941 0-18 8.059-18 18 0 13.5 18 30 18 30s18-16.5 18-30c0-9.941-8.059-18-18-18z"
      stroke="currentColor"
      strokeWidth="2"
      opacity="0.4"
    />
    <circle cx="32" cy="26" r="6" stroke="currentColor" strokeWidth="2" opacity="0.5" />
    <text x="30" y="30" fontSize="10" fill="currentColor" opacity="0.4">?</text>
  </svg>
);

const ChartIcon = ({ className }: { className?: string }) => (
  <svg className={clsx('w-16 h-16', className)} viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <rect x="8" y="36" width="10" height="20" rx="2" stroke="currentColor" strokeWidth="2" opacity="0.3" />
    <rect x="22" y="24" width="10" height="32" rx="2" stroke="currentColor" strokeWidth="2" opacity="0.4" />
    <rect x="36" y="16" width="10" height="40" rx="2" stroke="currentColor" strokeWidth="2" opacity="0.3" />
    <rect x="50" y="28" width="6" height="28" rx="2" stroke="currentColor" strokeWidth="2" opacity="0.2" />
    <path d="M8 12h48" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" opacity="0.3" />
  </svg>
);

const DataPointsIcon = ({ className }: { className?: string }) => (
  <svg className={clsx('w-16 h-16', className)} viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <circle cx="16" cy="32" r="3" fill="currentColor" opacity="0.3" />
    <circle cx="32" cy="20" r="3" fill="currentColor" opacity="0.4" />
    <circle cx="48" cy="36" r="3" fill="currentColor" opacity="0.3" />
    <circle cx="32" cy="32" r="20" stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" opacity="0.2" />
    <path d="M32 48v8M28 52l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
  </svg>
);


export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'compact' | 'card';
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = 'default',
  className,
}: EmptyStateProps) {
  const variantStyles = {
    default: 'py-12 px-6',
    compact: 'py-6 px-4',
    card: 'py-10 px-6 bg-gradient-to-br from-white to-sand-warm/30 rounded-2xl border border-border-light/60 shadow-sm',
  };

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center text-center',
        variantStyles[variant],
        className
      )}
      role="status"
      aria-label={title}
    >
      {/* Icon */}
      {icon && (
        <div className={clsx(
          'mb-4',
          variant === 'compact' ? 'text-ocean-light' : 'text-ocean-mid/60'
        )}>
          {icon}
        </div>
      )}

      {/* Title */}
      <h3
        className={clsx(
          'font-display font-semibold text-ocean-deep mb-2',
          variant === 'compact' ? 'text-base' : 'text-lg'
        )}
      >
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p
          className={clsx(
            'text-text-secondary max-w-md',
            variant === 'compact' ? 'text-sm' : 'text-base'
          )}
        >
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className={clsx(
          'flex flex-wrap items-center justify-center gap-3',
          variant === 'compact' ? 'mt-4' : 'mt-6'
        )}>
          {action && (
            <Button
              variant="primary"
              size={variant === 'compact' ? 'sm' : 'md'}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="ghost"
              size={variant === 'compact' ? 'sm' : 'md'}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}


export interface NoDataFoundProps {
  onClearFilters?: () => void;
  variant?: 'default' | 'compact' | 'card';
  className?: string;
}

/**
 * NoDataFound - Displayed when filter results are empty
 */
export function NoDataFound({ onClearFilters, variant = 'default', className }: NoDataFoundProps) {
  return (
    <EmptyState
      icon={<FilterIcon />}
      title="No data matches your filters"
      description="The current filter combination excludes all available observations. Try adjusting your selection or clear all filters to see the full dataset."
      action={
        onClearFilters
          ? { label: 'Clear all filters', onClick: onClearFilters }
          : undefined
      }
      variant={variant}
      className={className}
    />
  );
}

export interface NoResultsFoundProps {
  query?: string;
  onClearSearch?: () => void;
  variant?: 'default' | 'compact' | 'card';
  className?: string;
}

/**
 * NoResultsFound - Displayed when search yields no results
 */
export function NoResultsFound({ query, onClearSearch, variant = 'default', className }: NoResultsFoundProps) {
  return (
    <EmptyState
      icon={<SearchIcon />}
      title="No results found"
      description={
        query
          ? `No observations match "${query}". Try a different search term or check your spelling.`
          : 'No observations match your search criteria. Try adjusting your search terms.'
      }
      action={
        onClearSearch
          ? { label: 'Clear search', onClick: onClearSearch }
          : undefined
      }
      variant={variant}
      className={className}
    />
  );
}

export interface NoRegionDataProps {
  region: string;
  onSelectDifferentRegion?: () => void;
  variant?: 'default' | 'compact' | 'card';
  className?: string;
}

/**
 * NoRegionData - Displayed when a region has no available data
 */
export function NoRegionData({ region, onSelectDifferentRegion, variant = 'default', className }: NoRegionDataProps) {
  return (
    <EmptyState
      icon={<MapPinIcon />}
      title={`No data available for ${region}`}
      description={`We don't have coral survival or growth observations from ${region} yet. The database primarily covers Caribbean reef systems with active monitoring programs.`}
      action={
        onSelectDifferentRegion
          ? { label: 'Select a different region', onClick: onSelectDifferentRegion }
          : undefined
      }
      variant={variant}
      className={className}
    />
  );
}

export interface NeedMoreDataProps {
  minimum: number;
  current: number;
  context?: string;
  variant?: 'default' | 'compact' | 'card';
  className?: string;
}

/**
 * NeedMoreData - Displayed when there's insufficient data for reliable analysis
 */
export function NeedMoreData({ minimum, current, context, variant = 'default', className }: NeedMoreDataProps) {
  const deficit = minimum - current;

  return (
    <EmptyState
      icon={<DataPointsIcon />}
      title={`Need at least ${minimum} observations`}
      description={
        context
          ? `${context} Currently only ${current} observation${current !== 1 ? 's' : ''} available (${deficit} more needed for reliable estimates).`
          : `This analysis requires a minimum sample size for statistical reliability. Currently only ${current} observation${current !== 1 ? 's' : ''} available.`
      }
      variant={variant}
      className={className}
    />
  );
}

export interface NoChartDataProps {
  chartType?: string;
  onRefresh?: () => void;
  variant?: 'default' | 'compact' | 'card';
  className?: string;
}

/**
 * NoChartData - Displayed when chart data is unavailable
 */
export function NoChartData({ chartType, onRefresh, variant = 'default', className }: NoChartDataProps) {
  return (
    <EmptyState
      icon={<ChartIcon />}
      title={chartType ? `No ${chartType} data available` : 'No chart data available'}
      description="Unable to generate visualization with the current data selection. This may be due to filtering or data loading issues."
      action={
        onRefresh
          ? { label: 'Refresh data', onClick: onRefresh }
          : undefined
      }
      variant={variant}
      className={className}
    />
  );
}

export interface NoSurvivalDataProps {
  sizeClass?: string;
  onClearFilters?: () => void;
  variant?: 'default' | 'compact' | 'card';
  className?: string;
}

/**
 * NoSurvivalData - Displayed when survival data is empty
 */
export function NoSurvivalData({ sizeClass, onClearFilters, variant = 'default', className }: NoSurvivalDataProps) {
  return (
    <EmptyState
      icon={<CoralIcon />}
      title={sizeClass ? `No survival data for ${sizeClass}` : 'No survival data available'}
      description="Survival observations are not available for the current selection. This may be due to active filters or limited data coverage in this category."
      action={
        onClearFilters
          ? { label: 'Clear filters', onClick: onClearFilters }
          : undefined
      }
      variant={variant}
      className={className}
    />
  );
}

export interface NoGrowthDataProps {
  sizeClass?: string;
  onClearFilters?: () => void;
  variant?: 'default' | 'compact' | 'card';
  className?: string;
}

/**
 * NoGrowthData - Displayed when growth data is empty
 */
export function NoGrowthData({ sizeClass, onClearFilters, variant = 'default', className }: NoGrowthDataProps) {
  return (
    <EmptyState
      icon={<CoralIcon />}
      title={sizeClass ? `No growth data for ${sizeClass}` : 'No growth data available'}
      description="Growth measurements are not available for the current selection. Growth tracking requires repeated measurements of individual colonies."
      action={
        onClearFilters
          ? { label: 'Clear filters', onClick: onClearFilters }
          : undefined
      }
      variant={variant}
      className={className}
    />
  );
}
