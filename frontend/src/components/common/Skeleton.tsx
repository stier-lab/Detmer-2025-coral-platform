import { useMemo } from 'react';
import clsx from 'clsx';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

/**
 * Base Skeleton component with pulse animation.
 * Uses the ocean theme color palette for consistency.
 */
export function Skeleton({ className, width, height, rounded = 'md' }: SkeletonProps) {
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={clsx(
        'skeleton-premium',
        roundedClasses[rounded],
        className
      )}
      style={style}
      aria-hidden="true"
    />
  );
}

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

/**
 * Text skeleton for lines of text content.
 * Renders multiple skeleton lines with varying widths for a natural appearance.
 */
export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  // Varying widths to simulate natural text
  const lineWidths = ['100%', '92%', '85%', '90%', '75%', '88%', '80%', '95%'];

  return (
    <div className={clsx('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height={16}
          width={lineWidths[index % lineWidths.length]}
          rounded="sm"
        />
      ))}
    </div>
  );
}

interface SkeletonCardProps {
  className?: string;
}

/**
 * Card skeleton for loading states of Card components.
 * Matches the visual structure of typical data cards.
 */
export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-border-light/80 bg-gradient-to-br from-white to-sand-warm/50 p-5',
        className
      )}
      aria-hidden="true"
    >
      {/* Header area */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <Skeleton height={24} width="60%" rounded="md" className="mb-2" />
          <Skeleton height={14} width="40%" rounded="sm" />
        </div>
        <Skeleton height={40} width={40} rounded="lg" />
      </div>

      {/* Content area */}
      <SkeletonText lines={3} />

      {/* Footer area */}
      <div className="mt-4 pt-4 border-t border-border-light/50 flex justify-end gap-3">
        <Skeleton height={36} width={80} rounded="lg" />
        <Skeleton height={36} width={100} rounded="lg" />
      </div>
    </div>
  );
}

interface SkeletonChartProps {
  height?: number;
  className?: string;
}

/**
 * Chart skeleton for visualization placeholders.
 * Includes simulated axis lines and plot area for a professional appearance.
 */
export function SkeletonChart({ height = 300, className }: SkeletonChartProps) {
  /* eslint-disable react-hooks/purity -- random values are intentionally generated once via useMemo for skeleton placeholder layout */
  const barHeights = useMemo(
    () => Array.from({ length: 7 }, (_, i) => 30 + Math.sin(i * 0.8) * 25 + Math.random() * 20),
    []
  );
  /* eslint-enable react-hooks/purity */

  return (
    <div
      className={clsx(
        'relative rounded-2xl border border-border-light/80 bg-gradient-to-br from-white to-sand-warm/50 overflow-hidden',
        className
      )}
      style={{ height: `${height}px` }}
      aria-hidden="true"
    >
      {/* Chart title skeleton */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2">
        <Skeleton height={20} width={180} rounded="md" />
      </div>

      {/* Y-axis area */}
      <div className="absolute left-4 top-12 bottom-12 w-12 flex flex-col justify-between items-end pr-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} height={12} width={32} rounded="sm" />
        ))}
      </div>

      {/* Y-axis label */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 origin-center">
        <Skeleton height={12} width={80} rounded="sm" />
      </div>

      {/* Main chart area with grid lines */}
      <div className="absolute left-20 right-8 top-12 bottom-16 border-l border-b border-border-medium/50">
        {/* Horizontal grid lines */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 border-t border-dashed border-border-light/60"
            style={{ top: `${(i + 1) * 20}%` }}
          />
        ))}

        {/* Simulated data bars/area */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around h-full px-4 pt-4">
          {barHeights.map((h, i) => (
            <div
              key={i}
              className="skeleton-premium flex-1 mx-1 rounded-t-md"
              style={{
                height: `${h}%`,
              }}
            />
          ))}
        </div>
      </div>

      {/* X-axis area */}
      <div className="absolute bottom-4 left-20 right-8 flex justify-between">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} height={12} width={40} rounded="sm" />
        ))}
      </div>

      {/* X-axis label */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
        <Skeleton height={12} width={120} rounded="sm" />
      </div>
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
  className?: string;
}

/**
 * Table skeleton for data tables.
 * Includes header row and configurable body rows.
 */
export function SkeletonTable({ rows = 5, cols = 4, className }: SkeletonTableProps) {
  const cellWidths = useMemo(
    () =>
      Array.from({ length: rows }, () =>
        Array.from({ length: cols }, (_, colIndex) =>
          colIndex === 0 ? '90%' : `${50 + Math.random() * 30}%`
        )
      ),
    [rows, cols]
  );

  return (
    <div
      className={clsx(
        'rounded-2xl border border-border-light/80 bg-gradient-to-br from-white to-sand-warm/50 overflow-hidden',
        className
      )}
      aria-hidden="true"
    >
      {/* Table header */}
      <div className="bg-sand-warm/60 border-b border-border-light px-4 py-3">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="flex-1">
              <Skeleton
                height={16}
                width={i === 0 ? '80%' : '60%'}
                rounded="sm"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Table body */}
      <div className="divide-y divide-border-light/50">
        {cellWidths.map((rowWidths, rowIndex) => (
          <div key={rowIndex} className="px-4 py-3 flex gap-4">
            {rowWidths.map((width, colIndex) => (
              <div key={colIndex} className="flex-1">
                <Skeleton
                  height={14}
                  width={width}
                  rounded="sm"
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface SkeletonStatCardProps {
  className?: string;
  variant?: 'default' | 'compact' | 'featured';
}

/**
 * Stat card skeleton matching the StatCard component layout.
 * Supports different variants for consistent loading states.
 */
export function SkeletonStatCard({ className, variant = 'default' }: SkeletonStatCardProps) {
  if (variant === 'featured') {
    return (
      <div
        className={clsx(
          'relative overflow-hidden',
          'bg-gradient-to-br from-white via-white to-ocean-light/5',
          'rounded-2xl p-6',
          'border border-border-medium/50',
          className
        )}
        aria-hidden="true"
      >
        {/* Decorative accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-reef-green/30 via-border-medium/40 to-ocean-light/30" />

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <Skeleton height={36} width={100} rounded="lg" className="mb-3" />
            <Skeleton height={14} width={140} rounded="sm" />
          </div>
          <Skeleton height={48} width={48} rounded="lg" />
        </div>

        {/* Trend area */}
        <div className="mt-4 pt-3 border-t border-border-light/50 flex items-center gap-2">
          <Skeleton height={24} width={24} rounded="full" />
          <Skeleton height={14} width={100} rounded="sm" />
        </div>
      </div>
    );
  }

  const isCompact = variant === 'compact';

  return (
    <div
      className={clsx(
        'relative overflow-hidden',
        'bg-gradient-to-br from-white to-sand-warm/50',
        'rounded-xl',
        isCompact ? 'p-4' : 'p-5',
        'border border-border-light/80',
        className
      )}
      aria-hidden="true"
    >
      {/* Subtle top accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-border-medium/30 to-transparent" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Skeleton
            height={isCompact ? 28 : 32}
            width={80}
            rounded="lg"
            className="mb-2"
          />
          <Skeleton height={12} width={60} rounded="sm" />
        </div>
        <Skeleton
          height={isCompact ? 36 : 40}
          width={isCompact ? 36 : 40}
          rounded="lg"
        />
      </div>

      {/* Optional trend indicator */}
      <div className="mt-3 flex items-center gap-1.5">
        <Skeleton height={14} width={14} rounded="full" />
        <Skeleton height={12} width={60} rounded="sm" />
      </div>
    </div>
  );
}

interface SkeletonMapProps {
  height?: number;
  className?: string;
}

/**
 * Map skeleton for map visualization loading states.
 * Shows a placeholder for the map area with simulated controls.
 */
export function SkeletonMap({ height = 600, className }: SkeletonMapProps) {
  /* eslint-disable react-hooks/purity -- random values are intentionally generated once via useMemo for skeleton placeholder layout */
  const markerSizes = useMemo(
    () =>
      Array.from({ length: 7 }, () => ({
        width: 12 + Math.random() * 16,
        height: 12 + Math.random() * 16,
      })),
    []
  );
  /* eslint-enable react-hooks/purity */

  return (
    <div
      className={clsx(
        'relative rounded-2xl border border-border-light/80 bg-gradient-to-br from-sand-light to-border-medium/20 overflow-hidden',
        className
      )}
      style={{ height: `${height}px` }}
      aria-hidden="true"
    >
      {/* Map control panel skeleton (top-right) */}
      <div className="absolute top-4 right-4 z-10 bg-white/90 rounded-lg shadow-md p-3">
        <Skeleton height={12} width={60} rounded="sm" className="mb-2" />
        <div className="flex flex-col gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height={28} width={100} rounded="md" />
          ))}
        </div>
      </div>

      {/* Simulated map markers */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-3/4 h-3/4">
          {/* Simulated scatter of map points */}
          {[
            { top: '20%', left: '30%' },
            { top: '35%', left: '55%' },
            { top: '50%', left: '25%' },
            { top: '45%', left: '70%' },
            { top: '65%', left: '45%' },
            { top: '30%', left: '80%' },
            { top: '70%', left: '65%' },
          ].map((pos, i) => (
            <div
              key={i}
              className="absolute skeleton-premium rounded-full"
              style={{
                top: pos.top,
                left: pos.left,
                width: `${markerSizes[i].width}px`,
                height: `${markerSizes[i].height}px`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Legend skeleton (bottom-left) */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/90 rounded-lg shadow-md p-3">
        <Skeleton height={12} width={80} rounded="sm" className="mb-2" />
        <div className="flex flex-col gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton height={12} width={12} rounded="full" />
              <Skeleton height={12} width={50} rounded="sm" />
            </div>
          ))}
        </div>
      </div>

      {/* Zoom controls skeleton */}
      <div className="absolute top-1/2 left-4 -translate-y-1/2 z-10 bg-white/90 rounded-lg shadow-md">
        <div className="flex flex-col">
          <Skeleton height={32} width={32} rounded="none" className="rounded-t-lg" />
          <div className="border-t border-border-light" />
          <Skeleton height={32} width={32} rounded="none" className="rounded-b-lg" />
        </div>
      </div>
    </div>
  );
}

interface SkeletonForestPlotProps {
  rows?: number;
  className?: string;
}

/**
 * Forest plot skeleton matching the ForestPlot component structure.
 * Shows study labels, confidence intervals, and point estimates.
 */
export function SkeletonForestPlot({ rows = 6, className }: SkeletonForestPlotProps) {
  /* eslint-disable react-hooks/purity -- random values are intentionally generated once via useMemo for skeleton placeholder layout */
  const rowRandomValues = useMemo(
    () =>
      Array.from({ length: rows }, () => ({
        labelWidth: 60 + Math.random() * 40,
        ciLeft: 15 + Math.random() * 20,
        ciRight: 15 + Math.random() * 20,
        pointLeft: 40 + Math.random() * 20,
        pointSize: 8 + Math.random() * 8,
      })),
    [rows]
  );
  /* eslint-enable react-hooks/purity */

  return (
    <div
      className={clsx(
        'rounded-2xl border border-border-light/80 bg-gradient-to-br from-white to-sand-warm/50 overflow-hidden p-4',
        className
      )}
      aria-hidden="true"
    >
      {/* Title */}
      <div className="flex justify-center mb-6">
        <Skeleton height={20} width={200} rounded="md" />
      </div>

      {/* Forest plot rows */}
      <div className="space-y-4">
        {rowRandomValues.map((rv, i) => (
          <div key={i} className="flex items-center gap-4">
            {/* Study label */}
            <div className="w-40 flex-shrink-0 text-right">
              <Skeleton
                height={14}
                width={`${rv.labelWidth}%`}
                rounded="sm"
                className="ml-auto"
              />
            </div>

            {/* CI line and point estimate */}
            <div className="flex-1 flex items-center relative h-8">
              {/* CI line */}
              <div
                className="absolute h-0.5 skeleton-premium rounded-full"
                style={{
                  left: `${rv.ciLeft}%`,
                  right: `${rv.ciRight}%`,
                }}
              />
              {/* Point estimate */}
              <div
                className="absolute skeleton-premium rounded-full"
                style={{
                  left: `${rv.pointLeft}%`,
                  width: `${rv.pointSize}px`,
                  height: `${rv.pointSize}px`,
                  transform: 'translateX(-50%)',
                }}
              />
            </div>

            {/* Sample size and estimate */}
            <div className="w-20 flex-shrink-0 flex gap-2">
              <Skeleton height={12} width={35} rounded="sm" />
              <Skeleton height={12} width={30} rounded="sm" />
            </div>
          </div>
        ))}
      </div>

      {/* X-axis */}
      <div className="mt-6 pt-4 border-t border-border-light/50">
        <div className="flex justify-between px-44 mb-2">
          {['0%', '25%', '50%', '75%', '100%'].map((_, i) => (
            <Skeleton key={i} height={12} width={24} rounded="sm" />
          ))}
        </div>
        <div className="flex justify-center">
          <Skeleton height={14} width={150} rounded="sm" />
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-border-light flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Skeleton height={16} width={16} rounded="full" />
          <Skeleton height={12} width={120} rounded="sm" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton height={2} width={32} rounded="full" />
          <Skeleton height={12} width={50} rounded="sm" />
        </div>
      </div>
    </div>
  );
}
