/**
 * ElasticityMatrix - D3 heatmap showing full 5x5 elasticity matrix
 *
 * Visualizes the complete population elasticity matrix with:
 * - Color scale from white (0%) to coral for high elasticity
 * - Diagonal highlighted (stasis transitions)
 * - Cell labels with percentages
 * - Tooltips with transition description, sample size, reliability
 * - Responsive design
 */

import { useEffect, useRef, useState, useMemo, memo } from 'react';
import * as d3 from 'd3';
import { Loader2, AlertTriangle, Info } from 'lucide-react';
import { useElasticityMatrix } from '../../../hooks/useElasticityData';
import type { ElasticityMatrixCell, ReliabilityLevel } from '../../../types';

interface ElasticityMatrixProps {
  height?: number;
  showLabels?: boolean;
}

const RELIABILITY_COLORS: Record<ReliabilityLevel, string> = {
  'High': '#22c55e',
  'Moderate': '#eab308',
  'Low': '#f97316',
  'Very Low': '#ef4444',
  'None': '#991b1b',
  'Unknown': '#6b7280',
};

const TRANSITION_DESCRIPTIONS: Record<string, string> = {
  stasis: 'Survival & staying in same size class',
  growth: 'Growing to a larger size class',
  shrinkage: 'Shrinking to a smaller size class (or fragmentation)',
};

function ElasticityMatrixComponent({
  height = 450,
  showLabels = true,
}: ElasticityMatrixProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height });
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    data: ElasticityMatrixCell | null;
  }>({ visible: false, x: 0, y: 0, data: null });

  // Fetch data from API
  const { data: apiResponse, isLoading, isError } = useElasticityMatrix();

  const matrixData = useMemo(() => apiResponse?.data ?? [], [apiResponse]);
  const meta = apiResponse?.meta ?? { total_elasticity: 100, size_classes: 5, note: '' };
  const isUsingFallback = !apiResponse || meta.note?.includes('Fallback');

  // Get unique size classes maintaining order
  const sizeClasses = useMemo(() => ['SC1', 'SC2', 'SC3', 'SC4', 'SC5'], []);

  // Responsive sizing
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      if (width > 0) setDimensions({ width: Math.min(width, 600), height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [height]);

  // D3 rendering
  useEffect(() => {
    if (!svgRef.current || matrixData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width } = dimensions;
    const margin = { top: 80, right: 30, bottom: 60, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const cellSize = Math.min(innerWidth, innerHeight) / sizeClasses.length;
    const gridSize = cellSize * sizeClasses.length;

    // Center the grid
    const offsetX = (innerWidth - gridSize) / 2;
    const offsetY = (innerHeight - gridSize) / 2;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left + offsetX},${margin.top + offsetY})`);

    // Color scale - coral theme
    const maxElasticity: number = d3.max(matrixData, (d: ElasticityMatrixCell) => d.elasticity_pct) ?? 60;
    const colorScale = d3.scaleSequential()
      .domain([0, maxElasticity])
      .interpolator(d3.interpolate('#ffffff', '#e07a5f'));

    // Create cells
    matrixData.forEach((cell: ElasticityMatrixCell) => {
      const fromIndex = sizeClasses.indexOf(cell.from_short);
      const toIndex = sizeClasses.indexOf(cell.to_short);

      if (fromIndex === -1 || toIndex === -1) return;

      const x = fromIndex * cellSize;
      const y = toIndex * cellSize;
      const isDiagonal = fromIndex === toIndex;

      // Cell rectangle
      g.append('rect')
        .attr('x', x)
        .attr('y', y)
        .attr('width', cellSize - 2)
        .attr('height', cellSize - 2)
        .attr('fill', colorScale(cell.elasticity_pct))
        .attr('stroke', isDiagonal ? '#1e3a5f' : '#e5e7eb')
        .attr('stroke-width', isDiagonal ? 2 : 1)
        .attr('rx', 3)
        .style('cursor', 'pointer')
        .on('mouseenter', function(event) {
          const [mx, my] = d3.pointer(event, containerRef.current);
          setTooltip({
            visible: true,
            x: mx,
            y: my - 10,
            data: cell
          });
          d3.select(this)
            .attr('stroke', '#1e3a5f')
            .attr('stroke-width', 2);
        })
        .on('mouseleave', function() {
          setTooltip({ visible: false, x: 0, y: 0, data: null });
          d3.select(this)
            .attr('stroke', isDiagonal ? '#1e3a5f' : '#e5e7eb')
            .attr('stroke-width', isDiagonal ? 2 : 1);
        });

      // Cell labels (only for cells with >0.5% elasticity)
      if (showLabels && cell.elasticity_pct > 0.5) {
        const textColor = cell.elasticity_pct > maxElasticity * 0.5 ? '#ffffff' : '#1e3a5f';
        const fontSize = cellSize > 60 ? 14 : cellSize > 45 ? 12 : 10;

        g.append('text')
          .attr('x', x + (cellSize - 2) / 2)
          .attr('y', y + (cellSize - 2) / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', textColor)
          .attr('font-size', `${fontSize}px`)
          .attr('font-weight', cell.elasticity_pct > 5 ? '600' : '400')
          .text(cell.elasticity_pct >= 1 ? `${cell.elasticity_pct.toFixed(1)}%` : '<1%')
          .style('pointer-events', 'none');
      }
    });

    // Row labels (From: initial size class)
    sizeClasses.forEach((sc, i) => {
      g.append('text')
        .attr('x', i * cellSize + (cellSize - 2) / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', '500')
        .attr('fill', '#374151')
        .text(sc);
    });

    // Column labels (To: final size class)
    sizeClasses.forEach((sc, i) => {
      g.append('text')
        .attr('x', -10)
        .attr('y', i * cellSize + (cellSize - 2) / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', '500')
        .attr('fill', '#374151')
        .text(sc);
    });

    // Axis titles
    svg.append('text')
      .attr('x', margin.left + offsetX + gridSize / 2)
      .attr('y', margin.top + offsetY - 35)
      .attr('text-anchor', 'middle')
      .attr('font-size', '13px')
      .attr('fill', '#6b7280')
      .text('Initial Size Class (columns)');

    svg.append('text')
      .attr('transform', `rotate(-90)`)
      .attr('x', -(margin.top + offsetY + gridSize / 2))
      .attr('y', margin.left + offsetX - 40)
      .attr('text-anchor', 'middle')
      .attr('font-size', '13px')
      .attr('fill', '#6b7280')
      .text('Final Size Class (rows)');

    // Title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .attr('font-size', '18px')
      .attr('font-weight', '600')
      .attr('fill', '#1e3a5f')
      .text('Elasticity Matrix');

    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 45)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#64748b')
      .text('Sensitivity of λ to each transition rate (%)');

    // Color legend
    const legendWidth = 150;
    const legendHeight = 12;
    const legendX = width - margin.right - legendWidth;
    const legendY = height - 25;

    // Gradient definition
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'elasticity-gradient');

    gradient.selectAll('stop')
      .data([
        { offset: '0%', color: '#ffffff' },
        { offset: '100%', color: '#e07a5f' }
      ])
      .enter()
      .append('stop')
      .attr('offset', d => d.offset)
      .attr('stop-color', d => d.color);

    svg.append('rect')
      .attr('x', legendX)
      .attr('y', legendY)
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .attr('fill', 'url(#elasticity-gradient)')
      .attr('stroke', '#e5e7eb')
      .attr('rx', 2);

    svg.append('text')
      .attr('x', legendX)
      .attr('y', legendY - 5)
      .attr('font-size', '10px')
      .attr('fill', '#6b7280')
      .text('0%');

    svg.append('text')
      .attr('x', legendX + legendWidth)
      .attr('y', legendY - 5)
      .attr('text-anchor', 'end')
      .attr('font-size', '10px')
      .attr('fill', '#6b7280')
      .text(`${maxElasticity.toFixed(0)}%`);

    // Diagonal indicator
    svg.append('text')
      .attr('x', margin.left)
      .attr('y', legendY + legendHeight / 2)
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#6b7280')
      .html('◼ Diagonal = stasis (survival in same class)');

  }, [matrixData, dimensions, height, showLabels, sizeClasses]);

  // Loading state
  if (isLoading) {
    return (
      <div ref={containerRef} className="relative w-full flex items-center justify-center" style={{ height }}>
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-sm">Loading matrix data...</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (!matrixData.length) {
    return (
      <div ref={containerRef} className="relative w-full flex items-center justify-center" style={{ height }}>
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <AlertTriangle className="w-8 h-8" />
          <span className="text-sm">No elasticity matrix data available</span>
        </div>
      </div>
    );
  }

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
        className="overflow-visible mx-auto"
        role="img"
        aria-label="Elasticity matrix heatmap showing how sensitive population growth rate is to changes in each size class transition"
      />

      {/* Reading guide */}
      <div className="mt-2 mx-4 flex items-start gap-2 text-xs text-gray-500">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          Read as: column → row transition. Example: SC4 column, SC5 row = growing from small to large adult.
          Diagonal cells represent stasis (staying in the same size class).
        </span>
      </div>

      {/* Tooltip */}
      {tooltip.visible && tooltip.data && (
        <div
          className="absolute bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg pointer-events-none z-10 max-w-xs"
          style={{
            left: Math.min(tooltip.x, dimensions.width - 220),
            top: Math.max(tooltip.y - 10, 10),
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="font-semibold">
            {tooltip.data.from_label} → {tooltip.data.to_label}
          </div>
          <div className="text-2xl font-bold text-orange-300">
            {tooltip.data.elasticity_pct.toFixed(2)}%
          </div>
          <div className="text-xs text-gray-300 mt-1">
            {TRANSITION_DESCRIPTIONS[tooltip.data.transition_type] || tooltip.data.transition_type}
          </div>
          <div className="flex flex-col gap-1 text-xs text-gray-400 mt-2 pt-2 border-t border-gray-700">
            <div className="flex justify-between">
              <span>Raw elasticity:</span>
              <span>{tooltip.data.elasticity.toFixed(4)}</span>
            </div>
            {tooltip.data.n_observations !== undefined && (
              <div className="flex justify-between">
                <span>Sample size:</span>
                <span>n = {tooltip.data.n_observations.toLocaleString()}</span>
              </div>
            )}
            {tooltip.data.reliability && (
              <div className="flex justify-between items-center">
                <span>Confidence:</span>
                <span className="flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: RELIABILITY_COLORS[tooltip.data.reliability] }}
                  />
                  {tooltip.data.reliability}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const ElasticityMatrix = memo(ElasticityMatrixComponent);
