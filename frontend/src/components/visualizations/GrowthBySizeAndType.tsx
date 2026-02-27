import { useEffect, useRef, useState, useMemo, memo } from 'react';
import * as d3 from 'd3';
import { GrowthBySizeAndType as GrowthBySizeAndTypeData } from '../../types';
import { Card } from '../common/Card';
import { LoadingOverlay } from '../common/LoadingSpinner';
import { EmptyState } from '../common/StateIndicators';

interface GrowthBySizeAndTypeProps {
  data: GrowthBySizeAndTypeData[];
  height?: number;
  isLoading?: boolean;
}

const MARGIN = { top: 50, right: 140, bottom: 80, left: 70 };

// Colors for natural vs restored corals
const CORAL_TYPE_COLORS = {
  Natural: '#0a3d62',  // Deep ocean blue
  Restored: '#2a9d8f', // Teal/coral green
};

function GrowthBySizeAndTypeComponent({
  data,
  height = 400,
  isLoading = false,
}: GrowthBySizeAndTypeProps) {
  const safeData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data.filter(
      (d) =>
        d &&
        typeof d.size_class === 'string' &&
        typeof d.mean_growth === 'number' &&
        !isNaN(d.mean_growth) &&
        typeof d.coral_type === 'string'
    );
  }, [data]);

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 700, height });

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [height]);

  useEffect(() => {
    if (!svgRef.current || safeData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width } = dimensions;
    const innerWidth = width - MARGIN.left - MARGIN.right;
    const innerHeight = height - MARGIN.top - MARGIN.bottom;

    // Get unique size classes and coral types
    const sizeClasses = [...new Set(safeData.map((d) => d.size_class))].sort();
    const coralTypes = ['Natural', 'Restored'];

    // Create grouped bar scale
    const x0Scale = d3
      .scaleBand()
      .domain(sizeClasses)
      .range([0, innerWidth])
      .padding(0.2);

    const x1Scale = d3
      .scaleBand()
      .domain(coralTypes)
      .range([0, x0Scale.bandwidth()])
      .padding(0.1);

    const yMax = d3.max(safeData, (d) => Math.max(d.ci_upper, d.mean_growth)) || 100;
    const yMin = d3.min(safeData, (d) => Math.min(d.ci_lower, d.mean_growth)) || 0;
    const yPadding = (yMax - yMin) * 0.1;

    const yScale = d3
      .scaleLinear()
      .domain([Math.min(0, yMin - yPadding), yMax + yPadding])
      .range([innerHeight, 0]);

    // Create main group
    const g = svg
      .append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // Grid lines
    g.append('g')
      .attr('class', 'd3-grid')
      .selectAll('line')
      .data(yScale.ticks(6))
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', '#e5e7eb')
      .attr('stroke-dasharray', '3,3');

    // Zero line
    if (yScale.domain()[0] < 0) {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yScale(0))
        .attr('y2', yScale(0))
        .attr('stroke', '#9ca3af')
        .attr('stroke-width', 1);
    }

    // Draw bars for each size class group
    const sizeGroups = g
      .selectAll('g.size-group')
      .data(sizeClasses)
      .join('g')
      .attr('class', 'size-group')
      .attr('transform', (d) => `translate(${x0Scale(d)},0)`);

    // Draw bars within each group
    sizeGroups.each(function (sizeClass) {
      const group = d3.select(this);
      const sizeData = safeData.filter((d) => d.size_class === sizeClass);

      // Bars
      group
        .selectAll('rect.bar')
        .data(sizeData)
        .join('rect')
        .attr('class', 'bar')
        .attr('x', (d) => x1Scale(d.coral_type) || 0)
        .attr('y', (d) => (d.mean_growth >= 0 ? yScale(d.mean_growth) : yScale(0)))
        .attr('width', x1Scale.bandwidth())
        .attr('height', (d) =>
          Math.abs(yScale(0) - yScale(d.mean_growth))
        )
        .attr('fill', (d) => CORAL_TYPE_COLORS[d.coral_type as keyof typeof CORAL_TYPE_COLORS])
        .attr('rx', 3)
        .attr('opacity', 0.85);

      // Error bars
      group
        .selectAll('line.error')
        .data(sizeData)
        .join('line')
        .attr('class', 'error')
        .attr('x1', (d) => (x1Scale(d.coral_type) || 0) + x1Scale.bandwidth() / 2)
        .attr('x2', (d) => (x1Scale(d.coral_type) || 0) + x1Scale.bandwidth() / 2)
        .attr('y1', (d) => yScale(d.ci_upper))
        .attr('y2', (d) => yScale(d.ci_lower))
        .attr('stroke', '#374151')
        .attr('stroke-width', 1.5);

      // Error bar caps
      const capWidth = 6;
      group
        .selectAll('line.cap-upper')
        .data(sizeData)
        .join('line')
        .attr('class', 'cap-upper')
        .attr('x1', (d) => (x1Scale(d.coral_type) || 0) + x1Scale.bandwidth() / 2 - capWidth / 2)
        .attr('x2', (d) => (x1Scale(d.coral_type) || 0) + x1Scale.bandwidth() / 2 + capWidth / 2)
        .attr('y1', (d) => yScale(d.ci_upper))
        .attr('y2', (d) => yScale(d.ci_upper))
        .attr('stroke', '#374151')
        .attr('stroke-width', 1.5);

      group
        .selectAll('line.cap-lower')
        .data(sizeData)
        .join('line')
        .attr('class', 'cap-lower')
        .attr('x1', (d) => (x1Scale(d.coral_type) || 0) + x1Scale.bandwidth() / 2 - capWidth / 2)
        .attr('x2', (d) => (x1Scale(d.coral_type) || 0) + x1Scale.bandwidth() / 2 + capWidth / 2)
        .attr('y1', (d) => yScale(d.ci_lower))
        .attr('y2', (d) => yScale(d.ci_lower))
        .attr('stroke', '#374151')
        .attr('stroke-width', 1.5);

      // Sample size labels
      group
        .selectAll('text.n')
        .data(sizeData)
        .join('text')
        .attr('class', 'n')
        .attr('x', (d) => (x1Scale(d.coral_type) || 0) + x1Scale.bandwidth() / 2)
        .attr('y', innerHeight + 25)
        .attr('text-anchor', 'middle')
        .attr('font-size', '9px')
        .attr('font-family', 'JetBrains Mono, monospace')
        .attr('fill', (d) => CORAL_TYPE_COLORS[d.coral_type as keyof typeof CORAL_TYPE_COLORS])
        .text((d) => `n=${d.n}`);
    });

    // X axis
    g.append('g')
      .attr('class', 'd3-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x0Scale).tickSizeOuter(0))
      .selectAll('text')
      .attr('font-size', '10px')
      .attr('transform', 'rotate(-20)')
      .attr('text-anchor', 'end');

    // Y axis
    g.append('g')
      .attr('class', 'd3-axis')
      .call(d3.axisLeft(yScale).ticks(6).tickFormat((d) => `${d}`));

    // Y axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -50)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#5d6d7e')
      .text('Growth Rate (cm²/yr)');

    // Title
    svg
      .append('text')
      .attr('x', dimensions.width / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .attr('font-size', '15px')
      .attr('font-weight', '600')
      .attr('fill', '#0a3d62')
      .text('Growth by Size: Natural vs Restored Corals');

    // Legend
    const legend = svg
      .append('g')
      .attr('transform', `translate(${width - MARGIN.right + 15}, ${MARGIN.top + 10})`);

    coralTypes.forEach((type, i) => {
      const lg = legend.append('g').attr('transform', `translate(0, ${i * 25})`);

      lg.append('rect')
        .attr('width', 16)
        .attr('height', 16)
        .attr('fill', CORAL_TYPE_COLORS[type as keyof typeof CORAL_TYPE_COLORS])
        .attr('rx', 3);

      lg.append('text')
        .attr('x', 22)
        .attr('y', 12)
        .attr('font-size', '12px')
        .attr('fill', '#374151')
        .text(type);
    });
  }, [safeData, dimensions, height]);

  if (safeData.length === 0 && !isLoading) {
    return (
      <Card className="relative overflow-hidden">
        <EmptyState
          variant="no-data"
          title="No comparison data"
          description="No data available for natural vs restored growth comparison."
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
    </Card>
  );
}

// Memoize component to prevent unnecessary re-renders
export const GrowthBySizeAndType = memo(GrowthBySizeAndTypeComponent);
