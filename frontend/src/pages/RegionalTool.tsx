/**
 * Regional Tool - Regional comparison lookup
 *
 * Allows practitioners to compare survival and growth across Caribbean regions.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  AlertTriangle,
  Info,
  ArrowRight,
  ChevronDown,
  BarChart3
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { mapApi, qualityApi } from '../utils/api';
import { UncertaintyBanner } from '../components/common/UncertaintyBanner';
import { NoRegionData } from '../components/common/EmptyState';
import type { QualityMetrics, RegionSummary } from '../types';
import { trackEvent } from '../utils/analytics';

function DataQualityBadge({ quality }: { quality: 'high' | 'medium' | 'low' }) {
  const colors = {
    high: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    low: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
  };

  const labels = {
    high: 'High confidence',
    medium: 'Medium confidence',
    low: 'Low confidence'
  };

  return (
    <span className={`px-2 py-0.5 text-xs rounded-full border ${colors[quality]}`}>
      {labels[quality]}
    </span>
  );
}

export function RegionalTool() {
  const [regions, setRegions] = useState<RegionSummary[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [compareRegion, setCompareRegion] = useState<string | null>(null);
  const [showAllRegions, setShowAllRegions] = useState(false);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional loading state reset before async fetch
    setLoading(true);
    Promise.all([mapApi.getRegions(), qualityApi.getMetrics()])
      .then(([regionRows, metrics]) => {
        if (!mounted) return;
        setRegions(regionRows);
        setQualityMetrics(metrics);
        if (regionRows.length > 0) {
          setSelectedRegion(regionRows[0].region);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setRegions([]);
        setQualityMetrics(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const regionData = useMemo(
    () => regions.find(r => r.region === selectedRegion) || null,
    [regions, selectedRegion]
  );
  const compareData = useMemo(
    () => regions.find(r => r.region === compareRegion) || null,
    [regions, compareRegion]
  );

  // Calculate Florida Keys comparison
  const floridaData = regions.find(r => r.region.toLowerCase().includes('florida')) || null;
  const survivalDiff = regionData && floridaData
    ? (regionData.mean_survival - floridaData.mean_survival) * 100
    : 0;
  const growthDiff = regionData && floridaData && regionData.mean_growth && floridaData.mean_growth
    ? regionData.mean_growth - floridaData.mean_growth
    : 0;

  const getQuality = (row: RegionSummary | null): 'high' | 'medium' | 'low' => {
    if (!row) return 'low';
    if (row.n_observations >= 500 && row.n_studies >= 3) return 'high';
    if (row.n_observations >= 100) return 'medium';
    return 'low';
  };

  useEffect(() => {
    if (regionData) {
      trackEvent('regional_lookup', {
        selectedRegion: regionData.region,
        compareRegion,
      });
    }
  }, [regionData, compareRegion]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-ocean-abyss via-ocean-deep to-ocean-abyss">
      <Header />

      <main id="main-content" className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <UncertaintyBanner metrics={qualityMetrics} loading={loading} compact />
          {/* Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-300 text-sm mb-4">
              <MapPin className="w-4 h-4" />
              <span>Regional Lookup</span>
            </div>
            <h1 className="text-3xl font-display font-bold text-white mb-2">
              What's different about my region?
            </h1>
            <p className="text-white/60">
              Compare survival and growth across Caribbean regions
            </p>
          </div>

          {/* Region selector */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Primary region */}
              <div>
                <label htmlFor="region-select" className="block text-white/70 text-sm font-medium mb-2">
                  Select Your Region
                </label>
                <div className="relative">
                  <select
                    id="region-select"
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    disabled={regions.length === 0}
                    className="w-full appearance-none bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-bioluminescent/50 focus:border-bioluminescent/50 cursor-pointer"
                  >
                    {regions.length === 0 && (
                      <option value="" className="bg-ocean-deep text-white">
                        No regions available
                      </option>
                    )}
                    {regions.map(region => (
                      <option key={region.region} value={region.region} className="bg-ocean-deep text-white">
                        {region.region}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
                </div>
              </div>

              {/* Compare region */}
              <div>
                <label htmlFor="compare-region-select" className="block text-white/70 text-sm font-medium mb-2">
                  Compare To (optional)
                </label>
                <div className="relative">
                  <select
                    id="compare-region-select"
                    value={compareRegion || ''}
                    onChange={(e) => setCompareRegion(e.target.value ? e.target.value : null)}
                    disabled={regions.length === 0}
                    className="w-full appearance-none bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-bioluminescent/50 focus:border-bioluminescent/50 cursor-pointer"
                  >
                    <option value="" className="bg-ocean-deep text-white">No comparison</option>
                    {regions.filter(r => r.region !== selectedRegion).map(region => (
                      <option key={region.region} value={region.region} className="bg-ocean-deep text-white">
                        {region.region}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {!loading && regions.length === 0 && (
            <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-900/20 p-4 text-amber-100 text-sm">
              Live regional data is unavailable. Start the API server to load region summaries.
            </div>
          )}

          {/* Show empty state when selected region has no data */}
          {!loading && selectedRegion && !regionData && regions.length > 0 && (
            <div className="mb-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
              <NoRegionData
                region={selectedRegion}
                onSelectDifferentRegion={() => {
                  if (regions.length > 0) {
                    setSelectedRegion(regions[0].region);
                  }
                }}
                variant="default"
              />
            </div>
          )}

          {/* Region results */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Survival */}
            <div className="bg-gradient-to-br from-rose-500/20 to-coral-warm/20 rounded-xl p-6 border border-rose-500/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Annual Survival</h3>
                <DataQualityBadge quality={getQuality(regionData)} />
              </div>

              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-4xl font-bold text-white">
                  {regionData ? (regionData.mean_survival * 100).toFixed(1) : '—'}%
                </span>
                {compareData && (
                  <span className={`text-lg ${
                    regionData && regionData.mean_survival > compareData.mean_survival
                      ? 'text-emerald-400'
                      : regionData && regionData.mean_survival < compareData.mean_survival
                      ? 'text-rose-400'
                      : 'text-white/50'
                  }`}>
                    {regionData && regionData.mean_survival > compareData.mean_survival ? '+' : ''}
                    {regionData ? ((regionData.mean_survival - compareData.mean_survival) * 100).toFixed(1) : '—'}pp
                  </span>
                )}
              </div>
              <div className="text-white/50 text-sm mb-4">
                {regionData ? `n=${regionData.n_observations.toLocaleString()} observations` : 'No data'}
              </div>

              {/* Visual bar */}
              <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-coral-warm rounded-full"
                  style={{ width: `${regionData ? regionData.mean_survival * 100 : 0}%` }}
                />
              </div>

              {compareData && (
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white/30 rounded-full"
                    style={{ width: `${compareData.mean_survival * 100}%` }}
                  />
                </div>
              )}

              <div className="mt-3 text-white/40 text-xs">
                {regionData ? `n=${regionData.n_observations.toLocaleString()} observations` : 'n=—'}
                {compareData && ` vs n=${compareData.n_observations.toLocaleString()}`}
              </div>
            </div>

            {/* Growth */}
            <div className="bg-gradient-to-br from-emerald-500/20 to-reef-green/20 rounded-xl p-6 border border-emerald-500/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Mean Growth (cm²/yr)</h3>
                <DataQualityBadge quality={getQuality(regionData)} />
              </div>

              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-4xl font-bold text-white">
                  {regionData && regionData.mean_growth !== undefined ? regionData.mean_growth.toFixed(1) : '—'}
                </span>
                {regionData && regionData.mean_growth !== undefined && regionData.mean_growth > 200 && (
                  <span
                    className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 cursor-help"
                    title="This growth rate is unusually high (typical range: 20-100 cm²/yr). May reflect methodology differences rather than true biological differences."
                  >
                    Outlier
                  </span>
                )}
                {compareData && (
                  <span className={`text-lg ${
                    regionData && regionData.mean_growth !== undefined &&
                    compareData.mean_growth !== undefined &&
                    regionData.mean_growth > compareData.mean_growth
                      ? 'text-emerald-400'
                      : regionData && regionData.mean_growth !== undefined &&
                      compareData.mean_growth !== undefined &&
                      regionData.mean_growth < compareData.mean_growth
                      ? 'text-rose-400'
                      : 'text-white/50'
                  }`}>
                    {regionData && compareData && regionData.mean_growth !== undefined &&
                    compareData.mean_growth !== undefined && regionData.mean_growth > compareData.mean_growth ? '+' : ''}
                    {regionData && compareData && regionData.mean_growth !== undefined &&
                    compareData.mean_growth !== undefined
                      ? (regionData.mean_growth - compareData.mean_growth).toFixed(1)
                      : '—'}
                  </span>
                )}
              </div>
              <div className="text-white/50 text-sm mb-4">
                {regionData && regionData.growth_n ? `n=${regionData.growth_n.toLocaleString()} observations` : 'No growth data'}
              </div>

              {/* Visual bar - cap at 100% for outliers */}
              <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-reef-green rounded-full"
                  style={{ width: `${regionData && regionData.mean_growth !== undefined ? Math.min((regionData.mean_growth / 60) * 100, 100) : 0}%` }}
                />
              </div>

              {compareData && (
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white/30 rounded-full"
                    style={{ width: `${compareData.mean_growth !== undefined ? Math.min((compareData.mean_growth / 60) * 100, 100) : 0}%` }}
                  />
                </div>
              )}

              <div className="mt-3 text-white/40 text-xs">
                {regionData && regionData.growth_n ? `n=${regionData.growth_n.toLocaleString()} observations` : 'n=—'}
                {compareData && compareData.growth_n ? ` vs n=${compareData.growth_n.toLocaleString()}` : ''}
              </div>
            </div>
          </div>

          {/* Florida Keys comparison */}
          {regionData && floridaData && regionData.region !== floridaData.region && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 mb-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-bioluminescent flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-white font-medium text-sm mb-1">Compared to Florida Keys (78% of data)</h4>
                  <p className="text-white/60 text-sm">
                    {regionData.region} shows{' '}
                    <span className={survivalDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {survivalDiff >= 0 ? '+' : ''}{survivalDiff.toFixed(1)}pp
                    </span>{' '}
                    survival and{' '}
                    <span className={growthDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {growthDiff >= 0 ? '+' : ''}{growthDiff.toFixed(1)} cm²/yr
                    </span>{' '}
                    growth. However, confidence intervals often overlap due to smaller sample sizes.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* All regions table */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold" id="all-regions-heading">All Regions Comparison</h3>
              <button
                onClick={() => setShowAllRegions(!showAllRegions)}
                className="text-bioluminescent text-sm hover:underline focus:outline-none focus:ring-2 focus:ring-bioluminescent/50 rounded px-2 py-1"
                aria-expanded={showAllRegions}
                aria-controls="all-regions-table"
              >
                {showAllRegions ? 'Hide' : 'Show'} table
              </button>
            </div>

            {showAllRegions && (
              <div className="overflow-x-auto" id="all-regions-table" role="region" aria-labelledby="all-regions-heading" tabIndex={0}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th scope="col" className="text-left py-2 text-white/70 font-medium">Region</th>
                      <th scope="col" className="text-right py-2 text-white/70 font-medium">Survival</th>
                      <th scope="col" className="text-right py-2 text-white/70 font-medium">Growth</th>
                      <th scope="col" className="text-right py-2 text-white/70 font-medium">Studies</th>
                      <th scope="col" className="text-right py-2 text-white/70 font-medium">Quality</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regions.map(region => {
                      const isSelected = region.region === selectedRegion;
                      return (
                        <tr
                          key={region.region}
                          className={`border-b border-white/5 cursor-pointer hover:bg-white/5 ${isSelected ? 'bg-bioluminescent/10' : ''}`}
                          onClick={() => setSelectedRegion(region.region)}
                        >
                          <td className="py-3 text-white font-medium">{region.region}</td>
                          <td className="py-3 text-right text-white">
                            {(region.mean_survival * 100).toFixed(1)}%
                            <span className="text-white/40 text-xs ml-1">
                              (n={region.n_observations.toLocaleString()})
                            </span>
                          </td>
                          <td className="py-3 text-right text-white">
                            {region.mean_growth !== undefined ? region.mean_growth.toFixed(1) : '—'}
                            {region.mean_growth !== undefined && region.mean_growth > 200 && (
                              <span
                                className="ml-1 px-1.5 py-0.5 text-xs rounded bg-amber-500/20 text-amber-300 cursor-help"
                                title={region.region === 'Navassa'
                                  ? 'Navassa growth ~10× higher than typical (826 vs 20-100 cm²/yr). See caveat below.'
                                  : 'Unusually high growth rate - may reflect methodology differences'}
                              >!</span>
                            )}
                            <span className="text-white/40 text-xs ml-1">
                              (n={region.growth_n ? region.growth_n.toLocaleString() : '—'})
                            </span>
                          </td>
                          <td className="py-3 text-right text-white/70">{region.n_studies}</td>
                          <td className="py-3 text-right">
                            <DataQualityBadge quality={getQuality(region)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Navassa-specific warning when selected */}
          {regionData && regionData.region === 'Navassa' && (
            <div className="bg-amber-900/30 border border-amber-500/40 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-amber-200 font-semibold text-sm mb-2">
                    Navassa Growth Data Anomaly
                  </h4>
                  <p className="text-amber-100/80 text-sm mb-2">
                    Navassa shows mean growth of <strong>~826 cm²/yr</strong>, which is 10× higher than
                    other regions (typically 20-100 cm²/yr). This extreme value requires careful interpretation:
                  </p>
                  <ul className="text-amber-100/70 text-xs space-y-1 list-disc list-inside">
                    <li>Based on only <strong>94 observations</strong> from a single study (NOAA survey)</li>
                    <li>Navassa colonies were surveyed over ~2.5-3 year intervals with different methodology</li>
                    <li>Large adult colonies (some &gt;40,000 cm²) may have different growth dynamics</li>
                    <li>Potential measurement methodology differences (size estimation techniques)</li>
                    <li>The data may reflect real rapid growth in an undisturbed, remote reef system</li>
                  </ul>
                  <p className="text-amber-100/60 text-xs mt-2 italic">
                    Recommendation: Do not use Navassa growth values for planning without additional validation.
                    The data is flagged but retained for transparency.
                  </p>
                </div>
              </div>
            </div>
          )}

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
                  <li>- <strong>78% of data comes from Florida Keys</strong> - other regions have much smaller sample sizes</li>
                  <li>- Extremely high growth rates (marked with !) likely reflect methodology differences, not biological differences</li>
                  <li>- Confidence intervals often overlap between regions</li>
                  <li>- Regional differences may reflect study methodology, not true biological differences</li>
                  <li>- Local site conditions vary enormously within regions</li>
                  <li>- Data quality scores reflect sample size and study count, not data accuracy</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/analysis#regional"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/15 text-white rounded-xl transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Explore regional data</span>
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
