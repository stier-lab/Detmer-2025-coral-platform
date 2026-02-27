import { memo } from 'react';
import clsx from 'clsx';
import { FindingCard, FindingTrend } from '../../common/FindingCard';
import { EffectType } from '../../common/EffectSizeDisplay';

interface Finding {
  number: number;
  title: string;
  summary: string;
  statLabel: string;
  statValue: number | string;
  effectType: EffectType;
  effectValue: number | string;
  ciLower?: number;
  ciUpper?: number;
  pValue?: number | string;
  trend: FindingTrend;
  action: string;
  detailLink: string;
  category: 'population' | 'drivers' | 'size' | 'heterogeneity' | 'comparison' | 'regional' | 'evidence' | 'priorities';
}

// All 15 key findings from docs/ANALYSIS_SUMMARY.md
const FINDINGS: Finding[] = [
  {
    number: 1,
    title: 'Population Declining',
    summary: 'The population is declining at approximately 1.4% per year under current conditions.',
    statLabel: 'Growth Rate (λ)',
    statValue: 0.986,
    effectType: 'λ',
    effectValue: 0.986,
    ciLower: 0.819,
    ciUpper: 1.020,
    trend: 'declining',
    action: 'Without intervention, population will likely continue to shrink. 87.3% of bootstrap replicates show decline.',
    detailLink: '/analysis#population',
    category: 'population',
  },
  {
    number: 2,
    title: 'Protect Large Adults',
    summary: 'Large adult survival (SC5) accounts for 54.8% of population growth rate sensitivity.',
    statLabel: 'SC5 Elasticity',
    statValue: '54.8%',
    effectType: '%',
    effectValue: 0.548,
    trend: 'positive',
    action: '1% improvement in SC5 survival has 4× more impact than equivalent improvements to other parameters.',
    detailLink: '/analysis#drivers',
    category: 'drivers',
  },
  {
    number: 3,
    title: 'Size Explains Little',
    summary: 'Size predicts survival, but explains only 8.6% of the variance.',
    statLabel: 'Variance Explained',
    statValue: '8.6%',
    effectType: 'OR',
    effectValue: 1.41,
    ciLower: 1.36,
    ciUpper: 1.46,
    pValue: '< 0.0001',
    trend: 'uncertain',
    action: 'Other factors (region, year, disturbance) dominate. Don\'t rely solely on size for predictions.',
    detailLink: '/analysis#size-effects',
    category: 'size',
  },
  {
    number: 4,
    title: 'Threshold Unreliable',
    summary: 'Size threshold is detected at ~44 cm² but 95% CI spans 3 orders of magnitude.',
    statLabel: '95% CI Width',
    statValue: '10–33,100 cm²',
    effectType: 'custom',
    effectValue: '3,300×',
    trend: 'uncertain',
    action: 'Do not use single threshold values. Use size class estimates with confidence intervals instead.',
    detailLink: '/analysis#size-effects',
    category: 'size',
  },
  {
    number: 5,
    title: 'RGR Predicts Better',
    summary: 'Relative growth rate (RGR) explains 22× more variance than absolute growth rate.',
    statLabel: 'RGR R²',
    statValue: '33.9%',
    effectType: 'R²',
    effectValue: 0.339,
    trend: 'positive',
    action: 'Use relative growth rate for size-growth projections. AGR R² = 1.5% (nearly useless).',
    detailLink: '/analysis#size-effects',
    category: 'size',
  },
  {
    number: 6,
    title: 'Cannot Pool Studies',
    summary: 'Between-study heterogeneity is extreme (I² = 97.8%). Pooled estimates are unreliable.',
    statLabel: 'Heterogeneity (I²)',
    statValue: '97.8%',
    effectType: 'I²',
    effectValue: 0.978,
    pValue: '< 0.0001',
    trend: 'negative',
    action: 'Never use pooled averages. Always stratify by study or population type.',
    detailLink: '/analysis#heterogeneity',
    category: 'heterogeneity',
  },
  {
    number: 7,
    title: 'Fragments Survive Less',
    summary: 'Restoration fragments have 6.8 percentage points lower survival than natural colonies (non-significant, p = 0.30).',
    statLabel: 'Survival Gap',
    statValue: '6.8 pp',
    effectType: 'pp',
    effectValue: 6.8,
    pValue: 0.30,
    trend: 'uncertain',
    action: 'Suggestive but not significant difference. Natural: 85.1%, Fragments: 78.3%. Plan for possible higher mortality with fragments, but evidence is inconclusive.',
    detailLink: '/analysis#populations',
    category: 'comparison',
  },
  {
    number: 8,
    title: 'Allometry Differs',
    summary: 'Natural colonies and fragments show different growth allometry even at matched sizes.',
    statLabel: 'Slope Difference',
    statValue: '0.94 vs 0.78',
    effectType: 'custom',
    effectValue: 'Δ = 0.16',
    pValue: '< 0.0001',
    trend: 'neutral',
    action: 'Fragments grow proportionally faster but don\'t reach same trajectory as natural colonies.',
    detailLink: '/analysis#populations',
    category: 'comparison',
  },
  {
    number: 9,
    title: 'Temporal Decline',
    summary: 'Survival odds are declining 11.6% per year across the study period.',
    statLabel: 'Annual Change',
    statValue: '−11.6%',
    effectType: 'OR',
    effectValue: 0.88,
    ciLower: 0.87,
    ciUpper: 0.90,
    pValue: '< 0.0001',
    trend: 'declining',
    action: 'Older data may overestimate current survival. Use most recent estimates for planning.',
    detailLink: '/analysis#population',
    category: 'population',
  },
  {
    number: 10,
    title: 'Regional Variation',
    summary: 'Survival varies substantially by region (65% USVI to 92% Navassa).',
    statLabel: 'Range',
    statValue: '65–92%',
    effectType: 'OR',
    effectValue: 2.84,
    ciLower: 1.33,
    ciUpper: 6.11,
    trend: 'neutral',
    action: 'Use region-specific estimates. Florida Keys data may not apply to your site.',
    detailLink: '/analysis#regional',
    category: 'regional',
  },
  {
    number: 11,
    title: 'Sample Size Needs',
    summary: '80% power requires 150–700 corals per group depending on effect size.',
    statLabel: 'For Medium Effect',
    statValue: '~300',
    effectType: 'custom',
    effectValue: 'n/group',
    trend: 'neutral',
    action: 'Small studies (n<50) cannot reliably detect meaningful survival differences.',
    detailLink: '/analysis#evidence',
    category: 'evidence',
  },
  {
    number: 12,
    title: 'Results Show Sensitivity',
    summary: 'Leave-one-study-out analysis reveals substantial sensitivity to individual studies.',
    statLabel: 'λ Range (LOSO)',
    statValue: '0.951–0.992',
    effectType: 'λ',
    effectValue: 0.986,
    trend: 'uncertain',
    action: 'Lambda estimates shift substantially when excluding individual studies, indicating sensitivity to study composition.',
    detailLink: '/analysis#evidence',
    category: 'evidence',
  },
  {
    number: 13,
    title: 'Context Matters',
    summary: 'Field and nursery demographics differ. Nursery results may not transfer.',
    statLabel: 'Transferability',
    statValue: 'Limited',
    effectType: 'custom',
    effectValue: 'Caution',
    trend: 'uncertain',
    action: 'Don\'t assume nursery survival rates will hold after outplanting to the field.',
    detailLink: '/analysis#evidence',
    category: 'evidence',
  },
  {
    number: 14,
    title: 'Moderate Prediction',
    summary: 'Cross-validation shows models have moderate generalization (AUC = 0.68).',
    statLabel: 'LOSO-CV AUC',
    statValue: 0.68,
    effectType: 'custom',
    effectValue: '0.68',
    trend: 'neutral',
    action: 'Predictions are better than random but not highly accurate. Use with appropriate uncertainty.',
    detailLink: '/analysis#evidence',
    category: 'evidence',
  },
  {
    number: 15,
    title: 'Priority: Climate Data',
    summary: 'Climate event survival data is the #1 research priority (high impact, medium feasibility).',
    statLabel: 'Top Priority',
    statValue: 'Climate Events',
    effectType: 'custom',
    effectValue: 'Gap #1',
    trend: 'neutral',
    action: 'Future studies should track survival during bleaching, storms, and disease outbreaks.',
    detailLink: '/analysis#priorities',
    category: 'priorities',
  },
];

interface ExecutiveSummaryProps {
  /** Show only specific categories */
  categories?: Finding['category'][];
  /** Number of columns */
  columns?: 2 | 3 | 4;
  /** Card size */
  cardSize?: 'sm' | 'md';
  /** Show category headers */
  showCategoryHeaders?: boolean;
  /** Additional className */
  className?: string;
}

const CATEGORY_LABELS: Record<Finding['category'], string> = {
  population: 'Population Status',
  drivers: 'Key Drivers',
  size: 'Size Effects',
  heterogeneity: 'Data Quality',
  comparison: 'Population Comparisons',
  regional: 'Regional Patterns',
  evidence: 'Evidence Quality',
  priorities: 'Research Priorities',
};

const CATEGORY_ORDER: Finding['category'][] = [
  'population',
  'drivers',
  'size',
  'heterogeneity',
  'comparison',
  'regional',
  'evidence',
  'priorities',
];

export const ExecutiveSummary = memo(function ExecutiveSummary({
  categories,
  columns = 3,
  cardSize = 'sm',
  showCategoryHeaders = false,
  className,
}: ExecutiveSummaryProps) {
  const filteredFindings = categories
    ? FINDINGS.filter((f) => categories.includes(f.category))
    : FINDINGS;

  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  if (showCategoryHeaders) {
    // Group by category
    const grouped = CATEGORY_ORDER.filter((cat) => !categories || categories.includes(cat)).map(
      (category) => ({
        category,
        label: CATEGORY_LABELS[category],
        findings: filteredFindings.filter((f) => f.category === category),
      })
    );

    return (
      <div className={clsx('space-y-8', className)}>
        {grouped
          .filter((g) => g.findings.length > 0)
          .map((group) => (
            <div key={group.category}>
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-ocean-500 rounded-full" />
                {group.label}
              </h3>
              <div className={clsx('grid gap-4', gridCols[columns])}>
                {group.findings.map((finding) => (
                  <FindingCard
                    key={finding.number}
                    {...finding}
                    size={cardSize}
                  />
                ))}
              </div>
            </div>
          ))}
      </div>
    );
  }

  return (
    <div className={clsx('grid gap-4', gridCols[columns], className)}>
      {filteredFindings.map((finding) => (
        <FindingCard
          key={finding.number}
          {...finding}
          size={cardSize}
        />
      ))}
    </div>
  );
});

// Export findings data for use in other components
export { FINDINGS, CATEGORY_LABELS, CATEGORY_ORDER };
export type { Finding };

export default ExecutiveSummary;
