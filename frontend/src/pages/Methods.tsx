/**
 * Methods Page
 *
 * Practitioner-friendly documentation page explaining data sources,
 * methods, size classes, limitations, and a glossary of terms.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import {
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Database,
  MapPin,
  AlertTriangle,
  BookOpen,
  Microscope,
  Ruler,
  FileText,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';

// Size class visual component
function SizeClassDiagram() {
  const sizeClasses = [
    { id: 'SC1', range: '<25 cm²', label: 'Recruits', color: '#fef3c7', borderColor: '#f59e0b', description: 'Small fragments or new recruits', fieldNote: 'About the size of a quarter' },
    { id: 'SC2', range: '25-100 cm²', label: 'Juveniles', color: '#dcfce7', borderColor: '#22c55e', description: 'Establishing colonies', fieldNote: 'About the size of your palm' },
    { id: 'SC3', range: '100-500 cm²', label: 'Sub-adults', color: '#dbeafe', borderColor: '#3b82f6', description: 'Growing but pre-reproductive', fieldNote: 'About the size of a dinner plate' },
    { id: 'SC4', range: '500-2000 cm²', label: 'Adults', color: '#e9d5ff', borderColor: '#a855f7', description: 'Reproductive-age colonies', fieldNote: 'About the size of a laptop screen' },
    { id: 'SC5', range: '>2000 cm²', label: 'Large Adults', color: '#fce7f3', borderColor: '#ec4899', description: 'Mature colonies with greater reproductive output', fieldNote: 'Larger than a beach towel' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
      {sizeClasses.map((sc, index) => (
        <div
          key={sc.id}
          className="relative p-4 rounded-xl border-2 transition-all hover:shadow-md"
          style={{ backgroundColor: sc.color, borderColor: sc.borderColor }}
        >
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: sc.borderColor }}>{sc.id}</div>
            <div className="text-sm font-medium text-gray-700 mt-1">{sc.range}</div>
            <div className="text-xs text-gray-600 mt-2 font-medium">{sc.label}</div>
            <div className="text-xs text-gray-500 mt-1">{sc.description}</div>
            <div className="text-xs text-gray-400 mt-2 italic">{sc.fieldNote}</div>
          </div>
          {index < sizeClasses.length - 1 && (
            <ChevronRight className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-300 hidden sm:block" />
          )}
        </div>
      ))}
    </div>
  );
}

// Collapsible glossary term
function GlossaryTerm({ term, definition, example }: { term: string; definition: string; example?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const termId = `glossary-${term.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 text-left hover:bg-gray-50 px-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-ocean-light/50"
        aria-expanded={isOpen}
        aria-controls={termId}
      >
        <span className="font-mono text-ocean-deep font-medium">{term}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {isOpen && (
        <div id={termId} className="pb-3 px-2 text-sm text-gray-600" role="region" aria-label={`Definition of ${term}`}>
          <p>{definition}</p>
          {example && (
            <p className="mt-2 text-xs text-gray-500 italic">Example: {example}</p>
          )}
        </div>
      )}
    </div>
  );
}

// Data source card
function DataSourceCard({
  name,
  percentage,
  records,
  years,
  regions,
  type,
}: {
  name: string;
  percentage: number;
  records: string;
  years: string;
  regions: string;
  type: 'primary' | 'secondary';
}) {
  return (
    <div className={`p-4 rounded-xl border ${type === 'primary' ? 'bg-ocean-deep/5 border-ocean-deep/20' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900">{name}</h4>
        <span className={`text-xs font-mono px-2 py-0.5 rounded ${type === 'primary' ? 'bg-ocean-deep/10 text-ocean-deep' : 'bg-gray-200 text-gray-600'}`}>
          {percentage}%
        </span>
      </div>
      <div className="text-xs text-gray-500 space-y-1">
        <p><span className="font-medium">Records:</span> {records}</p>
        <p><span className="font-medium">Years:</span> {years}</p>
        <p><span className="font-medium">Regions:</span> {regions}</p>
      </div>
    </div>
  );
}

// Citation copy button
function CitationBox() {
  const [copied, setCopied] = useState(false);
  const citation = `Detmer, R. & Stier, A. (2025). Acropora palmata Demographic Parameters Database: Uncertainty-aware analysis of size-dependent survival and growth across the Caribbean. GitHub: stier-lab/Detmer-2025-coral-parameters`;

  const handleCopy = () => {
    navigator.clipboard.writeText(citation).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Clipboard API failed (e.g., insecure context) - no-op
    });
  };

  return (
    <div className="bg-sand-warm rounded-xl p-4 border border-border-medium">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-gray-700 leading-relaxed">
          {citation}
        </p>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 p-2 rounded-lg hover:bg-white/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ocean-light/50"
          aria-label={copied ? 'Citation copied to clipboard' : 'Copy citation to clipboard'}
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-600" aria-hidden="true" />
          ) : (
            <Copy className="w-4 h-4 text-gray-500" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}

export function Methods() {
  return (
    <div className="min-h-screen bg-sand-light flex flex-col">
      <Header />

      {/* Page Header */}
      <div className="bg-white border-b border-border-light">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-2 text-sm text-ocean-light mb-2">
            <BookOpen className="w-4 h-4" />
            <span>Documentation</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-semibold text-ocean-deep">
            Methods & About
          </h1>
          <p className="mt-2 text-text-secondary max-w-2xl">
            How to interpret this data, understand its limitations, and use it for your restoration planning.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main id="main-content" className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="space-y-12">
          {/* About This Database */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-ocean-deep/10 flex items-center justify-center">
                <Database className="w-5 h-5 text-ocean-deep" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">About This Database</h2>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 space-y-4">
              <p className="text-gray-700 leading-relaxed">
                This database synthesizes <strong>survival and growth data</strong> for <em>Acropora palmata</em> (elkhorn coral)
                from peer-reviewed studies and restoration monitoring programs across the Caribbean. Our goal is to provide
                restoration practitioners and researchers with <strong>evidence-based parameters</strong> for planning and
                evaluating coral restoration efforts.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-reef-green/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-reef-green" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm">Maintained by</h4>
                    <p className="text-sm text-gray-600">Stier Lab, UC Santa Barbara</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-coral-warm/10 flex items-center justify-center flex-shrink-0">
                    <Microscope className="w-4 h-4 text-coral-warm" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm">Last updated</h4>
                    <p className="text-sm text-gray-600">January 2026</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h4 className="text-sm font-medium text-gray-900 mb-2">How to cite</h4>
                <CitationBox />
              </div>
            </div>
          </section>

          {/* Data Sources */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-bioluminescent/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-bioluminescent" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Data Sources</h2>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 space-y-6">
              <p className="text-gray-700 leading-relaxed">
                Our dataset integrates <strong>5,196 survival records</strong> and <strong>4,344 growth records</strong>
                from 18+ studies spanning 2004-2024. The data covers 9 Caribbean regions.
              </p>

              {/* Visual breakdown */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Data contribution by source</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div className="bg-ocean-deep h-4 rounded-full" style={{ width: '78%' }} />
                    </div>
                    <span className="text-xs font-mono text-gray-600 w-12">78%</span>
                  </div>
                  <p className="text-xs text-gray-500">NOAA/Williams & Miller monitoring program</p>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div className="bg-reef-green h-4 rounded-full" style={{ width: '22%' }} />
                    </div>
                    <span className="text-xs font-mono text-gray-600 w-12">22%</span>
                  </div>
                  <p className="text-xs text-gray-500">Other peer-reviewed studies (17 sources)</p>
                </div>
              </div>

              {/* Source cards */}
              <div className="grid sm:grid-cols-2 gap-4">
                <DataSourceCard
                  name="NOAA Monitoring"
                  percentage={78}
                  records="~4,050 survival, ~3,400 growth"
                  years="2004-2022"
                  regions="Florida Keys"
                  type="primary"
                />
                <DataSourceCard
                  name="Literature Studies"
                  percentage={22}
                  records="~1,150 survival, ~950 growth"
                  years="2001-2024"
                  regions="USVI, Puerto Rico, Mexico, Curacao, etc."
                  type="secondary"
                />
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  <strong>Important:</strong> 78% of data comes from a single source (Florida Keys).
                  Results may not generalize to other Caribbean regions. See Limitations section below.
                </p>
              </div>
            </div>
          </section>

          {/* Size Classes */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-coral-warm/10 flex items-center justify-center">
                <Ruler className="w-5 h-5 text-coral-warm" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Size Classes Explained</h2>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 space-y-6">
              <p className="text-gray-700 leading-relaxed">
                We categorize corals into <strong>5 size classes</strong> based on planar tissue area (cm²).
                These cutoffs are based on biological transitions in survival and reproductive capacity.
              </p>

              <SizeClassDiagram />

              {/* Field photo example */}
              <div className="rounded-xl overflow-hidden border border-gray-200">
                <img
                  src="/images/acropora-palmata-elkhorn-coral.jpeg"
                  alt="Acropora palmata elkhorn coral colony in the field showing characteristic branching structure"
                  className="w-full h-auto"
                />
                <div className="bg-ocean-deep/5 p-3 border-t border-gray-200">
                  <p className="text-xs text-gray-600 italic">
                    Example of mature <em>Acropora palmata</em> (elkhorn coral) showing the characteristic flattened branching structure.
                    This colony would be classified as SC5 (&gt;2000 cm²).
                  </p>
                </div>
              </div>

              <div className="bg-ocean-deep/5 rounded-lg p-4 border border-ocean-deep/10">
                <h4 className="font-medium text-ocean-deep text-sm mb-2">Why these cutoffs?</h4>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-ocean-deep">•</span>
                    <span><strong>100 cm²</strong> — Approximate threshold where partial mortality risk begins to decrease</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-ocean-deep">•</span>
                    <span><strong>500 cm²</strong> — Typical reproductive maturity threshold</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-ocean-deep">•</span>
                    <span><strong>2000 cm²</strong> — Large, established colonies with greater reproductive output</span>
                  </li>
                </ul>
                <p className="text-xs text-gray-500 mt-3 italic">
                  These size classes are one common way to categorize colonies. Other studies use different cutoffs.
                </p>
              </div>

              <p className="text-sm text-gray-500">
                <strong>Note:</strong> Size is measured as planar tissue area, which can be estimated in the field
                using length × width × 0.8 for branching colonies, or more precisely using photogrammetry.
              </p>
            </div>
          </section>

          {/* Statistical Methods */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Microscope className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Statistical Methods</h2>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 space-y-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Survival Analysis</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    We use <strong>logistic regression with mixed effects</strong> to model survival probability as a function of size.
                    Study and site are included as random effects to account for variation across data sources.
                    95% confidence intervals are shown for all estimates.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Growth Analysis</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Growth is measured as change in planar area between monitoring intervals. We report both
                    <strong> Absolute Growth Rate (AGR)</strong> in cm²/year and <strong>Relative Growth Rate (RGR)</strong>
                    as a proportion of initial size. RGR is preferred for comparing across size classes.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Uncertainty Quantification</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    All estimates include <strong>95% confidence intervals</strong>. We use bootstrapping for some metrics
                    and parametric confidence intervals from model fits for others. When confidence intervals are wide,
                    treat point estimates with caution.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Population Matrix Model & Elasticity Analysis */}
          <section id="elasticity">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Population Matrix Model & Elasticity Analysis</h2>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 space-y-6">
              <p className="text-gray-700 leading-relaxed">
                We use a <strong>Lefkovitch (size-structured) matrix model</strong> to analyze population dynamics and identify
                which life-stage transitions have the greatest influence on population growth. This approach helps prioritize
                conservation and restoration interventions.
              </p>

              {/* What is a Lefkovitch Matrix */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">What is a Lefkovitch Matrix?</h4>
                <p className="text-sm text-gray-700 leading-relaxed mb-3">
                  A Lefkovitch matrix is a mathematical representation of how individuals transition between size classes over time.
                  Unlike age-based Leslie matrices, it groups organisms by size—more appropriate for corals where size (not age) determines
                  survival and reproduction.
                </p>
                <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                  <p className="text-xs text-gray-600 mb-2">Our 5×5 transition matrix structure:</p>
                  <div className="font-mono text-xs text-gray-700">
                    <table className="border-collapse">
                      <thead>
                        <tr className="text-gray-500">
                          <th className="p-2 border border-gray-200">To \ From</th>
                          <th className="p-2 border border-gray-200">SC1</th>
                          <th className="p-2 border border-gray-200">SC2</th>
                          <th className="p-2 border border-gray-200">SC3</th>
                          <th className="p-2 border border-gray-200">SC4</th>
                          <th className="p-2 border border-gray-200">SC5</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr><td className="p-2 border border-gray-200 font-medium">SC1</td><td className="p-2 border border-gray-200 bg-blue-50">P₁₁</td><td className="p-2 border border-gray-200">—</td><td className="p-2 border border-gray-200">—</td><td className="p-2 border border-gray-200 bg-amber-50">F₄</td><td className="p-2 border border-gray-200 bg-amber-50">F₅</td></tr>
                        <tr><td className="p-2 border border-gray-200 font-medium">SC2</td><td className="p-2 border border-gray-200 bg-green-50">G₁₂</td><td className="p-2 border border-gray-200 bg-blue-50">P₂₂</td><td className="p-2 border border-gray-200 bg-red-50">R₃₂</td><td className="p-2 border border-gray-200">—</td><td className="p-2 border border-gray-200">—</td></tr>
                        <tr><td className="p-2 border border-gray-200 font-medium">SC3</td><td className="p-2 border border-gray-200">—</td><td className="p-2 border border-gray-200 bg-green-50">G₂₃</td><td className="p-2 border border-gray-200 bg-blue-50">P₃₃</td><td className="p-2 border border-gray-200 bg-red-50">R₄₃</td><td className="p-2 border border-gray-200">—</td></tr>
                        <tr><td className="p-2 border border-gray-200 font-medium">SC4</td><td className="p-2 border border-gray-200">—</td><td className="p-2 border border-gray-200">—</td><td className="p-2 border border-gray-200 bg-green-50">G₃₄</td><td className="p-2 border border-gray-200 bg-blue-50">P₄₄</td><td className="p-2 border border-gray-200 bg-red-50">R₅₄</td></tr>
                        <tr><td className="p-2 border border-gray-200 font-medium">SC5</td><td className="p-2 border border-gray-200">—</td><td className="p-2 border border-gray-200">—</td><td className="p-2 border border-gray-200">—</td><td className="p-2 border border-gray-200 bg-green-50">G₄₅</td><td className="p-2 border border-gray-200 bg-blue-50">P₅₅</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-3 text-xs">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></span> P = Stasis (stay)</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-100 border border-green-300 rounded"></span> G = Growth</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 border border-red-300 rounded"></span> R = Retrogression</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-100 border border-amber-300 rounded"></span> F = Fecundity/Fragmentation</span>
                  </div>
                </div>
              </div>

              {/* Lambda */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Population Growth Rate (λ)</h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  The <strong>dominant eigenvalue (λ)</strong> of the transition matrix gives the asymptotic population growth rate.
                  When λ &lt; 1, the population is declining; when λ &gt; 1, it's growing; λ = 1 means stable. Our analysis estimates
                  <strong> λ = 0.986</strong> (95% CI: 0.819–1.020). The point estimate suggests ~1.4% annual decline, but
                  the CI is wide and crosses 1.0, meaning the population could be growing or declining. 87.3% of bootstrap
                  replicates show decline — probable but not certain.
                </p>
              </div>

              {/* Elasticity definition */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">What is Elasticity?</h4>
                <p className="text-sm text-gray-700 leading-relaxed mb-3">
                  <strong>Elasticity</strong> measures how sensitive λ is to <em>proportional</em> changes in each transition rate.
                  It answers: "If I improve this vital rate by 10%, how much does λ improve?" Unlike sensitivity (which measures
                  absolute changes), elasticity is dimensionless and allows direct comparison across transitions.
                </p>
                <div className="bg-gray-50 p-3 rounded font-mono text-xs">
                  <div>e<sub>ij</sub> = (a<sub>ij</sub> / λ) × (∂λ / ∂a<sub>ij</sub>) = (a<sub>ij</sub> / λ) × s<sub>ij</sub></div>
                  <div className="text-gray-500 mt-2">where s<sub>ij</sub> = v<sub>i</sub> × w<sub>j</sub> / (v · w)</div>
                  <div className="text-gray-500">v = reproductive value vector, w = stable stage distribution</div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  All elasticities sum to 1 (or 100%), representing the total &quot;budget&quot; of sensitivity. High elasticity values
                  indicate transitions where interventions would have the greatest proportional effect on population growth.
                </p>
              </div>

              {/* Key findings */}
              <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                <h4 className="font-medium text-teal-800 mb-2">Key Elasticity Findings</h4>
                <ul className="text-sm text-teal-900 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-teal-600 font-bold">•</span>
                    <span><strong>SC5 adult survival</strong> accounts for ~55% of total elasticity—by far the most influential transition</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-600 font-bold">•</span>
                    <span><strong>Stasis transitions</strong> (survival in same class) collectively represent ~76% of elasticity</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-600 font-bold">•</span>
                    <span><strong>Growth transitions</strong> account for ~15%, with SC4→SC5 being most important</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-600 font-bold">•</span>
                    <span><strong>Fragmentation/fecundity</strong> contributes ~8%—important but not dominant</span>
                  </li>
                </ul>
              </div>

              {/* Restoration implications */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">What This Means for Restoration</h4>
                <p className="text-sm text-gray-700 leading-relaxed mb-3">
                  The dominance of SC5 adult survival suggests that <strong>protecting existing large colonies</strong> may have
                  3-4× greater impact on population growth than outplanting many small fragments. However, this doesn't mean
                  fragment outplanting is useless—it creates the pipeline of recruits that eventually become large adults.
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="font-medium text-gray-800 text-sm mb-2">Strategic implications:</h5>
                  <ul className="text-sm text-gray-700 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-gray-500">1.</span>
                      <span><strong>Protect large adults</strong> from disease, predation, and physical damage—they're irreplaceable on short timescales</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-500">2.</span>
                      <span><strong>Outplant larger fragments</strong> when possible—they reach reproductive size faster with higher survival</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-500">3.</span>
                      <span><strong>Site selection matters</strong> more than fragment quantity—high mortality sites waste resources</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-500">4.</span>
                      <span><strong>Long-term monitoring</strong> of outplanted corals tracks the growth transition rates that feed into adult populations</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Caveats */}
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Important Model Assumptions
                </h4>
                <ul className="text-sm text-amber-900 space-y-1">
                  <li>• <strong>Density independence:</strong> Model assumes no carrying capacity effects</li>
                  <li>• <strong>Time invariance:</strong> Transition rates are treated as constant over time</li>
                  <li>• <strong>Closed population:</strong> No immigration or emigration between sites</li>
                  <li>• <strong>Sample size variation:</strong> Some transitions have limited data (see confidence indicators)</li>
                  <li>• <strong>Regional averaging:</strong> Results are Caribbean-wide; local conditions may differ</li>
                </ul>
                <p className="text-xs text-amber-700 mt-2">
                  Elasticities are <em>model outputs</em> based on averaged vital rates—they describe the model, not necessarily
                  any specific reef. Use as guidance for prioritization, not as precise prescriptions.
                </p>
              </div>

              <div className="text-sm text-gray-500 pt-2 border-t border-gray-100">
                <strong>Methods:</strong> Bootstrap resampling (n=1000) to estimate λ confidence intervals.
                Elasticities calculated using standard matrix calculus from the mean transition matrix.
                See <Link to="/analysis#drivers" className="text-ocean-deep hover:underline">Analysis</Link> for
                interactive visualizations.
              </div>
            </div>
          </section>

          {/* Limitations */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Key Limitations</h2>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 space-y-6">
              <p className="text-gray-700 leading-relaxed">
                Understanding what this data <strong>cannot</strong> tell you is as important as what it can.
                Use these parameters as <em>starting points</em> for planning, not as guarantees.
              </p>

              <div className="space-y-4">
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <h4 className="font-medium text-amber-800 mb-2">Geographic Bias</h4>
                  <p className="text-sm text-amber-900">
                    78% of data comes from Florida Keys. Survival and growth rates may differ significantly in Puerto Rico,
                    USVI, Mexico, or other Caribbean regions due to local environmental conditions, disease pressure, and management.
                  </p>
                </div>

                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <h4 className="font-medium text-amber-800 mb-2">Fragment vs Colony Confounding</h4>
                  <p className="text-sm text-amber-900">
                    Restored corals are often fragments, while natural populations include more intact colonies.
                    Observed survival differences may reflect fragment handling stress, not inherent population differences.
                    We separate data by origin type when possible, but cannot fully control for this.
                  </p>
                </div>

                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <h4 className="font-medium text-amber-800 mb-2">Size Explains Limited Variance</h4>
                  <p className="text-sm text-amber-900">
                    Size alone explains only ~8-9% of survival variation. Site conditions, disease exposure,
                    genotype, and environmental stressors matter more. Don't over-rely on size-based predictions.
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-700 mb-2">What this data CAN tell you</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• General survival ranges by size class (with uncertainty)</li>
                    <li>• Approximate growth trajectories for planning</li>
                    <li>• Conservation priorities (which life stages matter most)</li>
                    <li>• Regional variation patterns</li>
                  </ul>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-700 mb-2">What this data CANNOT tell you</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Precise survival rates for your specific site</li>
                    <li>• How your restoration will perform during disease outbreaks or bleaching</li>
                    <li>• Optimal outplanting techniques (beyond size)</li>
                    <li>• Genotype-specific performance</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Practitioner FAQ */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-bioluminescent/10 flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-bioluminescent" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Practitioner FAQ</h2>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 space-y-6">
              <p className="text-gray-700 text-sm">
                Common questions about using this database for restoration planning and decision-making.
              </p>

              <div className="space-y-4">
                {/* Pooling */}
                <div className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                  <h4 className="font-medium text-gray-900 mb-2">Why don&apos;t you show a single "best" survival number?</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Because study heterogeneity is high. Pooled estimates can be misleading when fragment studies and
                    large-colony surveys are mixed together. We show <strong>stratified estimates</strong> (separated by population type,
                    size class, and region) with <strong>explicit uncertainty</strong> to avoid false precision. A single pooled number
                    would hide the real variation practitioners need to understand.
                  </p>
                </div>

                {/* Thresholds */}
                <div className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                  <h4 className="font-medium text-gray-900 mb-2">Is there a critical size threshold for survival?</h4>
                  <p className="text-sm text-gray-700 leading-relaxed mb-2">
                    The data do not support a stable single threshold. When we fit threshold models, the confidence intervals
                    span orders of magnitude (e.g., ~27 cm² to ~9,000 cm²). This means the apparent "critical size" is highly
                    sensitive to which studies and sites are included.
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    <strong>Implication:</strong> We treat thresholds as <em>exploratory</em> rather than prescriptive.
                    Survival increases gradually with size, but there's no magic number where corals suddenly become safe.
                  </p>
                </div>

                {/* Fragment vs Natural */}
                <div className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                  <h4 className="font-medium text-gray-900 mb-2">Should I use fragment or natural colony data for my restoration project?</h4>
                  <p className="text-sm text-gray-700 leading-relaxed mb-2">
                    Use <strong>fragment data</strong> if you're outplanting nursery-raised fragments or broken fragments.
                    Fragments show ~6.8 percentage points lower survival than natural colonies at the same size, though this
                    difference is not statistically significant (p = 0.30). The gap is suggestive but inconclusive and may reflect
                    fragmentation stress, handling, and attachment issues.
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    <strong>Important caveat:</strong> This difference may reflect methodology (fragments are often smaller and more stressed)
                    rather than inherent biological differences. We separate the data to avoid overestimating fragment survival by pooling
                    them with intact colonies.
                  </p>
                </div>

                {/* When to pool */}
                <div className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                  <h4 className="font-medium text-gray-900 mb-2">When should I use &quot;All data&quot; vs separated fragment/natural estimates?</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Use <strong>separated estimates</strong> by default for restoration planning—they give you the most accurate
                    picture for your specific context. Use <strong>"All data"</strong> only when:
                  </p>
                  <ul className="text-sm text-gray-600 mt-2 space-y-1 ml-4">
                    <li>• You're exploring broad patterns across all <em>A. palmata</em> populations</li>
                    <li>• Your data includes a mix of fragments and colonies you can't separate</li>
                    <li>• You want a conservative estimate that accounts for both origins</li>
                  </ul>
                  <p className="text-sm text-gray-700 leading-relaxed mt-2">
                    Be aware that pooled estimates are harder to interpret and may not match your site's reality.
                  </p>
                </div>

                {/* Regional applicability */}
                <div className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                  <h4 className="font-medium text-gray-900 mb-2">How well do Florida Keys estimates apply to my region?</h4>
                  <p className="text-sm text-gray-700 leading-relaxed mb-2">
                    78% of our data comes from Florida Keys, so estimates for other regions have <strong>wide confidence intervals</strong>
                    and should be treated cautiously. Regional differences in water quality, temperature regimes, disease pressure, and
                    management practices can all affect survival and growth.
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    <strong>Recommendation:</strong> Use regional estimates when available, but supplement with your own monitoring data
                    as soon as possible. Treat these as starting points for power analysis and project planning, not as guarantees.
                  </p>
                </div>

                {/* Size explanatory power */}
                <div className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                  <h4 className="font-medium text-gray-900 mb-2">If size explains only 8.6% of survival variance, why base decisions on it?</h4>
                  <p className="text-sm text-gray-700 leading-relaxed mb-2">
                    Size is <em>one of the few factors you can control</em> at outplanting. You can't control your site's water quality,
                    disease exposure, or storm frequency—but you <em>can</em> choose what size to outplant.
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Even though size explains a small fraction of variance, that doesn't mean it's unimportant. A 10-15% survival boost
                    from larger size can meaningfully improve restoration outcomes, especially when compounded over years. The key is to
                    recognize that <strong>site-level factors matter more</strong>, so don't rely solely on size-based predictions.
                  </p>
                </div>

                {/* Time projections */}
                <div className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                  <h4 className="font-medium text-gray-900 mb-2">How accurate are the growth trajectory projections?</h4>
                  <p className="text-sm text-gray-700 leading-relaxed mb-2">
                    Growth projections are <strong>rough estimates</strong>, not precise predictions. They assume constant growth rates
                    without disease, bleaching, or major storms—conditions that rarely hold in practice. Individual corals also vary widely
                    in growth even at the same size.
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    <strong>Use these projections to:</strong> estimate time horizons for reaching target sizes, set monitoring intervals,
                    and communicate realistic timelines to stakeholders. Don't use them as binding commitments—actual growth will vary.
                  </p>
                </div>

                {/* Survivability timing */}
                <div className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                  <h4 className="font-medium text-gray-900 mb-2">How is survival measured? What time period do these estimates cover?</h4>
                  <p className="text-sm text-gray-700 leading-relaxed mb-2">
                    Survival rates in this database are <strong>annualized estimates</strong> based on monitoring intervals typically ranging from
                    6 months to 2 years. We standardize all observations to an annual survival probability to enable comparisons across studies.
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed mb-2">
                    <strong>Important:</strong> These are <em>short-term survival rates</em> (typically 1-2 years), not long-term projections.
                    Survival over 5 or 10 years depends on cumulative annual survival and is heavily influenced by disturbance events (disease outbreaks,
                    bleaching, storms) that aren't captured in our baseline estimates.
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    For multi-year projections, you should compound annual survival rates while accounting for the likelihood of major disturbances
                    in your region. A coral with 80% annual survival has roughly 33% probability of surviving 5 years <em>if conditions remain stable</em>—
                    a significant assumption.
                  </p>
                </div>

                {/* Data updates */}
                <div className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                  <h4 className="font-medium text-gray-900 mb-2">Will this database be updated with new data?</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    The current version (January 2026) synthesizes data through 2024. Future updates will depend on new published studies
                    and data sharing from monitoring programs. If you have <em>A. palmata</em> survival or growth data you'd be willing to
                    contribute, please contact the maintainers via GitHub.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Glossary */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-gray-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Glossary</h2>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <p className="text-gray-700 mb-4">
                Click any term to expand its definition.
              </p>

              <div className="divide-y divide-gray-100">
                <GlossaryTerm
                  term="λ (Lambda)"
                  definition="Population growth rate. Values above 1.0 indicate a growing population, below 1.0 indicates decline. For example, λ = 0.98 means the population shrinks by 2% per year."
                  example="λ = 0.986 means a 1.4% annual decline"
                />
                <GlossaryTerm
                  term="Elasticity"
                  definition="How sensitive population growth (λ) is to changes in a specific demographic rate. Higher elasticity means that rate has more leverage over population outcomes. Used to prioritize conservation actions."
                  example="SC5 survival elasticity of 0.548 means protecting large adults has 54.8% of the total possible impact"
                />
                <GlossaryTerm
                  term="AGR (Absolute Growth Rate)"
                  definition="Change in tissue area per unit time, typically cm²/year. Useful for predicting how much tissue a coral will add, but varies strongly with initial size."
                  example="AGR of 50 cm²/year means the coral adds 50 cm² of tissue annually"
                />
                <GlossaryTerm
                  term="RGR (Relative Growth Rate)"
                  definition="Growth as a proportion of initial size, typically expressed as a decimal per year. Allows fair comparison across size classes because it accounts for the fact that larger corals naturally grow more tissue."
                  example="RGR of 0.15 means the coral grows 15% of its current size per year"
                />
                <GlossaryTerm
                  term="Planar Area"
                  definition="The two-dimensional tissue coverage of a coral viewed from above, measured in cm². This is the standard size metric for elkhorn corals in monitoring programs."
                  example="A coral with planar area of 500 cm² covers roughly a 25×20 cm rectangle"
                />
                <GlossaryTerm
                  term="Partial Mortality"
                  definition="Loss of living tissue from part of a coral colony without killing the entire colony. Can result from disease, predation, sedimentation, or physical damage."
                />
                <GlossaryTerm
                  term="Whole-Colony Mortality"
                  definition="Death of an entire coral colony, resulting in 100% tissue loss. Tracked separately from partial mortality in demographic models."
                />
                <GlossaryTerm
                  term="Confidence Interval (CI)"
                  definition="A range of values that likely contains the true parameter value. A 95% CI means we're 95% confident the true value falls within this range. Wider intervals indicate more uncertainty."
                  example="Survival of 72% (95% CI: 65-79%) means we're confident survival is between 65% and 79%"
                />
                <GlossaryTerm
                  term="R² (R-squared)"
                  definition="Proportion of variance explained by a model. Ranges from 0 to 1. Higher values mean the predictor explains more of the variation in the outcome."
                  example="R² = 0.086 for size-survival means size explains only 8.6% of survival variation"
                />
                <GlossaryTerm
                  term="GLMM"
                  definition="Generalized Linear Mixed Model. A statistical model that handles non-normal data (like binary survival) while accounting for hierarchical structure (like multiple observations from the same site or study)."
                />
              </div>
            </div>
          </section>

          {/* Next Steps */}
          <section className="bg-ocean-deep rounded-xl p-6 text-white">
            <h3 className="text-lg font-semibold mb-3">Ready to explore the data?</h3>
            <p className="text-white/70 text-sm mb-4">
              Now that you understand how to interpret the data, dive into the key findings or explore the full dataset.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/analysis"
                className="inline-flex items-center gap-2 px-4 py-2 bg-bioluminescent text-ocean-abyss font-medium text-sm rounded-lg hover:bg-bioluminescent/90 transition-colors"
              >
                Full Analysis
              </Link>
              <Link
                to="/literature"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white font-medium text-sm rounded-lg hover:bg-white/20 transition-colors"
              >
                Literature Database
              </Link>
              <a
                href="https://github.com/stier-lab/Detmer-2025-coral-parameters"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-white/70 font-medium text-sm hover:text-white transition-colors"
              >
                View on GitHub
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Methods;
