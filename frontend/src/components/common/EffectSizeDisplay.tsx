import { memo } from 'react';
import clsx from 'clsx';

export type EffectType = 'OR' | 'R²' | 'λ' | 'I²' | "Cohen's h" | 'Δ' | '%' | 'pp' | 'custom';

export interface EffectSizeDisplayProps {
  /** Effect type label (OR, R², λ, etc.) */
  type: EffectType;
  /** Main value to display */
  value: number | string;
  /** 95% CI lower bound */
  ciLower?: number;
  /** 95% CI upper bound */
  ciUpper?: number;
  /** P-value for significance badge */
  pValue?: number | string;
  /** Custom label instead of type */
  label?: string;
  /** Interpretation text */
  interpretation?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Layout direction */
  layout?: 'horizontal' | 'vertical' | 'compact';
  /** Additional className */
  className?: string;
}

const formatValue = (value: number | string, type: EffectType): string => {
  if (typeof value === 'string') return value;

  switch (type) {
    case 'R²':
    case 'I²':
    case '%':
      return `${(value * 100).toFixed(1)}%`;
    case 'pp':
      return `${value.toFixed(1)} pp`;
    case 'λ':
      return value.toFixed(3);
    case 'OR':
      return value.toFixed(2);
    case "Cohen's h":
      return value.toFixed(2);
    default:
      return typeof value === 'number' ? value.toFixed(2) : String(value);
  }
};

const formatCI = (lower: number, upper: number, type: EffectType): string => {
  if (type === 'R²' || type === 'I²' || type === '%') {
    return `${(lower * 100).toFixed(1)}–${(upper * 100).toFixed(1)}%`;
  }
  if (type === 'λ') {
    return `${lower.toFixed(3)}–${upper.toFixed(3)}`;
  }
  return `${lower.toFixed(2)}–${upper.toFixed(2)}`;
};

const getPValueBadge = (pValue: number | string): { text: string; color: string } => {
  if (typeof pValue === 'string') {
    if (pValue.includes('0.0001') || pValue.includes('< 0.001')) {
      return { text: 'p < 0.0001', color: 'bg-teal-100 text-teal-800 border-teal-200' };
    }
    return { text: pValue, color: 'bg-slate-100 text-slate-700 border-slate-200' };
  }

  if (pValue < 0.0001) return { text: 'p < 0.0001', color: 'bg-teal-100 text-teal-800 border-teal-200' };
  if (pValue < 0.001) return { text: 'p < 0.001', color: 'bg-teal-100 text-teal-700 border-teal-200' };
  if (pValue < 0.01) return { text: 'p < 0.01', color: 'bg-ocean-100 text-ocean-700 border-ocean-200' };
  if (pValue < 0.05) return { text: `p = ${pValue.toFixed(3)}`, color: 'bg-amber-100 text-amber-700 border-amber-200' };
  return { text: `p = ${pValue.toFixed(2)}`, color: 'bg-slate-100 text-slate-600 border-slate-200' };
};

export const EffectSizeDisplay = memo(function EffectSizeDisplay({
  type,
  value,
  ciLower,
  ciUpper,
  pValue,
  label,
  interpretation,
  size = 'md',
  layout = 'horizontal',
  className,
}: EffectSizeDisplayProps) {
  const displayLabel = label || type;
  const formattedValue = formatValue(value, type);
  const hasCI = ciLower !== undefined && ciUpper !== undefined;
  const pBadge = pValue !== undefined ? getPValueBadge(pValue) : null;

  const sizeClasses = {
    sm: {
      label: 'text-xs font-medium',
      value: 'text-lg font-semibold',
      ci: 'text-xs',
      badge: 'text-[10px] px-1.5 py-0.5',
      interp: 'text-xs',
    },
    md: {
      label: 'text-sm font-medium',
      value: 'text-2xl font-bold',
      ci: 'text-sm',
      badge: 'text-xs px-2 py-0.5',
      interp: 'text-sm',
    },
    lg: {
      label: 'text-base font-medium',
      value: 'text-4xl font-bold',
      ci: 'text-base',
      badge: 'text-sm px-2.5 py-1',
      interp: 'text-base',
    },
  };

  const s = sizeClasses[size];

  if (layout === 'compact') {
    return (
      <span className={clsx('inline-flex items-baseline gap-1', className)}>
        <span className="text-slate-500 text-sm">{displayLabel} =</span>
        <span className="font-semibold text-slate-900">{formattedValue}</span>
        {hasCI && (
          <span className="text-slate-400 text-sm">
            ({formatCI(ciLower, ciUpper, type)})
          </span>
        )}
        {pBadge && (
          <span className={clsx('rounded border text-[10px] px-1 py-0.5 ml-1', pBadge.color)}>
            {pBadge.text}
          </span>
        )}
      </span>
    );
  }

  if (layout === 'vertical') {
    return (
      <div className={clsx('flex flex-col', className)}>
        <span className={clsx(s.label, 'text-slate-500 uppercase tracking-wide')}>
          {displayLabel}
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className={clsx(s.value, 'text-slate-900')}>{formattedValue}</span>
          {pBadge && (
            <span className={clsx('rounded border', s.badge, pBadge.color)}>
              {pBadge.text}
            </span>
          )}
        </div>
        {hasCI && (
          <span className={clsx(s.ci, 'text-slate-400 mt-0.5')}>
            95% CI: {formatCI(ciLower, ciUpper, type)}
          </span>
        )}
        {interpretation && (
          <span className={clsx(s.interp, 'text-slate-600 mt-2')}>
            {interpretation}
          </span>
        )}
      </div>
    );
  }

  // Horizontal layout (default)
  return (
    <div className={clsx('flex items-center gap-3 flex-wrap', className)}>
      <div className="flex items-baseline gap-2">
        <span className={clsx(s.label, 'text-slate-500')}>{displayLabel}</span>
        <span className="text-slate-400">=</span>
        <span className={clsx(s.value, 'text-slate-900')}>{formattedValue}</span>
      </div>
      {hasCI && (
        <span className={clsx(s.ci, 'text-slate-400')}>
          (95% CI: {formatCI(ciLower, ciUpper, type)})
        </span>
      )}
      {pBadge && (
        <span className={clsx('rounded border', s.badge, pBadge.color)}>
          {pBadge.text}
        </span>
      )}
      {interpretation && (
        <span className={clsx(s.interp, 'text-slate-600 italic')}>
          — {interpretation}
        </span>
      )}
    </div>
  );
});

export default EffectSizeDisplay;
