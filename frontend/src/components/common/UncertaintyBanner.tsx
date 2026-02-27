import { HTMLAttributes, forwardRef, useState } from 'react';
import clsx from 'clsx';
import { QualityMetrics } from '../../types';

interface UncertaintyBannerProps extends HTMLAttributes<HTMLDivElement> {
  metrics: QualityMetrics | null;
  loading?: boolean;
  compact?: boolean;
}

/**
 * UncertaintyBanner - Displays data quality metrics prominently
 *
 * Per PRD v2.0: "Always show uncertainty - R², confidence intervals,
 * sample sizes on every visualization"
 */
export const UncertaintyBanner = forwardRef<HTMLDivElement, UncertaintyBannerProps>(
  ({ className, metrics, loading = false, compact = false, ...props }, ref) => {
    const [expanded, setExpanded] = useState(false);

    if (loading) {
      return (
        <div
          ref={ref}
          className={clsx(
            'bg-sand-warm/50 border border-border-light rounded-lg p-3 animate-pulse',
            className
          )}
          {...props}
        >
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      );
    }

    if (!metrics) {
      return null;
    }

    const hasWarnings = metrics.warnings && metrics.warnings.length > 0;
    const isMockData = metrics.using_mock_data;

    // Determine banner color based on data quality
    const getBannerColor = () => {
      if (isMockData) return 'bg-amber-50 border-amber-300';
      if (hasWarnings && metrics.warnings.length >= 2) return 'bg-amber-50 border-amber-200';
      if (hasWarnings) return 'bg-yellow-50 border-yellow-200';
      return 'bg-ocean-light/20 border-ocean-light';
    };

    // Quality badge color
    const getQualityBadge = () => {
      if (isMockData) return { color: 'bg-amber-500', text: 'Mock Data' };
      if (metrics.r_squared === null) return { color: 'bg-gray-400', text: 'N/A' };
      if (metrics.r_squared < 0.05) return { color: 'bg-coral-stress', text: 'Low R²' };
      if (metrics.r_squared < 0.10) return { color: 'bg-amber-500', text: 'Moderate R²' };
      return { color: 'bg-ocean-medium', text: 'Good R²' };
    };

    const badge = getQualityBadge();

    if (compact) {
      return (
        <div
          ref={ref}
          className={clsx(
            'rounded-lg p-2 border flex items-center gap-3 text-sm',
            getBannerColor(),
            className
          )}
          {...props}
        >
          <span className={clsx('px-2 py-0.5 rounded text-white text-xs font-medium', badge.color)}>
            {badge.text}
          </span>
          <span className="text-ocean-deep">
            n = {metrics.sample_size.toLocaleString()}
          </span>
          {metrics.r_squared !== null && (
            <span className="text-gray-600">
              R² = {(metrics.r_squared * 100).toFixed(1)}%
            </span>
          )}
          {hasWarnings && (
            <button
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
              aria-controls="uncertainty-warnings"
              className="text-amber-600 hover:text-amber-800 underline"
            >
              {metrics.warnings.length} warning{metrics.warnings.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={clsx(
          'rounded-xl p-4 border',
          getBannerColor(),
          className
        )}
        {...props}
      >
        {/* Main stats row */}
        <div className="flex flex-wrap items-center gap-4 mb-2">
          <span className={clsx('px-3 py-1 rounded-full text-white text-sm font-medium', badge.color)}>
            {badge.text}
          </span>

          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="font-medium text-ocean-deep">Sample Size:</span>{' '}
              <span className="text-gray-700">{metrics.sample_size.toLocaleString()}</span>
            </div>

            {metrics.r_squared !== null && (
              <div>
                <span className="font-medium text-ocean-deep">R²:</span>{' '}
                <span className="text-gray-700">{(metrics.r_squared * 100).toFixed(1)}%</span>
              </div>
            )}

            <div>
              <span className="font-medium text-ocean-deep">Studies:</span>{' '}
              <span className="text-gray-700">{metrics.n_studies}</span>
            </div>

            <div>
              <span className="font-medium text-ocean-deep">Regions:</span>{' '}
              <span className="text-gray-700">{metrics.n_regions}</span>
            </div>

            <div>
              <span className="font-medium text-ocean-deep">Years:</span>{' '}
              <span className="text-gray-700">
                {metrics.year_range[0]} - {metrics.year_range[1]}
              </span>
            </div>
          </div>
        </div>

        {/* Dominant study warning */}
        {metrics.dominant_study && metrics.dominant_study.pct > 50 && (
          <div className="text-sm text-amber-700 mb-2">
            <span className="font-medium">Note:</span> {metrics.dominant_study.name} provides{' '}
            {metrics.dominant_study.pct.toFixed(0)}% of data
          </div>
        )}

        {/* Fragment mix indicator */}
        {metrics.fragment_mix && (
          <div className="text-sm text-amber-700 mb-2">
            <span className="font-medium">Mixed data:</span> Contains both fragments ({metrics.fragment_pct.toFixed(0)}%)
            and colonies - consider analyzing separately
          </div>
        )}

        {/* Warnings section */}
        {hasWarnings && (
          <div className="mt-3 pt-3 border-t border-amber-200">
            <button
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
              aria-controls="uncertainty-warnings"
              className="flex items-center gap-2 text-sm font-medium text-amber-700 hover:text-amber-900"
            >
              <svg
                className={clsx('w-4 h-4 transition-transform', expanded && 'rotate-90')}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {metrics.warnings.length} Data Quality Warning{metrics.warnings.length !== 1 ? 's' : ''}
            </button>

            {expanded && (
              <ul id="uncertainty-warnings" className="mt-2 space-y-1 text-sm text-amber-800">
                {metrics.warnings.map((warning, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <svg className="w-4 h-4 mt-0.5 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {warning}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Mock data banner */}
        {isMockData && (
          <div className="mt-3 pt-3 border-t border-amber-300 text-amber-800 text-sm">
            <span className="font-bold">Development Mode:</span> Displaying mock data.
            Connect to real data source for accurate results.
          </div>
        )}
      </div>
    );
  }
);

UncertaintyBanner.displayName = 'UncertaintyBanner';

/**
 * QualityBadge - Small inline quality indicator
 */
interface QualityBadgeProps {
  n: number;
  certainty?: number;
  showN?: boolean;
}

export const QualityBadge: React.FC<QualityBadgeProps> = ({ n, certainty, showN = true }) => {
  const getColor = () => {
    if (certainty !== undefined) {
      if (certainty <= 1) return 'bg-coral-stress text-white';
      if (certainty <= 2) return 'bg-amber-500 text-white';
      if (certainty <= 3) return 'bg-yellow-400 text-gray-800';
      if (certainty <= 4) return 'bg-ocean-light text-gray-800';
      return 'bg-ocean-medium text-white';
    }
    // Fall back to n-based coloring
    if (n < 10) return 'bg-coral-stress text-white';
    if (n < 30) return 'bg-amber-500 text-white';
    if (n < 100) return 'bg-yellow-400 text-gray-800';
    if (n < 500) return 'bg-ocean-light text-gray-800';
    return 'bg-ocean-medium text-white';
  };

  return (
    <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', getColor())}>
      {showN ? `n=${n}` : certainty !== undefined ? `C${certainty}` : ''}
    </span>
  );
};
