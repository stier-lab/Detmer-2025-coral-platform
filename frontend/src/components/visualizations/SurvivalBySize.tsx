import { useEffect, useRef, useState, useMemo, memo } from 'react';
import * as d3 from 'd3';
import { SurvivalBySize as SurvivalBySizeType } from '../../types';
import { SIZE_CLASS_COLORS } from '../../utils/colors';
import { Card } from '../common/Card';
import { LoadingOverlay } from '../common/LoadingSpinner';
import { NoChartData } from '../common/EmptyState';

interface SurvivalBySizeProps {
  data: SurvivalBySizeType[];
  height?: number;
  isLoading?: boolean;
}

const MARGIN = { top: 50, right: 30, bottom: 60, left: 60 };

function SurvivalBySizeComponent({
  data,
  height = 350,
  isLoading = false,
}: SurvivalBySizeProps) {
  // Validate and filter data
  const safeData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data.filter(d =>
      d &&
      typeof d.size_class === 'string' &&
      typeof d.survival_rate === 'number' &&
      !isNaN(d.survival_rate)
    );
  }, [data]);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height });

  // Observe container size
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [height]);

  // Draw the bar chart
  useEffect(() => {
    if (!svgRef.current || safeData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width } = dimensions;
    const innerWidth = width - MARGIN.left - MARGIN.right;
    const innerHeight = height - MARGIN.top - MARGIN.bottom;

    // Create scales
    const xScale = d3
      .scaleBand()
      .domain(safeData.map((d) => d.size_class))
      .range([0, innerWidth])
      .padding(0.3);

    const yScale = d3.scaleLinear().domain([0, 1]).range([innerHeight, 0]);

    // Create main group
    const g = svg
      .append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // Grid lines
    g.append('g')
      .attr('class', 'd3-grid')
      .selectAll('line')
      .data(yScale.ticks(5))
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d));

    // Draw bars
    g.selectAll('rect.bar')
      .data(safeData)
      .join('rect')
      .attr('class', 'bar d3-bar')
      .attr('x', (d) => xScale(d.size_class) || 0)
      .attr('y', (d) => yScale(d.survival_rate))
      .attr('width', xScale.bandwidth())
      .attr('height', (d) => innerHeight - yScale(d.survival_rate))
      .attr('fill', (d) => {
        const classKey = d.size_class.split(' ')[0].toUpperCase();
        return SIZE_CLASS_COLORS[classKey] || '#2e86ab';
      })
      .attr('rx', 4);

    // Error bars
    g.selectAll('line.error-upper')
      .data(safeData)
      .join('line')
      .attr('class', 'error-upper')
      .attr('x1', (d) => (xScale(d.size_class) || 0) + xScale.bandwidth() / 2)
      .attr('x2', (d) => (xScale(d.size_class) || 0) + xScale.bandwidth() / 2)
      .attr('y1', (d) => yScale(d.survival_rate))
      .attr('y2', (d) => yScale(Math.min(1, d.ci_upper)))
      .attr('stroke', '#1a1a2e')
      .attr('stroke-width', 1.5);

    g.selectAll('line.error-lower')
      .data(safeData)
      .join('line')
      .attr('class', 'error-lower')
      .attr('x1', (d) => (xScale(d.size_class) || 0) + xScale.bandwidth() / 2)
      .attr('x2', (d) => (xScale(d.size_class) || 0) + xScale.bandwidth() / 2)
      .attr('y1', (d) => yScale(d.survival_rate))
      .attr('y2', (d) => yScale(Math.max(0, d.ci_lower)))
      .attr('stroke', '#1a1a2e')
      .attr('stroke-width', 1.5);

    // Error bar caps
    const capWidth = 8;
    g.selectAll('line.cap-upper')
      .data(safeData)
      .join('line')
      .attr('class', 'cap-upper')
      .attr('x1', (d) => (xScale(d.size_class) || 0) + xScale.bandwidth() / 2 - capWidth / 2)
      .attr('x2', (d) => (xScale(d.size_class) || 0) + xScale.bandwidth() / 2 + capWidth / 2)
      .attr('y1', (d) => yScale(Math.min(1, d.ci_upper)))
      .attr('y2', (d) => yScale(Math.min(1, d.ci_upper)))
      .attr('stroke', '#1a1a2e')
      .attr('stroke-width', 1.5);

    g.selectAll('line.cap-lower')
      .data(safeData)
      .join('line')
      .attr('class', 'cap-lower')
      .attr('x1', (d) => (xScale(d.size_class) || 0) + xScale.bandwidth() / 2 - capWidth / 2)
      .attr('x2', (d) => (xScale(d.size_class) || 0) + xScale.bandwidth() / 2 + capWidth / 2)
      .attr('y1', (d) => yScale(Math.max(0, d.ci_lower)))
      .attr('y2', (d) => yScale(Math.max(0, d.ci_lower)))
      .attr('stroke', '#1a1a2e')
      .attr('stroke-width', 1.5);

    // Value labels
    g.selectAll('text.value')
      .data(safeData)
      .join('text')
      .attr('class', 'value')
      .attr('x', (d) => (xScale(d.size_class) || 0) + xScale.bandwidth() / 2)
      .attr('y', (d) => yScale(d.survival_rate) - 8)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('fill', '#1a1a2e')
      .text((d) => `${(d.survival_rate * 100).toFixed(0)}%`);

    // Sample size labels
    g.selectAll('text.n')
      .data(safeData)
      .join('text')
      .attr('class', 'n')
      .attr('x', (d) => (xScale(d.size_class) || 0) + xScale.bandwidth() / 2)
      .attr('y', innerHeight + 35)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('fill', '#5d6d7e')
      .text((d) => `n=${d.n}`);

    // X axis
    g.append('g')
      .attr('class', 'd3-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickSizeOuter(0))
      .selectAll('text')
      .attr('font-size', '11px');

    // Y axis
    g.append('g')
      .attr('class', 'd3-axis')
      .call(d3.axisLeft(yScale).tickFormat(d3.format('.0%')));

    // Y axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -45)
      .attr('text-anchor', 'middle')
      .attr('font-size', '13px')
      .attr('fill', '#5d6d7e')
      .text('Annual Survival Rate');

    // Title
    svg
      .append('text')
      .attr('x', dimensions.width / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', '600')
      .attr('fill', '#0a3d62')
      .text('Survival Rate by Size Class');
  }, [safeData, dimensions, height]);

  // Show empty state when no data after loading
  if (!isLoading && safeData.length === 0) {
    return (
      <Card padding="none" className="relative overflow-hidden">
        <NoChartData
          chartType="survival by size"
          variant="compact"
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
export const SurvivalBySize = memo(SurvivalBySizeComponent);
