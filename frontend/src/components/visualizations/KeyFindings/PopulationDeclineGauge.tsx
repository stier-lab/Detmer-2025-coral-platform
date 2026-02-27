/**
 * PopulationDeclineGauge - Animated gauge showing population growth rate (λ)
 *
 * Publication-quality visualization showing:
 * - Animated arc gauge with λ value
 * - Color gradient from red (declining) to green (growing)
 * - 95% CI range indicator
 * - Probability of decline annotation
 */

import { useEffect, useRef, useState, memo } from 'react';
import * as d3 from 'd3';

interface PopulationDeclineGaugeProps {
  lambda?: number;
  ciLower?: number;
  ciUpper?: number;
  probDecline?: number;
  height?: number;
}

const COLORS = {
  decline: '#dc2626',      // Red for declining
  stable: '#f59e0b',       // Amber for stable
  growing: '#10b981',      // Green for growing
  background: '#e5e7eb',
  text: '#1e3a5f',
  textSecondary: '#64748b',
  ci: '#94a3b8',
};

function PopulationDeclineGaugeComponent({
  lambda = 0.986,
  ciLower = 0.819,
  ciUpper = 1.020,
  probDecline = 87.3,
  height = 300,
}: PopulationDeclineGaugeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height });
  const hasAnimatedRef = useRef(false);
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; content: string }>({
    visible: false, x: 0, y: 0, content: ''
  });

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
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width } = dimensions;
    const centerX = width / 2;
    const centerY = height * 0.55;
    const outerRadius = Math.min(width, height) * 0.38;
    const innerRadius = outerRadius * 0.7;
    const ciRadius = outerRadius * 0.85;

    // Scale: lambda 0.8 to 1.1 maps to angle -135° to 135°
    const lambdaScale = d3.scaleLinear()
      .domain([0.8, 1.1])
      .range([-Math.PI * 0.75, Math.PI * 0.75])
      .clamp(true);

    // Color scale
    const colorScale = d3.scaleLinear<string>()
      .domain([0.8, 1.0, 1.1])
      .range([COLORS.decline, COLORS.stable, COLORS.growing]);

    // Background arc
    const backgroundArc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)
      .startAngle(-Math.PI * 0.75)
      .endAngle(Math.PI * 0.75)
      .cornerRadius(4);

    svg.append('path')
      .attr('d', backgroundArc as unknown as string)
      .attr('transform', `translate(${centerX},${centerY})`)
      .attr('fill', COLORS.background);

    // Create gradient for value arc
    const gradientId = 'lambda-gradient';
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', gradientId)
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', centerX - outerRadius)
      .attr('y1', centerY)
      .attr('x2', centerX + outerRadius)
      .attr('y2', centerY);

    gradient.append('stop').attr('offset', '0%').attr('stop-color', COLORS.decline);
    gradient.append('stop').attr('offset', '50%').attr('stop-color', COLORS.stable);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', COLORS.growing);

    // Value arc - use D3 transitions for animation instead of React state
    const shouldAnimate = !hasAnimatedRef.current;
    hasAnimatedRef.current = true;

    const valueArcGenerator = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)
      .cornerRadius(4);

    const startArcAngle = lambdaScale(1.0);
    const finalArcAngle = lambdaScale(lambda);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arcFn = valueArcGenerator as any;
    const valueArcPath = svg.append('path')
      .attr('transform', `translate(${centerX},${centerY})`)
      .attr('fill', colorScale(lambda));

    if (shouldAnimate) {
      valueArcPath
        .attr('d', arcFn({ startAngle: -Math.PI * 0.75, endAngle: startArcAngle }))
        .transition()
        .duration(1500)
        .ease(d3.easeCubicOut)
        .attrTween('d', function() {
          const interpolate = d3.interpolate(startArcAngle, finalArcAngle);
          return function(t: number) {
            return arcFn({ startAngle: -Math.PI * 0.75, endAngle: interpolate(t) });
          };
        });
    } else {
      valueArcPath.attr('d', arcFn({ startAngle: -Math.PI * 0.75, endAngle: finalArcAngle }));
    }

    // CI arc (thin band)
    const ciArc = d3.arc()
      .innerRadius(ciRadius - 3)
      .outerRadius(ciRadius + 3)
      .startAngle(lambdaScale(ciLower))
      .endAngle(lambdaScale(ciUpper))
      .cornerRadius(2);

    svg.append('path')
      .attr('d', ciArc as unknown as string)
      .attr('transform', `translate(${centerX},${centerY})`)
      .attr('fill', COLORS.ci)
      .attr('opacity', 0.7)
      .style('cursor', 'pointer')
      .on('mouseenter', (event) => {
        const [x, y] = d3.pointer(event, containerRef.current);
        setTooltip({
          visible: true,
          x,
          y: y - 10,
          content: `95% CI: ${ciLower.toFixed(3)} – ${ciUpper.toFixed(3)}`
        });
      })
      .on('mouseleave', () => setTooltip({ visible: false, x: 0, y: 0, content: '' }));

    // Reference line at λ = 1
    const refAngle = lambdaScale(1);
    const refX1 = centerX + Math.sin(refAngle) * (innerRadius - 5);
    const refY1 = centerY - Math.cos(refAngle) * (innerRadius - 5);
    const refX2 = centerX + Math.sin(refAngle) * (outerRadius + 10);
    const refY2 = centerY - Math.cos(refAngle) * (outerRadius + 10);

    svg.append('line')
      .attr('x1', refX1)
      .attr('y1', refY1)
      .attr('x2', refX2)
      .attr('y2', refY2)
      .attr('stroke', COLORS.text)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,2');

    svg.append('text')
      .attr('x', refX2 + 5)
      .attr('y', refY2)
      .attr('font-size', '11px')
      .attr('fill', COLORS.textSecondary)
      .attr('dominant-baseline', 'middle')
      .text('λ = 1 (stable)');

    // Needle
    const needleAngle = lambdaScale(lambda);
    const needleLength = outerRadius * 0.65;
    const needleX = centerX + Math.sin(needleAngle) * needleLength;
    const needleY = centerY - Math.cos(needleAngle) * needleLength;

    const needleLine = svg.append('line')
      .attr('x1', centerX)
      .attr('y1', centerY)
      .attr('stroke', COLORS.text)
      .attr('stroke-width', 3)
      .attr('stroke-linecap', 'round');

    if (shouldAnimate) {
      const startNeedleAngle = lambdaScale(1.0);
      const startNeedleX = centerX + Math.sin(startNeedleAngle) * needleLength;
      const startNeedleY = centerY - Math.cos(startNeedleAngle) * needleLength;
      needleLine
        .attr('x2', startNeedleX)
        .attr('y2', startNeedleY)
        .transition()
        .duration(1500)
        .ease(d3.easeCubicOut)
        .attr('x2', needleX)
        .attr('y2', needleY);
    } else {
      needleLine.attr('x2', needleX).attr('y2', needleY);
    }

    svg.append('circle')
      .attr('cx', centerX)
      .attr('cy', centerY)
      .attr('r', 8)
      .attr('fill', COLORS.text);

    // Central value display
    svg.append('text')
      .attr('x', centerX)
      .attr('y', centerY + outerRadius * 0.25)
      .attr('text-anchor', 'middle')
      .attr('font-size', '32px')
      .attr('font-weight', '700')
      .attr('fill', colorScale(lambda))
      .text(`λ = ${lambda.toFixed(3)}`);

    // Annual change - positioned closer to lambda value
    const annualChange = ((lambda - 1) * 100);
    const changeText = annualChange >= 0 ? `+${annualChange.toFixed(1)}%` : `${annualChange.toFixed(1)}%`;

    svg.append('text')
      .attr('x', centerX)
      .attr('y', centerY + outerRadius * 0.42)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('fill', COLORS.textSecondary)
      .text(`Annual change: ${changeText}`);

    // Title
    svg.append('text')
      .attr('x', centerX)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .attr('font-size', '18px')
      .attr('font-weight', '600')
      .attr('fill', COLORS.text)
      .text('Population Growth Rate');

    // Scale labels
    const labels = [
      { value: 0.8, text: '0.80' },
      { value: 0.9, text: '0.90' },
      { value: 1.0, text: '1.00' },
      { value: 1.05, text: '1.05' },
      { value: 1.1, text: '1.10' },
    ];

    labels.forEach(({ value, text }) => {
      const angle = lambdaScale(value);
      const labelRadius = outerRadius + 20;
      const x = centerX + Math.sin(angle) * labelRadius;
      const y = centerY - Math.cos(angle) * labelRadius;

      svg.append('text')
        .attr('x', x)
        .attr('y', y)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '11px')
        .attr('fill', COLORS.textSecondary)
        .text(text);
    });

  }, [lambda, dimensions, height, ciLower, ciUpper]);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={height}
        className="overflow-visible"
        role="img"
        aria-label={`Population growth rate gauge showing lambda equals ${lambda.toFixed(3)}, with ${probDecline.toFixed(1)}% probability of decline`}
      />

      {/* Probability badge */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
        <div className="text-center">
          <span className="text-2xl font-bold text-red-600">{probDecline.toFixed(1)}%</span>
          <p className="text-xs text-red-700">probability of decline</p>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="absolute bg-gray-900 text-white text-xs px-2 py-1 rounded pointer-events-none z-10 whitespace-nowrap"
          style={{
            left: Math.max(80, Math.min(tooltip.x, dimensions.width - 80)),
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

export const PopulationDeclineGauge = memo(PopulationDeclineGaugeComponent);
