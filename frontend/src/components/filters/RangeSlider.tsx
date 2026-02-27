import { useCallback, useRef, useState, useEffect } from 'react';
import clsx from 'clsx';

interface RangeSliderProps {
  value: [number, number];
  onChange: (value: [number, number]) => void;
  min: number;
  max: number;
  step?: number;
  formatValue?: (value: number) => string;
  label?: string;
}

export function RangeSlider({
  value,
  onChange,
  min,
  max,
  step = 1,
  formatValue = (v) => v.toString(),
  label,
}: RangeSliderProps) {
  const [localValue, setLocalValue] = useState(value);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<'min' | 'max' | null>(null);
  const localValueRef = useRef(localValue);
  const onChangeRef = useRef(onChange);

  // Keep refs in sync with latest state/props to avoid stale closures in mouseup handler
  useEffect(() => { localValueRef.current = localValue; }, [localValue]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const getPositionPercent = (val: number) => {
    return ((val - min) / (max - min)) * 100;
  };

  const getValueFromPosition = useCallback(
    (clientX: number) => {
      if (!sliderRef.current) return min;
      const rect = sliderRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const rawValue = min + percent * (max - min);
      return Math.round(rawValue / step) * step;
    },
    [min, max, step]
  );

  const handleMouseDown = (type: 'min' | 'max') => (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = type;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newValue = getValueFromPosition(moveEvent.clientX);

      setLocalValue((prev) => {
        if (type === 'min') {
          return [Math.min(newValue, prev[1] - step), prev[1]];
        } else {
          return [prev[0], Math.max(newValue, prev[0] + step)];
        }
      });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = null;
      onChangeRef.current(localValueRef.current);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const leftPercent = getPositionPercent(localValue[0]);
  const rightPercent = getPositionPercent(localValue[1]);

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex justify-between text-xs text-text-muted">
          <span>{formatValue(localValue[0])}</span>
          <span>{formatValue(localValue[1])}</span>
        </div>
      )}

      <div
        ref={sliderRef}
        className="relative h-2 bg-border-light rounded-full cursor-pointer"
      >
        {/* Active range */}
        <div
          className="absolute h-full bg-ocean-light rounded-full"
          style={{
            left: `${leftPercent}%`,
            width: `${rightPercent - leftPercent}%`,
          }}
        />

        {/* Min handle */}
        <div
          className={clsx(
            'absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md',
            'border-2 border-ocean-mid cursor-grab active:cursor-grabbing',
            'transition-transform hover:scale-110'
          )}
          style={{ left: `calc(${leftPercent}% - 8px)` }}
          onMouseDown={handleMouseDown('min')}
        />

        {/* Max handle */}
        <div
          className={clsx(
            'absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md',
            'border-2 border-ocean-mid cursor-grab active:cursor-grabbing',
            'transition-transform hover:scale-110'
          )}
          style={{ left: `calc(${rightPercent}% - 8px)` }}
          onMouseDown={handleMouseDown('max')}
        />
      </div>

      <div className="flex justify-between text-xs text-text-muted">
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
    </div>
  );
}

// Simplified year range slider
interface YearRangeSliderProps {
  value: [number, number];
  onChange: (value: [number, number]) => void;
  min?: number;
  max?: number;
}

export function YearRangeSlider({
  value,
  onChange,
  min = 2000,
  max = 2025,
}: YearRangeSliderProps) {
  return (
    <RangeSlider
      value={value}
      onChange={onChange}
      min={min}
      max={max}
      step={1}
      formatValue={(v) => v.toString()}
    />
  );
}

// Size range slider with log-like behavior
interface SizeRangeSliderProps {
  value: [number, number];
  onChange: (value: [number, number]) => void;
  min?: number;
  max?: number;
}

export function SizeRangeSlider({
  value,
  onChange,
  min = 0,
  max = 10000,
}: SizeRangeSliderProps) {
  return (
    <RangeSlider
      value={value}
      onChange={onChange}
      min={min}
      max={max}
      step={10}
      formatValue={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toString())}
    />
  );
}
