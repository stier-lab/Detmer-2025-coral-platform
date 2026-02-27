/**
 * Size class definitions for Acropora palmata coral colonies.
 *
 * Size classes are assigned based on LIVE TISSUE AREA (cm²), not total colony footprint.
 * A partially dead colony with 5,000 cm² total but 200 cm² alive = SC3, not SC5.
 *
 * These constants are shared across the application to ensure consistency.
 */

/**
 * Detailed size class definitions with boundaries and labels.
 * Used for trajectory projections and size-based analyses.
 */
export const SIZE_CLASSES = {
  SC1: { min: 0, max: 25, label: 'Recruit' },
  SC2: { min: 25, max: 100, label: 'Small juvenile' },
  SC3: { min: 100, max: 500, label: 'Large juvenile' },
  SC4: { min: 500, max: 2000, label: 'Small adult' },
  SC5: { min: 2000, max: Infinity, label: 'Large adult (reproductive)' },
} as const;

export type SizeClassKey = keyof typeof SIZE_CLASSES;

/**
 * Array of size class keys for iteration.
 */
export const SIZE_CLASS_KEYS: SizeClassKey[] = ['SC1', 'SC2', 'SC3', 'SC4', 'SC5'];

/**
 * Human-readable size class labels with ranges.
 */
export const SIZE_CLASS_LABELS = [
  'SC1 (0-25)',
  'SC2 (25-100)',
  'SC3 (100-500)',
  'SC4 (500-2000)',
  'SC5 (>2000)',
];

/**
 * Size class boundary values for classification.
 */
export const SIZE_CLASS_BOUNDARIES = [0, 25, 100, 500, 2000, Infinity];

/**
 * Determine which size class a given size (in cm²) belongs to.
 * @param size - Colony size in cm² (live tissue area)
 * @returns Size class key (SC1-SC5)
 */
export function getSizeClass(size: number): SizeClassKey {
  if (size <= 25) return 'SC1';
  if (size <= 100) return 'SC2';
  if (size <= 500) return 'SC3';
  if (size <= 2000) return 'SC4';
  return 'SC5';
}

/**
 * Get the midpoint of a size class for RGR calculations.
 * For SC5 (unbounded), uses 3000 cm² as a reasonable representative value.
 * @param sizeClass - Size class key
 * @returns Midpoint in cm²
 */
export function getSizeClassMidpoint(sizeClass: SizeClassKey): number {
  const { min, max } = SIZE_CLASSES[sizeClass];
  // For unbounded class (SC5), use 3000 as representative value
  const effectiveMax = max === Infinity ? 4000 : max;
  return (min + effectiveMax) / 2;
}

/**
 * Extract size class key from a label string (e.g., "SC3 (100-500)" -> "SC3").
 * @param label - Size class label containing SC[1-5]
 * @returns Size class key or null if not found
 */
export function extractSizeKey(label: string): SizeClassKey | null {
  const match = label.match(/SC[1-5]/i);
  return match ? (match[0].toUpperCase() as SizeClassKey) : null;
}
