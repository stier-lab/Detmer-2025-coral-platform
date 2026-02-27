/**
 * SurvivalByClassChart - Interactive bar chart with survival by size class
 *
 * Publication-quality visualization showing:
 * - Horizontal bars with survival rates
 * - Confidence intervals as error bars
 * - Sample size indicators
 * - R² annotation showing variance explained
 * - Animated entrance
 *
 * Now fetches data from /api/survival/by-size endpoint when available.
 */

import { useEffect, useRef, useState, memo } from 'react';
import * as d3 from 'd3';
import { survivalApi } from '../../../utils/api';
import { useQuery } from '@tanstack/react-query';
import type { SurvivalBySize } from '../../../types';

interface SurvivalData {
  sizeClass: string;
  sizeRange: string;
  survival: number;
  ciLower?: number;
  ciUpper?: number;
  n: number;
}

interface SurvivalByClassChartProps {
  data?: SurvivalData[];
  rSquared?: number;
  height?: number;
}

const SIZE_RANGES: Record<string, string> = {
  'SC1': '0-25 cm²',
  'SC2': '25-100 cm²',
  'SC3': '100-500 cm²',
  'SC4': '500-2000 cm²',
  'SC5': '>2000 cm²',
  'Unknown': '',
};

const DEFAULT_DATA: SurvivalData[] = [
  { sizeClass: 'SC1', sizeRange: '0-25 cm²', survival: 72.4, ciLower: 67.5, ciUpper: 77.3, n: 366 },
  { sizeClass: 'SC2', sizeRange: '25-100 cm²', survival: 64.4, ciLower: 61.8, ciUpper: 67.0, n: 1342 },
  { sizeClass: 'SC3', sizeRange: '100-500 cm²', survival: 76.8, ciLower: 74.0, ciUpper: 79.6, n: 920 },
  { sizeClass: 'SC4', sizeRange: '500-2000 cm²', survival: 87.6, ciLower: 85.4, ciUpper: 89.8, n: 837 },
  { sizeClass: 'SC5', sizeRange: '>2000 cm²', survival: 93.7, ciLower: 92.5, ciUpper: 94.9, n: 1731 },
];

const SIZE_CLASS_COLORS = [
  '#caf0f8', // SC1 - lightest
  '#90e0ef',
  '#00b4d8',
  '#0077b6',
  '#03045e', // SC5 - darkest
];

function SurvivalByClassChartComponent({
  data: propData,
  rSquared: propRSquared,
  height = 350,
}: SurvivalByClassChartProps) {
  // Fetch survival by size from API
  const { data: apiResponse } = useQuery<SurvivalBySize[]>({
    queryKey: ['survival', 'by-size'],
    queryFn: () => survivalApi.getBySize(),
    staleTime: 10 * 60 * 1000,
  });

  // Transform API data to chart format
  const chartData: SurvivalData[] = apiResponse && apiResponse.length > 0
    ? apiResponse.map(d => ({
        sizeClass: d.size_class || 'Unknown',
        sizeRange: SIZE_RANGES[d.size_class] || '',
        survival: (d.survival_rate || 0) * 100,
        ciLower: d.ci_lower ? d.ci_lower * 100 : undefined,
        ciUpper: d.ci_upper ? d.ci_upper * 100 : undefined,
        n: d.n || 0,
      }))
    : [];

  // Use API data if available, otherwise fall back to props or defaults
  const data = propData ?? (chartData.length > 0 ? chartData : DEFAULT_DATA);
  const rSquared = propRSquared ?? 8.6;
  const usingApiData = !propData && chartData.length > 0;
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height });
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [animationProgress] = useState(1);

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

  // Bars render at full width immediately (animationProgress = 1)

  // D3 rendering
  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width } = dimensions;
    const margin = { top: 60, right: 80, bottom: 60, left: 140 };
    const innerWidth = Math.max(100, width - margin.left - margin.right);
    const innerHeight = Math.max(100, height - margin.top - margin.bottom);

    // Scales
    const xScale = d3.scaleLinear()
      .domain([0, 100])
      .range([0, innerWidth]);

    const yScale = d3.scaleBand()
      .domain(data.map(d => d.sizeClass))
      .range([0, innerHeight])
      .padding(0.3);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data([25, 50, 75, 100])
      .join('line')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#e5e7eb')
      .attr('stroke-dasharray', '2,2');

    // 80% reference line (threshold)
    g.append('line')
      .attr('x1', xScale(80))
      .attr('x2', xScale(80))
      .attr('y1', -5)
      .attr('y2', innerHeight + 5)
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,3');

    g.append('text')
      .attr('x', xScale(80))
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#f59e0b')
      .text('80% threshold');

    // Bars
    g.selectAll('.bar')
      .data(data)
      .join('rect')
      .attr('class', 'bar')
      .attr('data-size-class', d => d.sizeClass)
      .attr('x', 0)
      .attr('y', d => yScale(d.sizeClass) || 0)
      .attr('width', d => xScale(d.survival * animationProgress))
      .attr('height', yScale.bandwidth())
      .attr('fill', (_, i) => SIZE_CLASS_COLORS[i])
      .attr('rx', 4)
      .attr('opacity', 0.85)
      .style('cursor', 'pointer')
      .on('mouseenter', (_, d) => setHoveredBar(d.sizeClass))
      .on('mouseleave', () => setHoveredBar(null));

    // Error bars (CI)
    data.forEach((d) => {
      if (d.ciLower && d.ciUpper && animationProgress > 0.5) {
        const y = (yScale(d.sizeClass) || 0) + yScale.bandwidth() / 2;
        const ciOpacity = (animationProgress - 0.5) * 2;

        // Horizontal line
        g.append('line')
          .attr('x1', xScale(d.ciLower))
          .attr('x2', xScale(d.ciUpper))
          .attr('y1', y)
          .attr('y2', y)
          .attr('stroke', '#374151')
          .attr('stroke-width', 2)
          .attr('opacity', ciOpacity);

        // End caps
        [d.ciLower, d.ciUpper].forEach(val => {
          g.append('line')
            .attr('x1', xScale(val))
            .attr('x2', xScale(val))
            .attr('y1', y - 6)
            .attr('y2', y + 6)
            .attr('stroke', '#374151')
            .attr('stroke-width', 2)
            .attr('opacity', ciOpacity);
        });
      }
    });

    // Value labels
    g.selectAll('.value-label')
      .data(data)
      .join('text')
      .attr('class', 'value-label')
      .attr('x', d => xScale(d.survival * animationProgress) + 8)
      .attr('y', d => (yScale(d.sizeClass) || 0) + yScale.bandwidth() / 2)
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .attr('fill', '#1f2937')
      .text(d => `${(d.survival * animationProgress).toFixed(1)}%`);

    // Sample size labels
    g.selectAll('.n-label')
      .data(data)
      .join('text')
      .attr('class', 'n-label')
      .attr('x', innerWidth + 10)
      .attr('y', d => (yScale(d.sizeClass) || 0) + yScale.bandwidth() / 2)
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '11px')
      .attr('fill', '#6b7280')
      .text(d => `n=${d.n.toLocaleString()}`);

    // Y-axis with combined labels (size class + range)
    const yAxis = g.append('g')
      .call(d3.axisLeft(yScale).tickSize(0).tickFormat((d) => {
        const item = data.find(item => item.sizeClass === d);
        if (!item) return String(d);
        // If sizeRange is available, show it; otherwise just show size class
        const range = item.sizeRange ? ` (${item.sizeRange.replace(' cm²', '')})` : '';
        return `${item.sizeClass}${range}`;
      }));

    yAxis.selectAll('.tick text')
      .attr('font-size', '11px')
      .attr('font-weight', '600');

    yAxis.select('.domain').remove();

    // X-axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => `${d}%`))
      .selectAll('text')
      .attr('font-size', '11px');

    // Title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 22)
      .attr('text-anchor', 'middle')
      .attr('font-size', '18px')
      .attr('font-weight', '600')
      .attr('fill', '#1e3a5f')
      .text('Annual Survival by Size Class');

    // X-axis label
    svg.append('text')
      .attr('x', margin.left + innerWidth / 2)
      .attr('y', height - 10)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#4b5563')
      .text('Annual Survival Rate (%)');

  // eslint-disable-next-line react-hooks/exhaustive-deps -- hoveredBar intentionally excluded; handled in separate effect below
  }, [data, dimensions, height, animationProgress]);

  // Separate hover effect - only updates opacity without re-rendering SVG
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('.bar')
      .attr('opacity', function() {
        const el = d3.select(this);
        const sizeClass = el.attr('data-size-class');
        return hoveredBar === sizeClass ? 1 : 0.85;
      });
  }, [hoveredBar]);

  // No loading spinner - render with fallback data immediately, swap when API responds

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Data source indicator */}
      {usingApiData && (
        <div className="absolute top-2 left-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded z-10">
          Live data from API
        </div>
      )}
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={height}
        className="overflow-visible"
        role="img"
        aria-label={`Bar chart showing annual survival rates by coral size class. SC1 (0-25 cm²): ${data[0]?.survival || 72}%, SC2: ${data[1]?.survival || 64}%, SC3: ${data[2]?.survival || 77}%, SC4: ${data[3]?.survival || 88}%, SC5 (>2000 cm²): ${data[4]?.survival || 94}%. Size explains only ${rSquared}% of variance.`}
      />

      {/* R² annotation */}
      <div className="absolute top-12 right-4 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        <div className="text-xs text-amber-700 font-medium">Variance Explained</div>
        <div className="text-xl font-bold text-amber-600">R² = {rSquared}%</div>
        <div className="text-xs text-amber-600">Size explains only {rSquared}%</div>
      </div>

      {/* Key insight */}
      <div className="mt-2 mx-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm text-gray-700">
          <strong>Note:</strong> Larger corals survive better, but size explains only <strong>{rSquared}%</strong> of
          variation. Other factors (location, disturbance, study methodology) explain <strong>{(100 - rSquared).toFixed(1)}%</strong>.
        </p>
      </div>
    </div>
  );
}

export const SurvivalByClassChart = memo(SurvivalByClassChartComponent);
