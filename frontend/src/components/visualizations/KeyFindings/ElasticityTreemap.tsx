/**
 * ElasticityTreemap - Interactive treemap showing population elasticity breakdown
 *
 * Publication-quality visualization showing:
 * - Treemap layout with area proportional to elasticity
 * - Color-coded by category (Survival, Growth, Reproduction)
 * - Interactive hover with detailed tooltips
 * - Animated transitions
 * - Dynamic data from API with fallback
 * - Reliability indicators for data quality
 */

import { useEffect, useRef, useState, memo } from 'react';
import * as d3 from 'd3';
import { Shield, TrendingUp, Sprout, TrendingDown, AlertTriangle, Loader2 } from 'lucide-react';
import { useElasticityBreakdown, DEFAULT_ELASTICITY_BREAKDOWN } from '../../../hooks/useElasticityData';
import type { ElasticityItem, ReliabilityLevel } from '../../../types';

interface ElasticityTreemapProps {
  height?: number;
  showReliabilityBadges?: boolean;
}

const COLORS = {
  Survival: { main: '#0369a1', light: '#7dd3fc', text: '#ffffff' },
  Growth: { main: '#15803d', light: '#86efac', text: '#ffffff' },
  Reproduction: { main: '#b45309', light: '#fcd34d', text: '#ffffff' },
  Shrinkage: { main: '#dc2626', light: '#fca5a5', text: '#ffffff' },
};

const DEFAULT_COLOR = { main: '#6b7280', light: '#d1d5db', text: '#ffffff' };

function getColor(category: string) {
  return COLORS[category as keyof typeof COLORS] ?? DEFAULT_COLOR;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Survival: <Shield className="w-4 h-4" />,
  Growth: <TrendingUp className="w-4 h-4" />,
  Reproduction: <Sprout className="w-4 h-4" />,
  Shrinkage: <TrendingDown className="w-4 h-4" />,
};

const RELIABILITY_COLORS: Record<ReliabilityLevel, string> = {
  'High': '#22c55e',
  'Moderate': '#eab308',
  'Low': '#f97316',
  'Very Low': '#ef4444',
  'None': '#991b1b',
  'Unknown': '#6b7280',
};

function ElasticityTreemapComponent({
  height = 400,
  showReliabilityBadges = true,
}: ElasticityTreemapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height });
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    data: ElasticityItem | null;
  }>({ visible: false, x: 0, y: 0, data: null });

  // Fetch data from API with fallback
  const { data: apiResponse, isLoading, isError } = useElasticityBreakdown();

  // Use API data or fallback
  const elasticityData = apiResponse?.data ?? DEFAULT_ELASTICITY_BREAKDOWN.data;
  const categoryTotals = apiResponse?.categoryTotals ?? DEFAULT_ELASTICITY_BREAKDOWN.categoryTotals;
  const meta = apiResponse?.meta ?? DEFAULT_ELASTICITY_BREAKDOWN.meta;
  const isUsingFallback = !apiResponse || meta.note?.includes('Fallback');

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
    if (!svgRef.current || elasticityData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width } = dimensions;
    const margin = { top: 50, right: 20, bottom: 80, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create hierarchy with proper typing - extend to preserve ElasticityItem fields
    interface TreemapNode {
      name: string;
      value?: number;
      category?: string;
      description?: string;
      from?: string;
      to?: string;
      reliability?: string;
      sampleSize?: number;
      transitionType?: string;
      children?: TreemapNode[] | null;
    }

    const hierarchyData: TreemapNode = {
      name: 'root',
      children: elasticityData.map((d: ElasticityItem): TreemapNode => ({
        name: d.name,
        value: d.value,
        category: d.category,
        description: d.description,
        from: d.from,
        to: d.to,
        reliability: d.reliability,
        sampleSize: d.sampleSize,
        transitionType: d.transitionType,
        children: null
      }))
    };

    const hierarchy = d3.hierarchy<TreemapNode>(hierarchyData)
      .sum((d: TreemapNode) => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Create treemap layout
    const treemap = d3.treemap<TreemapNode>()
      .size([innerWidth, innerHeight])
      .padding(3)
      .round(true);

    const root = treemap(hierarchy);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Draw cells
    const cells = g.selectAll('g')
      .data(root.leaves())
      .join('g')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);

    // Rectangles
    cells.append('rect')
      .attr('class', 'treemap-rect')
      .attr('data-name', d => (d.data as ElasticityItem).name)
      .attr('data-category', d => (d.data as ElasticityItem).category)
      .attr('width', d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('fill', d => {
        const item = d.data as ElasticityItem;
        return getColor(item.category).main;
      })
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .attr('rx', 4)
      .attr('ry', 4)
      .style('cursor', 'pointer')
      .style('transition', 'fill 0.2s ease')
      .on('mouseenter', function(event, d) {
        const item = d.data as ElasticityItem;
        setHoveredItem(item.name);
        const [x, y] = d3.pointer(event, containerRef.current);
        setTooltip({
          visible: true,
          x,
          y: y - 10,
          data: item
        });
        d3.select(this).attr('stroke-width', 3);
      })
      .on('mouseleave', function() {
        setHoveredItem(null);
        setTooltip({ visible: false, x: 0, y: 0, data: null });
        d3.select(this).attr('stroke-width', 2);
      });

    // Labels
    cells.each(function(d) {
      const cellWidth = d.x1 - d.x0;
      const cellHeight = d.y1 - d.y0;
      const cell = d3.select(this);
      const item = d.data as ElasticityItem;

      // Only show text if cell is large enough
      if (cellWidth > 60 && cellHeight > 40) {
        // Value (percentage)
        cell.append('text')
          .attr('x', cellWidth / 2)
          .attr('y', cellHeight / 2 - 8)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', getColor(item.category).text)
          .attr('font-size', Math.min(24, cellWidth / 4) + 'px')
          .attr('font-weight', '700')
          .text(`${item.value.toFixed(1)}%`);

        // Name (truncated if needed)
        if (cellHeight > 60) {
          // Calculate font size based on cell width, with reasonable bounds
          const fontSize = Math.max(10, Math.min(13, cellWidth / 10));
          // Estimate max chars based on font size and cell width (approx 0.6 * fontSize per char)
          const charWidth = fontSize * 0.6;
          const maxChars = Math.floor((cellWidth - 10) / charWidth);
          const displayName = item.name.length > maxChars
            ? item.name.substring(0, maxChars - 1) + '…'
            : item.name;

          cell.append('text')
            .attr('x', cellWidth / 2)
            .attr('y', cellHeight / 2 + 14)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', getColor(item.category).text)
            .attr('font-size', fontSize + 'px')
            .attr('opacity', 0.9)
            .text(displayName);
        }

        // Reliability indicator for low-confidence items
        if (showReliabilityBadges && item.reliability &&
            (item.reliability === 'Low' || item.reliability === 'Very Low' || item.reliability === 'Moderate')) {
          if (cellWidth > 80 && cellHeight > 70) {
            cell.append('circle')
              .attr('cx', cellWidth - 12)
              .attr('cy', 12)
              .attr('r', 6)
              .attr('fill', RELIABILITY_COLORS[item.reliability])
              .attr('stroke', '#ffffff')
              .attr('stroke-width', 1.5);
          }
        }
      } else if (cellWidth > 30 && cellHeight > 25) {
        // Just show percentage for smaller cells
        cell.append('text')
          .attr('x', cellWidth / 2)
          .attr('y', cellHeight / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', getColor(item.category).text)
          .attr('font-size', '11px')
          .attr('font-weight', '600')
          .text(`${item.value.toFixed(0)}%`);
      }
    });

    // Title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .attr('font-size', '18px')
      .attr('font-weight', '600')
      .attr('fill', '#1e3a5f')
      .text('Population Elasticity Analysis');

    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 42)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#64748b')
      .text('Area proportional to impact on population growth rate (λ)');

  // eslint-disable-next-line react-hooks/exhaustive-deps -- hoveredItem intentionally excluded; handled in separate effect below
  }, [elasticityData, dimensions, height, showReliabilityBadges]);

  // Separate hover effect - only updates fill styles without re-rendering entire SVG
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('.treemap-rect')
      .attr('fill', function() {
        const el = d3.select(this);
        const name = el.attr('data-name');
        const category = el.attr('data-category');
        const color = getColor(category);
        return hoveredItem === name ? color.light : color.main;
      });
  }, [hoveredItem]);

  // Loading state
  if (isLoading) {
    return (
      <div ref={containerRef} className="relative w-full flex items-center justify-center" style={{ height }}>
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-sm">Loading elasticity data...</span>
        </div>
      </div>
    );
  }

  // Get dominant item for display
  const dominantItem = elasticityData.reduce((max: ElasticityItem, item: ElasticityItem) =>
    item.value > max.value ? item : max, elasticityData[0]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Error/fallback indicator */}
      {(isError || isUsingFallback) && (
        <div className="absolute top-2 right-2 z-10">
          <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
            <AlertTriangle className="w-3 h-3" />
            <span>{isError ? 'Using cached data' : 'Demo data'}</span>
          </div>
        </div>
      )}

      <svg
        ref={svgRef}
        width={dimensions.width}
        height={height}
        className="overflow-visible"
        role="img"
        aria-label={`Treemap showing population elasticity analysis. ${dominantItem.name} has highest impact at ${dominantItem.value.toFixed(1)}%. Total survival elasticity: ${(categoryTotals.find((c: { category: string; total: number }) => c.category === 'Survival')?.total || 0).toFixed(1)}%, Growth: ${(categoryTotals.find((c: { category: string; total: number }) => c.category === 'Growth')?.total || 0).toFixed(1)}%.`}
      />

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-2 px-4">
        {categoryTotals.map(({ category, total }: { category: string; total: number; count: number }) => (
          <div key={category} className="flex items-center gap-2">
            <span className="text-sm">{CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS]}</span>
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: COLORS[category as keyof typeof COLORS]?.main || '#6b7280' }}
            />
            <span className="text-sm text-gray-700">
              {category}: <strong>{total.toFixed(1)}%</strong>
            </span>
          </div>
        ))}
      </div>

      {/* Reliability legend (if showing badges) */}
      {showReliabilityBadges && (
        <div className="flex justify-center gap-4 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: RELIABILITY_COLORS.Moderate }} />
            Moderate confidence
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: RELIABILITY_COLORS.Low }} />
            Low confidence
          </span>
        </div>
      )}

      {/* Key insight callout */}
      <div className="mt-4 mx-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm text-gray-700">
          <strong>Model result:</strong> {dominantItem.name} accounts for <strong>{dominantItem.value.toFixed(1)}%</strong> of total elasticity.
          This means changes in large adult survival have <strong>3-4× more influence</strong> on modeled λ than other transitions.
          Note: elasticities are model outputs, not direct measurements.
        </p>
      </div>

      {/* Tooltip */}
      {tooltip.visible && tooltip.data && (
        <div
          className="absolute bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg pointer-events-none z-10 max-w-xs"
          style={{
            left: Math.min(tooltip.x, dimensions.width - 200),
            top: tooltip.y,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="font-semibold">{tooltip.data.name}</div>
          <div className="text-2xl font-bold text-blue-300">{tooltip.data.value.toFixed(1)}%</div>
          {tooltip.data.description && (
            <div className="text-xs text-gray-300 mt-1">{tooltip.data.description}</div>
          )}
          <div className="flex justify-between gap-4 text-xs text-gray-400 mt-2 pt-2 border-t border-gray-700">
            <span>Category: {tooltip.data.category}</span>
            <span>Transition: {tooltip.data.from} → {tooltip.data.to}</span>
          </div>
          {tooltip.data.sampleSize !== undefined && (
            <div className="flex justify-between gap-4 text-xs text-gray-400 mt-1">
              <span>Sample size: n={tooltip.data.sampleSize.toLocaleString()}</span>
              {tooltip.data.reliability && (
                <span className="flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: RELIABILITY_COLORS[tooltip.data.reliability] }}
                  />
                  {tooltip.data.reliability} confidence
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const ElasticityTreemap = memo(ElasticityTreemapComponent);
