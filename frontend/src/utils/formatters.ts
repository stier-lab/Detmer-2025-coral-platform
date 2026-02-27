// Number formatting utilities

export function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(n: number, decimals = 0): string {
  return `${(n * 100).toFixed(decimals)}%`;
}

export function formatSize(cm2: number): string {
  if (cm2 < 1) return `${(cm2 * 100).toFixed(0)} mm²`;
  if (cm2 < 100) return `${cm2.toFixed(1)} cm²`;
  return `${formatNumber(cm2, 0)} cm²`;
}

export function formatGrowthRate(rate: number): string {
  const sign = rate >= 0 ? '+' : '';
  return `${sign}${rate.toFixed(1)} cm²/yr`;
}

export function formatDepth(m: number | null): string {
  if (m === null) return '—';
  return `${m.toFixed(1)} m`;
}

export function formatYearRange(start: number, end: number): string {
  if (start === end) return start.toString();
  return `${start}–${end}`;
}

/**
 * @deprecated Use getSizeClass() from constants/sizeClasses.ts instead.
 * Kept temporarily for backward compatibility.
 */
export { getSizeClass as getSizeClassName } from '../constants/sizeClasses';

export function getSizeClassLabel(cm2: number): string {
  if (cm2 < 25) return 'SC1 (0-25 cm²)';
  if (cm2 < 100) return 'SC2 (25-100 cm²)';
  if (cm2 < 500) return 'SC3 (100-500 cm²)';
  if (cm2 < 2000) return 'SC4 (500-2000 cm²)';
  return 'SC5 (>2000 cm²)';
}

// Compact number formatting for axis labels
export function formatCompact(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

// Format CI range
export function formatCI(lower: number, upper: number, decimals = 2): string {
  return `[${lower.toFixed(decimals)}, ${upper.toFixed(decimals)}]`;
}
