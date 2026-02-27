/**
 * useUrlFilters - URL synchronization for filter state
 *
 * This hook synchronizes the filter state with URL search parameters,
 * allowing filter selections to persist in the URL and be shared via links.
 *
 * URL updates are debounced to avoid too many history entries during
 * slider adjustments (e.g., year range, size range).
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFilterStore } from '../stores/filterStore';
import { FilterState, defaultFilters } from '../types/filters';
import { DataType } from '../types/coral';

// Default values for comparison (to avoid adding defaults to URL)
const DEFAULT_YEAR_MIN = 2000;
const DEFAULT_YEAR_MAX = 2025;
const DEFAULT_SIZE_MIN = 0;
const DEFAULT_SIZE_MAX = 10000;
const DEFAULT_DATA_TYPES: DataType[] = ['field', 'nursery_in', 'nursery_ex'];
const DEFAULT_SIZE_CLASSES = ['SC1', 'SC2', 'SC3', 'SC4', 'SC5'];

// URL parameter names
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
 */
function filtersToParams(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams();

  // Regions - only add if any are selected
  if (filters.regions.length > 0) {
    params.set(PARAM_KEYS.regions, filters.regions.join(','));
  }

  // Data types - only add if not all 3 are selected
  if (filters.dataTypes.length < DEFAULT_DATA_TYPES.length) {
    params.set(PARAM_KEYS.dataTypes, filters.dataTypes.join(','));
  }

  // Studies - only add if any are selected
  if (filters.studies.length > 0) {
    params.set(PARAM_KEYS.studies, filters.studies.join(','));
  }

  // Year range - only add if different from defaults
  if (filters.yearRange[0] !== DEFAULT_YEAR_MIN) {
    params.set(PARAM_KEYS.yearMin, String(filters.yearRange[0]));
  }
  if (filters.yearRange[1] !== DEFAULT_YEAR_MAX) {
    params.set(PARAM_KEYS.yearMax, String(filters.yearRange[1]));
  }

  // Size range - only add if different from defaults
  if (filters.sizeRange[0] !== DEFAULT_SIZE_MIN) {
    params.set(PARAM_KEYS.sizeMin, String(filters.sizeRange[0]));
  }
  if (filters.sizeRange[1] !== DEFAULT_SIZE_MAX) {
    params.set(PARAM_KEYS.sizeMax, String(filters.sizeRange[1]));
  }

  // Size classes - only add if not all 5 are selected
  if (filters.sizeClasses.length < DEFAULT_SIZE_CLASSES.length) {
    params.set(PARAM_KEYS.sizeClasses, filters.sizeClasses.join(','));
  }

  // Fragment status - only add if not 'all'
  if (filters.fragmentStatus !== 'all') {
    params.set(PARAM_KEYS.fragment, filters.fragmentStatus);
  }

  // Disturbance - only add if not 'all'
  if (filters.disturbance !== 'all') {
    params.set(PARAM_KEYS.disturbance, filters.disturbance);
  }

  return params;
}

/**
 * Parse URL search params to partial filter state.
 * Returns only the filters that are present in the URL.
 */
function paramsToFilters(params: URLSearchParams): Partial<FilterState> {
  const filters: Partial<FilterState> = {};

  // Regions
  const regions = params.get(PARAM_KEYS.regions);
  if (regions) {
    filters.regions = regions.split(',').filter(Boolean);
  }

  // Data types
  const dataTypes = params.get(PARAM_KEYS.dataTypes);
  if (dataTypes) {
    const types = dataTypes.split(',').filter(Boolean) as DataType[];
    // Validate that only valid data types are included
    const validTypes = types.filter(t =>
      ['field', 'nursery_in', 'nursery_ex'].includes(t)
    );
    if (validTypes.length > 0) {
      filters.dataTypes = validTypes;
    }
  }

  // Studies
  const studies = params.get(PARAM_KEYS.studies);
  if (studies) {
    filters.studies = studies.split(',').filter(Boolean);
  }

  // Year range
  const yearMin = params.get(PARAM_KEYS.yearMin);
  const yearMax = params.get(PARAM_KEYS.yearMax);
  if (yearMin !== null || yearMax !== null) {
    const minYear = yearMin ? parseInt(yearMin, 10) : DEFAULT_YEAR_MIN;
    const maxYear = yearMax ? parseInt(yearMax, 10) : DEFAULT_YEAR_MAX;
    // Validate year range
    if (!isNaN(minYear) && !isNaN(maxYear) && minYear <= maxYear) {
      filters.yearRange = [minYear, maxYear];
    }
  }

  // Size range
  const sizeMin = params.get(PARAM_KEYS.sizeMin);
  const sizeMax = params.get(PARAM_KEYS.sizeMax);
  if (sizeMin !== null || sizeMax !== null) {
    const minSize = sizeMin ? parseInt(sizeMin, 10) : DEFAULT_SIZE_MIN;
    const maxSize = sizeMax ? parseInt(sizeMax, 10) : DEFAULT_SIZE_MAX;
    // Validate size range
    if (!isNaN(minSize) && !isNaN(maxSize) && minSize <= maxSize && minSize >= 0) {
      filters.sizeRange = [minSize, maxSize];
    }
  }

  // Size classes
  const sizeClasses = params.get(PARAM_KEYS.sizeClasses);
  if (sizeClasses) {
    const classes = sizeClasses.split(',').filter(Boolean);
    // Validate that only valid size classes are included
    const validClasses = classes.filter(c =>
      DEFAULT_SIZE_CLASSES.includes(c)
    );
    if (validClasses.length > 0) {
      filters.sizeClasses = validClasses;
    }
  }

  // Fragment status
  const fragment = params.get(PARAM_KEYS.fragment);
  if (fragment && ['all', 'Y', 'N'].includes(fragment)) {
    filters.fragmentStatus = fragment as FilterState['fragmentStatus'];
  }

  // Disturbance
  const disturbance = params.get(PARAM_KEYS.disturbance);
  if (disturbance && ['all', 'none', 'storm', 'MHW', 'disease'].includes(disturbance)) {
    filters.disturbance = disturbance as FilterState['disturbance'];
  }

  return filters;
}

/**
 * Check if two filter states are equal (for avoiding unnecessary URL updates)
 */
function filtersAreEqual(a: FilterState, b: FilterState): boolean {
  return (
    JSON.stringify(a.regions) === JSON.stringify(b.regions) &&
    JSON.stringify(a.dataTypes) === JSON.stringify(b.dataTypes) &&
    JSON.stringify(a.studies) === JSON.stringify(b.studies) &&
    a.yearRange[0] === b.yearRange[0] &&
    a.yearRange[1] === b.yearRange[1] &&
    a.sizeRange[0] === b.sizeRange[0] &&
    a.sizeRange[1] === b.sizeRange[1] &&
    JSON.stringify(a.sizeClasses) === JSON.stringify(b.sizeClasses) &&
    a.fragmentStatus === b.fragmentStatus &&
    a.disturbance === b.disturbance
  );
}

// Debounce delay for URL updates (ms)
const DEBOUNCE_DELAY = 300;

/**
 * Hook for synchronizing filter state with URL search parameters.
 *
 * Usage:
 * ```tsx
 * function Explore() {
 *   const { isInitialized } = useUrlFilters();
 *   // ... rest of component
 * }
 * ```
 *
 * Features:
 * - Loads filters from URL on mount (if present)
 * - Updates URL when filters change (debounced)
 * - Handles bidirectional sync properly
 * - Only adds non-default values to URL for clean URLs
 */
export function useUrlFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { filters, setFilters, resetFilters } = useFilterStore();

  // Track whether initial URL parsing has completed
  const [isInitialized, setIsInitialized] = useState(false);

  // Ref to track if we're currently updating from URL (to prevent loops)
  const isUpdatingFromUrl = useRef(false);

  // Ref for debounce timer
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Store the last filters we synced to URL to avoid unnecessary updates
  const lastSyncedFilters = useRef<FilterState | null>(null);

  // On mount, load filters from URL if present
  useEffect(() => {
    const urlFilters = paramsToFilters(searchParams);

    if (Object.keys(urlFilters).length > 0) {
      // URL has filter parameters - apply them
      isUpdatingFromUrl.current = true;
      const mergedFilters = { ...defaultFilters, ...urlFilters };
      setFilters(mergedFilters);
      lastSyncedFilters.current = mergedFilters;

      // Reset the flag after a short delay to allow the state to update
      setTimeout(() => {
        isUpdatingFromUrl.current = false;
        setIsInitialized(true);
      }, 0);
    } else {
      // No URL filters - use current store filters but sync to URL if non-default
      lastSyncedFilters.current = filters;
      setIsInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // When filters change, update URL (debounced)
  useEffect(() => {
    // Skip if not initialized or if we're updating from URL
    if (!isInitialized || isUpdatingFromUrl.current) {
      return;
    }

    // Skip if filters haven't actually changed
    if (lastSyncedFilters.current && filtersAreEqual(filters, lastSyncedFilters.current)) {
      return;
    }

    // Clear any pending debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Debounce the URL update
    debounceTimer.current = setTimeout(() => {
      const params = filtersToParams(filters);

      // Update URL with replace to avoid creating too many history entries
      setSearchParams(params, { replace: true });
      lastSyncedFilters.current = filters;
    }, DEBOUNCE_DELAY);

    // Cleanup on unmount or before next effect
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [filters, isInitialized, setSearchParams]);

  // Reset filters and clear URL
  const resetFiltersAndUrl = useCallback(() => {
    resetFilters();
    setSearchParams(new URLSearchParams(), { replace: true });
    lastSyncedFilters.current = defaultFilters;
  }, [resetFilters, setSearchParams]);

  // Get a shareable URL with current filters
  const getShareableUrl = useCallback((): string => {
    const params = filtersToParams(filters);
    const url = new URL(window.location.href);
    url.search = params.toString();
    return url.toString();
  }, [filters]);

  // Copy shareable URL to clipboard
  const copyShareableUrl = useCallback(async (): Promise<boolean> => {
    const url = getShareableUrl();
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
      } catch {
        document.body.removeChild(textArea);
        return false;
      }
    }
  }, [getShareableUrl]);

  return {
    isInitialized,
    resetFilters: resetFiltersAndUrl,
    getShareableUrl,
    copyShareableUrl,
  };
}
