/**
 * Tests for URL filter serialization/deserialization utilities.
 *
 * Since the actual hook uses React Router and complex state management,
 * we test the core serialization logic by recreating the pure functions.
 * These functions mirror the internal implementation of useUrlFilters.
 */

import { describe, it, expect } from 'vitest';
import { FilterState, defaultFilters } from '../../types/filters';
import { DataType } from '../../types/coral';

// Default values for comparison (matching the hook's constants)
const DEFAULT_YEAR_MIN = 2000;
const DEFAULT_YEAR_MAX = 2025;
const DEFAULT_SIZE_MIN = 0;
const DEFAULT_SIZE_MAX = 10000;
const DEFAULT_DATA_TYPES: DataType[] = ['field', 'nursery_in', 'nursery_ex'];
const DEFAULT_SIZE_CLASSES = ['SC1', 'SC2', 'SC3', 'SC4', 'SC5'];

// URL parameter names (matching the hook's constants)
const PARAM_KEYS = {
  regions: 'regions',
  dataTypes: 'dataTypes',
  studies: 'studies',
  yearMin: 'yearMin',
  yearMax: 'yearMax',
  sizeMin: 'sizeMin',
  sizeMax: 'sizeMax',
  sizeClasses: 'sizeClasses',
  fragment: 'fragment',
  disturbance: 'disturbance',
} as const;

/**
 * Serialize filter state to URL search params.
 * Only includes non-default values to keep URLs clean.
 * (Mirrors the internal implementation)
 */
function filtersToParams(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.regions.length > 0) {
    params.set(PARAM_KEYS.regions, filters.regions.join(','));
  }

  if (filters.dataTypes.length < DEFAULT_DATA_TYPES.length) {
    params.set(PARAM_KEYS.dataTypes, filters.dataTypes.join(','));
  }

  if (filters.studies.length > 0) {
    params.set(PARAM_KEYS.studies, filters.studies.join(','));
  }

  if (filters.yearRange[0] !== DEFAULT_YEAR_MIN) {
    params.set(PARAM_KEYS.yearMin, String(filters.yearRange[0]));
  }
  if (filters.yearRange[1] !== DEFAULT_YEAR_MAX) {
    params.set(PARAM_KEYS.yearMax, String(filters.yearRange[1]));
  }

  if (filters.sizeRange[0] !== DEFAULT_SIZE_MIN) {
    params.set(PARAM_KEYS.sizeMin, String(filters.sizeRange[0]));
  }
  if (filters.sizeRange[1] !== DEFAULT_SIZE_MAX) {
    params.set(PARAM_KEYS.sizeMax, String(filters.sizeRange[1]));
  }

  if (filters.sizeClasses.length < DEFAULT_SIZE_CLASSES.length) {
    params.set(PARAM_KEYS.sizeClasses, filters.sizeClasses.join(','));
  }

  if (filters.fragmentStatus !== 'all') {
    params.set(PARAM_KEYS.fragment, filters.fragmentStatus);
  }

  if (filters.disturbance !== 'all') {
    params.set(PARAM_KEYS.disturbance, filters.disturbance);
  }

  return params;
}

/**
 * Parse URL search params to partial filter state.
 * Returns only the filters that are present in the URL.
 * (Mirrors the internal implementation)
 */
function paramsToFilters(params: URLSearchParams): Partial<FilterState> {
  const filters: Partial<FilterState> = {};

  const regions = params.get(PARAM_KEYS.regions);
  if (regions) {
    filters.regions = regions.split(',').filter(Boolean);
  }

  const dataTypes = params.get(PARAM_KEYS.dataTypes);
  if (dataTypes) {
    const types = dataTypes.split(',').filter(Boolean) as DataType[];
    const validTypes = types.filter(t =>
      ['field', 'nursery_in', 'nursery_ex'].includes(t)
    );
    if (validTypes.length > 0) {
      filters.dataTypes = validTypes;
    }
  }

  const studies = params.get(PARAM_KEYS.studies);
  if (studies) {
    filters.studies = studies.split(',').filter(Boolean);
  }

  const yearMin = params.get(PARAM_KEYS.yearMin);
  const yearMax = params.get(PARAM_KEYS.yearMax);
  if (yearMin !== null || yearMax !== null) {
    const minYear = yearMin ? parseInt(yearMin, 10) : DEFAULT_YEAR_MIN;
    const maxYear = yearMax ? parseInt(yearMax, 10) : DEFAULT_YEAR_MAX;
    if (!isNaN(minYear) && !isNaN(maxYear) && minYear <= maxYear) {
      filters.yearRange = [minYear, maxYear];
    }
  }

  const sizeMin = params.get(PARAM_KEYS.sizeMin);
  const sizeMax = params.get(PARAM_KEYS.sizeMax);
  if (sizeMin !== null || sizeMax !== null) {
    const minSize = sizeMin ? parseInt(sizeMin, 10) : DEFAULT_SIZE_MIN;
    const maxSize = sizeMax ? parseInt(sizeMax, 10) : DEFAULT_SIZE_MAX;
    if (!isNaN(minSize) && !isNaN(maxSize) && minSize <= maxSize && minSize >= 0) {
      filters.sizeRange = [minSize, maxSize];
    }
  }

  const sizeClasses = params.get(PARAM_KEYS.sizeClasses);
  if (sizeClasses) {
    const classes = sizeClasses.split(',').filter(Boolean);
    const validClasses = classes.filter(c =>
      DEFAULT_SIZE_CLASSES.includes(c)
    );
    if (validClasses.length > 0) {
      filters.sizeClasses = validClasses;
    }
  }

  const fragment = params.get(PARAM_KEYS.fragment);
  if (fragment && ['all', 'Y', 'N'].includes(fragment)) {
    filters.fragmentStatus = fragment as FilterState['fragmentStatus'];
  }

  const disturbance = params.get(PARAM_KEYS.disturbance);
  if (disturbance && ['all', 'none', 'storm', 'MHW', 'disease'].includes(disturbance)) {
    filters.disturbance = disturbance as FilterState['disturbance'];
  }

  return filters;
}

describe('useUrlFilters utilities', () => {
  describe('filtersToParams', () => {
    it('should return empty params for default filters', () => {
      const params = filtersToParams(defaultFilters);
      expect(params.toString()).toBe('');
    });

    it('should serialize regions', () => {
      const filters: FilterState = {
        ...defaultFilters,
        regions: ['Florida Keys', 'Puerto Rico'],
      };
      const params = filtersToParams(filters);
      expect(params.get('regions')).toBe('Florida Keys,Puerto Rico');
    });

    it('should serialize single region', () => {
      const filters: FilterState = {
        ...defaultFilters,
        regions: ['USVI'],
      };
      const params = filtersToParams(filters);
      expect(params.get('regions')).toBe('USVI');
    });

    it('should not serialize empty regions array', () => {
      const filters: FilterState = {
        ...defaultFilters,
        regions: [],
      };
      const params = filtersToParams(filters);
      expect(params.has('regions')).toBe(false);
    });

    it('should serialize dataTypes when reduced from default', () => {
      const filters: FilterState = {
        ...defaultFilters,
        dataTypes: ['field'],
      };
      const params = filtersToParams(filters);
      expect(params.get('dataTypes')).toBe('field');
    });

    it('should not serialize dataTypes when all selected', () => {
      const filters: FilterState = {
        ...defaultFilters,
        dataTypes: ['field', 'nursery_in', 'nursery_ex'],
      };
      const params = filtersToParams(filters);
      expect(params.has('dataTypes')).toBe(false);
    });

    it('should serialize studies', () => {
      const filters: FilterState = {
        ...defaultFilters,
        studies: ['NOAA', 'FWC'],
      };
      const params = filtersToParams(filters);
      expect(params.get('studies')).toBe('NOAA,FWC');
    });

    it('should serialize yearRange when min changes', () => {
      const filters: FilterState = {
        ...defaultFilters,
        yearRange: [2010, 2025],
      };
      const params = filtersToParams(filters);
      expect(params.get('yearMin')).toBe('2010');
      expect(params.has('yearMax')).toBe(false);
    });

    it('should serialize yearRange when max changes', () => {
      const filters: FilterState = {
        ...defaultFilters,
        yearRange: [2000, 2020],
      };
      const params = filtersToParams(filters);
      expect(params.has('yearMin')).toBe(false);
      expect(params.get('yearMax')).toBe('2020');
    });

    it('should serialize yearRange when both change', () => {
      const filters: FilterState = {
        ...defaultFilters,
        yearRange: [2010, 2020],
      };
      const params = filtersToParams(filters);
      expect(params.get('yearMin')).toBe('2010');
      expect(params.get('yearMax')).toBe('2020');
    });

    it('should serialize sizeRange when min changes', () => {
      const filters: FilterState = {
        ...defaultFilters,
        sizeRange: [100, 10000],
      };
      const params = filtersToParams(filters);
      expect(params.get('sizeMin')).toBe('100');
      expect(params.has('sizeMax')).toBe(false);
    });

    it('should serialize sizeRange when max changes', () => {
      const filters: FilterState = {
        ...defaultFilters,
        sizeRange: [0, 5000],
      };
      const params = filtersToParams(filters);
      expect(params.has('sizeMin')).toBe(false);
      expect(params.get('sizeMax')).toBe('5000');
    });

    it('should serialize sizeClasses when reduced', () => {
      const filters: FilterState = {
        ...defaultFilters,
        sizeClasses: ['SC1', 'SC2', 'SC3'],
      };
      const params = filtersToParams(filters);
      expect(params.get('sizeClasses')).toBe('SC1,SC2,SC3');
    });

    it('should not serialize sizeClasses when all selected', () => {
      const filters: FilterState = {
        ...defaultFilters,
        sizeClasses: ['SC1', 'SC2', 'SC3', 'SC4', 'SC5'],
      };
      const params = filtersToParams(filters);
      expect(params.has('sizeClasses')).toBe(false);
    });

    it('should serialize fragmentStatus when not all', () => {
      const filters: FilterState = {
        ...defaultFilters,
        fragmentStatus: 'Y',
      };
      const params = filtersToParams(filters);
      expect(params.get('fragment')).toBe('Y');
    });

    it('should not serialize fragmentStatus when all', () => {
      const params = filtersToParams(defaultFilters);
      expect(params.has('fragment')).toBe(false);
    });

    it('should serialize disturbance when not all', () => {
      const filters: FilterState = {
        ...defaultFilters,
        disturbance: 'storm',
      };
      const params = filtersToParams(filters);
      expect(params.get('disturbance')).toBe('storm');
    });

    it('should serialize multiple filters together', () => {
      const filters: FilterState = {
        ...defaultFilters,
        regions: ['Florida Keys'],
        dataTypes: ['field', 'nursery_in'],
        yearRange: [2010, 2020],
        fragmentStatus: 'N',
      };
      const params = filtersToParams(filters);
      expect(params.get('regions')).toBe('Florida Keys');
      expect(params.get('dataTypes')).toBe('field,nursery_in');
      expect(params.get('yearMin')).toBe('2010');
      expect(params.get('yearMax')).toBe('2020');
      expect(params.get('fragment')).toBe('N');
    });
  });

  describe('paramsToFilters', () => {
    it('should return empty object for empty params', () => {
      const params = new URLSearchParams();
      const filters = paramsToFilters(params);
      expect(filters).toEqual({});
    });

    it('should parse regions', () => {
      const params = new URLSearchParams('regions=Florida+Keys,Puerto+Rico');
      const filters = paramsToFilters(params);
      expect(filters.regions).toEqual(['Florida Keys', 'Puerto Rico']);
    });

    it('should parse single region', () => {
      const params = new URLSearchParams('regions=USVI');
      const filters = paramsToFilters(params);
      expect(filters.regions).toEqual(['USVI']);
    });

    it('should parse dataTypes', () => {
      const params = new URLSearchParams('dataTypes=field,nursery_in');
      const filters = paramsToFilters(params);
      expect(filters.dataTypes).toEqual(['field', 'nursery_in']);
    });

    it('should filter invalid dataTypes', () => {
      const params = new URLSearchParams('dataTypes=field,invalid,nursery_ex');
      const filters = paramsToFilters(params);
      expect(filters.dataTypes).toEqual(['field', 'nursery_ex']);
    });

    it('should not set dataTypes for all invalid values', () => {
      const params = new URLSearchParams('dataTypes=invalid1,invalid2');
      const filters = paramsToFilters(params);
      expect(filters.dataTypes).toBeUndefined();
    });

    it('should parse studies', () => {
      const params = new URLSearchParams('studies=NOAA,FWC');
      const filters = paramsToFilters(params);
      expect(filters.studies).toEqual(['NOAA', 'FWC']);
    });

    it('should parse yearRange min only', () => {
      const params = new URLSearchParams('yearMin=2010');
      const filters = paramsToFilters(params);
      expect(filters.yearRange).toEqual([2010, 2025]);
    });

    it('should parse yearRange max only', () => {
      const params = new URLSearchParams('yearMax=2020');
      const filters = paramsToFilters(params);
      expect(filters.yearRange).toEqual([2000, 2020]);
    });

    it('should parse yearRange both values', () => {
      const params = new URLSearchParams('yearMin=2010&yearMax=2020');
      const filters = paramsToFilters(params);
      expect(filters.yearRange).toEqual([2010, 2020]);
    });

    it('should reject invalid year range (min > max)', () => {
      const params = new URLSearchParams('yearMin=2020&yearMax=2010');
      const filters = paramsToFilters(params);
      expect(filters.yearRange).toBeUndefined();
    });

    it('should reject non-numeric year values', () => {
      const params = new URLSearchParams('yearMin=abc&yearMax=2020');
      const filters = paramsToFilters(params);
      // abc parses to NaN, so yearRange should be undefined
      expect(filters.yearRange).toBeUndefined();
    });

    it('should parse sizeRange min only', () => {
      const params = new URLSearchParams('sizeMin=100');
      const filters = paramsToFilters(params);
      expect(filters.sizeRange).toEqual([100, 10000]);
    });

    it('should parse sizeRange max only', () => {
      const params = new URLSearchParams('sizeMax=5000');
      const filters = paramsToFilters(params);
      expect(filters.sizeRange).toEqual([0, 5000]);
    });

    it('should parse sizeRange both values', () => {
      const params = new URLSearchParams('sizeMin=100&sizeMax=5000');
      const filters = paramsToFilters(params);
      expect(filters.sizeRange).toEqual([100, 5000]);
    });

    it('should reject invalid size range (min > max)', () => {
      const params = new URLSearchParams('sizeMin=5000&sizeMax=100');
      const filters = paramsToFilters(params);
      expect(filters.sizeRange).toBeUndefined();
    });

    it('should reject negative size min', () => {
      const params = new URLSearchParams('sizeMin=-100&sizeMax=5000');
      const filters = paramsToFilters(params);
      expect(filters.sizeRange).toBeUndefined();
    });

    it('should parse sizeClasses', () => {
      const params = new URLSearchParams('sizeClasses=SC1,SC2,SC3');
      const filters = paramsToFilters(params);
      expect(filters.sizeClasses).toEqual(['SC1', 'SC2', 'SC3']);
    });

    it('should filter invalid sizeClasses', () => {
      const params = new URLSearchParams('sizeClasses=SC1,SC6,SC3');
      const filters = paramsToFilters(params);
      expect(filters.sizeClasses).toEqual(['SC1', 'SC3']);
    });

    it('should not set sizeClasses for all invalid values', () => {
      const params = new URLSearchParams('sizeClasses=SC6,SC7');
      const filters = paramsToFilters(params);
      expect(filters.sizeClasses).toBeUndefined();
    });

    it('should parse fragmentStatus Y', () => {
      const params = new URLSearchParams('fragment=Y');
      const filters = paramsToFilters(params);
      expect(filters.fragmentStatus).toBe('Y');
    });

    it('should parse fragmentStatus N', () => {
      const params = new URLSearchParams('fragment=N');
      const filters = paramsToFilters(params);
      expect(filters.fragmentStatus).toBe('N');
    });

    it('should parse fragmentStatus all', () => {
      const params = new URLSearchParams('fragment=all');
      const filters = paramsToFilters(params);
      expect(filters.fragmentStatus).toBe('all');
    });

    it('should ignore invalid fragmentStatus', () => {
      const params = new URLSearchParams('fragment=invalid');
      const filters = paramsToFilters(params);
      expect(filters.fragmentStatus).toBeUndefined();
    });

    it('should parse disturbance values', () => {
      expect(paramsToFilters(new URLSearchParams('disturbance=none')).disturbance).toBe('none');
      expect(paramsToFilters(new URLSearchParams('disturbance=storm')).disturbance).toBe('storm');
      expect(paramsToFilters(new URLSearchParams('disturbance=MHW')).disturbance).toBe('MHW');
      expect(paramsToFilters(new URLSearchParams('disturbance=disease')).disturbance).toBe('disease');
      expect(paramsToFilters(new URLSearchParams('disturbance=all')).disturbance).toBe('all');
    });

    it('should ignore invalid disturbance', () => {
      const params = new URLSearchParams('disturbance=earthquake');
      const filters = paramsToFilters(params);
      expect(filters.disturbance).toBeUndefined();
    });

    it('should parse multiple params together', () => {
      const params = new URLSearchParams(
        'regions=Florida+Keys&dataTypes=field&yearMin=2010&yearMax=2020&fragment=N'
      );
      const filters = paramsToFilters(params);
      expect(filters.regions).toEqual(['Florida Keys']);
      expect(filters.dataTypes).toEqual(['field']);
      expect(filters.yearRange).toEqual([2010, 2020]);
      expect(filters.fragmentStatus).toBe('N');
    });

    it('should filter out empty string values in comma-separated lists', () => {
      const params = new URLSearchParams('regions=Florida+Keys,,Puerto+Rico,');
      const filters = paramsToFilters(params);
      expect(filters.regions).toEqual(['Florida Keys', 'Puerto Rico']);
    });
  });

  describe('round-trip serialization', () => {
    it('should round-trip filters with regions', () => {
      const original: FilterState = {
        ...defaultFilters,
        regions: ['Florida Keys', 'Puerto Rico'],
      };
      const params = filtersToParams(original);
      const parsed = paramsToFilters(params);
      expect(parsed.regions).toEqual(original.regions);
    });

    it('should round-trip filters with dataTypes', () => {
      const original: FilterState = {
        ...defaultFilters,
        dataTypes: ['field', 'nursery_in'],
      };
      const params = filtersToParams(original);
      const parsed = paramsToFilters(params);
      expect(parsed.dataTypes).toEqual(original.dataTypes);
    });

    it('should round-trip filters with yearRange', () => {
      const original: FilterState = {
        ...defaultFilters,
        yearRange: [2010, 2020],
      };
      const params = filtersToParams(original);
      const parsed = paramsToFilters(params);
      expect(parsed.yearRange).toEqual(original.yearRange);
    });

    it('should round-trip filters with sizeRange', () => {
      const original: FilterState = {
        ...defaultFilters,
        sizeRange: [100, 5000],
      };
      const params = filtersToParams(original);
      const parsed = paramsToFilters(params);
      expect(parsed.sizeRange).toEqual(original.sizeRange);
    });

    it('should round-trip complex filter combinations', () => {
      const original: FilterState = {
        ...defaultFilters,
        regions: ['Florida Keys', 'USVI'],
        dataTypes: ['field'],
        studies: ['NOAA'],
        yearRange: [2015, 2022],
        sizeRange: [50, 5000],
        sizeClasses: ['SC2', 'SC3', 'SC4'],
        fragmentStatus: 'Y',
        disturbance: 'storm',
      };
      const params = filtersToParams(original);
      const parsed = paramsToFilters(params);

      // Merge with defaults to compare (as paramsToFilters returns partial)
      const merged = { ...defaultFilters, ...parsed };
      expect(merged.regions).toEqual(original.regions);
      expect(merged.dataTypes).toEqual(original.dataTypes);
      expect(merged.studies).toEqual(original.studies);
      expect(merged.yearRange).toEqual(original.yearRange);
      expect(merged.sizeRange).toEqual(original.sizeRange);
      expect(merged.sizeClasses).toEqual(original.sizeClasses);
      expect(merged.fragmentStatus).toEqual(original.fragmentStatus);
      expect(merged.disturbance).toEqual(original.disturbance);
    });
  });

  describe('default values handling', () => {
    it('should not include default values in URL params', () => {
      const params = filtersToParams(defaultFilters);
      expect(Array.from(params.keys())).toHaveLength(0);
    });

    it('should return default year min when not in params', () => {
      const params = new URLSearchParams('yearMax=2020');
      const filters = paramsToFilters(params);
      expect(filters.yearRange?.[0]).toBe(DEFAULT_YEAR_MIN);
    });

    it('should return default year max when not in params', () => {
      const params = new URLSearchParams('yearMin=2010');
      const filters = paramsToFilters(params);
      expect(filters.yearRange?.[1]).toBe(DEFAULT_YEAR_MAX);
    });

    it('should return default size min when not in params', () => {
      const params = new URLSearchParams('sizeMax=5000');
      const filters = paramsToFilters(params);
      expect(filters.sizeRange?.[0]).toBe(DEFAULT_SIZE_MIN);
    });

    it('should return default size max when not in params', () => {
      const params = new URLSearchParams('sizeMin=100');
      const filters = paramsToFilters(params);
      expect(filters.sizeRange?.[1]).toBe(DEFAULT_SIZE_MAX);
    });
  });
});
