import { describe, it, expect, beforeEach } from 'vitest';
import { useFilterStore } from '../filterStore';
import { defaultFilters } from '../../types/filters';

describe('filterStore', () => {
  beforeEach(() => {
    // Reset store to default state before each test
    useFilterStore.setState({ filters: defaultFilters });
  });

  describe('updateFilter', () => {
    it('should update a single filter value', () => {
      const { updateFilter } = useFilterStore.getState();

      updateFilter('regions', ['Florida Keys']);

      const { filters } = useFilterStore.getState();
      expect(filters.regions).toEqual(['Florida Keys']);
    });

    it('should update multiple filters independently', () => {
      const { updateFilter } = useFilterStore.getState();

      updateFilter('regions', ['Florida Keys', 'Puerto Rico']);
      updateFilter('fragmentStatus', 'Y');

      const { filters } = useFilterStore.getState();
      expect(filters.regions).toEqual(['Florida Keys', 'Puerto Rico']);
      expect(filters.fragmentStatus).toBe('Y');
    });

    it('should update yearRange tuple', () => {
      const { updateFilter } = useFilterStore.getState();

      updateFilter('yearRange', [2010, 2020]);

      const { filters } = useFilterStore.getState();
      expect(filters.yearRange).toEqual([2010, 2020]);
    });

    it('should update sizeRange tuple', () => {
      const { updateFilter } = useFilterStore.getState();

      updateFilter('sizeRange', [50, 5000]);

      const { filters } = useFilterStore.getState();
      expect(filters.sizeRange).toEqual([50, 5000]);
    });

    it('should update dataTypes array', () => {
      const { updateFilter } = useFilterStore.getState();

      updateFilter('dataTypes', ['field']);

      const { filters } = useFilterStore.getState();
      expect(filters.dataTypes).toEqual(['field']);
    });

    it('should update disturbance filter', () => {
      const { updateFilter } = useFilterStore.getState();

      updateFilter('disturbance', 'storm');

      const { filters } = useFilterStore.getState();
      expect(filters.disturbance).toBe('storm');
    });

    it('should preserve other filters when updating one', () => {
      const { updateFilter } = useFilterStore.getState();

      // Set initial state with some filters
      updateFilter('regions', ['Florida Keys']);
      updateFilter('fragmentStatus', 'N');

      // Update another filter
      updateFilter('disturbance', 'MHW');

      const { filters } = useFilterStore.getState();
      expect(filters.regions).toEqual(['Florida Keys']);
      expect(filters.fragmentStatus).toBe('N');
      expect(filters.disturbance).toBe('MHW');
    });
  });

  describe('resetFilters', () => {
    it('should reset all filters to default values', () => {
      const { updateFilter, resetFilters } = useFilterStore.getState();

      // Modify some filters
      updateFilter('regions', ['Florida Keys']);
      updateFilter('yearRange', [2015, 2020]);
      updateFilter('fragmentStatus', 'Y');
      updateFilter('dataTypes', ['field']);

      // Reset
      resetFilters();

      const { filters } = useFilterStore.getState();
      expect(filters).toEqual(defaultFilters);
    });

    it('should reset to default after multiple updates', () => {
      const { updateFilter, resetFilters } = useFilterStore.getState();

      // Make many updates
      updateFilter('regions', ['Florida Keys', 'Puerto Rico']);
      updateFilter('studies', ['Study1', 'Study2']);
      updateFilter('yearRange', [2010, 2015]);
      updateFilter('sizeRange', [100, 500]);
      updateFilter('sizeClasses', ['SC1', 'SC2']);
      updateFilter('fragmentStatus', 'N');
      updateFilter('disturbance', 'disease');

      resetFilters();

      const { filters } = useFilterStore.getState();
      expect(filters.regions).toEqual([]);
      expect(filters.studies).toEqual([]);
      expect(filters.yearRange).toEqual([2000, 2025]);
      expect(filters.sizeRange).toEqual([0, 10000]);
      expect(filters.sizeClasses).toEqual(['SC1', 'SC2', 'SC3', 'SC4', 'SC5']);
      expect(filters.fragmentStatus).toBe('all');
      expect(filters.disturbance).toBe('all');
    });
  });

  describe('hasActiveFilters', () => {
    it('should return false when all filters are at default values', () => {
      const { hasActiveFilters } = useFilterStore.getState();

      expect(hasActiveFilters()).toBe(false);
    });

    it('should return true when regions are selected', () => {
      const { updateFilter, hasActiveFilters } = useFilterStore.getState();

      updateFilter('regions', ['Florida Keys']);

      expect(hasActiveFilters()).toBe(true);
    });

    it('should return true when dataTypes are reduced from default', () => {
      const { updateFilter, hasActiveFilters } = useFilterStore.getState();

      updateFilter('dataTypes', ['field']);

      expect(hasActiveFilters()).toBe(true);
    });

    it('should return true when studies are selected', () => {
      const { updateFilter, hasActiveFilters } = useFilterStore.getState();

      updateFilter('studies', ['NOAA']);

      expect(hasActiveFilters()).toBe(true);
    });

    it('should return true when yearRange min is changed', () => {
      const { updateFilter, hasActiveFilters } = useFilterStore.getState();

      updateFilter('yearRange', [2010, 2025]);

      expect(hasActiveFilters()).toBe(true);
    });

    it('should return true when yearRange max is changed', () => {
      const { updateFilter, hasActiveFilters } = useFilterStore.getState();

      updateFilter('yearRange', [2000, 2020]);

      expect(hasActiveFilters()).toBe(true);
    });

    it('should return true when sizeRange min is changed', () => {
      const { updateFilter, hasActiveFilters } = useFilterStore.getState();

      updateFilter('sizeRange', [100, 10000]);

      expect(hasActiveFilters()).toBe(true);
    });

    it('should return true when sizeRange max is changed', () => {
      const { updateFilter, hasActiveFilters } = useFilterStore.getState();

      updateFilter('sizeRange', [0, 5000]);

      expect(hasActiveFilters()).toBe(true);
    });

    it('should return true when fragmentStatus is not all', () => {
      const { updateFilter, hasActiveFilters } = useFilterStore.getState();

      updateFilter('fragmentStatus', 'Y');

      expect(hasActiveFilters()).toBe(true);
    });

    it('should return true when disturbance is not all', () => {
      const { updateFilter, hasActiveFilters } = useFilterStore.getState();

      updateFilter('disturbance', 'storm');

      expect(hasActiveFilters()).toBe(true);
    });

    it('should return false after reset', () => {
      const { updateFilter, resetFilters, hasActiveFilters } = useFilterStore.getState();

      // Apply some filters
      updateFilter('regions', ['Florida Keys']);
      updateFilter('fragmentStatus', 'Y');

      // Reset
      resetFilters();

      expect(hasActiveFilters()).toBe(false);
    });
  });

  describe('getActiveFilterCount', () => {
    it('should return 0 when all filters are at default values', () => {
      const { getActiveFilterCount } = useFilterStore.getState();

      expect(getActiveFilterCount()).toBe(0);
    });

    it('should return 1 when one filter category is active', () => {
      const { updateFilter, getActiveFilterCount } = useFilterStore.getState();

      updateFilter('regions', ['Florida Keys']);

      expect(getActiveFilterCount()).toBe(1);
    });

    it('should count regions as one filter even with multiple values', () => {
      const { updateFilter, getActiveFilterCount } = useFilterStore.getState();

      updateFilter('regions', ['Florida Keys', 'Puerto Rico', 'USVI']);

      expect(getActiveFilterCount()).toBe(1);
    });

    it('should count dataTypes as active when reduced from default', () => {
      const { updateFilter, getActiveFilterCount } = useFilterStore.getState();

      updateFilter('dataTypes', ['field', 'nursery_in']);

      expect(getActiveFilterCount()).toBe(1);
    });

    it('should count yearRange as one filter when either bound changes', () => {
      const { updateFilter, getActiveFilterCount } = useFilterStore.getState();

      updateFilter('yearRange', [2010, 2020]);

      expect(getActiveFilterCount()).toBe(1);
    });

    it('should count sizeRange as one filter when either bound changes', () => {
      const { updateFilter, getActiveFilterCount } = useFilterStore.getState();

      updateFilter('sizeRange', [50, 5000]);

      expect(getActiveFilterCount()).toBe(1);
    });

    it('should count multiple active filters correctly', () => {
      const { updateFilter, getActiveFilterCount } = useFilterStore.getState();

      updateFilter('regions', ['Florida Keys']);
      updateFilter('dataTypes', ['field']);
      updateFilter('studies', ['NOAA']);
      updateFilter('yearRange', [2010, 2020]);
      updateFilter('sizeRange', [50, 5000]);
      updateFilter('fragmentStatus', 'Y');
      updateFilter('disturbance', 'storm');

      expect(getActiveFilterCount()).toBe(7);
    });

    it('should return 0 after reset', () => {
      const { updateFilter, resetFilters, getActiveFilterCount } = useFilterStore.getState();

      // Apply multiple filters
      updateFilter('regions', ['Florida Keys']);
      updateFilter('fragmentStatus', 'Y');
      updateFilter('disturbance', 'storm');

      // Verify we had active filters
      expect(getActiveFilterCount()).toBe(3);

      // Reset
      resetFilters();

      expect(getActiveFilterCount()).toBe(0);
    });
  });
});
