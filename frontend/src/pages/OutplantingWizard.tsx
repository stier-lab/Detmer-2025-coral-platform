
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Target,
  ChevronRight,
  ChevronLeft,
  Heart,
  TrendingUp,
  Scale,
  MapPin,
  Users,
  AlertTriangle,
  Check,
  Info,
  ArrowRight,
  RotateCcw,
  RefreshCw
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { UncertaintyBanner } from '../components/common/UncertaintyBanner';
import { growthApi, qualityApi, survivalApi, ApiError, NetworkError } from '../utils/api';
import type { GrowthBySize, QualityMetrics, SurvivalBySize } from '../types';
import { trackEvent } from '../utils/analytics';

type Goal = 'survival' | 'growth' | 'balance';
type SizeClass = 'SC1' | 'SC2' | 'SC3' | 'SC4' | 'SC5';
type Region = 'florida' | 'usvi' | 'curacao' | 'puerto_rico' | 'other';
type PopulationType = 'natural' | 'fragment';

interface WizardState {
  step: number;
  goal: Goal | null;
  sizeClass: SizeClass | null;
  region: Region | null;
  populationType: PopulationType | null;
}

const SIZE_CLASS_RANGE: Record<SizeClass, { min: number; max: number; label: string }> = {
  SC1: { min: 0, max: 25, label: '0-25 cm²' },
  SC2: { min: 25, max: 100, label: '25-100 cm²' },
  SC3: { min: 100, max: 500, label: '100-500 cm²' },
  SC4: { min: 500, max: 2000, label: '500-2,000 cm²' },
  SC5: { min: 2000, max: 10000, label: '>2,000 cm²' },
};

const REGION_CONFIDENCE: Record<Region, { label: string; color: string }> = {
  florida: { label: 'High confidence', color: 'emerald' },
  curacao: { label: 'Medium confidence', color: 'amber' },
  usvi: { label: 'Medium confidence', color: 'amber' },
  puerto_rico: { label: 'Medium confidence', color: 'amber' },
  other: { label: 'Low confidence', color: 'rose' }
};

function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const stepLabels = ['Goal', 'Size', 'Region', 'Type', 'Results'];
  return (
    <nav aria-label={`Wizard progress: step ${currentStep + 1} of ${totalSteps}`} className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div
          key={i}
          role="presentation"
          aria-label={`Step ${i + 1}: ${stepLabels[i] || ''} - ${i < currentStep ? 'completed' : i === currentStep ? 'current' : 'upcoming'}`}
          className={`w-3 h-3 rounded-full transition-colors ${
            i < currentStep
              ? 'bg-bioluminescent'
              : i === currentStep
              ? 'bg-bioluminescent/50 ring-2 ring-bioluminescent/30'
              : 'bg-white/20'
          }`}
        />
      ))}
    </nav>
  );
}

function OptionButton({
  selected,
  onClick,
  icon: Icon,
  title,
  description
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full p-4 rounded-xl border-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-bioluminescent/50 ${
        selected
          ? 'border-bioluminescent bg-bioluminescent/10'
          : 'border-white/20 hover:border-white/40 bg-white/5'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${selected ? 'bg-bioluminescent/20' : 'bg-white/10'}`}>
          <Icon className={`w-5 h-5 ${selected ? 'text-bioluminescent' : 'text-white/60'}`} />
        </div>
        <div>
          <h4 className={`font-semibold mb-1 ${selected ? 'text-bioluminescent' : 'text-white'}`}>
            {title}
          </h4>
          <p className="text-sm text-white/60">{description}</p>
        </div>
        {selected && (
          <Check className="w-5 h-5 text-bioluminescent ml-auto flex-shrink-0" />
        )}
      </div>
    </button>
  );
}

const extractSizeKey = (label: string): SizeClass | null => {
  const match = label.match(/SC[1-5]/i);
  return match ? (match[0].toUpperCase() as SizeClass) : null;
};

const mapSurvival = (rows: SurvivalBySize[]) => {
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

const mapGrowth = (rows: GrowthBySize[]) => {
  const mapped: Record<SizeClass, { mean: number; n: number }> = {
    SC1: { mean: 0, n: 0 },
    SC2: { mean: 0, n: 0 },
    SC3: { mean: 0, n: 0 },
    SC4: { mean: 0, n: 0 },
    SC5: { mean: 0, n: 0 },
  };

  rows.forEach((row) => {
    const key = extractSizeKey(row.size_class);
    if (!key) return;
    mapped[key] = {
      mean: row.mean_growth,
      n: row.n,
    };
  });

  return mapped;
};

const estimateYearsToAdult = (sizeClass: SizeClass, meanGrowth: number) => {
  const range = SIZE_CLASS_RANGE[sizeClass];
  const midpoint = (range.min + Math.min(range.max, 2000)) / 2;
  if (!meanGrowth || meanGrowth <= 0) {
    return { median: '—', range: '—' };
  }
  const years = Math.max(0, (2000 - midpoint) / meanGrowth);
  const low = Math.max(0, years * 0.8);
  const high = years * 1.2;
  return {
    median: years.toFixed(1),
    range: `${low.toFixed(1)}-${high.toFixed(1)}`,
  };
};

export function OutplantingWizard() {
  const [state, setState] = useState<WizardState>({
    step: 0,
    goal: null,
    sizeClass: null,
    region: null,
    populationType: null
  });
  const [survivalData, setSurvivalData] = useState<Record<SizeClass, { rate: number; ci: [number, number]; n: number }> | null>(null);
  const [growthData, setGrowthData] = useState<Record<SizeClass, { mean: number; n: number }> | null>(null);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; isNetwork: boolean } | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const totalSteps = 5; // 4 input steps + 1 results step

  const loadData = useCallback(async (populationType: PopulationType | null) => {
    // Default to fragment data for initial load, update when user selects
    const fragmentParam = populationType === 'fragment' ? 'Y'
      : populationType === 'natural' ? 'N'
      : 'Y'; // Default to fragment data instead of 'all'

    setLoading(true);
    setError(null);

    try {
      const [survivalRows, growthRows, metrics] = await Promise.all([
        survivalApi.getBySize({ fragment: fragmentParam }),
        growthApi.getBySize({ fragment: fragmentParam }),
        qualityApi.getMetrics({ fragment: fragmentParam }),
      ]);

      setSurvivalData(mapSurvival(survivalRows));
      setGrowthData(mapGrowth(growthRows));
      setQualityMetrics(metrics);
      setError(null);
    } catch (err) {
      console.error('Failed to load wizard data:', err);
      setSurvivalData(null);
      setGrowthData(null);
      setQualityMetrics(null);

      // Determine error type for user-friendly message
      const isNetwork = err instanceof NetworkError ||
        (err instanceof ApiError && err.statusCode === 0);

      setError({
        message: isNetwork
          ? 'Cannot connect to the API server. Make sure the backend is running.'
          : err instanceof ApiError
            ? err.userMessage
            : 'Failed to load data. Please try again.',
        isNetwork
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(state.populationType);
  }, [state.populationType, retryCount, loadData]);

  const handleRetry = () => {
    setRetryCount(c => c + 1);
  };

  const canProceed = () => {
    switch (state.step) {
      case 0: return state.goal !== null;
      case 1: return state.sizeClass !== null;
      case 2: return state.region !== null;
      case 3: return state.populationType !== null;
      default: return true;
    }
  };

  const nextStep = () => {
    if (canProceed() && state.step < totalSteps - 1) {
      setState({ ...state, step: state.step + 1 });
    }
  };

  const prevStep = () => {
    if (state.step > 0) {
      setState({ ...state, step: state.step - 1 });
    }
  };

  const reset = () => {
    setState({
      step: 0,
      goal: null,
      sizeClass: null,
      region: null,
      populationType: null
    });
  };

  // Calculate results
  const getResults = () => {
    if (!state.sizeClass || !state.populationType || !survivalData || !growthData) return null;

    const baseData = survivalData[state.sizeClass];
    const growthInfo = growthData[state.sizeClass];
    const yearsEstimate = estimateYearsToAdult(state.sizeClass, growthInfo.mean);

    return {
      survivalRate: Math.round(baseData.rate),
      survivalCi: baseData.ci.map(v => Math.round(v)) as [number, number],
      sampleSize: baseData.n,
      yearsToAdult: yearsEstimate,
      meanGrowth: growthInfo.mean,
      growthSample: growthInfo.n,
    };
  };

  const results = getResults();

  // Extract primitive value to avoid infinite loop from object reference changing every render
  const survivalRate = results?.survivalRate ?? null;
  useEffect(() => {
    if (state.step === 4 && survivalRate !== null) {
      trackEvent('outplanting_result', {
        sizeClass: state.sizeClass,
        region: state.region,
        populationType: state.populationType,
        survivalRate,
      });
    }
  }, [state.step, survivalRate, state.sizeClass, state.region, state.populationType]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-ocean-abyss via-ocean-deep to-ocean-abyss">
      <Header />

      <main id="main-content" className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-full text-amber-300 text-sm mb-4">
              <Target className="w-4 h-4" />
              <span>Outplanting Decision Wizard</span>
            </div>
            <h1 className="text-3xl font-display font-bold text-white">
              What size should I outplant?
            </h1>
          </div>

          <StepIndicator currentStep={state.step} totalSteps={totalSteps} />

          {/* Step content */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
            <UncertaintyBanner metrics={qualityMetrics} loading={loading} compact />

            {/* Error state with retry button */}
            {!loading && error && (
              <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-900/20 p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-amber-200 font-semibold text-sm mb-1">
                      {error.isNetwork ? 'Connection Error' : 'Data Load Error'}
                    </h4>
                    <p className="text-amber-100/80 text-sm mb-3">
                      {error.message}
                    </p>
                    {error.isNetwork && (
                      <p className="text-amber-100/60 text-xs mb-3">
                        Run <code className="bg-amber-900/40 px-1.5 py-0.5 rounded">cd web-platform/backend && Rscript run.R</code> to start the server.
                      </p>
                    )}
                    <button
                      onClick={handleRetry}
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-amber-200 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Legacy fallback message if data is simply missing without explicit error */}
            {!loading && !error && (!survivalData || !growthData) && (
              <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-900/20 p-4 text-amber-100 text-sm">
                No data available for this selection. Try a different population type.
              </div>
            )}

            {/* Step 0: Goal */}
            {state.step === 0 && (
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  What's your primary goal?
                </h2>
                <p className="text-white/60 text-sm mb-6">
                  This helps us weight the tradeoffs in our recommendation.
                </p>
                <div className="space-y-3">
                  <OptionButton
                    selected={state.goal === 'survival'}
                    onClick={() => setState({ ...state, goal: 'survival' })}
                    icon={Heart}
                    title="Maximize survival"
                    description="I want as many corals as possible to survive the first year"
                  />
                  <OptionButton
                    selected={state.goal === 'growth'}
                    onClick={() => setState({ ...state, goal: 'growth' })}
                    icon={TrendingUp}
                    title="Fastest growth"
                    description="I want corals to reach reproductive size quickly"
                  />
                  <OptionButton
                    selected={state.goal === 'balance'}
                    onClick={() => setState({ ...state, goal: 'balance' })}
                    icon={Scale}
                    title="Balance both"
                    description="I want a good tradeoff between survival and growth"
                  />
                </div>
              </div>
            )}

            {/* Step 1: Size class */}
            {state.step === 1 && (
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  What size are your fragments?
                </h2>
                <p className="text-white/60 text-sm mb-6">
                  Select the size class that best matches your typical fragment size.
                </p>
                <div className="space-y-3">
                  <OptionButton
                    selected={state.sizeClass === 'SC1'}
                    onClick={() => setState({ ...state, sizeClass: 'SC1' })}
                    icon={Target}
                    title="Very Small (SC1): 0-25 cm²"
                    description="Smaller than palm size. Not recommended - high mortality risk."
                  />
                  <OptionButton
                    selected={state.sizeClass === 'SC2'}
                    onClick={() => setState({ ...state, sizeClass: 'SC2' })}
                    icon={Target}
                    title="Small (SC2): 25-100 cm²"
                    description="About the size of your palm. Typical nursery fragments."
                  />
                  <OptionButton
                    selected={state.sizeClass === 'SC3'}
                    onClick={() => setState({ ...state, sizeClass: 'SC3' })}
                    icon={Target}
                    title="Medium (SC3): 100-500 cm²"
                    description="About the size of a dinner plate. Larger nursery colonies."
                  />
                  <OptionButton
                    selected={state.sizeClass === 'SC4'}
                    onClick={() => setState({ ...state, sizeClass: 'SC4' })}
                    icon={Target}
                    title="Large (SC4): 500-2,000 cm²"
                    description="Larger than a dinner plate. Mature nursery colonies."
                  />
                  <OptionButton
                    selected={state.sizeClass === 'SC5'}
                    onClick={() => setState({ ...state, sizeClass: 'SC5' })}
                    icon={Target}
                    title="Very Large (SC5): &gt;2,000 cm²"
                    description="Very large colonies. Rare in restoration. Highest survival."
                  />
                </div>
              </div>
            )}

            {/* Step 2: Region */}
            {state.step === 2 && (
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  Where are you planting?
                </h2>
                <p className="text-white/60 text-sm mb-6">
                  Regional differences affect our confidence in the estimates.
                </p>
                <div className="space-y-3">
                  <OptionButton
                    selected={state.region === 'florida'}
                    onClick={() => setState({ ...state, region: 'florida' })}
                    icon={MapPin}
                    title="Florida Keys"
                    description="Most data available (78%). High confidence estimates."
                  />
                  <OptionButton
                    selected={state.region === 'curacao'}
                    onClick={() => setState({ ...state, region: 'curacao' })}
                    icon={MapPin}
                    title="Curaçao"
                    description="Good data coverage. Moderate confidence."
                  />
                  <OptionButton
                    selected={state.region === 'usvi'}
                    onClick={() => setState({ ...state, region: 'usvi' })}
                    icon={MapPin}
                    title="US Virgin Islands"
                    description="Limited data. Lower confidence."
                  />
                  <OptionButton
                    selected={state.region === 'puerto_rico'}
                    onClick={() => setState({ ...state, region: 'puerto_rico' })}
                    icon={MapPin}
                    title="Puerto Rico"
                    description="Moderate data coverage. Medium confidence."
                  />
                  <OptionButton
                    selected={state.region === 'other'}
                    onClick={() => setState({ ...state, region: 'other' })}
                    icon={MapPin}
                    title="Other Caribbean region"
                    description="Very limited data. Estimates may not apply."
                  />
                </div>
              </div>
            )}

            {/* Step 3: Population type */}
            {state.step === 3 && (
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  Natural colonies or nursery fragments?
                </h2>
                <p className="text-white/60 text-sm mb-6">
                  Fragments typically show lower survival than natural colonies.
                </p>
                <div className="space-y-3">
                  <OptionButton
                    selected={state.populationType === 'natural'}
                    onClick={() => setState({ ...state, populationType: 'natural' })}
                    icon={Users}
                    title="Natural colonies"
                    description="Wild colonies of opportunity (rare for restoration)"
                  />
                  <OptionButton
                    selected={state.populationType === 'fragment'}
                    onClick={() => setState({ ...state, populationType: 'fragment' })}
                    icon={Users}
                    title="Nursery-raised fragments"
                    description="Fragments grown in a nursery setting (typical for restoration)"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Results */}
            {state.step === 4 && results && (
              <div>
                <h2 className="text-xl font-semibold text-white mb-6">
                  Your Personalized Estimate
                </h2>

                {/* Main result */}
                <div className="bg-gradient-to-r from-bioluminescent/20 to-reef-green/20 rounded-xl p-6 mb-6 border border-bioluminescent/30">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-bioluminescent mb-2">
                      {results.survivalRate}%
                    </div>
                    <div className="text-white/70 text-sm">
                      Expected first-year survival
                    </div>
                    <div className="text-white/50 text-xs mt-1">
                      95% CI: {results.survivalCi[0]}-{results.survivalCi[1]}%
                      {results.sampleSize ? ` (n=${results.sampleSize})` : ''}
                    </div>
                    {state.region && (
                      <div className="mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs bg-white/10 text-white/70">
                        Region confidence: {REGION_CONFIDENCE[state.region].label}
                      </div>
                    )}
                  </div>
                </div>

                {/* Secondary metrics */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/5 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-white">{results.yearsToAdult.median}</div>
                    <div className="text-white/60 text-sm">
                      Years to reproductive size
                      <div className="text-white/40 text-xs">Range: {results.yearsToAdult.range}</div>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-white">
                      {results.meanGrowth ? results.meanGrowth.toFixed(1) : '—'}
                    </div>
                    <div className="text-white/60 text-sm">
                      Mean growth (cm²/yr)
                      {results.growthSample ? (
                        <div className="text-white/40 text-xs">n={results.growthSample}</div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Caveats */}
                <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-amber-200 font-semibold text-sm mb-2">Important caveats</h4>
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
                            <li>- Your specific site conditions may differ</li>
                            <li>- Estimates exclude disease/bleaching events</li>
                          </>
                        )}
                        {results.sampleSize < 30 && (
                          <li>- Low sample size for this size class (n&lt;30)</li>
                        )}
                        {state.region === 'other' && (
                          <li>- Limited data for your region - use with caution</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Links to evidence */}
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <Info className="w-4 h-4" />
                  <span>See the</span>
                  <Link to="/analysis#evidence" className="text-bioluminescent hover:underline">
                    full evidence base
                  </Link>
                  <span>for methodology and detailed analysis.</span>
                </div>
              </div>
            )}

            {state.step === 4 && !results && (
              <div className="text-white/70 text-sm">
                No estimates available for this selection. Verify the API is running and try again.
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
              {state.step > 0 ? (
                <button
                  onClick={prevStep}
                  className="flex items-center gap-2 px-4 py-2 text-white/70 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-bioluminescent/50 rounded-lg"
                  aria-label="Go to previous step"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                  Back
                </button>
              ) : (
                <div />
              )}

              {state.step < 4 ? (
                <button
                  onClick={nextStep}
                  disabled={!canProceed()}
                  aria-label={canProceed() ? 'Continue to next step' : 'Select an option to continue'}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-bioluminescent/50 ${
                    canProceed()
                      ? 'bg-bioluminescent text-ocean-abyss hover:bg-bioluminescent/90'
                      : 'bg-white/10 text-white/30 cursor-not-allowed'
                  }`}
                >
                  Continue
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              ) : (
                <button
                  onClick={reset}
                  className="flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-bioluminescent/50"
                  aria-label="Start the wizard over from the beginning"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  Start over
                </button>
              )}
            </div>
          </div>

          {/* Additional tools */}
          {state.step === 4 && (
            <div className="mt-8 grid grid-cols-2 gap-4">
              <Link
                to="/answers/survival"
                className="group flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all"
              >
                <Heart className="w-5 h-5 text-rose-400" />
                <div>
                  <div className="text-white font-medium text-sm group-hover:text-bioluminescent transition-colors">
                    Survival Deep-Dive
                  </div>
                  <div className="text-white/50 text-xs">Explore more parameters</div>
                </div>
                <ArrowRight className="w-4 h-4 text-white/40 ml-auto" />
              </Link>

              <Link
                to="/answers/growth"
                className="group flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all"
              >
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="text-white font-medium text-sm group-hover:text-bioluminescent transition-colors">
                    Growth Projector
                  </div>
                  <div className="text-white/50 text-xs">Project trajectories</div>
                </div>
                <ArrowRight className="w-4 h-4 text-white/40 ml-auto" />
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
