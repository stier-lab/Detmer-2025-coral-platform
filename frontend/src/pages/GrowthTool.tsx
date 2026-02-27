
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  AlertTriangle,
  Info,
  ArrowRight
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { UncertaintyBanner } from '../components/common/UncertaintyBanner';
import { growthApi, qualityApi } from '../utils/api';
import type { GrowthBySize, QualityMetrics } from '../types';
import { trackEvent } from '../utils/analytics';
import {
  SIZE_CLASSES,
  SIZE_CLASS_KEYS,
  getSizeClass,
  getSizeClassMidpoint,
  extractSizeKey,
  type SizeClassKey,
} from '../constants/sizeClasses';

const mapGrowthBySize = (rows: GrowthBySize[]) => {
  const mapped: Record<SizeClassKey, GrowthBySize | null> = {
    SC1: null,
    SC2: null,
    SC3: null,
    SC4: null,
    SC5: null,
  };

  rows.forEach((row) => {
    const key = extractSizeKey(row.size_class);
    if (!key) return;
    mapped[key] = row;
  });

  return mapped;
};

type PopulationType = 'fragment' | 'natural' | 'all';

export function GrowthTool() {
  const [startSize, setStartSize] = useState<number>(50);
  const [targetSize, setTargetSize] = useState<number>(2000);
  const [populationType, setPopulationType] = useState<PopulationType>('fragment');
  const [growthBySize, setGrowthBySize] = useState<Record<SizeClassKey, GrowthBySize | null> | null>(null);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fragmentParam = populationType === 'fragment' ? 'Y' : populationType === 'natural' ? 'N' : 'all';

    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional loading state reset before async fetch
    setLoading(true);
    setError(null);
    Promise.all([
      growthApi.getBySize({ fragment: fragmentParam }),
      qualityApi.getMetrics({ fragment: fragmentParam }),
    ])
      .then(([growthRows, metrics]) => {
        if (!mounted) return;
        setGrowthBySize(mapGrowthBySize(growthRows));
        setQualityMetrics(metrics);
        setError(null);
      })
      .catch((err) => {
        if (!mounted) return;
        setGrowthBySize(null);
        setQualityMetrics(null);
        setError(err instanceof Error ? err.message : 'Failed to load growth data');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [populationType]);

  // Calculate trajectory using Relative Growth Rate (RGR) instead of absolute growth
  // RGR = mean_growth / midpoint_of_size_class
  // This prevents confusing size decreases when mean_growth is negative for large corals
  const trajectory = useMemo(() => {
    const points: { year: number; size: number; lower: number; upper: number; hasNegativeData: boolean }[] = [];
    let currentSize = startSize;
    const floorSize = Math.max(startSize, 1); // Size never goes below starting size

    for (let year = 0; year <= 10; year++) {
      const sizeClass = getSizeClass(currentSize);
      const growthRow = growthBySize?.[sizeClass];
      const meanGrowth = growthRow?.mean_growth ?? 0;
      const sdGrowth = growthRow?.sd_growth;

      // Flag if this size class has negative growth data (for warning display)
      const hasNegativeData = meanGrowth < 0;

      // Calculate RGR: relative growth rate = mean_growth / size_class_midpoint
      const midpoint = getSizeClassMidpoint(sizeClass);
      const rgr = meanGrowth / midpoint;

      // Use RGR for projection, but floor at 0 to prevent decreases
      // When data shows shrinkage, we project stable size (with warning)
      const effectiveRgr = Math.max(rgr, 0);

      // Calculate uncertainty bands based on actual data variability
      // Use sd_growth if available, otherwise fallback to +/- 30%
      let uncertaintyFactor: number;
      if (sdGrowth !== undefined && sdGrowth > 0 && midpoint > 0) {
        // Convert sd_growth to relative uncertainty
        const sdRgr = sdGrowth / midpoint;
        // Use ~1.5 SD for approximate 80% interval
        uncertaintyFactor = Math.min(Math.max(sdRgr * 1.5, 0.15), 0.5);
      } else {
        uncertaintyFactor = 0.3; // Default +/- 30%
      }

      const lower = Math.max(currentSize * (1 - uncertaintyFactor), 1);
      const upper = currentSize * (1 + uncertaintyFactor);

      points.push({
        year,
        size: Math.round(currentSize),
        lower: Math.round(lower),
        upper: Math.round(upper),
        hasNegativeData,
      });

      // Apply RGR-based growth: newSize = currentSize * (1 + RGR)
      currentSize = currentSize * (1 + effectiveRgr);

      // Enforce floor: size never drops below starting size (or 1 cm2)
      currentSize = Math.max(currentSize, floorSize);

      // Stop if size becomes unreasonably large
      if (currentSize > 10000) break;
    }

    return points;
  }, [startSize, targetSize, growthBySize]);

  // Calculate time to target
  const timeToTarget = useMemo(() => {
    const targetPoint = trajectory.find(p => p.size >= targetSize);
    if (targetPoint) {
      return {
        median: targetPoint.year,
        range: `${Math.max(0, targetPoint.year - 1)}-${targetPoint.year + 1}`
      };
    }
    return { median: '>10', range: '>10' };
  }, [trajectory, targetSize]);

  const currentSizeClass: SizeClassKey = getSizeClass(startSize);
  const targetSizeClass: SizeClassKey = getSizeClass(targetSize);

  // Check if any size class along the trajectory has negative growth data
  const hasNegativeGrowthData = trajectory.some(p => p.hasNegativeData);

  // Simple bar chart for trajectory
  const maxSize = Math.max(...trajectory.map(p => p.upper), targetSize);

  useEffect(() => {
    if (!loading) {
      trackEvent('growth_projection', {
        startSize,
        targetSize,
        populationType,
        currentSizeClass,
        targetSizeClass,
      });
    }
  }, [loading, startSize, targetSize, populationType, currentSizeClass, targetSizeClass]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-ocean-abyss via-ocean-deep to-ocean-abyss">
      <Header />

      <main id="main-content" className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-300 text-sm mb-4">
              <TrendingUp className="w-4 h-4" />
              <span>Growth Projector</span>
            </div>
            <h1 className="text-3xl font-display font-bold text-white mb-2">
              How long to reach target size?
            </h1>
            <p className="text-white/60">
              Project growth trajectories with prediction intervals
            </p>
          </div>

          {/* Inputs */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-6">
            <UncertaintyBanner metrics={qualityMetrics} loading={loading} compact />
            {!loading && error && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-900/20 p-4 text-red-100 text-sm flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Failed to load growth data</p>
                  <p className="text-red-200/70 mt-1">{error}</p>
                  <p className="text-red-200/50 mt-2 text-xs">Make sure the API server is running on port 8000.</p>
                </div>
              </div>
            )}
            {!loading && !error && !growthBySize && (
              <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-900/20 p-4 text-amber-100 text-sm">
                No growth data available for the selected filters.
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Starting size */}
              <div>
                <label htmlFor="start-size" className="block text-white/70 text-sm font-medium mb-2">
                  Starting Size (cm²)
                </label>
                <input
                  id="start-size"
                  type="number"
                  value={startSize}
                  onChange={(e) => setStartSize(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  max={5000}
                  aria-describedby="start-size-hint"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-bioluminescent/50"
                />
                <div id="start-size-hint" className="mt-1 text-white/50 text-xs">
                  Current: {currentSizeClass} ({SIZE_CLASSES[currentSizeClass].label})
                </div>
              </div>

              {/* Target size */}
              <div>
                <label htmlFor="target-size" className="block text-white/70 text-sm font-medium mb-2">
                  Target Size (cm²)
                </label>
                <input
                  id="target-size"
                  type="number"
                  value={targetSize}
                  onChange={(e) => setTargetSize(Math.max(startSize + 1, parseInt(e.target.value) || startSize + 1))}
                  min={startSize + 1}
                  aria-describedby="target-size-hint"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-bioluminescent/50"
                />
                <div id="target-size-hint" className="mt-1 text-white/50 text-xs">
                  Target: {targetSizeClass} ({SIZE_CLASSES[targetSizeClass].label})
                </div>
              </div>
            </div>

            {/* Population type */}
            <div className="mt-6">
              <label id="population-type-label" className="block text-white/70 text-sm font-medium mb-2">
                Population Type
              </label>
              <div className="flex gap-2" role="group" aria-labelledby="population-type-label">
                {[
                  { value: 'fragment', label: 'Fragment' },
                  { value: 'natural', label: 'Natural' },
                  { value: 'all', label: 'All data' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setPopulationType(value as PopulationType)}
                    aria-pressed={populationType === value}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
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

            {/* Quick presets */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-white/50 text-sm">Presets:</span>
              {[
                { start: 25, target: 500, label: 'SC2 → SC3' },
                { start: 50, target: 2000, label: 'Fragment → Adult' },
                { start: 100, target: 2000, label: 'SC3 → Reproductive' }
              ].map(preset => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setStartSize(preset.start);
                    setTargetSize(preset.target);
                  }}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white/70 text-sm rounded-lg transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {populationType === 'all' && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-900/20 p-4">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-100 text-sm font-medium">
                    Mixed fragments and colonies
                  </p>
                  <p className="text-amber-100/70 text-xs">
                    Fragment and colony growth may differ even at the same size.
                    Consider selecting Fragment or Natural for clearer guidance.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Negative Growth Data Warning */}
          {hasNegativeGrowthData && (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-amber-200 font-semibold text-sm mb-2">Negative growth observed in data for large corals</h4>
                  <p className="text-amber-100/70 text-sm leading-relaxed mb-2">
                    Large corals (&gt;500 cm²) in this dataset show net shrinkage on average due to partial mortality,
                    fragmentation, or storm damage. However, <strong className="text-amber-200">this projection assumes stable or growing size</strong> to
                    provide actionable guidance.
                  </p>
                  <p className="text-amber-100/70 text-sm leading-relaxed">
                    <strong className="text-amber-200">What this means:</strong> Individual large corals may shrink, grow, or remain stable.
                    The projection shows potential growth trajectory if conditions allow, but actual outcomes are highly variable.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Result */}
          <div className="bg-gradient-to-r from-emerald-500/20 to-reef-green/20 rounded-xl p-6 border border-emerald-500/30 mb-6" aria-live="polite" aria-atomic="true">
            <div className="text-center mb-6">
              <div className="text-white/70 text-sm mb-1">Estimated Time to Target</div>
              <div className="text-5xl font-bold text-white mb-1">
                {timeToTarget.median} <span className="text-2xl text-white/60">years</span>
              </div>
              <div className="text-white/50 text-sm">
                Range: {timeToTarget.range} years (with typical variation)
              </div>
            </div>

            {/* Simple trajectory visualization */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-white/50 mb-1">
                <span>Year</span>
                <span>Projected Size (cm²)</span>
              </div>
              {trajectory.slice(0, 7).map(point => (
                <div key={point.year} className="flex items-center gap-3">
                  <div className="w-8 text-white/60 text-sm">Y{point.year}</div>
                  <div className="flex-1 h-6 bg-white/10 rounded overflow-hidden relative">
                    {/* Uncertainty band */}
                    <div
                      className="absolute h-full bg-emerald-500/20"
                      style={{
                        left: `${(point.lower / maxSize) * 100}%`,
                        width: `${((point.upper - point.lower) / maxSize) * 100}%`
                      }}
                    />
                    {/* Main bar - different color when negative data exists for this size range */}
                    <div
                      className={`h-full transition-all ${
                        point.size >= targetSize
                          ? 'bg-bioluminescent'
                          : point.hasNegativeData
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${(point.size / maxSize) * 100}%` }}
                    />
                    {/* Target line */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-white/50"
                      style={{ left: `${(targetSize / maxSize) * 100}%` }}
                    />
                  </div>
                  <div className="w-24 text-right text-white/70 text-sm">
                    {point.size.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-white/50">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-emerald-500 rounded" /> Growing
              </span>
              {hasNegativeGrowthData && (
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-amber-500 rounded" /> Caution (negative data)
                </span>
              )}
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-emerald-500/20 rounded" /> Uncertainty
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-white/50" /> Target
              </span>
            </div>
          </div>

          {/* Caveats */}
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-amber-200 font-semibold text-sm mb-2">Projection assumptions</h4>
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
                      <li>- Uses mean growth by size class from pooled studies</li>
                      <li className="font-semibold text-amber-200">
                        - Large corals (&gt;500 cm²) may show net shrinkage due to partial mortality
                      </li>
                      <li>- Does not account for disease, bleaching, or storm events</li>
                      <li>- Individual variation can be substantial</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* RGR by size class table */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-6">
            <h3 className="text-white font-semibold mb-4" id="rgr-table-heading">Relative Growth Rate by Size Class</h3>
            <div className="overflow-x-auto" role="region" aria-labelledby="rgr-table-heading" tabIndex={0}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th scope="col" className="text-left py-2 text-white/70 font-medium">Size Class</th>
                    <th scope="col" className="text-left py-2 text-white/70 font-medium">Size Range</th>
                    <th scope="col" className="text-right py-2 text-white/70 font-medium">RGR (yr⁻¹)</th>
                    <th scope="col" className="text-right py-2 text-white/70 font-medium">Interpretation</th>
                  </tr>
                </thead>
                <tbody>
                  {SIZE_CLASS_KEYS.map((key) => {
                    const data = SIZE_CLASSES[key];
                    const growthRow = growthBySize?.[key];
                    const midpoint = getSizeClassMidpoint(key);
                    const rgr = growthRow ? growthRow.mean_growth / midpoint : null;

                    return (
                      <tr key={key} className="border-b border-white/5">
                        <td className="py-3 text-white font-medium">{key}</td>
                        <td className="py-3 text-white/70">
                          {data.max === Infinity ? `>${data.min}` : `${data.min}-${data.max}`} cm²
                        </td>
                        <td className={`py-3 text-right font-semibold ${rgr !== null && rgr < 0 ? 'text-amber-400' : 'text-white'}`}>
                          {rgr !== null ? rgr.toFixed(2) : '—'}
                          {rgr !== null && rgr < 0 && ' *'}
                        </td>
                        <td className="py-3 text-right text-white/50 text-xs">
                          {rgr !== null && rgr < 0
                            ? 'Net shrinkage (partial mortality)'
                            : rgr !== null && rgr > 1
                            ? 'Can double annually'
                            : rgr !== null && rgr > 0.3
                            ? '30-45% annual increase'
                            : 'Lower proportional growth'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/analysis#evidence"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/15 text-white rounded-xl transition-colors"
            >
              <Info className="w-4 h-4" />
              <span>See full growth analysis</span>
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
