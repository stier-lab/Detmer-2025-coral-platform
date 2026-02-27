/**
 * AGRvsRGRComparison - Side-by-side comparison of Absolute vs Relative Growth Rate
 *
 * Publication-quality visualization showing:
 * - Dual scatter plots with GAM curves
 * - R² comparison (1.5% vs 33.9%)
 * - Size-dependent growth patterns
 * - Interactive tooltips
 *
 * Now fetches R² values from /api/analysis/growth-threshold endpoint when available.
 */

import { useEffect, useRef, useState, useMemo, memo, useCallback } from 'react';
import * as d3 from 'd3';
import { Loader2 } from 'lucide-react';
import { useGrowthThreshold } from '../../../hooks/useAnalysisData';

interface GrowthDataPoint {
  size: number;
  agr: number;
  rgr: number;
  sizeClass: string;
}

interface AGRvsRGRComparisonProps {
  data?: GrowthDataPoint[];
  height?: number;
  agrRSquared?: number;
  rgrRSquared?: number;
}

// Generate synthetic data based on actual patterns
function generateSyntheticData(n: number = 200): GrowthDataPoint[] {
  const data: GrowthDataPoint[] = [];
  const sizeClasses = ['SC1', 'SC2', 'SC3', 'SC4', 'SC5'];
  const sizeRanges = [
    [5, 25],
    [25, 100],
    [100, 500],
    [500, 2000],
    [2000, 20000],
  ];

  for (let i = 0; i < n; i++) {
    const classIdx = Math.floor(Math.random() * 5);
    const [minSize, maxSize] = sizeRanges[classIdx];
    const size = minSize + Math.random() * (maxSize - minSize);

    // AGR: loosely related to size with high variance
    const agrBase = size * 0.05 + (Math.random() - 0.3) * size * 0.2;
    const agr = Math.max(-size * 0.3, agrBase);

    // RGR: strongly decreasing with size
    const rgrBase = 2.5 * Math.pow(size / 10, -0.5) + (Math.random() - 0.5) * 0.5;
    const rgr = Math.max(-0.5, rgrBase);

    data.push({
      size,
      agr,
      rgr,
      sizeClass: sizeClasses[classIdx],
    });
  }

  return data;
}

const SIZE_CLASS_COLORS: Record<string, string> = {
  SC1: '#caf0f8',
  SC2: '#90e0ef',
  SC3: '#00b4d8',
  SC4: '#0077b6',
  SC5: '#03045e',
};

function AGRvsRGRComparisonComponent({
  data,
  height = 400,
  agrRSquared: propAgrR2,
  rgrRSquared: propRgrR2,
}: AGRvsRGRComparisonProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
  }>({ visible: false, x: 0, y: 0, content: '' });

  // Fetch growth threshold data from API
  const { data: growthData, isLoading } = useGrowthThreshold();

  // Extract R² values from API response or use props/defaults
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiData = growthData as any;
  const agrRSquared = propAgrR2 ?? (apiData?.absolute_growth?.r_squared ? apiData.absolute_growth.r_squared * 100 : 1.5);
  const rgrRSquared = propRgrR2 ?? (apiData?.rgr?.r_squared ? apiData.rgr.r_squared * 100 : 33.9);
  const usingApiData = !propAgrR2 && !propRgrR2 && apiData && !apiData.error;

  const usingSyntheticData = !data;
  const chartData = useMemo(() => data || generateSyntheticData(), [data]);

  // Callback ref for container - handles element mounting
  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    // Clean up old observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (node) {
      containerRef.current = node;

      // Get initial width immediately
      const initialWidth = node.offsetWidth;
      if (initialWidth > 0) {
        setContainerWidth(initialWidth);
      }

      // Set up ResizeObserver
      observerRef.current = new ResizeObserver((entries) => {
        const { width } = entries[0].contentRect;
        if (width > 0) {
          setContainerWidth(width);
        }
      });
      observerRef.current.observe(node);
    }
  }, []);

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // D3 rendering
  useEffect(() => {
    if (!svgRef.current || chartData.length === 0 || containerWidth === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = containerWidth;
    const margin = { top: 80, right: 30, bottom: 60, left: 70 };
    const gap = 40;
    const panelWidth = (width - margin.left - margin.right - gap) / 2;
    const panelHeight = height - margin.top - margin.bottom;

    // Scales
    const xScale = d3.scaleLog()
      .domain([5, 25000])
      .range([0, panelWidth]);

    const agrExtent = d3.extent(chartData, d => d.agr) as [number, number];
    const agrScale = d3.scaleLinear()
      .domain([Math.min(agrExtent[0], -200), Math.max(agrExtent[1], 500)])
      .range([panelHeight, 0]);

    const rgrExtent = d3.extent(chartData, d => d.rgr) as [number, number];
    const rgrScale = d3.scaleLinear()
      .domain([Math.min(rgrExtent[0], -0.5), Math.max(rgrExtent[1], 3)])
      .range([panelHeight, 0]);

    // Helper function for loess-like smoothing
    const calculateTrendLine = (
      data: GrowthDataPoint[],
      getValue: (d: GrowthDataPoint) => number,
      yScale: d3.ScaleLinear<number, number>
    ) => {
      const sorted = [...data].sort((a, b) => a.size - b.size);
      const windowSize = Math.floor(sorted.length / 10);
      const points: [number, number][] = [];

      for (let i = windowSize; i < sorted.length - windowSize; i += 5) {
        const window = sorted.slice(i - windowSize, i + windowSize);
        const avgSize = d3.mean(window, d => d.size) || 0;
        const avgValue = d3.mean(window, getValue) || 0;
        points.push([xScale(avgSize), yScale(avgValue)]);
      }

      return points;
    };

    // Left panel: AGR
    const gLeft = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // AGR points
    gLeft.selectAll('circle')
      .data(chartData)
      .join('circle')
      .attr('cx', d => xScale(d.size))
      .attr('cy', d => agrScale(d.agr))
      .attr('r', 3)
      .attr('fill', d => SIZE_CLASS_COLORS[d.sizeClass])
      .attr('opacity', 0.5)
      .on('mouseenter', (event, d) => {
        const [x, y] = d3.pointer(event, containerRef.current);
        setTooltip({
          visible: true,
          x, y: y - 10,
          content: `Size: ${d.size.toFixed(0)} cm² | AGR: ${d.agr.toFixed(1)} cm²/yr | ${d.sizeClass}`
        });
      })
      .on('mouseleave', () => setTooltip({ visible: false, x: 0, y: 0, content: '' }));

    // AGR trend line
    const agrTrend = calculateTrendLine(chartData, d => d.agr, agrScale);
    if (agrTrend.length > 2) {
      const lineGenerator = d3.line().curve(d3.curveMonotoneX);
      gLeft.append('path')
        .attr('d', lineGenerator(agrTrend))
        .attr('fill', 'none')
        .attr('stroke', '#dc2626')
        .attr('stroke-width', 3)
        .attr('opacity', 0.8);
    }

    // Zero line for AGR
    gLeft.append('line')
      .attr('x1', 0)
      .attr('x2', panelWidth)
      .attr('y1', agrScale(0))
      .attr('y2', agrScale(0))
      .attr('stroke', '#9ca3af')
      .attr('stroke-dasharray', '4,2');

    // AGR axes
    gLeft.append('g')
      .attr('transform', `translate(0,${panelHeight})`)
      .call(d3.axisBottom(xScale).ticks(5, ',.0f'))
      .selectAll('text').attr('font-size', '10px');

    gLeft.append('g')
      .call(d3.axisLeft(agrScale).ticks(6))
      .selectAll('text').attr('font-size', '10px');

    // AGR title and R²
    gLeft.append('text')
      .attr('x', panelWidth / 2)
      .attr('y', -35)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .attr('fill', '#1f2937')
      .text('A. Absolute Growth Rate (AGR)');

    gLeft.append('text')
      .attr('x', panelWidth / 2)
      .attr('y', -18)
      .attr('text-anchor', 'middle')
      .attr('font-size', '20px')
      .attr('font-weight', '700')
      .attr('fill', '#dc2626')
      .text(`R² = ${agrRSquared.toFixed(1)}%`);

    gLeft.append('text')
      .attr('x', panelWidth / 2)
      .attr('y', panelHeight + 45)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('fill', '#4b5563')
      .text('Colony Size (cm²)');

    gLeft.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -panelHeight / 2)
      .attr('y', -50)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('fill', '#4b5563')
      .text('Growth (cm²/yr)');

    // Right panel: RGR
    const gRight = svg.append('g')
      .attr('transform', `translate(${margin.left + panelWidth + gap},${margin.top})`);

    // RGR points
    gRight.selectAll('circle')
      .data(chartData)
      .join('circle')
      .attr('cx', d => xScale(d.size))
      .attr('cy', d => rgrScale(d.rgr))
      .attr('r', 3)
      .attr('fill', d => SIZE_CLASS_COLORS[d.sizeClass])
      .attr('opacity', 0.5)
      .on('mouseenter', (event, d) => {
        const [x, y] = d3.pointer(event, containerRef.current);
        setTooltip({
          visible: true,
          x, y: y - 10,
          content: `Size: ${d.size.toFixed(0)} cm² | RGR: ${d.rgr.toFixed(2)} yr⁻¹ | ${d.sizeClass}`
        });
      })
      .on('mouseleave', () => setTooltip({ visible: false, x: 0, y: 0, content: '' }));

    // RGR trend line
    const rgrTrend = calculateTrendLine(chartData, d => d.rgr, rgrScale);
    if (rgrTrend.length > 2) {
      const lineGenerator = d3.line().curve(d3.curveMonotoneX);
      gRight.append('path')
        .attr('d', lineGenerator(rgrTrend))
        .attr('fill', 'none')
        .attr('stroke', '#059669')
        .attr('stroke-width', 3)
        .attr('opacity', 0.8);
    }

    // Zero line for RGR
    gRight.append('line')
      .attr('x1', 0)
      .attr('x2', panelWidth)
      .attr('y1', rgrScale(0))
      .attr('y2', rgrScale(0))
      .attr('stroke', '#9ca3af')
      .attr('stroke-dasharray', '4,2');

    // RGR axes
    gRight.append('g')
      .attr('transform', `translate(0,${panelHeight})`)
      .call(d3.axisBottom(xScale).ticks(5, ',.0f'))
      .selectAll('text').attr('font-size', '10px');

    gRight.append('g')
      .call(d3.axisLeft(rgrScale).ticks(6))
      .selectAll('text').attr('font-size', '10px');

    // RGR title and R²
    gRight.append('text')
      .attr('x', panelWidth / 2)
      .attr('y', -35)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .attr('fill', '#1f2937')
      .text('B. Relative Growth Rate (RGR)');

    gRight.append('text')
      .attr('x', panelWidth / 2)
      .attr('y', -18)
      .attr('text-anchor', 'middle')
      .attr('font-size', '20px')
      .attr('font-weight', '700')
      .attr('fill', '#059669')
      .text(`R² = ${rgrRSquared.toFixed(1)}%`);

    gRight.append('text')
      .attr('x', panelWidth / 2)
      .attr('y', panelHeight + 45)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('fill', '#4b5563')
      .text('Colony Size (cm²)');

    gRight.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -panelHeight / 2)
      .attr('y', -50)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('fill', '#4b5563')
      .text('Relative Growth (yr⁻¹)');

    // Main title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 22)
      .attr('text-anchor', 'middle')
      .attr('font-size', '18px')
      .attr('font-weight', '600')
      .attr('fill', '#1e3a5f')
      .text('Growth Rate Comparison: AGR vs RGR');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartData.length, containerWidth, height, agrRSquared, rgrRSquared]);

  // Calculate ratio for insight text
  const rgrRatio = Math.round(rgrRSquared / agrRSquared);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <Loader2 className="w-8 h-8 animate-spin text-ocean-deep" />
        <span className="ml-2 text-gray-600">Loading growth analysis...</span>
      </div>
    );
  }

  return (
    <div ref={setContainerRef} className="relative w-full">
      {/* Data source indicator */}
      {usingApiData && (
        <div className="absolute top-2 left-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded z-10">
          Live data from analysis
        </div>
      )}
      {usingSyntheticData && (
        <div className="absolute top-2 right-2 px-2 py-1 text-xs text-amber-600 bg-amber-50 rounded z-10">
          Using simulated data
        </div>
      )}
      <svg
        ref={svgRef}
        width={containerWidth || '100%'}
        height={height}
        className="overflow-visible"
        style={{ minHeight: height }}
        role="img"
        aria-label="Side-by-side scatter plots comparing Absolute Growth Rate (AGR) versus Relative Growth Rate (RGR) against colony size. AGR shows R-squared of only 1.5%, while RGR shows R-squared of 33.9%, demonstrating RGR is 22 times more predictive than AGR."
      />

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3 mt-2 px-4">
        {Object.entries(SIZE_CLASS_COLORS).map(([cls, color]) => (
          <div key={cls} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-gray-600">{cls}</span>
          </div>
        ))}
      </div>

      {/* Key insight */}
      <div className="mt-3 mx-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-sm text-green-800">
          <strong>RGR is {rgrRatio}× more predictive than AGR!</strong> Relative growth rate accounts for allometry —
          small corals growing 50 cm²/yr (RGR ≈ 2.0) are actually growing much faster relative to their size
          than large corals gaining 500 cm²/yr (RGR ≈ 0.1).
        </p>
      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="absolute bg-gray-900 text-white text-xs px-2 py-1 rounded pointer-events-none z-10 whitespace-nowrap"
          style={{
            left: Math.max(80, Math.min(tooltip.x, containerWidth - 80)),
            top: Math.max(30, tooltip.y),
            transform: 'translate(-50%, -100%)'
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}

export const AGRvsRGRComparison = memo(AGRvsRGRComparisonComponent);
