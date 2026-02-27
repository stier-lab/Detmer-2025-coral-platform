/**
 * RGRBySizeChart - Interactive chart showing Relative Growth Rate by size class
 *
 * Publication-quality visualization showing:
 * - Bar chart with RGR values by size class
 * - Interpretive annotations (e.g., "can double annually")
 * - Gradient colors showing declining RGR with size
 * - Animated entrance
 */

import { useEffect, useRef, useState, memo } from 'react';
import * as d3 from 'd3';

interface RGRData {
  sizeClass: string;
  sizeRange: string;
  meanRGR: number;
  medianRGR: number;
  interpretation: string;
  n: number;
}

interface RGRBySizeChartProps {
  data?: RGRData[];
  height?: number;
}

const DEFAULT_DATA: RGRData[] = [
  { sizeClass: 'SC1', sizeRange: '0-25 cm²', meanRGR: 2.58, medianRGR: 1.94, interpretation: 'Can double size annually', n: 299 },
  { sizeClass: 'SC2', sizeRange: '25-100 cm²', meanRGR: 1.15, medianRGR: 0.93, interpretation: '~100% size increase/yr', n: 890 },
  { sizeClass: 'SC3', sizeRange: '100-500 cm²', meanRGR: 0.46, medianRGR: 0.32, interpretation: '~30-45% increase/yr', n: 641 },
  { sizeClass: 'SC4', sizeRange: '500-2000 cm²', meanRGR: 0.30, medianRGR: 0.23, interpretation: '~25-30% increase/yr', n: 661 },
  { sizeClass: 'SC5', sizeRange: '>2000 cm²', meanRGR: 0.09, medianRGR: 0.12, interpretation: '~10% increase/yr', n: 1553 },
];

// Color scale from bright (high RGR) to dark (low RGR)
const RGR_COLORS = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'];

function RGRBySizeChartComponent({
  data = DEFAULT_DATA,
  height = 400,
}: RGRBySizeChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 700, height });
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const hasAnimatedRef = useRef(false);

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

  // D3 rendering
  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width } = dimensions;
    const margin = { top: 60, right: 180, bottom: 80, left: 80 };
    const innerWidth = Math.max(100, width - margin.left - margin.right);
    const innerHeight = Math.max(100, height - margin.top - margin.bottom);

    // Scales
    const xScale = d3.scaleBand()
      .domain(data.map(d => d.sizeClass))
      .range([0, innerWidth])
      .padding(0.3);

    const yScale = d3.scaleLinear()
      .domain([0, Math.max(...data.map(d => d.meanRGR)) * 1.15])
      .range([innerHeight, 0]);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Grid lines
    g.append('g')
      .selectAll('line')
      .data(yScale.ticks(5))
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', '#e5e7eb')
      .attr('stroke-dasharray', '2,2');

    // Reference line at RGR = 1 (doubling)
    if (yScale.domain()[1] >= 1) {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yScale(1))
        .attr('y2', yScale(1))
        .attr('stroke', '#3b82f6')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '6,3');

      g.append('text')
        .attr('x', innerWidth + 5)
        .attr('y', yScale(1))
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '10px')
        .attr('fill', '#3b82f6')
        .text('RGR = 1 (doubling)');
    }

    // Bars - use D3 transitions for animation instead of React state
    const shouldAnimate = !hasAnimatedRef.current;
    hasAnimatedRef.current = true;

    data.forEach((d, i) => {
      const barX = xScale(d.sizeClass) || 0;
      const barWidth = xScale.bandwidth();
      const targetBarHeight = innerHeight - yScale(d.meanRGR);

      const rect = g.append('rect')
        .attr('class', 'rgr-bar')
        .attr('data-size-class', d.sizeClass)
        .attr('x', barX)
        .attr('width', barWidth)
        .attr('fill', RGR_COLORS[i])
        .attr('rx', 4)
        .attr('opacity', 0.85)
        .style('cursor', 'pointer')
        .on('mouseenter', () => setHoveredBar(d.sizeClass))
        .on('mouseleave', () => setHoveredBar(null));

      if (shouldAnimate) {
        rect
          .attr('y', innerHeight)
          .attr('height', 0)
          .transition()
          .duration(1200)
          .ease(d3.easeCubicOut)
          .attr('y', innerHeight - targetBarHeight)
          .attr('height', targetBarHeight);
      } else {
        rect
          .attr('y', innerHeight - targetBarHeight)
          .attr('height', targetBarHeight);
      }

      // Value label on bar
      const valueLabel = g.append('text')
        .attr('x', barX + barWidth / 2)
        .attr('y', innerHeight - targetBarHeight - 8)
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .attr('font-weight', '700')
        .attr('fill', '#1f2937')
        .text(d.meanRGR.toFixed(2));

      if (shouldAnimate) {
        valueLabel.attr('opacity', 0)
          .transition()
          .delay(840)
          .duration(360)
          .attr('opacity', 1);
      }

      // Interpretation label (right side) - positioned at fixed vertical intervals
      const labelY = 30 + i * 28;
      const interpLabel = g.append('text')
        .attr('x', innerWidth + 10)
        .attr('y', labelY)
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '10px')
        .attr('fill', '#6b7280')
        .text(`${d.sizeClass}: ${d.interpretation}`);

      if (shouldAnimate) {
        interpLabel.attr('opacity', 0)
          .transition()
          .delay(960)
          .duration(240)
          .attr('opacity', 1);
      }
    });

    // X-axis
    const xAxis = g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickSize(0));

    xAxis.selectAll('.tick text')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .attr('y', 10);

    xAxis.select('.domain').attr('stroke', '#9ca3af');

    // Size range labels
    data.forEach(d => {
      const x = (xScale(d.sizeClass) || 0) + xScale.bandwidth() / 2;
      g.append('text')
        .attr('x', x)
        .attr('y', innerHeight + 30)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', '#9ca3af')
        .text(d.sizeRange);
    });

    // Y-axis
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .selectAll('text')
      .attr('font-size', '11px');

    // Y-axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -55)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#4b5563')
      .text('Relative Growth Rate (yr⁻¹)');

    // Title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 22)
      .attr('text-anchor', 'middle')
      .attr('font-size', '18px')
      .attr('font-weight', '600')
      .attr('fill', '#1e3a5f')
      .text('Relative Growth Rate by Size Class');

    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 42)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#64748b')
      .text('Small corals grow proportionally faster — R² = 33.9%');

  // eslint-disable-next-line react-hooks/exhaustive-deps -- hoveredBar intentionally excluded; handled in separate effect below
  }, [data, dimensions, height]);

  // Separate hover effect - only updates opacity without re-rendering SVG
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('.rgr-bar')
      .attr('opacity', function() {
        const el = d3.select(this);
        const sizeClass = el.attr('data-size-class');
        return hoveredBar === sizeClass ? 1 : 0.85;
      });
  }, [hoveredBar]);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={height}
        className="overflow-visible"
        role="img"
        aria-label={`Bar chart showing relative growth rate by coral size class. SC1 corals have highest RGR at ${data[0]?.meanRGR || 2.58} per year (can double size annually), decreasing to SC5 at ${data[4]?.meanRGR || 0.09} per year. R-squared equals 33.9%.`}
      />

      {/* Key insight */}
      <div className="mt-3 mx-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Biological pattern:</strong> RGR decreases with size (negative allometry).
          SC1 corals with RGR ≈ 2.6 yr⁻¹ can more than double annually,
          while SC5 corals grow only ~10% per year — but that's still <strong>hundreds of cm²</strong> in absolute terms.
        </p>
      </div>

      {/* Sample sizes */}
      <div className="flex justify-center gap-4 mt-2 text-xs text-gray-500">
        {data.map(d => (
          <span key={d.sizeClass}>{d.sizeClass}: n={d.n.toLocaleString()}</span>
        ))}
      </div>
    </div>
  );
}

export const RGRBySizeChart = memo(RGRBySizeChartComponent);
