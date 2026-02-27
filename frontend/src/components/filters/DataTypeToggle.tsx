import clsx from 'clsx';
import { DataType, DATA_TYPE_LABELS } from '../../types';
import { DATA_TYPE_COLORS } from '../../utils/colors';

interface DataTypeToggleProps {
  selected: DataType[];
  onChange: (types: DataType[]) => void;
}

const dataTypes: DataType[] = ['field', 'nursery_in', 'nursery_ex'];

export function DataTypeToggle({ selected, onChange }: DataTypeToggleProps) {
  const toggleType = (type: DataType) => {
    if (selected.includes(type)) {
      // Don't allow deselecting all
      if (selected.length > 1) {
        onChange(selected.filter((t) => t !== type));
      }
    } else {
      onChange([...selected, type]);
    }
  };

  return (
    <div className="space-y-2">
      {dataTypes.map((type) => (
        <label
          key={type}
          className={clsx(
            'flex items-center gap-3 px-3 py-2 rounded-lg',
            'border transition-all duration-200',
            type === 'nursery_ex' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
            selected.includes(type)
              ? 'border-ocean-mid bg-ocean-mid/5'
              : 'border-border-light bg-white hover:border-border-medium'
          )}
        >
          <input
            type="checkbox"
            checked={selected.includes(type)}
            onChange={() => toggleType(type)}
            disabled={type === 'nursery_ex'}
            className="w-4 h-4 rounded border-border-medium text-ocean-mid focus:ring-ocean-light disabled:cursor-not-allowed"
          />
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: DATA_TYPE_COLORS[type] }}
          />
          <div className="flex-1 flex items-center justify-between">
            <span className={clsx(
              "text-sm font-medium",
              type === 'nursery_ex' ? "text-text-muted" : "text-text-primary"
            )}>
              {DATA_TYPE_LABELS[type]}
            </span>
            {type === 'nursery_ex' && (
              <span className="text-xs text-text-muted italic">(no data)</span>
            )}
          </div>
        </label>
      ))}
    </div>
  );
}
