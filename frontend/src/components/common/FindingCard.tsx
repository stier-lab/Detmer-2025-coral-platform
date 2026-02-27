import { memo } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowRight, TrendingDown, TrendingUp, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
import { EffectSizeDisplay, EffectType } from './EffectSizeDisplay';

export type FindingTrend = 'declining' | 'stable' | 'increasing' | 'uncertain' | 'positive' | 'negative' | 'neutral';

export interface FindingCardProps {
  /** Finding number (1-15) */
  number: number;
  /** Short title */
  title: string;
  /** One-line summary of the finding */
  summary: string;
  /** Main statistic label */
  statLabel: string;
  /** Main statistic value */
  statValue: number | string;
  /** Effect size type */
  effectType: EffectType;
  /** Effect size value */
  effectValue: number | string;
  /** 95% CI lower */
  ciLower?: number;
  /** 95% CI upper */
  ciUpper?: number;
  /** P-value */
  pValue?: number | string;
  /** Trend direction */
  trend?: FindingTrend;
  /** Actionable interpretation for practitioners */
  action?: string;
  /** Link to detailed section */
  detailLink?: string;
  /** Card size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional className */
  className?: string;
}

const trendConfig: Record<FindingTrend, { icon: typeof TrendingDown; color: string; bg: string }> = {
  declining: { icon: TrendingDown, color: 'text-coral-500', bg: 'bg-coral-50' },
  increasing: { icon: TrendingUp, color: 'text-teal-500', bg: 'bg-teal-50' },
  stable: { icon: CheckCircle, color: 'text-ocean-500', bg: 'bg-ocean-50' },
  uncertain: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50' },
  positive: { icon: CheckCircle, color: 'text-teal-500', bg: 'bg-teal-50' },
  negative: { icon: XCircle, color: 'text-coral-500', bg: 'bg-coral-50' },
  neutral: { icon: Info, color: 'text-slate-500', bg: 'bg-slate-50' },
};

export const FindingCard = memo(function FindingCard({
  number,
  title,
  summary,
  statLabel,
  statValue,
  effectType,
  effectValue,
  ciLower,
  ciUpper,
  pValue,
  trend = 'neutral',
  action,
  detailLink,
  size = 'md',
  className,
}: FindingCardProps) {
  const TrendIcon = trendConfig[trend].icon;
  const trendColor = trendConfig[trend].color;
  const trendBg = trendConfig[trend].bg;

  const sizeClasses = {
    sm: {
      padding: 'p-4',
      number: 'text-xs w-5 h-5',
      title: 'text-sm font-semibold',
      summary: 'text-xs',
      stat: 'text-2xl',
      action: 'text-xs',
    },
    md: {
      padding: 'p-5',
      number: 'text-sm w-6 h-6',
      title: 'text-base font-semibold',
      summary: 'text-sm',
      stat: 'text-3xl',
      action: 'text-sm',
    },
    lg: {
      padding: 'p-6',
      number: 'text-base w-7 h-7',
      title: 'text-lg font-semibold',
      summary: 'text-base',
      stat: 'text-4xl',
      action: 'text-base',
    },
  };

  const s = sizeClasses[size];

  const content = (
    <div
      className={clsx(
        'bg-white rounded-xl border border-slate-200 overflow-hidden',
        'hover:border-ocean-300 hover:shadow-md transition-all duration-200',
        detailLink && 'cursor-pointer',
        s.padding,
        className
      )}
    >
      {/* Header with number and trend */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              'inline-flex items-center justify-center rounded-full bg-ocean-100 text-ocean-700 font-bold',
              s.number
            )}
          >
            {number}
          </span>
          <h3 className={clsx(s.title, 'text-slate-900')}>{title}</h3>
        </div>
        <div className={clsx('rounded-full p-1.5', trendBg)}>
          <TrendIcon className={clsx('w-4 h-4', trendColor)} />
        </div>
      </div>

      {/* Summary */}
      <p className={clsx(s.summary, 'text-slate-600 mb-4')}>{summary}</p>

      {/* Main statistic */}
      <div className="mb-3">
        <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">{statLabel}</div>
        <div className={clsx(s.stat, 'font-bold text-slate-900')}>
          {typeof statValue === 'number' ? statValue.toFixed(statValue < 10 ? 3 : 1) : statValue}
        </div>
      </div>

      {/* Effect size display */}
      <div className="border-t border-slate-100 pt-3 mb-3">
        <EffectSizeDisplay
          type={effectType}
          value={effectValue}
          ciLower={ciLower}
          ciUpper={ciUpper}
          pValue={pValue}
          size="sm"
          layout="compact"
        />
      </div>

      {/* Action interpretation */}
      {action && (
        <div className={clsx('bg-slate-50 -mx-5 -mb-5 px-5 py-3 mt-4', size === 'sm' && '-mx-4 -mb-4 px-4')}>
          <p className={clsx(s.action, 'text-slate-700')}>
            <span className="font-medium text-ocean-700">Implication:</span> {action}
          </p>
        </div>
      )}

      {/* Link indicator */}
      {detailLink && (
        <div className="flex items-center gap-1 text-ocean-600 text-sm mt-3">
          <span>View details</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      )}
    </div>
  );

  if (detailLink) {
    return (
      <Link to={detailLink} className="block group">
        {content}
      </Link>
    );
  }

  return content;
});

export default FindingCard;
