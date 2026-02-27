import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { statsApi } from '../utils/api';
import { OverviewStats } from '../types';
import {
  ArrowRight,
  ArrowDown,
  TrendingDown,
  Shield,
  Lightbulb,
  BarChart3,
} from 'lucide-react';

const DEFAULT_STATS: OverviewStats = {
  total_observations: 5200,
  total_studies: 16,
  total_regions: 10,
  year_range: [2004, 2024],
  mean_survival: 0.769,
  mean_growth: 45.5,
};

export function Story() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchStats() {
      try {
        const data = await statsApi.getOverview();
        if (isMounted) setStats(data);
      } catch {
        if (isMounted) setStats(DEFAULT_STATS);
      } finally {
        if (isMounted) setStatsLoading(false);
      }
    }
    fetchStats();
    return () => { isMounted = false; };
  }, []);

  const studyCount = stats ? stats.total_studies.toString() : '18';
  const obsCount = stats ? stats.total_observations.toLocaleString() : '5,200';
  const regionCount = stats ? stats.total_regions.toString() : '9';

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main id="main-content">
      {/* Hero */}
      <section aria-label="Introduction" className="relative min-h-[75vh] flex items-center overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-15">
            <img
              src="/images/acropora-palmata-elkhorn-coral.jpeg"
              alt=""
              className="w-full h-full object-cover"
              aria-hidden="true"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-ocean-950/95 via-ocean-900/92 to-ocean-950" />
          <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-teal-500 rounded-full blur-[200px] opacity-[0.04]" />
          <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-coral-400 rounded-full blur-[150px] opacity-[0.03]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 lg:px-8 w-full py-24 lg:py-32">
          <p className="text-teal-400 text-xs font-sans font-semibold tracking-[0.2em] uppercase mb-5 opacity-80">
            Acropora palmata Demographics
          </p>

          <h1 className="font-display text-[2.5rem] sm:text-[3.25rem] lg:text-[3.75rem] font-light text-white leading-[1.1] tracking-[-0.02em] mb-7 max-w-3xl">
            Elkhorn coral populations are declining.
            <br />
            <span className="text-white/55">What can restoration do about it?</span>
          </h1>

          <p className="text-lg text-white/60 font-body mb-5 max-w-2xl leading-relaxed">
            We synthesized <span className="text-teal-300 font-medium">{statsLoading ? '...' : obsCount}+ observations</span> from {statsLoading ? '...' : studyCount} studies
            across {statsLoading ? '...' : regionCount} Caribbean regions to quantify survival, growth, and population dynamics
            for the most iconic reef-building coral in the Western Atlantic.
          </p>

          <blockquote className="text-sm text-white/45 mb-10 max-w-lg leading-relaxed italic border-l-2 border-teal-500/30 pl-4">
            &ldquo;We built the database we wished existed &mdash; showing what we know, what we don&rsquo;t, and how much uncertainty remains.&rdquo;
            <span className="block mt-1.5 not-italic text-white/30 text-xs">&mdash; Ocean Recoveries Lab, UC Santa Barbara</span>
          </blockquote>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/analysis"
              className="group inline-flex items-center gap-2.5 px-6 py-3.5 bg-teal-500 text-white font-sans font-semibold text-sm rounded-xl transition-all duration-300 hover:bg-teal-400 hover:shadow-[0_8px_24px_rgba(42,157,143,0.25)]"
            >
              <BarChart3 className="w-4 h-4" />
              Explore the Analysis
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#findings"
              className="inline-flex items-center gap-2 px-5 py-3.5 text-white/60 hover:text-white font-sans font-medium text-sm transition-colors"
            >
              Read the story first
              <ArrowDown className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-scroll-bounce" aria-hidden="true">
            <ArrowDown className="w-4 h-4 text-white/25" />
          </div>
        </div>
      </section>

      {/* Finding 1: Population decline */}
      <section id="findings" aria-label="Population decline finding" className="py-20 lg:py-28 bg-white relative">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                  <TrendingDown className="w-[18px] h-[18px] text-red-600" />
                </div>
                <span className="text-xs font-sans font-semibold text-slate-400 uppercase tracking-wider">Key Finding</span>
              </div>

              <h2 className="font-display text-[1.75rem] sm:text-[2.125rem] font-light text-ocean-900 leading-tight mb-5">
                The population is <span className="font-semibold text-red-700">declining ~1.4% per year</span>
              </h2>

              <p className="text-base text-slate-600 font-body leading-relaxed mb-5">
                Our population matrix model estimates a dominant eigenvalue (&lambda;) of <strong className="text-slate-800">0.986</strong>,
                indicating the population shrinks by about 1.4% annually under current conditions.
                The probability of decline is <strong className="text-slate-800">87.3%</strong> across bootstrap replicates — probable but not certain.
              </p>

              <div className="bg-amber-50 border border-amber-200/70 rounded-xl p-4 text-sm text-amber-800 font-body">
                <strong className="font-semibold">Caveat:</strong> The 95% CI for &lambda; is wide (0.819&ndash;1.020) and crosses 1.0, meaning the
                population could be growing or declining. While 87.3% of bootstrap replicates show decline, certainty
                is limited. The model is also heavily influenced by NOAA monitoring data (78% of observations).
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-8" style={{ boxShadow: '0 1px 3px rgba(10, 61, 98, 0.04), 0 4px 12px rgba(10, 61, 98, 0.06)' }}>
              <div className="text-center mb-6">
                <div className="text-[3.5rem] font-mono font-light text-ocean-900 leading-none">0.986</div>
                <div className="text-sm text-red-600 font-sans font-medium mt-2">&darr; Declining</div>
                <div className="text-sm text-slate-400 font-sans mt-1.5">Population growth rate (&lambda;)</div>
                <div className="text-xs text-slate-300 font-mono mt-1">95% CI: 0.819&ndash;1.020</div>
              </div>
              <div className="coral-divider my-6" />
              <div className="flex items-center justify-center gap-10 text-center">
                <div>
                  <div className="text-2xl font-mono font-medium text-red-600">87.3%</div>
                  <div className="text-xs text-slate-400 font-sans mt-0.5">P(decline)</div>
                </div>
                <div className="w-px h-10 bg-slate-100" />
                <div>
                  <div className="text-2xl font-mono font-medium text-ocean-900">~1.4%</div>
                  <div className="text-xs text-slate-400 font-sans mt-0.5">annual decline</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Finding 2: What matters most */}
      <section aria-label="Elasticity analysis finding" className="py-20 lg:py-28 bg-sand-100 relative">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div className="order-2 lg:order-1 bg-ocean-900 rounded-2xl p-8 text-white">
              <h3 className="text-xs font-sans font-semibold text-white/50 uppercase tracking-wider mb-6">Elasticity Breakdown</h3>
              <div className="space-y-4">
                {[
                  { label: 'Large adult survival', value: 54.8, color: '#3ea3d4' },
                  { label: 'Small adult survival', value: 11.6, color: '#7fc2e3' },
                  { label: 'Growth transitions', value: 14.7, color: '#2dd4b5' },
                  { label: 'Retrogression', value: 7.7, color: '#f4a261' },
                  { label: 'Other', value: 8.4, color: '#94a3b8' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-white/60 font-sans text-[0.8125rem]">{item.label}</span>
                      <span className="font-mono text-white/80 text-sm">{item.value}%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${item.value}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-ocean-50 flex items-center justify-center">
                  <Shield className="w-[18px] h-[18px] text-ocean-700" />
                </div>
                <span className="text-xs font-sans font-semibold text-slate-400 uppercase tracking-wider">Key Finding</span>
              </div>

              <h2 className="font-display text-[1.75rem] sm:text-[2.125rem] font-light text-ocean-900 leading-tight mb-5">
                <span className="font-semibold">Large adult survival</span> matters most
              </h2>

              <p className="text-base text-slate-600 font-body leading-relaxed mb-5">
                Elasticity analysis reveals that keeping large colonies alive accounts for
                <strong className="text-slate-800"> 54.8% of potential population improvement</strong>. This means
                disease management and physical protection of existing adults is 4&times; more impactful
                than any other single intervention.
              </p>

              <p className="text-sm text-slate-500 font-body leading-relaxed">
                Growth transitions (14.7%) and retrogression (7.7%) have lower leverage,
                meaning outplanting alone cannot offset adult mortality.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Finding 3: Restoration scenarios */}
      <section aria-label="Restoration scenarios" className="py-20 lg:py-28 bg-white relative">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
                <Lightbulb className="w-[18px] h-[18px] text-teal-700" />
              </div>
            </div>
            <h2 className="font-display text-[1.75rem] sm:text-[2.125rem] font-light text-ocean-900 leading-tight mb-4">
              What this means for <span className="font-semibold">restoration</span>
            </h2>
            <p className="text-base text-slate-500 font-body max-w-2xl mx-auto">
              Our scenario modeling shows that protecting adults alone could stabilize the population,
              while a combined approach needs only ~4% improvement per transition.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 mb-10">
            {[
              {
                scenario: 'Protect Adults',
                lambda: '1.036',
                direction: 'Growing',
                directionColor: 'text-teal-700',
                feasibility: 'Feasible',
                feasibilityColor: 'text-teal-700 bg-teal-50',
                description: 'Reduce adult mortality through disease management',
                improvementLabel: 'Needs just 5% better adult survival to stabilize',
              },
              {
                scenario: 'Full Restoration',
                lambda: '1.045',
                direction: 'Growing',
                directionColor: 'text-teal-700',
                feasibility: 'Feasible',
                feasibilityColor: 'text-teal-700 bg-teal-50',
                description: 'Combine all interventions at modest improvement levels',
                improvementLabel: 'Needs 4.3% improvement across all transitions',
              },
              {
                scenario: 'Outplanting Only',
                lambda: '0.968',
                direction: 'Declining',
                directionColor: 'text-red-600',
                feasibility: 'Difficult',
                feasibilityColor: 'text-red-700 bg-red-50',
                description: 'Increasing reproduction alone requires impractical gains',
                improvementLabel: 'Would need 84% more reproduction',
              },
            ].map((item) => (
              <div key={item.scenario} className="bg-white rounded-2xl border border-slate-100 p-6 transition-all duration-300 hover:shadow-[0_4px_12px_rgba(10,61,98,0.08),0_12px_28px_rgba(10,61,98,0.06)]" style={{ boxShadow: '0 1px 3px rgba(10, 61, 98, 0.04), 0 4px 12px rgba(10, 61, 98, 0.05)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-sans font-semibold text-ocean-900 text-sm">{item.scenario}</h3>
                  <span className={`text-[0.6875rem] font-sans font-medium px-2 py-0.5 rounded-full ${item.feasibilityColor}`}>
                    {item.feasibility}
                  </span>
                </div>
                <div className="mb-3">
                  <span className="text-[1.75rem] font-mono font-light text-ocean-900">&lambda; = {item.lambda}</span>
                  <span className={`block text-xs font-sans font-medium mt-1 ${item.directionColor}`}>{item.direction}</span>
                </div>
                <p className="text-sm text-slate-500 font-body mb-3">{item.description}</p>
                <div className="text-xs text-slate-400 font-sans">
                  {item.improvementLabel}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200/70 rounded-xl p-4 text-sm text-amber-800 font-body max-w-3xl mx-auto">
            <strong className="font-semibold">Important:</strong> These are model projections, not empirical measurements of restoration outcomes.
            Real-world effectiveness depends on local conditions, implementation quality, and factors not captured in the model.
          </div>
        </div>
      </section>

      {/* CTA */}
      <section aria-label="Explore the full analysis" className="py-20 lg:py-28 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a3d62 0%, #051b2c 100%)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-teal-500 rounded-full blur-[200px] opacity-[0.05]" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="font-display text-[1.75rem] sm:text-[2.125rem] font-light text-white mb-4">
            Ready to <span className="font-semibold text-teal-300">dig into the details</span>?
          </h2>
          <p className="text-base text-white/50 font-body mb-10 max-w-xl mx-auto">
            The full analysis page contains interactive visualizations, restoration planning tools,
            regional comparisons, and downloadable data &mdash; all in one place.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/analysis"
              className="group inline-flex items-center gap-2.5 px-7 py-3.5 bg-teal-500 text-white font-sans font-semibold text-sm rounded-xl transition-all duration-300 hover:bg-teal-400 hover:shadow-[0_8px_24px_rgba(42,157,143,0.3)]"
            >
              <BarChart3 className="w-4 h-4" />
              Full Analysis
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/methods"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 text-white/60 font-sans font-medium text-sm border border-white/15 rounded-xl hover:bg-white/5 hover:border-white/25 transition-all"
            >
              Methods & Data
            </Link>
          </div>
        </div>
      </section>
      </main>

      <Footer />
    </div>
  );
}
