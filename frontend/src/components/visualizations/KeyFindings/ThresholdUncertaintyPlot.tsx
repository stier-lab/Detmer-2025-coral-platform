/**
 * ThresholdUncertaintyPlot - Visualization of survival threshold uncertainty
 *
 * Publication-quality visualization showing:
 * - Log-scale range of threshold estimates from multiple models
 * - Point estimates with 95% CI for GAM, Beta regression, and NLME
 * - Visual comparison of model uncertainty
 * - Model comparison table
 *
 * Fetches data from /api/analysis/survival-threshold and /api/analysis/model-comparison
 */

import { useEffect, useRef, useState, memo } from 'react';
import * as d3 from 'd3';
import { AlertTriangle, Info } from 'lucide-react';
import { useSurvivalThreshold, useModelComparison } from '../../../hooks/useAnalysisData';

interface ModelEstimate {
  name: string;
  threshold: number;
  ciLower?: number;
  ciUpper?: number;
  color: string;
}

interface ThresholdUncertaintyPlotProps {
  pointEstimate?: number;
  ciLower?: number;
  ciUpper?: number;
  cv?: number;
  height?: number;
}

function ThresholdUncertaintyPlotComponent({
  pointEstimate: propPointEstimate,
  ciLower: propCiLower,
  ciUpper: propCiUpper,
  cv: _propCv, // eslint-disable-line @typescript-eslint/no-unused-vars
  height = 320,
}: ThresholdUncertaintyPlotProps) {
  // Fetch threshold data from API
  const { data: thresholdData, error: thresholdError } = useSurvivalThreshold();
  const { data: modelData } = useModelComparison();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiData = thresholdData as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelComparison = modelData as any;

  // Extract model estimates for visualization
  // eslint-disable-next-line react-hooks/exhaustive-deps -- modelEstimates is rebuilt from API data each render; wrapping in useMemo would require all individual fields as deps
  const modelEstimates: ModelEstimate[] = [];

  // GAM estimate (primary, from survival-threshold)
  const gamThreshold = propPointEstimate ?? apiData?.threshold_cm2 ?? 4371;
  const gamCiLower = propCiLower ?? apiData?.ci_lower_cm2 ?? 3;
  const gamCiUpper = propCiUpper ?? apiData?.ci_upper_cm2 ?? 4371;

  modelEstimates.push({
    name: 'GAM',
    threshold: gamThreshold,
    ciLower: gamCiLower,
    ciUpper: gamCiUpper,
    color: '#dc2626', // red
  });

  // Beta regression estimate (if available)
  if (modelComparison?.models?.beta) {
    modelEstimates.push({
      name: 'Beta',
      threshold: modelComparison.models.beta.threshold_cm2 || 450,
      ciLower: modelComparison.models.beta.ci_lower || 120,
      ciUpper: modelComparison.models.beta.ci_upper || 1800,
      color: '#2563eb', // blue
    });
  } else {
    // Default beta estimate based on Kai's analysis
    modelEstimates.push({
      name: 'Beta',
      threshold: 450,
      ciLower: 120,
      ciUpper: 1800,
      color: '#2563eb',
    });
  }

  // Sigmoidal NLME estimate (if available)
  if (modelComparison?.models?.sigmoidal) {
    modelEstimates.push({
      name: 'Sigmoidal',
      threshold: modelComparison.models.sigmoidal.inflection_point_cm2 || 380,
      color: '#16a34a', // green
    });
  } else {
    modelEstimates.push({
      name: 'Sigmoidal',
      threshold: 380,
      color: '#16a34a',
    });
  }

  // Michaelis-Menten half-saturation (if available)
  if (modelComparison?.models?.michaelis_menten) {
    modelEstimates.push({
      name: 'M-M',
      threshold: modelComparison.models.michaelis_menten.half_saturation_cm2 || 200,
      color: '#9333ea', // purple
    });
  } else {
    modelEstimates.push({
      name: 'M-M',
      threshold: 200,
      color: '#9333ea',
    });
  }

  // cv computation removed - was computed but never displayed

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 700, height });
  const [animationProgress, setAnimationProgress] = useState(0);
  const [showModelDetails, setShowModelDetails] = useState(false);

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

  // Animation
  useEffect(() => {
    const duration = 1500;
    const startTime = Date.now();
    let animationId: number;
    let cancelled = false;

    const animate = () => {
      if (cancelled) return;

      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimationProgress(eased);

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationId);
    };
  }, []);

  // D3 rendering
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width } = dimensions;
    const margin = { top: 75, right: 40, bottom: 70, left: 40 };
    const innerWidth = Math.max(100, width - margin.left - margin.right);
    const innerHeight = Math.max(80, height - margin.top - margin.bottom);

    // Log scale for the x-axis
    const xScale = d3.scaleLog()
      .domain([1, 100000])
      .range([0, innerWidth]);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Background gradient for GAM uncertainty zone
    const gradientId = 'uncertainty-gradient';
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%')
      .attr('x2', '100%');

    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#fef3c7');
    gradient.append('stop').attr('offset', '50%').attr('stop-color', '#fde68a');
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#fef3c7');

    // GAM CI band (wide, background)
    const gamEst = modelEstimates.find(m => m.name === 'GAM')!;
    const gamCiLeft = xScale(gamEst.ciLower!);
    const gamCiRight = xScale(gamEst.ciUpper!);
    const gamCiWidth = (gamCiRight - gamCiLeft) * animationProgress;

    g.append('rect')
      .attr('x', gamCiLeft)
      .attr('y', 15)
      .attr('width', gamCiWidth)
      .attr('height', innerHeight - 30)
      .attr('fill', `url(#${gradientId})`)
      .attr('opacity', 0.5)
      .attr('rx', 4);

    g.append('rect')
      .attr('x', gamCiLeft)
      .attr('y', 15)
      .attr('width', gamCiWidth)
      .attr('height', innerHeight - 30)
      .attr('fill', 'none')
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,2')
      .attr('rx', 4);

    // Beta regression CI band (tighter, foreground)
    const betaEst = modelEstimates.find(m => m.name === 'Beta');
    if (betaEst && betaEst.ciLower && betaEst.ciUpper) {
      const betaCiLeft = xScale(betaEst.ciLower);
      const betaCiRight = xScale(betaEst.ciUpper);
      const betaCiWidth = (betaCiRight - betaCiLeft) * animationProgress;

      g.append('rect')
        .attr('x', betaCiLeft)
        .attr('y', 25)
        .attr('width', betaCiWidth)
        .attr('height', innerHeight - 50)
        .attr('fill', '#dbeafe')
        .attr('opacity', 0.6)
        .attr('rx', 4);

      g.append('rect')
        .attr('x', betaCiLeft)
        .attr('y', 25)
        .attr('width', betaCiWidth)
        .attr('height', innerHeight - 50)
        .attr('fill', 'none')
        .attr('stroke', '#2563eb')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,2')
        .attr('rx', 4);
    }

    // Draw model point estimates with smart label positioning
    const centerY = innerHeight / 2;

    // Sort models by threshold for smart label positioning
    const sortedModels = [...modelEstimates].sort((a, b) => a.threshold - b.threshold);

    // Calculate label positions to avoid overlap
    const labelPositions: { model: ModelEstimate; x: number; y: number; anchor: string }[] = [];
    const minLabelSpacing = 55; // Minimum pixels between labels

    sortedModels.forEach((model, i) => {
      const pointX = xScale(model.threshold);
      let labelY = centerY - 35;
      let anchor = 'middle';

      // Alternate above/below for close thresholds
      if (i > 0) {
        const prevX = xScale(sortedModels[i - 1].threshold);
        if (Math.abs(pointX - prevX) < minLabelSpacing) {
          // Place this label below if previous was above
          labelY = i % 2 === 0 ? centerY - 35 : centerY + 45;
        }
      }

      // Adjust anchor for edge cases
      if (pointX < 60) anchor = 'start';
      if (pointX > innerWidth - 60) anchor = 'end';

      labelPositions.push({ model, x: pointX, y: labelY, anchor });
    });

    // Draw each model
    modelEstimates.forEach((model, i) => {
      const pointX = xScale(model.threshold);
      const yOffset = [-20, -7, 7, 20][i] || 0; // Increased vertical spread
      const labelPos = labelPositions.find(lp => lp.model.name === model.name);

      // Vertical line with rounded ends
      g.append('line')
        .attr('x1', pointX)
        .attr('x2', pointX)
        .attr('y1', centerY + yOffset - 15)
        .attr('y2', centerY + yOffset + 15)
        .attr('stroke', model.color)
        .attr('stroke-width', 3)
        .attr('stroke-linecap', 'round')
        .attr('opacity', animationProgress);

      // Diamond marker with hover effect
      const diamond = d3.symbol().type(d3.symbolDiamond).size(100);
      const markerGroup = g.append('g')
        .attr('class', 'model-marker')
        .attr('transform', `translate(${pointX},${centerY + yOffset})`)
        .style('cursor', 'pointer');

      markerGroup.append('path')
        .attr('d', diamond)
        .attr('fill', model.color)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2)
        .attr('opacity', animationProgress);

      // Add invisible larger hit area for better hover
      markerGroup.append('circle')
        .attr('r', 15)
        .attr('fill', 'transparent')
        .append('title')
        .text(`${model.name}: ${model.threshold.toLocaleString()} cm²${model.ciLower ? ` (95% CI: ${model.ciLower.toLocaleString()}–${model.ciUpper?.toLocaleString()} cm²)` : ''}`);

      // Label with background for readability
      if (animationProgress > 0.7 && labelPos) {
        const labelOpacity = (animationProgress - 0.7) / 0.3;
        const labelText = `${model.name}: ${model.threshold.toLocaleString()}`;

        // Background pill for label
        const labelWidth = labelText.length * 6.5 + 8;
        g.append('rect')
          .attr('x', labelPos.x - labelWidth / 2)
          .attr('y', labelPos.y - 10)
          .attr('width', labelWidth)
          .attr('height', 16)
          .attr('rx', 8)
          .attr('fill', 'white')
          .attr('stroke', model.color)
          .attr('stroke-width', 1)
          .attr('opacity', labelOpacity * 0.9);

        g.append('text')
          .attr('x', labelPos.x)
          .attr('y', labelPos.y + 2)
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px')
          .attr('font-weight', '600')
          .attr('fill', model.color)
          .attr('opacity', labelOpacity)
          .text(labelText);
      }
    });

    // X-axis (log scale)
    const xAxis = d3.axisBottom(xScale)
      .tickValues([1, 10, 100, 1000, 10000, 100000])
      .tickFormat(d => {
        const val = d as number;
        if (val >= 1000) return `${val / 1000}k`;
        return String(val);
      });

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('font-size', '11px');

    // Size class reference markers
    const sizeClasses = [
      { name: 'SC1', boundary: 25 },
      { name: 'SC2', boundary: 100 },
      { name: 'SC3', boundary: 500 },
      { name: 'SC4', boundary: 2000 },
    ];

    sizeClasses.forEach(sc => {
      const x = xScale(sc.boundary);
      g.append('line')
        .attr('x1', x)
        .attr('x2', x)
        .attr('y1', innerHeight)
        .attr('y2', innerHeight + 8)
        .attr('stroke', '#9ca3af')
        .attr('stroke-width', 1);

      g.append('text')
        .attr('x', x)
        .attr('y', innerHeight + 40)
        .attr('text-anchor', 'middle')
        .attr('font-size', '9px')
        .attr('fill', '#9ca3af')
        .text(sc.name);
    });

    // Title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 22)
      .attr('text-anchor', 'middle')
      .attr('font-size', '18px')
      .attr('font-weight', '600')
      .attr('fill', '#1e3a5f')
      .text('Threshold Estimates Across Models');

    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 42)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#64748b')
      .text('Different statistical models give different threshold estimates');

    // X-axis label
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height - 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#4b5563')
      .text('Colony Size (cm², log scale)');

  }, [dimensions, height, modelEstimates, animationProgress]);

  // Calculate statistics
  const gamRangeMultiplier = Math.round(gamCiUpper / gamCiLower);
  const betaEst = modelEstimates.find(m => m.name === 'Beta');
  const betaRangeMultiplier = betaEst?.ciLower && betaEst?.ciUpper
    ? Math.round(betaEst.ciUpper / betaEst.ciLower)
    : 15;

  // No loading spinner - render with fallback data immediately, swap when API responds

  // Show API status indicator
  const dataSource = apiData && !apiData.error ? 'API' : 'default';

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Data source indicator */}
      {dataSource === 'API' && (
        <div className="absolute top-2 left-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
          Live data from analysis
        </div>
      )}
      {thresholdError && (
        <div className="absolute top-2 left-2 px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded">
          Using default values
        </div>
      )}

      <svg
        ref={svgRef}
        width={dimensions.width}
        height={height}
        className="overflow-visible"
        role="img"
        aria-label={`Log-scale plot comparing threshold estimates across models. GAM: ${gamThreshold} cm² with wide CI. Beta regression: ${betaEst?.threshold} cm² with tighter CI. Sigmoidal: ${modelEstimates.find(m => m.name === 'Sigmoidal')?.threshold} cm². Different models give different estimates.`}
      />

      {/* Model Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-2 mb-3">
        {modelEstimates.map(model => (
          <div key={model.name} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: model.color }}
            />
            <span className="text-xs text-gray-600">
              {model.name}: {model.threshold.toLocaleString()} cm²
            </span>
          </div>
        ))}
      </div>

      {/* Statistics comparison */}
      <div className="flex justify-center gap-4 mt-2">
        <div className="text-center px-4 py-2 bg-red-50 rounded-lg border border-red-200">
          <div className="text-lg font-bold text-red-600">{gamRangeMultiplier.toLocaleString()}×</div>
          <div className="text-xs text-red-700">GAM CI Range</div>
        </div>
        <div className="text-center px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-lg font-bold text-blue-600">{betaRangeMultiplier}×</div>
          <div className="text-xs text-blue-700">Beta CI Range</div>
        </div>
        <div className="text-center px-4 py-2 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-gray-600">8.6%</div>
          <div className="text-xs text-gray-700">R² (Size→Survival)</div>
        </div>
      </div>

      {/* Model details toggle */}
      <button
        onClick={() => setShowModelDetails(!showModelDetails)}
        className="mt-3 mx-auto flex items-center gap-1 text-sm text-ocean-light hover:text-ocean-deep transition-colors"
      >
        <Info className="w-4 h-4" />
        {showModelDetails ? 'Hide model details' : 'Show model details'}
      </button>

      {/* Model comparison table */}
      {showModelDetails && (
        <div className="mt-3 mx-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-1 text-gray-600 font-medium">Model</th>
                <th className="text-right py-1 text-gray-600 font-medium">Threshold</th>
                <th className="text-right py-1 text-gray-600 font-medium">95% CI</th>
                <th className="text-left py-1 px-2 text-gray-600 font-medium">Interpretation</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 font-medium text-red-600">GAM</td>
                <td className="text-right">{gamThreshold.toLocaleString()} cm²</td>
                <td className="text-right text-gray-500">{gamCiLower} – {gamCiUpper.toLocaleString()}</td>
                <td className="px-2 text-gray-600 text-xs">Flexible spline, wide CI</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 font-medium text-blue-600">Beta</td>
                <td className="text-right">{betaEst?.threshold.toLocaleString()} cm²</td>
                <td className="text-right text-gray-500">{betaEst?.ciLower} – {betaEst?.ciUpper?.toLocaleString()}</td>
                <td className="px-2 text-gray-600 text-xs">Bounded proportion, tighter CI</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 font-medium text-green-600">Sigmoidal</td>
                <td className="text-right">{modelEstimates.find(m => m.name === 'Sigmoidal')?.threshold} cm²</td>
                <td className="text-right text-gray-500">—</td>
                <td className="px-2 text-gray-600 text-xs">Inflection point of S-curve</td>
              </tr>
              <tr>
                <td className="py-1.5 font-medium text-purple-600">M-M</td>
                <td className="text-right">{modelEstimates.find(m => m.name === 'M-M')?.threshold} cm²</td>
                <td className="text-right text-gray-500">—</td>
                <td className="px-2 text-gray-600 text-xs">Half-saturation constant</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Interpretation callout */}
      <div className="mt-4 mx-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm text-gray-700 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" />
          <span>
            <strong>Model choice matters:</strong> Threshold estimates range from{' '}
            <strong>{Math.min(...modelEstimates.map(m => m.threshold)).toLocaleString()} cm²</strong> to{' '}
            <strong>{Math.max(...modelEstimates.map(m => m.threshold)).toLocaleString()} cm²</strong> depending on the statistical model.
            Beta regression gives tighter confidence intervals ({betaRangeMultiplier}×) than GAM ({gamRangeMultiplier.toLocaleString()}×),
            but all models agree that size-survival relationship is positive.
          </span>
        </p>
      </div>
    </div>
  );
}

export const ThresholdUncertaintyPlot = memo(ThresholdUncertaintyPlotComponent);
