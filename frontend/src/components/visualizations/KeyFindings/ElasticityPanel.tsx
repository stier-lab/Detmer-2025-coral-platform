/**
 * ElasticityPanel - Container component for elasticity analysis visualizations
 *
 * Combines:
 * - Tab toggle between Overview (treemap) and Full Matrix (heatmap) views
 * - Category summary bar showing total elasticities
 * - Lambda estimate with confidence interval
 * - Population projection chart
 * - Collapsible methodology explanation
 */

import { useState, memo } from 'react';
import { ChevronDown, ChevronUp, BarChart3, Grid3X3, Info, TrendingDown, TrendingUp, Minus, AlertTriangle, ExternalLink } from 'lucide-react';
import { ElasticityTreemap } from './ElasticityTreemap';
import { ElasticityMatrix } from './ElasticityMatrix';
import { useElasticitySummary, DEFAULT_ELASTICITY_SUMMARY } from '../../../hooks/useElasticityData';

interface ElasticityPanelProps {
  defaultView?: 'overview' | 'matrix';
  showMethodology?: boolean;
  compact?: boolean;
}

function ElasticityPanelComponent({
  defaultView = 'overview',
  showMethodology = true,
  compact = false,
}: ElasticityPanelProps) {
  const [activeView, setActiveView] = useState<'overview' | 'matrix'>(defaultView);
  const [methodologyExpanded, setMethodologyExpanded] = useState(false);

  // Fetch summary data
  const { data: summaryData } = useElasticitySummary();
  const summary = summaryData?.data ?? DEFAULT_ELASTICITY_SUMMARY.data;
  const summaryMeta = summaryData?.meta ?? DEFAULT_ELASTICITY_SUMMARY.meta;

  const lambda = summary.lambda;
  const elasticities = summary.elasticity;
  const insights = summary.insights;

  // Format lambda interpretation
  const lambdaColor = lambda.estimate < 1 ? 'text-red-600' : lambda.estimate > 1 ? 'text-green-600' : 'text-gray-600';
  const lambdaTrend = lambda.estimate < 1 ? 'declining' : lambda.estimate > 1 ? 'growing' : 'stable';

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Header with Lambda Summary */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-teal-50 border-b">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Population Elasticity Analysis</h3>
            <p className="text-sm text-gray-600">
              Which vital rates matter most for population growth?
            </p>
          </div>

          {/* Lambda estimate badge */}
          <div className="flex items-center gap-3">
            <div className="text-center px-4 py-2 bg-white rounded-lg shadow-sm border">
              <div className="text-xs text-gray-500 uppercase tracking-wide">λ (growth rate)</div>
              <div className={`text-2xl font-bold ${lambdaColor}`}>
                {lambda.estimate.toFixed(3)}
              </div>
              <div className="text-xs text-gray-500">
                95% CI: {lambda.ciLower.toFixed(3)}–{lambda.ciUpper.toFixed(3)}
              </div>
            </div>
            <div className="text-center px-3 py-2 bg-white rounded-lg shadow-sm border">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Trend</div>
              <div className={`flex items-center gap-1 ${lambdaColor}`}>
                {lambdaTrend === 'declining' ? <TrendingDown className="w-4 h-4" /> :
                 lambdaTrend === 'growing' ? <TrendingUp className="w-4 h-4" /> :
                 <Minus className="w-4 h-4" />}
                <span className="font-semibold capitalize">{lambdaTrend}</span>
              </div>
              <div className="text-xs text-gray-500">
                P(decline) = {lambda.pDecline}%
              </div>
            </div>
          </div>
        </div>

        {/* Category summary bar */}
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 rounded-full">
            <span className="font-medium text-blue-800">Stasis:</span>
            <span className="text-blue-700">{elasticities.stasis.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 rounded-full">
            <span className="font-medium text-green-800">Growth:</span>
            <span className="text-green-700">{elasticities.growth.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 rounded-full">
            <span className="font-medium text-amber-800">Fragmentation:</span>
            <span className="text-amber-700">{elasticities.fragmentation.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 rounded-full">
            <span className="font-medium text-red-800">Shrinkage:</span>
            <span className="text-red-700">{elasticities.shrinkage.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveView('overview')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${
            activeView === 'overview'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
          }`}
          aria-pressed={activeView === 'overview'}
        >
          <BarChart3 className="w-4 h-4" />
          Overview (Treemap)
        </button>
        <button
          onClick={() => setActiveView('matrix')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${
            activeView === 'matrix'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
          }`}
          aria-pressed={activeView === 'matrix'}
        >
          <Grid3X3 className="w-4 h-4" />
          Full Matrix (Heatmap)
        </button>
      </div>

      {/* Visualization content */}
      <div className="p-4">
        {activeView === 'overview' ? (
          <ElasticityTreemap height={compact ? 350 : 400} />
        ) : (
          <ElasticityMatrix height={compact ? 400 : 450} />
        )}
      </div>

      {/* Key insight */}
      <div className="mx-4 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <strong>Key finding:</strong> {insights.dominant} accounts for {insights.dominantPct}% of total elasticity.
          {' '}{insights.implication}
        </div>
      </div>

      {/* Methodology section (collapsible) */}
      {showMethodology && (
        <div className="border-t">
          <button
            onClick={() => setMethodologyExpanded(!methodologyExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            aria-expanded={methodologyExpanded}
          >
            <span className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              Understanding Elasticity Analysis
            </span>
            {methodologyExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {methodologyExpanded && (
            <div className="px-4 pb-4 text-sm text-gray-600 space-y-4">
              {/* What is elasticity */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">What is elasticity?</h4>
                <p>
                  Elasticity measures how sensitive the population growth rate (λ) is to proportional changes
                  in each vital rate. Unlike sensitivity, which measures absolute changes, elasticity is
                  dimensionless and allows fair comparison across different vital rates.
                </p>
              </div>

              {/* Lefkovitch matrix */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">The Lefkovitch Matrix Model</h4>
                <p>
                  We use a size-structured population matrix (Lefkovitch model) with 5 size classes.
                  Each cell represents the probability of transitioning from one size class to another
                  (or staying in the same class). The dominant eigenvalue of this matrix is λ.
                </p>
              </div>

              {/* How it's calculated */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">How elasticities are calculated</h4>
                <p className="mb-2">
                  Elasticity = (transition rate / λ) × sensitivity, where sensitivity is derived from
                  the stable stage distribution and reproductive value vectors. All elasticities sum to 100%.
                </p>
                <div className="bg-gray-50 p-3 rounded font-mono text-xs">
                  <div>e<sub>ij</sub> = (a<sub>ij</sub> / λ) × (∂λ / ∂a<sub>ij</sub>)</div>
                  <div className="text-gray-500 mt-1">where a<sub>ij</sub> is the transition rate from class j to class i</div>
                </div>
              </div>

              {/* Interpretation */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">What this means for restoration</h4>
                <p>
                  High elasticity values indicate transitions that, if improved, would have the greatest
                  proportional impact on population growth. For <em>A. palmata</em>, adult survival (SC5→SC5)
                  dominates, suggesting that protecting existing large colonies may be more effective than
                  outplanting many small fragments.
                </p>
              </div>

              {/* Caveats */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <h4 className="font-semibold text-amber-800 mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Important caveats
                </h4>
                <ul className="list-disc list-inside text-amber-700 space-y-1">
                  <li>Elasticities are model outputs based on averaged vital rates, not direct measurements</li>
                  <li>Assumes density-independent population dynamics (no carrying capacity)</li>
                  <li>Sample sizes vary considerably across transitions (see confidence indicators)</li>
                  <li>Results may not apply to all Caribbean populations due to local variation</li>
                </ul>
              </div>

              {/* Source */}
              <div className="text-xs text-gray-500 pt-2 border-t flex items-center justify-between">
                <span>
                  Source: {summaryMeta.source} | Method: {summaryMeta.method}
                </span>
                <a
                  href="/methods#elasticity"
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  Full methodology
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const ElasticityPanel = memo(ElasticityPanelComponent);
