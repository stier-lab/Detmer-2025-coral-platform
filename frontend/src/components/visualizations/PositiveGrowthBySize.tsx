import { useEffect, useRef, useState, useMemo, memo } from 'react';
import * as d3 from 'd3';
import { PositiveGrowthResponse } from '../../types';
import { Card } from '../common/Card';
import { LoadingOverlay } from '../common/LoadingSpinner';
import { EmptyState } from '../common/StateIndicators';

interface PositiveGrowthBySizeProps {
  data: PositiveGrowthResponse | null | undefined;
  height?: number;
  isLoading?: boolean;
  showThresholds?: boolean;
}

const MARGIN = { top: 50, right: 30, bottom: 70, left: 70 };
const SIZE_CLASS_BOUNDARIES = [25, 100, 500, 2000];

function PositiveGrowthBySizeComponent({
  data,
  height = 420,
  isLoading = false,
  showThresholds = true,
}: PositiveGrowthBySizeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 700, height });

  // Validate data
  const hasData = useMemo(() => {
    return data?.predictions && Array.isArray(data.predictions) && data.predictions.length > 0;
  }, [data]);

  // Observe container size
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      if (width > 0) {
        setDimensions({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [height]);

  // Draw the chart
  useEffect(() => {
    if (!svgRef.current || !hasData || !data) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width } = dimensions;
    const innerWidth = Math.max(100, width - MARGIN.left - MARGIN.right);
    const innerHeight = Math.max(100, height - MARGIN.top - MARGIN.bottom);

    const predictions = data.predictions;
    const binned = data.binned || [];

    // Get max size from predictions
    const maxSize = d3.max(predictions, d => d.size_cm2) || 10000;

    // Create scales
    const xScale = d3
      .scaleLog()
      .domain([1, maxSize])
      .range([0, innerWidth])
      .nice();

    const yScale = d3
      .scaleLinear()
      .domain([0, 100])
      .range([innerHeight, 0]);

    // Create main group
    const g = svg
      .append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // Add grid lines
    g.append('g')
      .attr('class', 'd3-grid')
      .selectAll('line')
      .data([0, 25, 50, 75, 100])
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', '#e5e7eb')
      .attr('stroke-dasharray', '3,3');

    // Add size class boundary lines
    const xDomain = xScale.domain();
    g.append('g')
      .attr('class', 'size-boundaries')
      .selectAll('line')
      .data(SIZE_CLASS_BOUNDARIES.filter(b => b > xDomain[0] && b < xDomain[1]))
      .join('line')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#cbd5e1')
      .attr('stroke-dasharray', '4,4')
      .attr('stroke-width', 1);

    // Add size class labels at top
    g.append('g')
      .attr('class', 'size-labels')
      .selectAll('text')
      .data(SIZE_CLASS_BOUNDARIES.filter(b => b > xDomain[0] && b < xDomain[1]))
      .join('text')
      .attr('x', d => xScale(d))
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#94a3b8')
      .text((_, i) => `SC${i + 2}`);

    // Add 50% reference line
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', yScale(50))
      .attr('y2', yScale(50))
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '6,4');

    g.append('text')
      .attr('x', innerWidth - 5)
      .attr('y', yScale(50) - 5)
      .attr('text-anchor', 'end')
      .attr('font-size', '11px')
      .attr('fill', '#64748b')
      .text('50% threshold');

    // Draw confidence interval band
    const areaGenerator = d3
      .area<{ size_cm2: number; ci_lower: number; ci_upper: number }>()
      .x(d => xScale(Math.max(1, d.size_cm2)))
      .y0(d => yScale(Math.max(0, d.ci_lower * 100)))
      .y1(d => yScale(Math.min(100, d.ci_upper * 100)))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(predictions)
      .attr('d', areaGenerator)
      .attr('fill', '#2a9d8f')
      .attr('opacity', 0.15);

    // Draw model line
    const lineGenerator = d3
      .line<{ size_cm2: number; prob_positive: number }>()
      .x(d => xScale(Math.max(1, d.size_cm2)))
      .y(d => yScale(d.prob_positive * 100))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(predictions)
      .attr('d', lineGenerator)
      .attr('fill', 'none')
      .attr('stroke', '#2a9d8f')
      .attr('stroke-width', 3);

    // Draw binned data points
    if (binned.length > 0) {
      g.selectAll('circle.binned')
        .data(binned)
        .join('circle')
        .attr('class', 'binned')
        .attr('cx', d => xScale(Math.max(1, d.size_cm2)))
        .attr('cy', d => yScale(d.pct_positive))
        .attr('r', d => Math.max(4, Math.min(10, Math.sqrt(d.n) / 2)))
        .attr('fill', '#0a3d62')
        .attr('opacity', 0.6)
        .attr('stroke', 'white')
        .attr('stroke-width', 1);
    }

    // Draw threshold indicators if enabled
    if (showThresholds && data.thresholds) {
      const { threshold_70_cm2 } = data.thresholds;

      // 70% threshold line (primary)
      if (threshold_70_cm2 && threshold_70_cm2 > xDomain[0] && threshold_70_cm2 < xDomain[1]) {
        g.append('line')
          .attr('x1', xScale(threshold_70_cm2))
          .attr('x2', xScale(threshold_70_cm2))
          .attr('y1', yScale(70))
          .attr('y2', innerHeight)
          .attr('stroke', '#059669')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '4,2');

        g.append('circle')
          .attr('cx', xScale(threshold_70_cm2))
          .attr('cy', yScale(70))
          .attr('r', 6)
          .attr('fill', '#059669')
          .attr('stroke', 'white')
          .attr('stroke-width', 2);

        g.append('text')
          .attr('x', xScale(threshold_70_cm2) + 8)
          .attr('y', yScale(70) + 4)
          .attr('font-size', '11px')
          .attr('font-weight', '600')
          .attr('fill', '#059669')
          .text(`${threshold_70_cm2} cm²`);
      }
    }

    // X axis
    g.append('g')
      .attr('class', 'd3-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(xScale)
          .tickValues([1, 10, 100, 1000, 10000].filter(v => v <= maxSize))
          .tickFormat(d => d.toLocaleString())
      );

    // X axis label
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 50)
      .attr('text-anchor', 'middle')
      .attr('font-size', '13px')
      .attr('fill', '#374151')
      .text('Colony Size (cm²)');

    // Y axis
    g.append('g')
      .attr('class', 'd3-axis')
      .call(d3.axisLeft(yScale).tickFormat(d => `${d}%`));

    // Y axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -50)
      .attr('text-anchor', 'middle')
      .attr('font-size', '13px')
      .attr('fill', '#374151')
      .text('Probability of Positive Growth');

    // Title
    svg
      .append('text')
      .attr('x', dimensions.width / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', '600')
      .attr('fill', '#0a3d62')
      .text('Size-Dependent Growth Probability');

  }, [data, hasData, dimensions, height, showThresholds]);

  if (!hasData && !isLoading) {
    return (
      <Card className="relative overflow-hidden">
        <EmptyState
          variant="no-data"
          title="No growth data"
          description="No growth probability data available for the current filters."
          size="md"
        />
      </Card>
    );
  }

  return (
    <Card padding="none" className="relative overflow-hidden">
      {isLoading && <LoadingOverlay />}

      <div ref={containerRef} className="w-full p-4">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={height}
          className="overflow-visible"
        />
      </div>

      {/* Statistics summary */}
      {data?.stats && (
        <div className="flex flex-wrap gap-6 px-4 pb-4 border-t border-border-light pt-3">
          <div className="text-sm">
            <span className="text-text-muted">Growing:</span>{' '}
            <span className="font-mono font-medium text-reef-green">
              {data.stats.pct_positive}%
            </span>
          </div>
          <div className="text-sm">
            <span className="text-text-muted">Shrinking:</span>{' '}
            <span className="font-mono font-medium text-coral-warm">
              {data.stats.pct_shrinking}%
            </span>
          </div>
          {data.thresholds?.threshold_70_cm2 && (
            <div className="text-sm">
              <span className="text-text-muted">70% growth threshold:</span>{' '}
              <span className="font-mono font-medium text-ocean-deep">
                {data.thresholds.threshold_70_cm2} cm²
              </span>
            </div>
          )}
          <div className="text-sm">
            <span className="text-text-muted">n =</span>{' '}
            <span className="font-mono font-medium">
              {data.stats.n?.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Interpretation */}
      {data?.stats?.interpretation && (
        <div className="px-4 pb-4">
          <p className="text-sm text-text-secondary italic">
            {data.stats.interpretation}
          </p>
        </div>
      )}
    </Card>
  );
}

export const PositiveGrowthBySize = memo(PositiveGrowthBySizeComponent);
