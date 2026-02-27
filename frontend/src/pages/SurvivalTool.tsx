/**
 * Survival Tool - Interactive survival rate lookup
 *
 * Allows practitioners to explore survival rates by:
 * - Size class (SC1-SC5)
 * - Population type (Natural/Fragment)
 * - Region (optional)
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  AlertTriangle,
  Info,
  ArrowRight,
  ChevronDown
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { UncertaintyBanner } from '../components/common/UncertaintyBanner';
import { qualityApi, survivalApi } from '../utils/api';
import type { QualityMetrics, SurvivalBySize } from '../types';
import { trackEvent } from '../utils/analytics';

type SizeClass = 'SC1' | 'SC2' | 'SC3' | 'SC4' | 'SC5';
type PopulationType = 'all' | 'natural' | 'fragment';

const SIZE_CLASS_META: Record<SizeClass, { label: string; size: string }> = {
  SC1: { label: 'Recruits', size: '0-25 cm²' },
  SC2: { label: 'Small juveniles', size: '25-100 cm²' },
  SC3: { label: 'Large juveniles', size: '100-500 cm²' },
  SC4: { label: 'Small adults', size: '500-2,000 cm²' },
  SC5: { label: 'Large adults', size: '>2,000 cm²' },
};

const extractSizeKey = (label: string): SizeClass | null => {
  const match = label.match(/SC[1-5]/i);
  return match ? (match[0].toUpperCase() as SizeClass) : null;
};

const mapBySize = (rows: SurvivalBySize[]) => {
  const mapped: Record<SizeClass, { rate: number; ci: [number, number]; n: number }> = {
    SC1: { rate: 0, ci: [0, 0], n: 0 },
    SC2: { rate: 0, ci: [0, 0], n: 0 },
    SC3: { rate: 0, ci: [0, 0], n: 0 },
    SC4: { rate: 0, ci: [0, 0], n: 0 },
    SC5: { rate: 0, ci: [0, 0], n: 0 },
  };

  rows.forEach((row) => {
    const key = extractSizeKey(row.size_class);
    if (!key) return;
    mapped[key] = {
      rate: row.survival_rate * 100,
      ci: [row.ci_lower * 100, row.ci_upper * 100],
      n: row.n,
    };
  });

  return mapped;
};

export function SurvivalTool() {
  const [sizeClass, setSizeClass] = useState<SizeClass>('SC3');
  const [populationType, setPopulationType] = useState<PopulationType>('fragment');
  const [showAllClasses, setShowAllClasses] = useState(false);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);
  const [qualityLoading, setQualityLoading] = useState(true);
  const [dataBySize, setDataBySize] = useState<Record<SizeClass, { rate: number; ci: [number, number]; n: number }> | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fragmentParam = populationType === 'fragment' ? 'Y' : populationType === 'natural' ? 'N' : 'all';

    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional loading state reset before async fetch
    setDataLoading(true);
    survivalApi
      .getBySize({ fragment: fragmentParam })
      .then((rows) => {
        if (!mounted) return;
        setDataBySize(mapBySize(rows));
      })
      .catch(() => {
        if (mounted) setDataBySize(null);
      })
      .finally(() => {
        if (mounted) setDataLoading(false);
      });

    setQualityLoading(true);
    qualityApi
      .getMetrics({ fragment: fragmentParam })
      .then((metrics) => {
        if (mounted) setQualityMetrics(metrics);
      })
      .catch(() => {
        if (mounted) setQualityMetrics(null);
      })
      .finally(() => {
        if (mounted) setQualityLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [populationType]);

  const baseData = useMemo(() => {
    if (!dataBySize) return null;
    return dataBySize[sizeClass];
  }, [dataBySize, sizeClass]);

  const survivalRate = baseData?.rate ?? 0;
  const survivalCi = baseData?.ci ?? [0, 0];

  useEffect(() => {
    if (!dataLoading && baseData) {
      trackEvent('survival_lookup', {
        sizeClass,
        populationType,
        survivalRate: baseData.rate,
        n: baseData.n,
      });
    }
  }, [dataLoading, baseData, sizeClass, populationType]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-ocean-abyss via-ocean-deep to-ocean-abyss">
      <Header />

      <main id="main-content" className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500/20 border border-rose-500/30 rounded-full text-rose-300 text-sm mb-4">
              <Heart className="w-4 h-4" />
              <span>Survival Lookup</span>
            </div>
            <h1 className="text-3xl font-display font-bold text-white mb-2">
              What survival should I expect?
            </h1>
            <p className="text-white/60">
              Look up survival rates by size class and population type
            </p>
          </div>

          <UncertaintyBanner metrics={qualityMetrics} loading={qualityLoading} />

          {!dataLoading && !dataBySize && (
            <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-900/20 p-4 text-amber-100 text-sm">
              Live data is unavailable. Start the API server to load survival estimates.
            </div>
          )}

          {/* Main calculator */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-6">
            {/* Inputs */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Size class selector */}
              <div>
                <label htmlFor="size-class-select" className="block text-white/70 text-sm font-medium mb-2">
                  Size Class
                </label>
                <div className="relative">
                  <select
                    id="size-class-select"
                    value={sizeClass}
                    onChange={(e) => setSizeClass(e.target.value as SizeClass)}
                    className="w-full appearance-none bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-bioluminescent/50 focus:border-bioluminescent/50 cursor-pointer"
                  >
                    {Object.entries(SIZE_CLASS_META).map(([key, meta]) => (
                      <option key={key} value={key} className="bg-ocean-deep text-white">
                        {key}: {meta.label} ({meta.size})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
                </div>
              </div>

              {/* Population type */}
              <div>
                <label id="survival-pop-type-label" className="block text-white/70 text-sm font-medium mb-2">
                  Population Type
                </label>
                <div className="flex gap-2" role="group" aria-labelledby="survival-pop-type-label">
                  {[
                    { value: 'fragment', label: 'Fragment' },
                    { value: 'natural', label: 'Natural' },
                    { value: 'all', label: 'All data' }
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setPopulationType(value as PopulationType)}
                      aria-pressed={populationType === value}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-bioluminescent/50 ${
                        populationType === value
                          ? 'bg-bioluminescent/20 border-2 border-bioluminescent text-bioluminescent'
                          : 'bg-white/10 border-2 border-transparent text-white/70 hover:bg-white/15'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Result display */}
            <div className="bg-gradient-to-r from-rose-500/20 to-coral-warm/20 rounded-xl p-6 border border-rose-500/30" aria-live="polite" aria-atomic="true">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white/70 text-sm mb-1">Expected Survival Rate</div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-5xl font-bold text-white">
                      {dataLoading || !baseData ? '—' : `${Math.round(survivalRate)}%`}
                    </span>
                    {baseData && (
                      <span className="text-white/60 text-sm">
                        95% CI: {Math.round(survivalCi[0])}-{Math.round(survivalCi[1])}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white/70 text-sm mb-1">Sample Size</div>
                  <div className="text-2xl font-semibold text-white">
                    {baseData ? `n=${baseData.n.toLocaleString()}` : 'n=—'}
                  </div>
                </div>
              </div>

              {/* Visual gauge */}
              <div className="mt-4">
                <div
                  className="h-4 bg-white/10 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={dataLoading || !baseData ? 0 : Math.round(survivalRate)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Survival rate: ${dataLoading || !baseData ? 'loading' : `${Math.round(survivalRate)}%`}`}
                >
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-coral-warm rounded-full transition-all duration-500"
                    style={{ width: `${dataLoading || !baseData ? 0 : survivalRate}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-white/50" aria-hidden="true">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            {populationType === 'all' && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-900/20 p-4">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-100 text-sm font-medium">
                    Mixed fragments and colonies
                  </p>
                  <p className="text-amber-100/70 text-xs">
                    Fragment and colony survival differ even at the same size.
                    Consider selecting Fragment or Natural for clearer guidance.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Comparison table */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold" id="compare-heading">Compare All Size Classes</h3>
              <button
                onClick={() => setShowAllClasses(!showAllClasses)}
                className="text-bioluminescent text-sm hover:underline focus:outline-none focus:ring-2 focus:ring-bioluminescent/50 rounded px-2 py-1"
                aria-expanded={showAllClasses}
                aria-controls="size-class-comparison-table"
              >
                {showAllClasses ? 'Hide' : 'Show'} table
              </button>
            </div>

            {showAllClasses && (
              <div className="overflow-x-auto" id="size-class-comparison-table" role="region" aria-labelledby="compare-heading" tabIndex={0}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th scope="col" className="text-left py-2 text-white/70 font-medium">Size Class</th>
                      <th scope="col" className="text-left py-2 text-white/70 font-medium">Size Range</th>
                      <th scope="col" className="text-right py-2 text-white/70 font-medium">Survival</th>
                      <th scope="col" className="text-right py-2 text-white/70 font-medium">95% CI</th>
                      <th scope="col" className="text-right py-2 text-white/70 font-medium">n</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(SIZE_CLASS_META).map(([key, meta]) => {
                      const rowData = dataBySize ? dataBySize[key as SizeClass] : null;
                      const adjustedRow = rowData;
                      return (
                      <tr
                        key={key}
                        className={`border-b border-white/5 ${key === sizeClass ? 'bg-bioluminescent/10' : ''}`}
                      >
                        <td className="py-3 text-white font-medium">{key}: {meta.label}</td>
                        <td className="py-3 text-white/70">{meta.size}</td>
                        <td className="py-3 text-right text-white font-semibold">
                          {adjustedRow ? `${Math.round(adjustedRow.rate)}%` : '—'}
                        </td>
                        <td className="py-3 text-right text-white/50">
                          {adjustedRow ? `${Math.round(adjustedRow.ci[0])}-${Math.round(adjustedRow.ci[1])}%` : '—'}
                        </td>
                        <td className="py-3 text-right text-white/50">{rowData ? rowData.n.toLocaleString() : '—'}</td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Caveats */}
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-amber-200 font-semibold text-sm mb-2">Important context</h4>
                <ul className="text-amber-100/70 text-xs space-y-1">
                  <li className="font-semibold text-amber-200">
                    - Size explains only 8.6% of survival variance
                  </li>
                  {qualityMetrics?.dominant_study && (
                    <li>
                      - {qualityMetrics.dominant_study.pct.toFixed(0)}% of data from single study (
                      {qualityMetrics.dominant_study.name})
                    </li>
                  )}
                  {qualityMetrics?.warnings?.length ? (
                    qualityMetrics.warnings.map((warning) => (
                      <li key={warning}>- {warning}</li>
                    ))
                  ) : (
                    <>
                      <li>- Estimates are annualized over one monitoring interval</li>
                      <li>- Disease and bleaching events are not included</li>
                      <li>- Local site conditions can dominate size effects</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/analysis#evidence"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/15 text-white rounded-xl transition-colors"
            >
              <Info className="w-4 h-4" />
              <span>See full analysis</span>
            </Link>
            <Link
              to="/answers/outplant"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-bioluminescent text-ocean-abyss font-medium rounded-xl hover:bg-bioluminescent/90 transition-colors"
            >
              <span>Get outplanting recommendation</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
