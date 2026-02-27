import { useEffect, useRef, useMemo, useState, memo } from 'react';
import * as d3 from 'd3';
import { GrowthRecord } from '../../types';
import { SIZE_CLASS_COLORS } from '../../utils/colors';
import { Card } from '../common/Card';
import { SkeletonChart } from '../common/Skeleton';
import { EmptyState } from '../common/StateIndicators';

interface GrowthDistributionProps {
  data?: GrowthRecord[] | null;
  height?: number;
  isLoading?: boolean;
  sizeClass?: string;
}

const MARGIN = { top: 40, right: 30, bottom: 60, left: 60 };
const MIN_DATA_POINTS = 3; // Minimum points needed for meaningful histogram

function GrowthDistributionComponent({
  data,
  height = 400,
  isLoading = false,
  sizeClass,
}: GrowthDistributionProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height });

  // Normalize data - handle null, undefined, and filter invalid values
  const safeData = useMemo(() => {
    if (!data) return [];
    if (!Array.isArray(data)) return [];
    return data.filter(d =>
      d &&
      typeof d.growth_cm2_yr === 'number' &&
      isFinite(d.growth_cm2_yr)
    );
  }, [data]);

  // Observe container size
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width } = entry.contentRect;
        if (width > 0) {
          setDimensions({ width, height });
        }
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [height]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (safeData.length === 0) return null;

    const rates = safeData.map((d) => d.growth_cm2_yr);
    const shrinkingCount = rates.filter((r) => r < 0).length;
    const growingCount = rates.filter((r) => r > 0).length;

    // Avoid division by zero
    const shrinking = rates.length > 0 ? shrinkingCount / rates.length : 0;
    const growing = rates.length > 0 ? growingCount / rates.length : 0;
    const mean = d3.mean(rates) ?? 0;
    const median = d3.median(rates) ?? 0;

    return { shrinking, growing, mean, median };
  }, [safeData]);

  // Draw the histogram
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Skip rendering if insufficient data
    if (safeData.length < MIN_DATA_POINTS) return;

    const { width } = dimensions;
    const innerWidth = Math.max(100, width - MARGIN.left - MARGIN.right);
    const innerHeight = Math.max(100, height - MARGIN.top - MARGIN.bottom);

    const growthRates = safeData.map((d) => d.growth_cm2_yr);

    // Create scales with safe extent calculation
    const xExtent = d3.extent(growthRates) as [number, number];
    if (!isFinite(xExtent[0]) || !isFinite(xExtent[1])) return;

    // Handle edge case where all values are the same
    const range = xExtent[1] - xExtent[0];
    const xPadding = range === 0 ? 10 : range * 0.1;

    const xScale = d3
      .scaleLinear()
      .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
      .range([0, innerWidth]);

    // Create histogram bins with dynamic threshold count
    const histogram = d3
      .bin<number, number>()
      .domain(xScale.domain() as [number, number])
      .thresholds(Math.min(40, Math.max(5, Math.floor(safeData.length / 3))));

    const bins = histogram(growthRates);

    // Ensure we have valid bins
    if (bins.length === 0) return;

    const maxBinLength = d3.max(bins, (d) => d.length) ?? 1;

    const yScale = d3
      .scaleLinear()
      .domain([0, maxBinLength])
      .range([innerHeight, 0])
      .nice();

    // Create main group
    const g = svg
      .append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // Add grid lines
    g.append('g')
      .attr('class', 'd3-grid')
      .selectAll('line')
      .data(yScale.ticks(5))
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d));

    // Draw zero line
    const xDomain = xScale.domain();
    if (xDomain[0] < 0 && xDomain[1] > 0) {
      g.append('line')
        .attr('x1', xScale(0))
        .attr('x2', xScale(0))
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#e07a5f')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4,4');

      g.append('text')
        .attr('x', xScale(0))
        .attr('y', -8)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('fill', '#e07a5f')
        .text('No change');
    }

    // Determine bar color
    const barColor = sizeClass
      ? SIZE_CLASS_COLORS[sizeClass.replace(/[^A-Z0-9]/gi, '').toUpperCase()] || '#2e86ab'
      : '#2e86ab';

    // Draw histogram bars
    g.selectAll('rect')
      .data(bins)
      .join('rect')
      .attr('class', 'd3-bar')
      .attr('x', (d) => xScale(d.x0 ?? 0))
      .attr('y', (d) => yScale(d.length))
      .attr('width', (d) => {
        const w = xScale(d.x1 ?? 0) - xScale(d.x0 ?? 0) - 1;
        return Math.max(0, w);
      })
      .attr('height', (d) => Math.max(0, innerHeight - yScale(d.length)))
      .attr('fill', barColor)
      .attr('opacity', 0.7)
      .attr('rx', 2);

    // Draw KDE curve (only if we have enough data)
    if (safeData.length >= 10) {
      const bandwidth = Math.max(1, range / 10);
      const kde = kernelDensityEstimator(
        kernelEpanechnikov(bandwidth),
        xScale.ticks(100)
      );
      const density = kde(growthRates);

      const maxDensity = d3.max(density, (d) => d[1]) ?? 0;
      if (maxDensity > 0) {
        const yDensityScale = d3
          .scaleLinear()
          .domain([0, maxDensity])
          .range([innerHeight, 0]);

        const line = d3
          .line<[number, number]>()
          .curve(d3.curveBasis)
          .x((d) => xScale(d[0]))
          .y((d) => yDensityScale(d[1]));

        const darkerColor = d3.color(barColor)?.darker(0.5)?.toString() ?? barColor;

        g.append('path')
          .datum(density)
          .attr('class', 'd3-line')
          .attr('d', line)
          .attr('stroke', darkerColor)
          .attr('stroke-width', 2);
      }
    }

    // X axis
    g.append('g')
      .attr('class', 'd3-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat((d) => `${d}`));

    // X axis label
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 45)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('fill', '#1a1a2e')
      .text('Annual Growth Rate (cm²/yr)');

    // Y axis
    g.append('g').attr('class', 'd3-axis').call(d3.axisLeft(yScale));

    // Y axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -45)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('fill', '#1a1a2e')
      .text('Count');

    // Title
    svg
      .append('text')
      .attr('x', dimensions.width / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', '600')
      .attr('fill', '#0a3d62')
      .text(sizeClass ? `Growth Distribution - ${sizeClass}` : 'Growth Rate Distribution');
  }, [safeData, dimensions, height, sizeClass]);

  // Show skeleton when loading
  if (isLoading) {
    return <SkeletonChart height={height} className="m-4" />;
  }

  return (
    <Card padding="none" className="relative overflow-hidden">
      <div ref={containerRef} className="w-full p-4">
        {safeData.length < MIN_DATA_POINTS ? (
          <EmptyState
            variant="no-data"
            title={safeData.length === 0 ? "No growth data" : "Insufficient data"}
            description={safeData.length === 0
              ? "No growth observations match the current filters."
              : `Only ${safeData.length} points available. At least ${MIN_DATA_POINTS} required.`
            }
            size="md"
          />
        ) : (
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={height}
            className="overflow-visible"
          />
        )}
      </div>

      {/* Statistics summary */}
      {stats && safeData.length >= MIN_DATA_POINTS && (
        <div className="flex flex-wrap gap-6 px-4 pb-4 border-t border-border-light pt-3">
          <div className="text-sm">
            <span className="text-text-muted">Mean:</span>{' '}
            <span className="font-mono font-medium text-ocean-deep">
              {stats.mean > 0 ? '+' : ''}
              {stats.mean.toFixed(1)} cm²/yr
            </span>
          </div>
          <div className="text-sm">
            <span className="text-text-muted">Shrinking:</span>{' '}
            <span className="font-mono font-medium text-coral-warm">
              {(stats.shrinking * 100).toFixed(0)}%
            </span>
          </div>
          <div className="text-sm">
            <span className="text-text-muted">Growing:</span>{' '}
            <span className="font-mono font-medium text-reef-green">
              {(stats.growing * 100).toFixed(0)}%
            </span>
          </div>
          <div className="text-sm">
            <span className="text-text-muted">n =</span>{' '}
            <span className="font-mono font-medium">{safeData.length.toLocaleString()}</span>
          </div>
        </div>
      )}
    </Card>
  );
}

// Kernel density estimation helpers with edge case handling
function kernelDensityEstimator(
  kernel: (v: number) => number,
  X: number[]
): (V: number[]) => [number, number][] {
  return function (V: number[]) {
    if (V.length === 0) return [];
    return X.map((x) => {
      const densityValue = d3.mean(V, (v) => kernel(x - v)) ?? 0;
      return [x, densityValue] as [number, number];
    });
  };
}

function kernelEpanechnikov(k: number): (v: number) => number {
  // Guard against division by zero
  const safeK = k === 0 ? 1 : k;
  return function (v: number) {
    const normalized = v / safeK;
    return Math.abs(normalized) <= 1 ? (0.75 * (1 - normalized * normalized)) / safeK : 0;
  };
}

// Memoize component to prevent unnecessary re-renders
export const GrowthDistribution = memo(GrowthDistributionComponent);
