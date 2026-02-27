import { useState, useEffect } from 'react';
import { useFilterStore } from '../../stores/filterStore';
import { RegionSelect } from './RegionSelect';
import { DataTypeToggle } from './DataTypeToggle';
import { YearRangeSlider, SizeRangeSlider } from './RangeSlider';
import { FilterChips } from './FilterChips';
import { Button } from '../common/Button';
import clsx from 'clsx';

interface FilterPanelProps {
  className?: string;
}

export function FilterPanel({ className }: FilterPanelProps) {
  const { filters, updateFilter, resetFilters, hasActiveFilters, getActiveFilterCount } = useFilterStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const filterCount = getActiveFilterCount();

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    if (mobileOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when drawer is open
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }
  }, [mobileOpen]);

  const filterContent = (
    <>
      {/* Active Filters */}
      {hasActiveFilters() && (
        <div className="pb-4 border-b border-border-light">
          <FilterChips />
        </div>
      )}

      {/* Region Selection */}
      <section className="filter-section">
        <h3 className="filter-label mb-2">Region</h3>
        <RegionSelect
          selected={filters.regions}
          onChange={(regions) => updateFilter('regions', regions)}
        />
      </section>

      {/* Data Type Toggles */}
      <section className="filter-section">
        <h3 className="filter-label mb-2">Data Type</h3>
        <DataTypeToggle
          selected={filters.dataTypes}
          onChange={(dataTypes) => updateFilter('dataTypes', dataTypes)}
        />
      </section>

      {/* Year Range */}
      <section className="filter-section">
        <h3 className="filter-label mb-3">Year Range</h3>
        <YearRangeSlider
          value={filters.yearRange}
          onChange={(yearRange) => updateFilter('yearRange', yearRange)}
        />
      </section>

      {/* Size Range */}
      <section className="filter-section">
        <h3 className="filter-label mb-3">Size Range (cm²)</h3>
        <SizeRangeSlider
          value={filters.sizeRange}
          onChange={(sizeRange) => updateFilter('sizeRange', sizeRange)}
        />
      </section>

      {/* Fragment Status */}
      <section className="filter-section">
        <h3 id="fragment-status-label" className="filter-label mb-2">Fragment Status</h3>
        <div role="group" aria-labelledby="fragment-status-label" className="flex gap-2">
          {(['all', 'Y', 'N'] as const).map((status) => (
            <button
              key={status}
              aria-pressed={filters.fragmentStatus === status}
              onClick={() => updateFilter('fragmentStatus', status)}
              className={clsx(
                'flex-1 px-3 py-2 sm:py-1.5 rounded-md text-sm transition-colors min-h-[44px] sm:min-h-0',
                filters.fragmentStatus === status
                  ? 'bg-ocean-mid text-white'
                  : 'bg-white text-text-secondary border border-border-medium hover:border-ocean-light'
              )}
            >
              {status === 'all' ? 'All' : status === 'Y' ? 'Fragments' : 'Colonies'}
            </button>
          ))}
        </div>
      </section>

      {/* Disturbance Filter */}
      <section className="filter-section">
        <h3 id="disturbance-label" className="filter-label mb-2">Disturbance</h3>
        <select
          id="disturbance-select"
          aria-labelledby="disturbance-label"
          value={filters.disturbance}
          onChange={(e) =>
            updateFilter('disturbance', e.target.value as typeof filters.disturbance)
          }
          className="w-full px-3 py-2.5 sm:py-2 bg-white border border-border-medium rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-light/50 min-h-[44px] sm:min-h-0"
        >
          <option value="all">All observations</option>
          <option value="none">No disturbance</option>
          <option value="storm">Storm events</option>
          <option value="MHW">Marine heatwaves</option>
          <option value="disease">Disease outbreaks</option>
        </select>
      </section>

      {/* Reset Button */}
      {hasActiveFilters() && (
        <Button
          variant="ghost"
          onClick={resetFilters}
          className="mt-auto text-coral-warm border border-coral-warm hover:bg-coral-warm hover:text-white min-h-[44px]"
        >
          Reset All Filters
        </Button>
      )}
    </>
  );

  return (
    <>
      {/* Mobile Filter Toggle Button */}
      <button
        onClick={() => setMobileOpen(true)}
        className={clsx(
          'lg:hidden fixed bottom-4 right-4 z-40 flex items-center gap-2',
          'px-4 py-3 bg-ocean-deep text-white rounded-full shadow-lg',
          'hover:bg-ocean-mid transition-colors min-h-[48px]'
        )}
        aria-label="Open filters"
        aria-expanded={mobileOpen}
        aria-controls="filter-drawer"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        <span className="font-medium">Filters</span>
        {filterCount > 0 && (
          <span className="bg-coral-warm text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {filterCount}
          </span>
        )}
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 animate-fade-in"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        id="filter-drawer"
        className={clsx(
          'lg:hidden fixed inset-y-0 right-0 z-50 w-80 max-w-[90vw]',
          'bg-sand-warm shadow-xl transform transition-transform duration-300 ease-out',
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        aria-label="Filters"
        aria-hidden={!mobileOpen}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-light">
          <h2 className="text-lg font-semibold text-ocean-deep">Filters</h2>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 hover:bg-sand-light rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close filters"
          >
            <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer Content */}
        <div className="p-5 flex flex-col gap-5 h-[calc(100%-64px)] overflow-y-auto">
          {filterContent}
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={clsx(
          'hidden lg:flex w-72 bg-sand-warm border-r border-border-light p-5',
          'flex-col gap-5 h-full overflow-y-auto filter-panel',
          className
        )}
        aria-label="Filters"
      >
        {filterContent}
      </aside>
    </>
  );
}
