import { describe, it, expect } from 'vitest';
import {
  getSizeClass,
  getSizeClassMidpoint,
  extractSizeKey,
  SIZE_CLASSES,
  SIZE_CLASS_KEYS,
  SIZE_CLASS_LABELS,
  SIZE_CLASS_BOUNDARIES,
} from '../sizeClasses';

describe('sizeClasses constants', () => {
  describe('SIZE_CLASSES', () => {
    it('should have five size classes', () => {
      expect(Object.keys(SIZE_CLASSES)).toHaveLength(5);
    });

    it('should have correct boundaries for SC1 (Recruit)', () => {
      expect(SIZE_CLASSES.SC1).toEqual({ min: 0, max: 25, label: 'Recruit' });
    });

    it('should have correct boundaries for SC2 (Small juvenile)', () => {
      expect(SIZE_CLASSES.SC2).toEqual({ min: 25, max: 100, label: 'Small juvenile' });
    });

    it('should have correct boundaries for SC3 (Large juvenile)', () => {
      expect(SIZE_CLASSES.SC3).toEqual({ min: 100, max: 500, label: 'Large juvenile' });
    });

    it('should have correct boundaries for SC4 (Small adult)', () => {
      expect(SIZE_CLASSES.SC4).toEqual({ min: 500, max: 2000, label: 'Small adult' });
    });

    it('should have correct boundaries for SC5 (Large adult)', () => {
      expect(SIZE_CLASSES.SC5.min).toBe(2000);
      expect(SIZE_CLASSES.SC5.max).toBe(Infinity);
      expect(SIZE_CLASSES.SC5.label).toBe('Large adult (reproductive)');
    });
  });

  describe('SIZE_CLASS_KEYS', () => {
    it('should contain all size class keys in order', () => {
      expect(SIZE_CLASS_KEYS).toEqual(['SC1', 'SC2', 'SC3', 'SC4', 'SC5']);
    });
  });

  describe('SIZE_CLASS_LABELS', () => {
    it('should contain human-readable labels with ranges', () => {
      expect(SIZE_CLASS_LABELS).toEqual([
        'SC1 (0-25)',
        'SC2 (25-100)',
        'SC3 (100-500)',
        'SC4 (500-2000)',
        'SC5 (>2000)',
      ]);
    });
  });

  describe('SIZE_CLASS_BOUNDARIES', () => {
    it('should contain boundary values in ascending order', () => {
      expect(SIZE_CLASS_BOUNDARIES).toEqual([0, 25, 100, 500, 2000, Infinity]);
    });
  });

  describe('getSizeClass', () => {
    it('should return SC1 for sizes 0-24', () => {
      expect(getSizeClass(0)).toBe('SC1');
      expect(getSizeClass(10)).toBe('SC1');
      expect(getSizeClass(24)).toBe('SC1');
      expect(getSizeClass(24.9)).toBe('SC1');
    });

    it('should return SC2 for sizes 25-99', () => {
      expect(getSizeClass(25)).toBe('SC2');
      expect(getSizeClass(50)).toBe('SC2');
      expect(getSizeClass(99)).toBe('SC2');
      expect(getSizeClass(99.9)).toBe('SC2');
    });

    it('should return SC3 for sizes 100-499', () => {
      expect(getSizeClass(100)).toBe('SC3');
      expect(getSizeClass(250)).toBe('SC3');
      expect(getSizeClass(499)).toBe('SC3');
      expect(getSizeClass(499.9)).toBe('SC3');
    });

    it('should return SC4 for sizes 500-1999', () => {
      expect(getSizeClass(500)).toBe('SC4');
      expect(getSizeClass(1000)).toBe('SC4');
      expect(getSizeClass(1999)).toBe('SC4');
      expect(getSizeClass(1999.9)).toBe('SC4');
    });

    it('should return SC5 for sizes 2000+', () => {
      expect(getSizeClass(2000)).toBe('SC5');
      expect(getSizeClass(3000)).toBe('SC5');
      expect(getSizeClass(10000)).toBe('SC5');
      expect(getSizeClass(100000)).toBe('SC5');
    });

    it('should handle edge cases at boundaries', () => {
      // At each boundary, should be in the higher class
      expect(getSizeClass(25)).toBe('SC2');
      expect(getSizeClass(100)).toBe('SC3');
      expect(getSizeClass(500)).toBe('SC4');
      expect(getSizeClass(2000)).toBe('SC5');
    });

    it('should handle very small sizes', () => {
      expect(getSizeClass(0.1)).toBe('SC1');
      expect(getSizeClass(0.01)).toBe('SC1');
    });

    it('should handle negative sizes as SC1', () => {
      // Edge case - negative sizes would be < 25, so SC1
      expect(getSizeClass(-5)).toBe('SC1');
    });
  });

  describe('getSizeClassMidpoint', () => {
    it('should return correct midpoint for SC1 (0-25)', () => {
      const midpoint = getSizeClassMidpoint('SC1');
      expect(midpoint).toBe((0 + 25) / 2); // 12.5
    });

    it('should return correct midpoint for SC2 (25-100)', () => {
      const midpoint = getSizeClassMidpoint('SC2');
      expect(midpoint).toBe((25 + 100) / 2); // 62.5
    });

    it('should return correct midpoint for SC3 (100-500)', () => {
      const midpoint = getSizeClassMidpoint('SC3');
      expect(midpoint).toBe((100 + 500) / 2); // 300
    });

    it('should return correct midpoint for SC4 (500-2000)', () => {
      const midpoint = getSizeClassMidpoint('SC4');
      expect(midpoint).toBe((500 + 2000) / 2); // 1250
    });

    it('should return 3000 for SC5 (uses 4000 as effective max)', () => {
      const midpoint = getSizeClassMidpoint('SC5');
      // SC5 has min=2000, max=Infinity, but uses 4000 as effective max
      expect(midpoint).toBe((2000 + 4000) / 2); // 3000
    });

    it('should return numeric values for all size classes', () => {
      SIZE_CLASS_KEYS.forEach((key) => {
        const midpoint = getSizeClassMidpoint(key);
        expect(typeof midpoint).toBe('number');
        expect(Number.isFinite(midpoint)).toBe(true);
      });
    });

    it('should return midpoints in ascending order', () => {
      const midpoints = SIZE_CLASS_KEYS.map(getSizeClassMidpoint);
      for (let i = 1; i < midpoints.length; i++) {
        expect(midpoints[i]).toBeGreaterThan(midpoints[i - 1]);
      }
    });
  });

  describe('extractSizeKey', () => {
    it('should extract SC1 from label', () => {
      expect(extractSizeKey('SC1 (0-25)')).toBe('SC1');
    });

    it('should extract SC2 from label', () => {
      expect(extractSizeKey('SC2 (25-100)')).toBe('SC2');
    });

    it('should extract SC3 from label', () => {
      expect(extractSizeKey('SC3 (100-500)')).toBe('SC3');
    });

    it('should extract SC4 from label', () => {
      expect(extractSizeKey('SC4 (500-2000)')).toBe('SC4');
    });

    it('should extract SC5 from label', () => {
      expect(extractSizeKey('SC5 (>2000)')).toBe('SC5');
    });

    it('should handle lowercase input', () => {
      expect(extractSizeKey('sc1 (0-25)')).toBe('SC1');
      expect(extractSizeKey('sc3')).toBe('SC3');
    });

    it('should handle mixed case input', () => {
      expect(extractSizeKey('Sc2 (25-100)')).toBe('SC2');
    });

    it('should extract from strings with extra text', () => {
      expect(extractSizeKey('Size class SC3 is large juvenile')).toBe('SC3');
      expect(extractSizeKey('The SC4 category')).toBe('SC4');
    });

    it('should return null for invalid inputs', () => {
      expect(extractSizeKey('')).toBeNull();
      expect(extractSizeKey('No size class here')).toBeNull();
      expect(extractSizeKey('SC6')).toBeNull();
      expect(extractSizeKey('SC0')).toBeNull();
      expect(extractSizeKey('ABC')).toBeNull();
    });

    it('should return the first match if multiple are present', () => {
      expect(extractSizeKey('SC1 to SC5')).toBe('SC1');
      expect(extractSizeKey('Between SC2 and SC3')).toBe('SC2');
    });

    it('should handle labels from SIZE_CLASS_LABELS', () => {
      SIZE_CLASS_LABELS.forEach((label, index) => {
        const expectedKey = SIZE_CLASS_KEYS[index];
        expect(extractSizeKey(label)).toBe(expectedKey);
      });
    });

    it('should handle just the size class key', () => {
      expect(extractSizeKey('SC1')).toBe('SC1');
      expect(extractSizeKey('SC5')).toBe('SC5');
    });

    it('should handle size class key embedded in longer strings', () => {
      expect(extractSizeKey('mortality_SC1_2020')).toBe('SC1');
      expect(extractSizeKey('growth-SC4-data')).toBe('SC4');
    });
  });
});
