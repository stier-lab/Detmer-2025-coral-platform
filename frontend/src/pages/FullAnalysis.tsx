import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import {
  AnalysisSidebar,
  ANALYSIS_SECTIONS,
  useScrollSpy,
} from '../components/layout/AnalysisSidebar';
import {
  PopulationDeclineGauge,
  ElasticityPanel,
  RestorationScenarios,
  SurvivalByClassChart,
  RGRBySizeChart,
  NaturalVsRestoredChart,
  ThresholdUncertaintyPlot,
  ExecutiveSummary,
  TemporalTrendChart,
  HeterogeneityPanel,
} from '../components/visualizations/KeyFindings';
import { MapView } from '../components/visualizations';
import { useMapData } from '../hooks/useMapData';
import {
  ArrowRight,
  Download,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';

/**
 * Reusable section wrapper with consistent styling
 */
function AnalysisSection({
  id,
  title,
  subtitle,
  children,
  variant = 'white',
  toolLink,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  variant?: 'white' | 'gray';
  toolLink?: { label: string; path: string };
}) {
  return (
    <section
      id={id}
      className={`py-16 sm:py-20 ${variant === 'gray' ? 'bg-gray-50' : 'bg-white'}`}
    >
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#0a3d62] mb-2">
            {title}
          </h2>
          {subtitle && (
            <p className="text-base text-gray-500 max-w-2xl">{subtitle}</p>
          )}
          {toolLink && (
            <Link
              to={toolLink.path}
              className="inline-flex items-center gap-2 mt-3 text-sm text-[#0a3d62] hover:text-[#0a3d62]/80 font-medium transition-colors"
            >
              {toolLink.label}
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

export function FullAnalysis() {
  const location = useLocation();
  const sectionIds = ANALYSIS_SECTIONS.map((s) => s.id);
  const { activeSection, scrollToSection } = useScrollSpy(sectionIds);

  // Fetch map data for regional section
  const { data: mapSites, isLoading: mapLoading } = useMapData();

  // Scroll to hash on mount
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      setTimeout(() => scrollToSection(id), 100);
    }
  }, [location.hash, scrollToSection]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      {/* Page header */}
      <div className="bg-gradient-to-br from-[#0a3d62] to-[#051b2c] pt-20 pb-12 px-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="font-display text-3xl sm:text-4xl font-light text-white mb-3">
            Full Analysis
          </h1>
          <p className="text-white/60 max-w-2xl text-lg">
            Interactive visualizations, restoration planning tools, and downloadable data
            from ~9,500 observations of <em>Acropora palmata</em> across the Caribbean.
          </p>
        </div>
      </div>

      {/* Main content with sidebar */}
      <main id="main-content" className="flex-1 flex">
        <div className="max-w-7xl mx-auto w-full flex px-6 lg:px-8 gap-8">
          {/* Sticky sidebar */}
          <AnalysisSidebar
            activeSection={activeSection}
            onSectionClick={scrollToSection}
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Section: Executive Summary - All 15 Findings */}
            <AnalysisSection
              id="summary"
              title="Key Findings"
              subtitle="15 key findings from the meta-analysis of ~9,500 observations across 16 studies"
            >
              <ExecutiveSummary />
            </AnalysisSection>

            {/* Section: Population Status (Findings 1, 9) */}
            <AnalysisSection
              id="population-status"
              title="Population Decline"
              subtitle="Matrix population model estimates showing A. palmata populations are declining ~1.4% annually"
              variant="gray"
            >
              <div className="space-y-10">
                <PopulationDeclineGauge height={300} />

                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-[#0a3d62] mb-4">Transition Matrix</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Size-classified transition probabilities estimated from annual census data.
                    Each cell shows the probability of transitioning between size classes over one year.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr>
                          <th className="p-2 text-left text-gray-500 text-xs">From \ To</th>
                          {['SC1', 'SC2', 'SC3', 'SC4', 'SC5'].map(sc => (
                            <th key={sc} className="p-2 text-center text-xs font-mono text-[#0a3d62]">{sc}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { from: 'SC1', values: [0.414, 0.191, 0.125, 0.110, 0.060] },
                          { from: 'SC2', values: [0.268, 0.336, 0.046, 0.048, 0.213] },
                          { from: 'SC3', values: [0.023, 0.236, 0.495, 0.109, 0.326] },
                          { from: 'SC4', values: [0.018, 0.005, 0.147, 0.576, 0.097] },
                          { from: 'SC5', values: [0.000, 0.005, 0.000, 0.151, 0.872] },
                        ].map(row => (
                          <tr key={row.from}>
                            <td className="p-2 font-mono text-xs text-[#0a3d62] font-medium">{row.from}</td>
                            {row.values.map((val, i) => (
                              <td
                                key={i}
                                className="p-2 text-center font-mono text-xs"
                                style={{
                                  backgroundColor: val > 0 ? `rgba(10, 61, 98, ${Math.min(val * 0.8, 0.7)})` : 'transparent',
                                  color: val > 0.3 ? 'white' : val > 0 ? '#0a3d62' : '#d1d5db',
                                }}
                              >
                                {val > 0 ? val.toFixed(3) : '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    SC1=Recruit, SC2=Small Juvenile, SC3=Large Juvenile, SC4=Small Adult, SC5=Large Adult.
                    Row SC5→SC1 represents fragmentation/reproduction.
                  </p>
                </div>

                <CaveatBox>
                  Model assumes time-invariant vital rates. Actual populations experience
                  stochastic disturbances (hurricanes, bleaching, disease outbreaks) not captured here.
                  The transition matrix is dominated by NOAA monitoring data from Florida and USVI.
                </CaveatBox>

                {/* Temporal Trend - Finding 9 */}
                <div className="mt-10 pt-10 border-t border-gray-200">
                  <TemporalTrendChart height={350} />
                </div>
              </div>
            </AnalysisSection>

            {/* Section: Drivers of Decline (Finding 2) */}
            <AnalysisSection
              id="drivers"
              title="Critical Vital Rates"
              subtitle="Elasticity analysis identifies large adult survival (SC5) as the most critical vital rate for population growth"
            >
              <div className="space-y-8">
                <ElasticityPanel />

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl border border-gray-100 p-6">
                    <h4 className="font-semibold text-[#0a3d62] mb-2">Why elasticity matters</h4>
                    <p className="text-sm text-gray-600">
                      Elasticity tells us which transitions, if improved, would have the largest
                      proportional effect on λ. High-elasticity transitions are the best targets
                      for conservation investment.
                    </p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 p-6">
                    <h4 className="font-semibold text-[#0a3d62] mb-2">Key result</h4>
                    <p className="text-sm text-gray-600">
                      Large adult survival (SC5→SC5) accounts for <strong>54.8%</strong> of total elasticity —
                      meaning protecting existing large colonies is 4× more impactful than any
                      other single intervention.
                    </p>
                  </div>
                </div>
              </div>
            </AnalysisSection>

            {/* Section: Size Relationships (Findings 3, 4, 5) */}
            <AnalysisSection
              id="size-effects"
              title="Size Relationships"
              subtitle="Size-survival and size-growth relationships, including threshold analysis"
              variant="gray"
            >
              <div className="space-y-8">
                <SurvivalByClassChart height={350} />

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl border border-gray-100 p-6">
                    <h4 className="font-semibold text-[#0a3d62] mb-2">Finding #3: Size explains little</h4>
                    <p className="text-sm text-gray-600">
                      Initial size explains only <strong>8.6%</strong> of variance in survival (R² = 0.086).
                      Site conditions, genetics, and handling quality likely matter more than size alone.
                    </p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 p-6">
                    <h4 className="font-semibold text-[#0a3d62] mb-2">Finding #5: RGR 22× better</h4>
                    <p className="text-sm text-gray-600">
                      Relative Growth Rate (RGR) predicts survival 22× better than Absolute Growth Rate (AGR).
                      Growing corals have survival odds 8× higher than non-growing corals.
                    </p>
                  </div>
                </div>

                <ThresholdUncertaintyPlot height={300} />

                <RGRBySizeChart height={350} />

                <CaveatBox>
                  The 95% CI for the size threshold spans 10–33,100 cm², indicating
                  a reliable threshold is not detectable from current data. Size is a weak predictor
                  of survival—focus on site quality and growth indicators instead.
                </CaveatBox>
              </div>
            </AnalysisSection>

            {/* Section: Study Heterogeneity (Finding 6) */}
            <AnalysisSection
              id="heterogeneity"
              title="Study Heterogeneity"
              subtitle="Extreme between-study heterogeneity (I² = 97.8%) means pooled estimates should be interpreted with caution"
            >
              <HeterogeneityPanel height={280} />
            </AnalysisSection>

            {/* Section: Natural vs Fragment (Findings 7, 8) */}
            <AnalysisSection
              id="populations"
              title="Natural vs Fragment Populations"
              subtitle="Survival and growth patterns differ between natural colonies and restoration fragments"
              variant="gray"
            >
              <div className="space-y-8">
                <NaturalVsRestoredChart height={300} />

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl border border-gray-100 p-6">
                    <h4 className="font-semibold text-[#0a3d62] mb-2">Finding #7: 6.8pp survival gap (non-significant)</h4>
                    <p className="text-sm text-gray-600">
                      Natural colonies show <strong>6.8 percentage points</strong> higher annual survival
                      than restoration fragments, but this difference is not statistically significant
                      (p = 0.30). The gap is suggestive but inconclusive.
                    </p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 p-6">
                    <h4 className="font-semibold text-[#0a3d62] mb-2">Finding #8: Different allometry</h4>
                    <p className="text-sm text-gray-600">
                      Fragment-derived colonies may have different size-survival relationships than
                      naturally-recruited corals. Data pooling across types increases uncertainty.
                    </p>
                  </div>
                </div>

                <CaveatBox>
                  Most "fragments" in the database are restoration outplants, while "natural" colonies
                  are from NOAA monitoring. Size distributions differ substantially between groups.
                </CaveatBox>
              </div>
            </AnalysisSection>

            {/* Section: Restoration Scenarios */}
            <AnalysisSection
              id="scenarios"
              title="Restoration Scenarios"
              subtitle="Explore how different management strategies affect projected population growth"
            >
              <RestorationScenarios />
            </AnalysisSection>

            {/* Section: Regional Variation (Finding 10) */}
            <AnalysisSection
              id="regional"
              title="Regional Variation"
              subtitle="Demographic parameters vary across Caribbean regions, though sample sizes differ substantially"
              toolLink={{ label: 'Interactive Regional Tool', path: '/answers/region' }}
            >
              <div className="space-y-8">
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  <MapView
                    sites={mapSites ?? []}
                    isLoading={mapLoading}
                    height={400}
                    colorMetric="region"
                  />
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                  <strong>Data dominance:</strong> NOAA monitoring data accounts for ~78% of all observations.
                  Results are heavily weighted toward Florida and USVI. Other regions have limited sample
                  sizes and may not be representative.
                </div>
              </div>
            </AnalysisSection>

            {/* Section: Evidence Quality (Findings 11-14) */}
            <AnalysisSection
              id="evidence"
              title="Evidence Quality"
              subtitle="Power analysis, model robustness, and cross-validation assessment (Findings 11-14)"
              variant="gray"
            >
              <div className="space-y-8">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl border border-gray-100 p-6">
                    <h4 className="font-semibold text-[#0a3d62] mb-4">Study Heterogeneity</h4>
                    <div className="text-center py-6">
                      <div className="text-5xl font-mono font-light text-red-600 mb-2">97.8%</div>
                      <div className="text-sm text-gray-500 mb-1">I² (between-study heterogeneity)</div>
                      <div className="text-xs text-gray-400">Considerable — pooled estimates may be misleading</div>
                      <div className="mt-4 h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-green-400 via-yellow-400 via-orange-400 to-red-500" style={{ width: '97.8%' }} />
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>0% (homogeneous)</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 p-6">
                    <h4 className="font-semibold text-[#0a3d62] mb-4">Study-Level Estimates</h4>
                    <div className="space-y-3 py-2">
                      {[
                        { study: 'NOAA Survey', survival: 0.871, ci: [0.86, 0.88] },
                        { study: 'Pausch 2018', survival: 0.78, ci: [0.71, 0.85] },
                        { study: 'Mendoza-Q. 2023', survival: 0.77, ci: [0.63, 0.87] },
                        { study: 'USGS USVI', survival: 0.652, ci: [0.51, 0.77] },
                        { study: 'Kuffner 2020', survival: 0.73, ci: [0.59, 0.84] },
                        { study: 'FUNDEMAR', survival: 0.70, ci: [0.54, 0.82] },
                        { study: 'Pooled (k=16)', survival: 0.811, ci: [0.732, 0.871] },
                      ].map((item, idx) => (
                        <div key={item.study} className="flex items-center gap-3">
                          <span className={`text-xs w-28 truncate ${idx === 6 ? 'font-bold text-[#0a3d62]' : 'text-gray-500'}`}>
                            {item.study}
                          </span>
                          <div className="flex-1 relative h-4">
                            <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-200" />
                            <div
                              className="absolute top-1/2 -translate-y-1/2 h-2 bg-blue-200 rounded"
                              style={{ left: `${(item.ci[0] * 100 - 50) * 2}%`, width: `${(item.ci[1] - item.ci[0]) * 200}%` }}
                            />
                            <div
                              className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${idx === 6 ? 'bg-red-500' : 'bg-blue-600'}`}
                              style={{ left: `${(item.survival * 100 - 50) * 2}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-gray-500 w-10">{item.survival.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-xs text-gray-400 mt-2 pt-2 border-t">
                        <span>0.50</span>
                        <span>Annual Survival</span>
                        <span>1.00</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 p-6">
                  <h4 className="font-semibold text-[#0a3d62] mb-3">Key data limitations</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span>I² = 97.8% — extreme heterogeneity between studies</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span>78% of data from NOAA monitoring (potential source bias)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span>Size-survival R² = 8.6% (size is a weak predictor)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span>No ex-situ nursery data available (only field observations)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </AnalysisSection>

            {/* Section: Research Priorities (Finding 15) */}
            <AnalysisSection
              id="priorities"
              title="Research Priorities"
              subtitle="Key data gaps and recommended research priorities for improving A. palmata demographic estimates"
            >
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl font-bold text-red-600">#1</span>
                      <h4 className="font-semibold text-red-800">High Priority</h4>
                    </div>
                    <h5 className="font-medium text-gray-900 mb-2">Reproduction & Recruitment Data</h5>
                    <p className="text-sm text-gray-600">
                      No empirical fecundity data for wild A. palmata populations. Current matrix
                      uses assumed recruitment rates. Sexual reproduction success rates needed.
                    </p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl font-bold text-red-600">#2</span>
                      <h4 className="font-semibold text-red-800">High Priority</h4>
                    </div>
                    <h5 className="font-medium text-gray-900 mb-2">Long-term Fragment Monitoring</h5>
                    <p className="text-sm text-gray-600">
                      Most fragment data spans 1-2 years. Need 5+ year trajectories to understand
                      whether fragments achieve natural colony survival rates over time.
                    </p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl font-bold text-amber-600">#3</span>
                      <h4 className="font-semibold text-amber-800">Medium Priority</h4>
                    </div>
                    <h5 className="font-medium text-gray-900 mb-2">Standardized Protocols</h5>
                    <p className="text-sm text-gray-600">
                      Size measurement methods vary across studies (TLE vs. planar area vs. 3D).
                      Standardized protocols would reduce between-study heterogeneity.
                    </p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl font-bold text-amber-600">#4</span>
                      <h4 className="font-semibold text-amber-800">Medium Priority</h4>
                    </div>
                    <h5 className="font-medium text-gray-900 mb-2">Ex-situ Nursery Studies</h5>
                    <p className="text-sm text-gray-600">
                      No ex-situ nursery survival/growth data in this database. Laboratory and
                      nursery growth rates may differ from field conditions.
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                  <strong>Power analysis (Finding #11):</strong> To detect a 10% difference in survival with 80% power,
                  studies need 150-700 colonies per group depending on baseline survival rate. Many current
                  studies are underpowered for detecting ecologically meaningful effects.
                </div>
              </div>
            </AnalysisSection>

            {/* Section: Download */}
            <AnalysisSection
              id="download"
              title="Download Data"
              subtitle="Export raw data, model outputs, and parameter estimates for your own analyses"
            >
              <div className="grid md:grid-cols-2 gap-6">
                <DownloadCard
                  title="Individual Observations"
                  description="Raw survival and growth data with colony-level covariates"
                  format="CSV"
                  records="5,200+"
                  path="/download"
                />
                <DownloadCard
                  title="Model Parameters"
                  description="Transition matrix, elasticity values, and bootstrap confidence intervals"
                  format="CSV/RDS"
                  records="Full matrix"
                  path="/download"
                />
              </div>

              <div className="mt-8 text-center">
                <Link
                  to="/download"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#0a3d62] text-white font-medium rounded-full hover:bg-[#0a3d62]/90 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Go to Download Page
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </AnalysisSection>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function CaveatBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg p-4 text-sm text-amber-800">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <div>{children}</div>
      </div>
    </div>
  );
}

function DownloadCard({
  title,
  description,
  format,
  records,
  path,
}: {
  title: string;
  description: string;
  format: string;
  records: string;
  path: string;
}) {
  return (
    <Link
      to={path}
      className="group block rounded-xl border border-gray-200 p-6 hover:border-[#0a3d62]/30 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-[#0a3d62] group-hover:text-[#0a3d62]">{title}</h4>
        <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{format}</span>
      </div>
      <p className="text-sm text-gray-500 mb-3">{description}</p>
      <div className="text-xs text-gray-400">{records} records</div>
    </Link>
  );
}
