/**
 * HeterogeneityPanel - Prominent display of study heterogeneity (I² = 97.8%)
 *
 * Displays Finding #6: Cannot pool studies due to extreme heterogeneity
 * - Large I² gauge visualization
 * - "Cannot Pool Studies" prominent warning
 * - Mini forest plot showing study-level estimates
 * - Clear explanation of implications
 */

import { useEffect, useRef, useState, memo } from 'react';
import * as d3 from 'd3';
import { AlertOctagon, XCircle, ChevronDown, ChevronUp, Info } from 'lucide-react';
// clsx available but not currently used

interface StudyEstimate {
  study: string;
  survival: number;
  ciLower: number;
  ciUpper: number;
  n: number;
  weight: number;
}

interface HeterogeneityPanelProps {
  iSquared?: number;
  qStatistic?: number;
  qPValue?: string;
  tau?: number;
  pooledSurvival?: number;
  pooledCiLower?: number;
  pooledCiUpper?: number;
  studyEstimates?: StudyEstimate[];
  height?: number;
}

const DEFAULT_STUDIES: StudyEstimate[] = [
  { study: 'NOAA NCRMP', survival: 0.86, ciLower: 0.84, ciUpper: 0.88, n: 4072, weight: 0.78 },
  { study: 'Pausch et al.', survival: 0.68, ciLower: 0.62, ciUpper: 0.74, n: 856, weight: 0.12 },
  { study: 'Navassa Survey', survival: 0.92, ciLower: 0.85, ciUpper: 0.97, n: 102, weight: 0.03 },
  { study: 'USGS USVI', survival: 0.65, ciLower: 0.50, ciUpper: 0.78, n: 46, weight: 0.02 },
  { study: 'Fundemar', survival: 0.86, ciLower: 0.73, ciUpper: 0.95, n: 44, weight: 0.02 },
  { study: 'Mendoza-Quiroz', survival: 1.00, ciLower: 0.93, ciUpper: 1.00, n: 52, weight: 0.03 },
];

const COLORS = {
  danger: '#dc2626',
  dangerLight: '#fef2f2',
  dangerBorder: '#fecaca',
  warning: '#f59e0b',
  text: '#1e3a5f',
  textSecondary: '#64748b',
  pooled: '#6366f1',
  study: '#0a3d62',
  grid: '#e5e7eb',
};

function HeterogeneityPanelComponent({
  iSquared = 97.8,
  qStatistic = 407.43,
  qPValue = '< 0.0001',
  // tau is accepted as a prop but not currently displayed
  tau: _tau = 0.718, // eslint-disable-line @typescript-eslint/no-unused-vars
  pooledSurvival = 0.769,
  pooledCiLower = 0.569,
  pooledCiUpper = 0.894,
  studyEstimates = DEFAULT_STUDIES,
  height = 280,
}: HeterogeneityPanelProps) {
  const gaugeRef = useRef<SVGSVGElement>(null);
  const forestRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 600, height });

  // Responsive sizing
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      if (width > 0) setDimensions({ width, height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [height]);

  // I² Gauge
  useEffect(() => {
    if (!gaugeRef.current) return;

    const svg = d3.select(gaugeRef.current);
    svg.selectAll('*').remove();

    const size = 160;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = 60;
    const thickness = 12;

    const g = svg.append('g').attr('transform', `translate(${centerX},${centerY})`);

    // Background arc
    const arc = d3
      .arc()
      .innerRadius(radius - thickness)
      .outerRadius(radius)
      .startAngle(-Math.PI * 0.75)
      .endAngle(Math.PI * 0.75);

    g.append('path')
      .attr('d', arc as unknown as string)
      .attr('fill', '#e5e7eb');

    // Gradient for filled arc
    const gradient = svg
      .append('defs')
      .append('linearGradient')
      .attr('id', 'i2-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');

    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#f59e0b');
    gradient.append('stop').attr('offset', '50%').attr('stop-color', '#ef4444');
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#dc2626');

    // Filled arc (animated)
    const filledArc = d3
      .arc()
      .innerRadius(radius - thickness)
      .outerRadius(radius)
      .startAngle(-Math.PI * 0.75)
      .endAngle(-Math.PI * 0.75 + (Math.PI * 1.5 * iSquared) / 100);

    g.append('path')
      .attr('d', filledArc as unknown as string)
      .attr('fill', 'url(#i2-gradient)')
      .attr('opacity', 0)
      .transition()
      .duration(1000)
      .attr('opacity', 1);

    // Center text
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.1em')
      .attr('font-size', '28px')
      .attr('font-weight', 'bold')
      .attr('fill', COLORS.danger)
      .text(`${iSquared.toFixed(1)}%`);

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.5em')
      .attr('font-size', '12px')
      .attr('fill', COLORS.textSecondary)
      .text('I² Heterogeneity');

    // Threshold markers
    const thresholds = [
      { value: 25, label: 'Low' },
      { value: 50, label: 'Moderate' },
      { value: 75, label: 'High' },
    ];

    thresholds.forEach((t) => {
      const angle = -Math.PI * 0.75 + (Math.PI * 1.5 * t.value) / 100;
      g.append('line')
        .attr('x1', Math.cos(angle) * (radius - thickness - 2))
        .attr('y1', Math.sin(angle) * (radius - thickness - 2))
        .attr('x2', Math.cos(angle) * (radius + 2))
        .attr('y2', Math.sin(angle) * (radius + 2))
        .attr('stroke', '#9ca3af')
        .attr('stroke-width', 1);
    });
  }, [iSquared]);

  // Mini Forest Plot
  useEffect(() => {
    if (!forestRef.current || studyEstimates.length === 0) return;

    const svg = d3.select(forestRef.current);
    svg.selectAll('*').remove();

    const width = Math.min(dimensions.width - 200, 400);
    const margin = { top: 20, right: 20, bottom: 30, left: 100 };
    const chartWidth = width - margin.left - margin.right;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // X scale (survival)
    const xScale = d3.scaleLinear().domain([0.4, 1.05]).range([0, chartWidth]);

    // Y scale (studies)
    const yScale = d3
      .scaleBand()
      .domain(studyEstimates.map((d) => d.study))
      .range([0, studyEstimates.length * 28])
      .padding(0.3);

    // Vertical reference line at pooled estimate
    g.append('line')
      .attr('x1', xScale(pooledSurvival))
      .attr('y1', 0)
      .attr('x2', xScale(pooledSurvival))
      .attr('y2', studyEstimates.length * 28)
      .attr('stroke', COLORS.pooled)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,4')
      .attr('opacity', 0.5);

    // CI lines
    g.selectAll('.ci-line')
      .data(studyEstimates)
      .enter()
      .append('line')
      .attr('class', 'ci-line')
      .attr('x1', (d) => xScale(d.ciLower))
      .attr('x2', (d) => xScale(d.ciUpper))
      .attr('y1', (d) => (yScale(d.study) || 0) + yScale.bandwidth() / 2)
      .attr('y2', (d) => (yScale(d.study) || 0) + yScale.bandwidth() / 2)
      .attr('stroke', COLORS.study)
      .attr('stroke-width', 2);

    // Point estimates
    g.selectAll('.point')
      .data(studyEstimates)
      .enter()
      .append('rect')
      .attr('class', 'point')
      .attr('x', (d) => xScale(d.survival) - Math.sqrt(d.weight * 100) / 2)
      .attr('y', (d) => (yScale(d.study) || 0) + yScale.bandwidth() / 2 - Math.sqrt(d.weight * 100) / 2)
      .attr('width', (d) => Math.sqrt(d.weight * 100))
      .attr('height', (d) => Math.sqrt(d.weight * 100))
      .attr('fill', COLORS.study);

    // Study labels
    g.selectAll('.label')
      .data(studyEstimates)
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('x', -10)
      .attr('y', (d) => (yScale(d.study) || 0) + yScale.bandwidth() / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '11px')
      .attr('fill', COLORS.textSecondary)
      .text((d) => d.study);

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${studyEstimates.length * 28 + 5})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickValues([0.5, 0.7, 0.9, 1.0])
          .tickFormat((d) => `${(Number(d) * 100).toFixed(0)}%`)
      )
      .selectAll('text')
      .attr('font-size', '10px')
      .attr('fill', COLORS.textSecondary);
  }, [studyEstimates, dimensions, pooledSurvival]);

  return (
    <div className="bg-white rounded-xl border-2 border-red-200 overflow-hidden" ref={containerRef}>
      {/* Warning Header */}
      <div className="bg-red-50 px-5 py-4 border-b border-red-200">
        <div className="flex items-center gap-3">
          <div className="bg-red-100 rounded-full p-2">
            <AlertOctagon className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              Cannot Pool Studies
            </h3>
            <p className="text-sm text-red-700">
              Extreme heterogeneity (I² = {iSquared.toFixed(1)}%) means pooled estimates are unreliable
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-5">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Gauge */}
          <div className="flex flex-col items-center">
            <svg ref={gaugeRef} width={160} height={140} />
            <div className="text-center mt-2">
              <div className="text-xs text-slate-500">Cochran's Q = {qStatistic}</div>
              <div className="text-xs text-slate-500">p {qPValue}</div>
            </div>
          </div>

          {/* Forest Plot Preview */}
          <div className="flex-1">
            <div className="text-sm font-medium text-slate-700 mb-2">Study-Level Survival Estimates</div>
            <svg ref={forestRef} width={Math.min(dimensions.width - 200, 400)} height={studyEstimates.length * 28 + 50} />
          </div>
        </div>

        {/* Key Message */}
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            <strong>What this means:</strong> Study estimates range from 65% to 100% survival.
            The "pooled" estimate of {(pooledSurvival * 100).toFixed(0)}% ({(pooledCiLower * 100).toFixed(0)}–{(pooledCiUpper * 100).toFixed(0)}%)
            is statistically meaningless because studies are measuring fundamentally different populations.
          </p>
        </div>

        {/* Expandable Details */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="mt-4 flex items-center gap-2 text-sm text-ocean-600 hover:text-ocean-800 transition-colors"
        >
          {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showDetails ? 'Hide details' : 'Why does this matter?'}
        </button>

        {showDetails && (
          <div className="mt-3 p-4 bg-slate-50 rounded-lg text-sm text-slate-700 space-y-3">
            <div className="flex gap-2">
              <Info className="w-4 h-4 text-ocean-500 flex-shrink-0 mt-0.5" />
              <div>
                <strong>I² interpretation:</strong> 97.8% of the variance in estimates is due to
                real differences between studies, not sampling error. This is "considerable" heterogeneity
                ({'>'}75% = considerable per Cochrane guidelines).
              </div>
            </div>
            <div className="flex gap-2">
              <Info className="w-4 h-4 text-ocean-500 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Root cause:</strong> NOAA studies large natural colonies (mean 2,000+ cm²),
                while fragment studies use small outplants (mean 20–50 cm²). These are fundamentally
                different populations with different survival dynamics.
              </div>
            </div>
            <div className="flex gap-2">
              <Info className="w-4 h-4 text-ocean-500 flex-shrink-0 mt-0.5" />
              <div>
                <strong>What to do instead:</strong> Always analyze by study or population type
                (natural colonies vs. restoration fragments). Never report a single "average" survival rate.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="bg-slate-50 px-5 py-3 border-t border-slate-200">
        <p className="text-sm text-slate-600">
          <span className="font-medium text-ocean-700">Recommendation:</span>{' '}
          Use the stratified analyses on this page, not pooled averages. Select your population type and region for applicable estimates.
        </p>
      </div>
    </div>
  );
}

export const HeterogeneityPanel = memo(HeterogeneityPanelComponent);
export default HeterogeneityPanel;
