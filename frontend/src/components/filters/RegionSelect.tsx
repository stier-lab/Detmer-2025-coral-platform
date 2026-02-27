import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { REGIONS } from '../../types';
import { REGION_COLORS } from '../../utils/colors';

interface RegionSelectProps {
  selected: string[];
  onChange: (regions: string[]) => void;
  options?: string[];
}

export function RegionSelect({
  selected,
  onChange,
  options = REGIONS,
}: RegionSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleRegion = (region: string) => {
    if (selected.includes(region)) {
      onChange(selected.filter((r) => r !== region));
    } else {
      onChange([...selected, region]);
    }
  };

  // When selecting all, treat it the same as clearing to avoid excluding unlisted regions
  // (e.g., Navassa is in the data but not in the REGIONS constant)
  const selectAll = () => onChange([]);
  const clearAll = () => onChange([]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select regions"
        className={clsx(
          'w-full px-3 py-2 text-left bg-white border rounded-lg',
          'focus:outline-none focus:ring-2 focus:ring-ocean-light/50',
          'transition-colors duration-200',
          isOpen ? 'border-ocean-light' : 'border-border-medium'
        )}
      >
        <span className="block truncate text-sm">
          {selected.length === 0
            ? 'All regions'
            : selected.length === options.length
            ? 'All regions'
            : `${selected.length} region${selected.length > 1 ? 's' : ''} selected`}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2">
          <svg
            className={clsx(
              'w-4 h-4 text-text-muted transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-border-medium rounded-lg shadow-lg max-h-60 overflow-auto">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-light">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-ocean-light hover:text-ocean-mid"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-text-muted hover:text-text-secondary"
            >
              Clear
            </button>
          </div>

          {options.map((region) => (
            <label
              key={region}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 cursor-pointer',
                'hover:bg-sand-light transition-colors'
              )}
            >
              <input
                type="checkbox"
                checked={selected.includes(region)}
                onChange={() => toggleRegion(region)}
                className="w-4 h-4 rounded border-border-medium text-ocean-mid focus:ring-ocean-light"
              />
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: REGION_COLORS[region] || '#94a3b8' }}
              />
              <span className="text-sm text-text-primary">{region}</span>
            </label>
          ))}
        </div>
      )}

      {selected.length > 0 && selected.length < options.length && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selected.map((region) => (
            <span
              key={region}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-ocean-light/10 text-ocean-mid"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: REGION_COLORS[region] }}
              />
              {region}
              <button
                type="button"
                onClick={() => toggleRegion(region)}
                aria-label={`Remove ${region}`}
                className="hover:text-coral-warm"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
