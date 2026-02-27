import { describe, it, expect } from 'vitest'
import {
  formatNumber,
  formatPercent,
  formatSize,
  formatGrowthRate,
  formatDepth,
  formatYearRange,
  getSizeClassName,
  getSizeClassLabel,
  formatCompact,
  formatCI,
} from './formatters'

describe('formatNumber', () => {
  it('formats integers correctly', () => {
    expect(formatNumber(1234)).toBe('1,234')
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(999999)).toBe('999,999')
  })

  it('formats with specified decimals', () => {
    expect(formatNumber(1234.567, 2)).toBe('1,234.57')
    expect(formatNumber(1234, 2)).toBe('1,234.00')
  })

  it('handles negative numbers', () => {
    expect(formatNumber(-1234)).toBe('-1,234')
    expect(formatNumber(-0.5, 1)).toBe('-0.5')
  })

  // Edge cases
  it('handles NaN', () => {
    expect(formatNumber(NaN)).toBe('NaN')
  })

  it('handles Infinity', () => {
    expect(formatNumber(Infinity)).toBe('∞')
  })

  it('handles very small numbers', () => {
    expect(formatNumber(0.0001, 4)).toBe('0.0001')
  })
})

describe('formatPercent', () => {
  it('formats decimal to percentage', () => {
    expect(formatPercent(0.5)).toBe('50%')
    expect(formatPercent(0.123)).toBe('12%')
    expect(formatPercent(1)).toBe('100%')
  })

  it('formats with decimals', () => {
    expect(formatPercent(0.5, 1)).toBe('50.0%')
    expect(formatPercent(0.123, 2)).toBe('12.30%')
  })

  it('handles values > 1', () => {
    expect(formatPercent(1.5)).toBe('150%')
  })

  it('handles negative values', () => {
    expect(formatPercent(-0.1)).toBe('-10%')
  })

  // Edge cases
  it('handles zero', () => {
    expect(formatPercent(0)).toBe('0%')
  })

  it('handles NaN', () => {
    expect(formatPercent(NaN)).toBe('NaN%')
  })
})

describe('formatSize', () => {
  it('formats very small sizes in mm²', () => {
    expect(formatSize(0.5)).toBe('50 mm²')
    expect(formatSize(0.01)).toBe('1 mm²')
  })

  it('formats small sizes with 1 decimal', () => {
    expect(formatSize(1)).toBe('1.0 cm²')
    expect(formatSize(50.5)).toBe('50.5 cm²')
    expect(formatSize(99.9)).toBe('99.9 cm²')
  })

  it('formats large sizes with commas', () => {
    expect(formatSize(100)).toBe('100 cm²')
    expect(formatSize(1234)).toBe('1,234 cm²')
    expect(formatSize(10000)).toBe('10,000 cm²')
  })

  // Edge cases
  it('handles zero', () => {
    expect(formatSize(0)).toBe('0 mm²')
  })

  it('handles boundary at 1', () => {
    expect(formatSize(0.99)).toBe('99 mm²')
    expect(formatSize(1.01)).toBe('1.0 cm²')
  })

  it('handles boundary at 100', () => {
    expect(formatSize(99.99)).toBe('100.0 cm²')
    expect(formatSize(100.01)).toBe('100 cm²')
  })
})

describe('formatGrowthRate', () => {
  it('adds + sign for positive rates', () => {
    expect(formatGrowthRate(5.5)).toBe('+5.5 cm²/yr')
    expect(formatGrowthRate(0.1)).toBe('+0.1 cm²/yr')
  })

  it('keeps - sign for negative rates', () => {
    expect(formatGrowthRate(-5.5)).toBe('-5.5 cm²/yr')
    expect(formatGrowthRate(-0.1)).toBe('-0.1 cm²/yr')
  })

  it('handles zero', () => {
    expect(formatGrowthRate(0)).toBe('+0.0 cm²/yr')
  })

  it('rounds to 1 decimal using toFixed rounding', () => {
    expect(formatGrowthRate(5.555)).toBe('+5.6 cm²/yr')
    expect(formatGrowthRate(-5.554)).toBe('-5.6 cm²/yr')
    expect(formatGrowthRate(-5.544)).toBe('-5.5 cm²/yr')
  })
})

describe('formatDepth', () => {
  it('formats depth with 1 decimal', () => {
    expect(formatDepth(5)).toBe('5.0 m')
    expect(formatDepth(12.5)).toBe('12.5 m')
  })

  it('returns em dash for null', () => {
    expect(formatDepth(null)).toBe('—')
  })

  it('handles zero', () => {
    expect(formatDepth(0)).toBe('0.0 m')
  })

  // Edge case: undefined (TypeScript should catch this, but test runtime behavior)
  it('handles undefined as a number (runtime edge case)', () => {
    // @ts-expect-error testing runtime behavior
    expect(() => formatDepth(undefined)).toThrow()
  })
})

describe('formatYearRange', () => {
  it('formats range with en dash', () => {
    expect(formatYearRange(2000, 2025)).toBe('2000–2025')
  })

  it('returns single year when start equals end', () => {
    expect(formatYearRange(2020, 2020)).toBe('2020')
  })

  it('handles reversed ranges (start > end)', () => {
    // Current behavior - no validation
    expect(formatYearRange(2025, 2000)).toBe('2025–2000')
  })
})

describe('getSizeClassName', () => {
  it('returns correct size class', () => {
    expect(getSizeClassName(5)).toBe('SC1')
    expect(getSizeClassName(50)).toBe('SC2')
    expect(getSizeClassName(200)).toBe('SC3')
    expect(getSizeClassName(1000)).toBe('SC4')
    expect(getSizeClassName(5000)).toBe('SC5')
  })

  // Boundary tests (canonical: 0-25, 25-100, 100-500, 500-2000, 2000+)
  it('handles boundaries correctly', () => {
    expect(getSizeClassName(0)).toBe('SC1')
    expect(getSizeClassName(24.99)).toBe('SC1')
    expect(getSizeClassName(25)).toBe('SC2')
    expect(getSizeClassName(99.99)).toBe('SC2')
    expect(getSizeClassName(100)).toBe('SC3')
    expect(getSizeClassName(499.99)).toBe('SC3')
    expect(getSizeClassName(500)).toBe('SC4')
    expect(getSizeClassName(1999.99)).toBe('SC4')
    expect(getSizeClassName(2000)).toBe('SC5')
  })

  // Edge cases
  it('handles negative values', () => {
    expect(getSizeClassName(-1)).toBe('SC1')
  })
})

describe('getSizeClassLabel', () => {
  it('returns full labels with ranges', () => {
    expect(getSizeClassLabel(5)).toBe('SC1 (0-25 cm²)')
    expect(getSizeClassLabel(50)).toBe('SC2 (25-100 cm²)')
    expect(getSizeClassLabel(200)).toBe('SC3 (100-500 cm²)')
    expect(getSizeClassLabel(1000)).toBe('SC4 (500-2000 cm²)')
    expect(getSizeClassLabel(5000)).toBe('SC5 (>2000 cm²)')
  })
})

describe('formatCompact', () => {
  it('formats millions', () => {
    expect(formatCompact(1000000)).toBe('1.0M')
    expect(formatCompact(2500000)).toBe('2.5M')
    expect(formatCompact(10500000)).toBe('10.5M')
  })

  it('formats thousands', () => {
    expect(formatCompact(1000)).toBe('1.0K')
    expect(formatCompact(2500)).toBe('2.5K')
    expect(formatCompact(999999)).toBe('1000.0K')
  })

  it('formats small numbers without suffix', () => {
    expect(formatCompact(0)).toBe('0')
    expect(formatCompact(999)).toBe('999')
    expect(formatCompact(500)).toBe('500')
  })

  // Edge case
  it('handles negative numbers', () => {
    expect(formatCompact(-1000)).toBe('-1000')
    expect(formatCompact(-1000000)).toBe('-1000000')
  })
})

describe('formatCI', () => {
  it('formats confidence interval', () => {
    expect(formatCI(0.5, 0.8)).toBe('[0.50, 0.80]')
    expect(formatCI(0.123, 0.456)).toBe('[0.12, 0.46]')
  })

  it('respects decimals parameter', () => {
    expect(formatCI(0.5, 0.8, 3)).toBe('[0.500, 0.800]')
    expect(formatCI(0.5, 0.8, 0)).toBe('[1, 1]')
  })

  it('handles negative bounds', () => {
    expect(formatCI(-0.5, 0.5)).toBe('[-0.50, 0.50]')
  })

  it('handles reversed bounds (lower > upper)', () => {
    // Current behavior - no validation
    expect(formatCI(0.8, 0.5)).toBe('[0.80, 0.50]')
  })
})
