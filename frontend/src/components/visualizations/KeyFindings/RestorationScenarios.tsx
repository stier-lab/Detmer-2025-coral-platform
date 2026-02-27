
import { useState, useEffect, useRef, useCallback, memo } from 'react';
import * as d3 from 'd3';
import {
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Target,
  TrendingUp,
  Shield,
  Leaf,
  Zap,
  Info,
} from 'lucide-react';
import { useScenarios, DEFAULT_SCENARIOS_DATA } from '../../../hooks/useScenarioData';
import type { ScenarioTransition, CombinedScenario, PathToStability } from '../../../types';


const CATEGORY_COLORS: Record<string, string> = {
  Survival: '#0369a1',
  Growth: '#15803d',
  Reproduction: '#b45309',
  Shrinkage: '#dc2626',
};

const FEASIBILITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  feasible: { bg: 'bg-green-100', text: 'text-green-800', label: 'Feasible' },
  moderate: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Moderate' },
  difficult: { bg: 'bg-red-100', text: 'text-red-800', label: 'Difficult' },
};

const SCENARIO_ICONS: Record<string, React.ReactNode> = {
  protect_adults: <Shield className="w-5 h-5" />,
  enhance_growth: <TrendingUp className="w-5 h-5" />,
  outplanting: <Leaf className="w-5 h-5" />,
  reduce_shrinkage: <AlertTriangle className="w-5 h-5" />,
  full_restoration: <Zap className="w-5 h-5" />,
};


function ImpactBarChart({
  data,
  targetDeltaLambda,
}: {
  data: ScenarioTransition[];
  targetDeltaLambda: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: ScenarioTransition | null;
  }>({ visible: false, x: 0, y: 0, content: null });

  // Responsive sizing
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      if (width > 0) {
        setDimensions({ width, height: Math.max(300, data.length * 44 + 80) });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [data.length]);

  // D3 rendering
  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const margin = { top: 30, right: 30, bottom: 40, left: 110 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Sort data by delta_lambda descending
    const sortedData = [...data].sort((a, b) => b.delta_lambda - a.delta_lambda).slice(0, 10);

    // Scales
    const xMax = Math.max(
      d3.max(sortedData, (d) => d.delta_lambda) || 0.02,
      targetDeltaLambda * 1.1
    );
    const xScale = d3.scaleLinear().domain([0, xMax]).range([0, innerWidth]);

    const yScale = d3
      .scaleBand<string>()
      .domain(sortedData.map((d) => `${d.from_short}\u2192${d.to_short}`))
      .range([0, innerHeight])
      .padding(0.25);

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(5)
          .tickFormat((d) => `+${d3.format('.3f')(d as number)}`)
      )
      .call((g) => g.select('.domain').attr('stroke', '#e5e7eb'))
      .call((g) => g.selectAll('.tick line').attr('stroke', '#e5e7eb'))
      .call((g) => g.selectAll('.tick text').attr('fill', '#6b7280').attr('font-size', '11px'));

    // X axis label
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 35)
      .attr('text-anchor', 'middle')
      .attr('fill', '#6b7280')
      .attr('font-size', '12px')
      .text('\u0394\u03BB (change in growth rate)');

    // Y axis labels
    g.selectAll('.y-label')
      .data(sortedData)
      .join('text')
      .attr('class', 'y-label')
      .attr('x', -8)
      .attr('y', (d) => (yScale(`${d.from_short}\u2192${d.to_short}`) || 0) + yScale.bandwidth() / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#374151')
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .text((d) => `${d.from_short}\u2192${d.to_short}`);

    // Bars with animation
    g.selectAll('.bar')
      .data(sortedData)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', 0)
      .attr('y', (d) => yScale(`${d.from_short}\u2192${d.to_short}`) || 0)
      .attr('height', yScale.bandwidth())
      .attr('rx', 4)
      .attr('fill', (d) => CATEGORY_COLORS[d.category] || '#6b7280')
      .attr('opacity', 0.85)
      .attr('width', 0)
      .transition()
      .duration(800)
      .delay((_, i) => i * 60)
      .ease(d3.easeCubicOut)
      .attr('width', (d) => xScale(d.delta_lambda));

    // Invisible hover rects for tooltip
    g.selectAll('.hover-rect')
      .data(sortedData)
      .join('rect')
      .attr('class', 'hover-rect')
      .attr('x', 0)
      .attr('y', (d) => yScale(`${d.from_short}\u2192${d.to_short}`) || 0)
      .attr('width', innerWidth)
      .attr('height', yScale.bandwidth())
      .attr('fill', 'transparent')
      .attr('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        const rect = (event.target as SVGRectElement).getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (containerRect) {
          setTooltip({
            visible: true,
            x: event.clientX - containerRect.left,
            y: rect.top - containerRect.top + yScale.bandwidth() / 2,
            content: d,
          });
        }
      })
      .on('mouseleave', () => {
        setTooltip({ visible: false, x: 0, y: 0, content: null });
      });

    // Target line (delta needed for lambda = 1.0)
    if (targetDeltaLambda > 0 && targetDeltaLambda <= xMax) {
      g.append('line')
        .attr('x1', xScale(targetDeltaLambda))
        .attr('x2', xScale(targetDeltaLambda))
        .attr('y1', -10)
        .attr('y2', innerHeight)
        .attr('stroke', '#dc2626')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '6,4')
        .attr('opacity', 0.7);

      g.append('text')
        .attr('x', xScale(targetDeltaLambda))
        .attr('y', -15)
        .attr('text-anchor', 'middle')
        .attr('fill', '#dc2626')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .text('\u03BB = 1.0 target');
    }

    // Value labels on bars
    g.selectAll('.value-label')
      .data(sortedData)
      .join('text')
      .attr('class', 'value-label')
      .attr('x', (d) => xScale(d.delta_lambda) + 6)
      .attr('y', (d) => (yScale(`${d.from_short}\u2192${d.to_short}`) || 0) + yScale.bandwidth() / 2)
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#6b7280')
      .attr('font-size', '11px')
      .attr('opacity', 0)
      .text((d) => `+${d.delta_lambda.toFixed(4)}`)
      .transition()
      .duration(400)
      .delay((_, i) => 800 + i * 60)
      .attr('opacity', 1);
  }, [data, dimensions, targetDeltaLambda]);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg ref={svgRef} className="w-full" />
      {tooltip.visible && tooltip.content && (
        <div
          className="absolute z-10 bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-xs pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 40 }}
        >
          <div className="text-sm font-semibold text-gray-900 mb-1">
            {tooltip.content.from_short} → {tooltip.content.to_short}
          </div>
          <div className="text-xs text-gray-600 mb-1">
            {tooltip.content.restoration_action}
          </div>
          <div className="flex gap-3 text-xs">
            <span className="text-gray-500">
              Elasticity: <strong>{tooltip.content.elasticity_pct.toFixed(1)}%</strong>
            </span>
            <span className="text-gray-500">
              {'\u0394\u03BB'}: <strong className="text-green-700">+{tooltip.content.delta_lambda.toFixed(4)}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function ScenarioCard({ scenario }: { scenario: CombinedScenario }) {
  const targetDelta = 1.0 - scenario.baseline_lambda;
  const progressPct = Math.min(100, (scenario.delta_lambda / targetDelta) * 100);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              scenario.achieves_stability
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {SCENARIO_ICONS[scenario.scenario_id] || <Target className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{scenario.scenario_name}</h4>
            <p className="text-xs text-gray-500">{scenario.description}</p>
          </div>
        </div>
        {scenario.achieves_stability && (
          <span className="flex-shrink-0 px-2.5 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
            Stable
          </span>
        )}
      </div>

      {/* Lambda result */}
      <div className="flex items-center gap-4 mb-3">
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">New {'\u03BB'}</div>
          <div
            className={`text-xl font-bold ${
              scenario.new_lambda >= 1.0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {scenario.new_lambda.toFixed(3)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">{'\u0394\u03BB'}</div>
          <div className="text-lg font-semibold text-gray-700">
            +{scenario.delta_lambda.toFixed(3)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Change</div>
          <div className="text-lg font-semibold text-gray-700">
            +{scenario.pct_lambda_change.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Progress bar toward stability */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progress toward {'\u03BB'} = 1.0</span>
          <span>{progressPct.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              scenario.achieves_stability ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(100, progressPct)}%` }}
          />
        </div>
      </div>

      {/* Transitions affected */}
      <div className="flex flex-wrap gap-1.5">
        {scenario.transitions_affected.map((t) => (
          <span
            key={t}
            className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md font-mono"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function PathToStabilityTable({ paths }: { paths: PathToStability[] }) {
  const sortedPaths = [...paths].sort((a, b) => a.improvement_needed_pct - b.improvement_needed_pct);
  const bestPath = sortedPaths[0];

  return (
    <div>
      {/* Key insight callout */}
      {bestPath && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-900">
                Key Insight: {bestPath.scenario_name} requires only ~{bestPath.improvement_needed_pct.toFixed(1)}% improvement to stabilize the population
              </p>
              <p className="text-xs text-green-700 mt-1">{bestPath.note}</p>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 text-gray-600 font-medium">Scenario</th>
              <th className="text-center py-2 px-3 text-gray-600 font-medium">Improvement Needed</th>
              <th className="text-center py-2 px-3 text-gray-600 font-medium">Feasibility</th>
              <th className="text-left py-2 px-3 text-gray-600 font-medium hidden md:table-cell">Note</th>
            </tr>
          </thead>
          <tbody>
            {sortedPaths.map((path) => {
              const feasibility = FEASIBILITY_COLORS[path.feasibility] || FEASIBILITY_COLORS.moderate;
              return (
                <tr key={path.scenario_id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2.5 px-3 font-medium text-gray-900">{path.scenario_name}</td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            path.feasibility === 'feasible'
                              ? 'bg-green-500'
                              : path.feasibility === 'moderate'
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(100, path.improvement_needed_pct)}%` }}
                        />
                      </div>
                      <span className="text-gray-700 font-mono text-xs">
                        {path.improvement_needed_pct.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${feasibility.bg} ${feasibility.text}`}
                    >
                      {feasibility.label}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-gray-600 text-xs hidden md:table-cell">
                    {path.note}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CaveatsPanel() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-6 border border-amber-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 hover:bg-amber-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-medium text-amber-900">Model Assumptions & Caveats</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-amber-600" />
        ) : (
          <ChevronDown className="w-4 h-4 text-amber-600" />
        )}
      </button>
      {expanded && (
        <div className="px-4 py-3 bg-white border-t border-amber-200">
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">*</span>
              <span>
                <strong>Density-independent model:</strong> These projections assume no density
                dependence. Real populations may saturate or face increased competition at higher
                densities.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">*</span>
              <span>
                <strong>Proportional perturbation:</strong> Improvements are applied as proportional
                increases (e.g., 10% of the current transition probability), not absolute changes.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">*</span>
              <span>
                <strong>Feasibility not assessed:</strong> These are mathematical possibilities, not
                practical recommendations. Achieving even a 10% improvement in adult survival may
                require substantial management effort.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">*</span>
              <span>
                <strong>Non-linear interactions:</strong> Combined improvements may interact
                non-linearly. The additive approximation used here may over- or under-estimate true
                combined effects.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">*</span>
              <span>
                <strong>No environmental stochasticity:</strong> Year-to-year variation in hurricane
                frequency, disease outbreaks, or bleaching events is not captured in this
                deterministic model.
              </span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}


function RestorationScenariosComponent() {
  const [improvementPct, setImprovementPct] = useState(10);
  const [debouncedPct, setDebouncedPct] = useState(10);

  // Debounce slider changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPct(improvementPct);
    }, 300);
    return () => clearTimeout(timer);
  }, [improvementPct]);

  const { data: apiData, isLoading, isError } = useScenarios(debouncedPct);

  // Use API data or fallback
  const scenarioData = apiData ?? DEFAULT_SCENARIOS_DATA;
  const { individual, combined, path_to_stability } = scenarioData.data;
  const meta = scenarioData.meta;

  // Calculate target delta lambda needed
  const targetDeltaLambda = meta.target_lambda - meta.baseline_lambda;

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setImprovementPct(Number(e.target.value));
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="p-4 md:p-6 bg-gradient-to-r from-blue-50 to-teal-50 border-b">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Restoration Scenario Explorer</h3>
            <p className="text-sm text-gray-600">
              How much improvement in vital rates is needed to stabilize the population?
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center px-4 py-2 bg-white rounded-lg shadow-sm border">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Current {'\u03BB'}</div>
              <div className="text-2xl font-bold text-red-600">
                {meta.baseline_lambda.toFixed(3)}
              </div>
              <div className="text-xs text-gray-500">Declining ~1.4%/yr</div>
            </div>
            <div className="text-center px-4 py-2 bg-white rounded-lg shadow-sm border">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Target {'\u03BB'}</div>
              <div className="text-2xl font-bold text-green-600">1.000</div>
              <div className="text-xs text-gray-500">Stable</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-8">
        {/* Improvement Slider */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <label
              htmlFor="improvement-slider"
              className="text-sm font-medium text-gray-700 flex items-center gap-2"
            >
              <Info className="w-4 h-4 text-gray-400" />
              Proportional improvement in transition probabilities
            </label>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-ocean-deep">{improvementPct}%</span>
              {isLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
            </div>
          </div>
          <input
            id="improvement-slider"
            type="range"
            min="1"
            max="50"
            value={improvementPct}
            onChange={handleSliderChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-ocean-deep"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>1%</span>
            <span>10%</span>
            <span>25%</span>
            <span>50%</span>
          </div>
        </div>

        {/* Error banner */}
        {isError && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Live data is unavailable. Showing pre-computed estimates based on the published transition matrix.</span>
          </div>
        )}

        {/* Section A: Individual Transition Impacts */}
        <div>
          <h4 className="text-base font-semibold text-gray-800 mb-1">
            Individual Transition Impacts
          </h4>
          <p className="text-sm text-gray-600 mb-3">
            Effect of a {improvementPct}% proportional improvement in each transition on {'\u03BB'}. Dashed line shows the improvement needed to reach stability.
          </p>

          {/* Category legend */}
          <div className="flex flex-wrap gap-3 mb-3">
            {Object.entries(CATEGORY_COLORS).map(([category, color]) => (
              <div key={category} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                <span className="text-xs text-gray-600">{category}</span>
              </div>
            ))}
          </div>

          <ImpactBarChart data={individual} targetDeltaLambda={targetDeltaLambda} />
        </div>

        {/* Section B: Combined Scenarios */}
        <div>
          <h4 className="text-base font-semibold text-gray-800 mb-1">Combined Scenarios</h4>
          <p className="text-sm text-gray-600 mb-4">
            What happens when multiple transitions are improved simultaneously by {improvementPct}%?
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {combined.map((scenario) => (
              <ScenarioCard key={scenario.scenario_id} scenario={scenario} />
            ))}
          </div>
        </div>

        {/* Section C: Path to Stability */}
        <div>
          <h4 className="text-base font-semibold text-gray-800 mb-1">Path to Stability</h4>
          <p className="text-sm text-gray-600 mb-4">
            What percentage improvement does each strategy need to reach {'\u03BB'} = 1.0?
          </p>
          <PathToStabilityTable paths={path_to_stability} />
        </div>

        {/* Section D: Caveats */}
        <CaveatsPanel />
      </div>
    </div>
  );
}

export const RestorationScenarios = memo(RestorationScenariosComponent);
