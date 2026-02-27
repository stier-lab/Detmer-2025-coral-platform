/**
 * Key Findings Visualization Components
 *
 * Publication-quality interactive D3 visualizations for the main research findings
 * of the A. palmata demographic analysis.
 *
 * Components map to the 15 key findings from docs/ANALYSIS_SUMMARY.md
 */

// Population Status (Findings 1, 9)
export { PopulationDeclineGauge } from './PopulationDeclineGauge';
export { TemporalTrendChart } from './TemporalTrendChart';

// Key Drivers (Finding 2)
export { ElasticityTreemap } from './ElasticityTreemap';
export { ElasticityMatrix } from './ElasticityMatrix';
export { ElasticityPanel } from './ElasticityPanel';

// Size Effects (Findings 3, 4, 5)
export { SurvivalByClassChart } from './SurvivalByClassChart';
export { ThresholdUncertaintyPlot } from './ThresholdUncertaintyPlot';
export { AGRvsRGRComparison } from './AGRvsRGRComparison';
export { RGRBySizeChart } from './RGRBySizeChart';

// Heterogeneity (Finding 6)
export { HeterogeneityPanel } from './HeterogeneityPanel';

// Population Comparisons (Findings 7, 8)
export { NaturalVsRestoredChart } from './NaturalVsRestoredChart';

// Restoration Scenarios
export { RestorationScenarios } from './RestorationScenarios';

// Executive Summary (All 15 Findings)
export { ExecutiveSummary, FINDINGS, CATEGORY_LABELS, CATEGORY_ORDER } from './ExecutiveSummary';
export type { Finding } from './ExecutiveSummary';
