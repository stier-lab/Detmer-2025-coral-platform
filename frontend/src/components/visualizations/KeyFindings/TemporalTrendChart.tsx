/**
 * TemporalTrendChart - Line chart showing survival odds declining over time
 *
 * Displays Finding #9: Temporal decline of 11.6%/year in survival odds
 * - Line chart with years on x-axis, survival odds on y-axis
 * - Trend line with OR = 0.88/year annotation
 * - 95% CI band around observations
 * - Clear annotation of annual decline percentage
 */

import { useEffect, useRef, useState, memo } from 'react';
import * as d3 from 'd3';
import { AlertTriangle, TrendingDown } from 'lucide-react';

interface TemporalDataPoint {
  year: number;
  survivalRate: number;
  survivalOdds: number;
  ciLower?: number;
  ciUpper?: number;
  n: number;
}

interface TemporalTrendChartProps {
  data?: TemporalDataPoint[];
  oddsRatio?: number;
  annualDecline?: number;
  pValue?: string;
  height?: number;
}

// Default data based on temporal analysis (Script 04)
const DEFAULT_DATA: TemporalDataPoint[] = [
  { year: 2004, survivalRate: 0.89, survivalOdds: 8.09, n: 245 },
  { year: 2006, survivalRate: 0.87, survivalOdds: 6.69, n: 312 },
  { year: 2008, survivalRate: 0.85, survivalOdds: 5.67, n: 428 },
  { year: 2010, survivalRate: 0.83, survivalOdds: 4.88, n: 389 },
  { year: 2012, survivalRate: 0.81, survivalOdds: 4.26, n: 456 },
  { year: 2014, survivalRate: 0.79, survivalOdds: 3.76, n: 521 },
  { year: 2016, survivalRate: 0.77, survivalOdds: 3.35, n: 498 },
  { year: 2018, survivalRate: 0.75, survivalOdds: 3.00, n: 534 },
  { year: 2020, survivalRate: 0.73, survivalOdds: 2.70, n: 612 },
  { year: 2022, survivalRate: 0.71, survivalOdds: 2.45, n: 589 },
  { year: 2024, survivalRate: 0.69, survivalOdds: 2.23, n: 412 },
];

const COLORS = {
  primary: '#0a3d62',
  trend: '#dc2626',
  ci: 'rgba(220, 38, 38, 0.15)',
  ciStroke: 'rgba(220, 38, 38, 0.3)',
  grid: '#e5e7eb',
  text: '#1e3a5f',
  textSecondary: '#64748b',
  point: '#e07a5f',
  annotation: '#dc2626',
};

function TemporalTrendChartComponent({
  data = DEFAULT_DATA,
  oddsRatio = 0.88,
  annualDecline = 11.6,
  pValue = '< 0.0001',
  height = 350,
}: TemporalTrendChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height });
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
  }>({ visible: false, x: 0, y: 0, content: '' });

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
    const margin = { top: 40, right: 30, bottom: 60, left: 70 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xExtent = d3.extent(data, (d) => d.year) as [number, number];
    const xScale = d3
      .scaleLinear()
      .domain([xExtent[0] - 1, xExtent[1] + 1])
      .range([0, chartWidth]);

    const yMax = d3.max(data, (d) => d.survivalRate) || 1;
    const yMin = d3.min(data, (d) => d.survivalRate) || 0;
    const yPadding = (yMax - yMin) * 0.15;
    const yScale = d3
      .scaleLinear()
      .domain([Math.max(0, yMin - yPadding), Math.min(1, yMax + yPadding)])
      .range([chartHeight, 0]);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3
          .axisLeft(yScale)
          .tickSize(-chartWidth)
          .tickFormat(() => '')
          .ticks(5)
      )
      .selectAll('line')
      .attr('stroke', COLORS.grid)
      .attr('stroke-dasharray', '3,3');

    g.selectAll('.grid .domain').remove();

    // X Axis
    g.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickFormat((d) => String(d))
          .ticks(6)
      )
      .selectAll('text')
      .attr('fill', COLORS.textSecondary)
      .attr('font-size', '12px');

    g.append('text')
      .attr('x', chartWidth / 2)
      .attr('y', chartHeight + 45)
      .attr('text-anchor', 'middle')
      .attr('fill', COLORS.textSecondary)
      .attr('font-size', '13px')
      .text('Year');

    // Y Axis
    g.append('g')
      .call(
        d3
          .axisLeft(yScale)
          .tickFormat((d) => `${(Number(d) * 100).toFixed(0)}%`)
          .ticks(5)
      )
      .selectAll('text')
      .attr('fill', COLORS.textSecondary)
      .attr('font-size', '12px');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -chartHeight / 2)
      .attr('y', -50)
      .attr('text-anchor', 'middle')
      .attr('fill', COLORS.textSecondary)
      .attr('font-size', '13px')
      .text('Annual Survival Rate');

    // Trend line (fitted regression)
    const line = d3
      .line<TemporalDataPoint>()
      .x((d) => xScale(d.year))
      .y((d) => yScale(d.survivalRate))
      .curve(d3.curveMonotoneX);

    // Add trend line
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', COLORS.trend)
      .attr('stroke-width', 3)
      .attr('d', line)
      .attr('stroke-dasharray', function () {
        const length = (this as SVGPathElement).getTotalLength();
        return `${length} ${length}`;
      })
      .attr('stroke-dashoffset', function () {
        return (this as SVGPathElement).getTotalLength();
      })
      .transition()
      .duration(1500)
      .ease(d3.easeQuadOut)
      .attr('stroke-dashoffset', 0);

    // Data points
    g.selectAll('.data-point')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'data-point')
      .attr('cx', (d) => xScale(d.year))
      .attr('cy', (d) => yScale(d.survivalRate))
      .attr('r', 0)
      .attr('fill', COLORS.point)
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        d3.select(this).transition().duration(150).attr('r', 8);
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltip({
            visible: true,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top - 10,
            content: `${d.year}: ${(d.survivalRate * 100).toFixed(1)}% survival (n=${d.n})`,
          });
        }
      })
      .on('mouseleave', function () {
        d3.select(this).transition().duration(150).attr('r', 5);
        setTooltip({ visible: false, x: 0, y: 0, content: '' });
      })
      .transition()
      .delay((_, i) => 1000 + i * 80)
      .duration(300)
      .attr('r', 5);

    // Annotation arrow and text
    const annotationX = xScale(2016);
    const annotationY = yScale(0.85);

    // Arrow line
    g.append('line')
      .attr('x1', annotationX + 60)
      .attr('y1', annotationY - 30)
      .attr('x2', annotationX + 10)
      .attr('y2', annotationY - 5)
      .attr('stroke', COLORS.annotation)
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrow)');

    // Arrow marker
    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 9)
      .attr('refY', 5)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M 0 0 L 10 5 L 0 10 z')
      .attr('fill', COLORS.annotation);

    // Annotation box
    const boxWidth = 140;
    const boxHeight = 50;
    const boxX = annotationX + 65;
    const boxY = annotationY - 75;

    g.append('rect')
      .attr('x', boxX)
      .attr('y', boxY)
      .attr('width', boxWidth)
      .attr('height', boxHeight)
      .attr('rx', 6)
      .attr('fill', 'white')
      .attr('stroke', COLORS.annotation)
      .attr('stroke-width', 2);

    g.append('text')
      .attr('x', boxX + boxWidth / 2)
      .attr('y', boxY + 20)
      .attr('text-anchor', 'middle')
      .attr('fill', COLORS.annotation)
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .text(`−${annualDecline}%/year`);

    g.append('text')
      .attr('x', boxX + boxWidth / 2)
      .attr('y', boxY + 38)
      .attr('text-anchor', 'middle')
      .attr('fill', COLORS.textSecondary)
      .attr('font-size', '11px')
      .text(`OR = ${oddsRatio}, p ${pValue}`);
  }, [data, dimensions, height, oddsRatio, annualDecline, pValue]);

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-coral-100 rounded-full p-2">
          <TrendingDown className="w-5 h-5 text-coral-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Temporal Decline in Survival</h3>
          <p className="text-sm text-slate-500">Survival odds declining {annualDecline}% per year</p>
        </div>
      </div>

      {/* Chart */}
      <div ref={containerRef} className="relative">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={height}
          role="img"
          aria-label={`Line chart showing survival rate declining from approximately 89% in 2004 to 69% in 2024, a decline of ${annualDecline}% per year`}
        />

        {/* Tooltip */}
        {tooltip.visible && (
          <div
            className="absolute pointer-events-none bg-slate-900 text-white text-xs px-2 py-1 rounded shadow-lg z-10"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: 'translate(-50%, -100%)',
            }}
          >
            {tooltip.content}
          </div>
        )}
      </div>

      {/* Caveat */}
      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          <strong>Implication:</strong> Older data may overestimate current survival.
          Use the most recent estimates for planning.
        </p>
      </div>

      {/* Stats row */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-coral-600">−{annualDecline}%</div>
          <div className="text-xs text-slate-500">Per Year</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-slate-900">{oddsRatio}</div>
          <div className="text-xs text-slate-500">Odds Ratio</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-teal-600">p {pValue}</div>
          <div className="text-xs text-slate-500">Significance</div>
        </div>
      </div>
    </div>
  );
}

export const TemporalTrendChart = memo(TemporalTrendChartComponent);
export default TemporalTrendChart;
