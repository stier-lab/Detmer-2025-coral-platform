import { useFilterStore } from '../../stores/filterStore';
import { DATA_TYPE_LABELS } from '../../types';
import clsx from 'clsx';

export function FilterChips() {
  const { filters, updateFilter, getActiveFilterCount } = useFilterStore();
  const count = getActiveFilterCount();

  if (count === 0) return null;

  const removeChip = (
    type: 'region' | 'dataType' | 'year' | 'size' | 'fragment' | 'disturbance',
    value?: string
  ) => {
    switch (type) {
      case 'region':
        updateFilter('regions', filters.regions.filter((r) => r !== value));
        break;
      case 'dataType':
        if (filters.dataTypes.length > 1) {
          updateFilter('dataTypes', filters.dataTypes.filter((t) => t !== value));
        }
        break;
      case 'year':
        updateFilter('yearRange', [2000, 2025]);
        break;
      case 'size':
        updateFilter('sizeRange', [0, 10000]);
        break;
      case 'fragment':
        updateFilter('fragmentStatus', 'all');
        break;
      case 'disturbance':
        updateFilter('disturbance', 'all');
        break;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted uppercase tracking-wide">
          Active Filters ({count})
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {/* Region chips */}
        {filters.regions.map((region) => (
          <Chip
            key={region}
            label={region}
            onRemove={() => removeChip('region', region)}
          />
        ))}

        {/* Data type chips (only show if not all selected) */}
        {filters.dataTypes.length < 3 &&
          filters.dataTypes.map((type) => (
            <Chip
              key={type}
              label={DATA_TYPE_LABELS[type]}
              onRemove={() => removeChip('dataType', type)}
              disabled={filters.dataTypes.length === 1}
            />
          ))}

        {/* Year range chip */}
        {(filters.yearRange[0] !== 2000 || filters.yearRange[1] !== 2025) && (
          <Chip
            label={`${filters.yearRange[0]}-${filters.yearRange[1]}`}
            onRemove={() => removeChip('year')}
          />
        )}

        {/* Size range chip */}
        {(filters.sizeRange[0] !== 0 || filters.sizeRange[1] !== 10000) && (
          <Chip
            label={`${filters.sizeRange[0]}-${filters.sizeRange[1]} cm²`}
            onRemove={() => removeChip('size')}
          />
        )}

        {/* Fragment status chip */}
        {filters.fragmentStatus !== 'all' && (
          <Chip
            label={filters.fragmentStatus === 'Y' ? 'Fragments only' : 'Colonies only'}
            onRemove={() => removeChip('fragment')}
          />
        )}

        {/* Disturbance chip */}
        {filters.disturbance !== 'all' && (
          <Chip
            label={
              filters.disturbance === 'none'
                ? 'No disturbance'
                : filters.disturbance.charAt(0).toUpperCase() + filters.disturbance.slice(1)
            }
            onRemove={() => removeChip('disturbance')}
          />
        )}
      </div>
    </div>
  );
}

interface ChipProps {
  label: string;
  onRemove: () => void;
  disabled?: boolean;
}

function Chip({ label, onRemove, disabled }: ChipProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
        'bg-ocean-light/10 text-ocean-mid',
        !disabled && 'hover:bg-ocean-light/20'
      )}
    >
      {label}
      {!disabled && (
        <button
          type="button"
          onClick={onRemove}
          className="hover:text-coral-warm transition-colors"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </span>
  );
}
