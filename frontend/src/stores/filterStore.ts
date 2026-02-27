import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FilterState, defaultFilters } from '../types/filters';

interface FilterStore {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
  hasActiveFilters: () => boolean;
  getActiveFilterCount: () => number;
}

export const useFilterStore = create<FilterStore>()(
  persist(
    (set, get) => ({
      filters: defaultFilters,

      setFilters: (filters) => set({ filters }),

      updateFilter: (key, value) =>
        set((state) => ({
          filters: { ...state.filters, [key]: value },
        })),

      resetFilters: () => set({ filters: defaultFilters }),

      hasActiveFilters: () => {
        const { filters } = get();
        return (
          filters.regions.length > 0 ||
          filters.dataTypes.length < 3 ||
          filters.studies.length > 0 ||
          filters.yearRange[0] !== 2000 ||
          filters.yearRange[1] !== 2025 ||
          filters.sizeRange[0] !== 0 ||
          filters.sizeRange[1] !== 10000 ||
          filters.fragmentStatus !== 'all' ||
          filters.disturbance !== 'all'
        );
      },

      getActiveFilterCount: () => {
        const { filters } = get();
        let count = 0;
        if (filters.regions.length > 0) count++;
        if (filters.dataTypes.length < 3) count++;
        if (filters.studies.length > 0) count++;
        if (filters.yearRange[0] !== 2000 || filters.yearRange[1] !== 2025) count++;
        if (filters.sizeRange[0] !== 0 || filters.sizeRange[1] !== 10000) count++;
        if (filters.fragmentStatus !== 'all') count++;
        if (filters.disturbance !== 'all') count++;
        return count;
      },
    }),
    {
      name: 'rrse-filters',
      partialize: (state) => ({ filters: state.filters }),
    }
  )
);
