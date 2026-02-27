# Design & Implementation Guide
## RRSE Coral Parameters Data Platform

**Component Examples & Code Patterns**
**Version 2.0 - Uncertainty-Aware Design**

> **Implementation Status (Feb 2026):** Platform is built and deployed. This guide documents the component patterns and code examples used in the implementation.

---

## Table of Contents

1. [Key Design Changes for v2.0](#1-key-design-changes-for-v20)
2. [Data Quality Components](#2-data-quality-components)
3. [Stratified Visualization Components](#3-stratified-visualization-components)
4. [State Management](#4-state-management)
5. [R Backend Implementation](#5-r-backend-implementation)
6. [Global Styles & CSS Variables](#6-global-styles--css-variables)
7. [Implementation Checklist](#7-implementation-checklist)

---

## 1. Key Design Changes for v2.0

### 1.1 Philosophy Shift

| Aspect | v1.0 | v2.0 |
|--------|------|------|
| **Goal** | Provide unified parameter estimates | **Expose heterogeneity honestly** |
| **Default view** | Pooled data | **Stratified by study** |
| **Thresholds** | Feature highlight | **De-emphasized (unreliable)** |
| **Warnings** | Minimal | **Prominent, always visible** |
| **User guidance** | "Here are the numbers" | **"Which data applies to your context?"** |

### 1.2 Critical Implementation Rules

1. **Never hide uncertainty**: Every estimate shows CI and sample size
2. **No pooled estimates by default**: Show study-level data first
3. **R² always visible**: Users must see explanatory power
4. **Fragment/colony separation**: Default to stratified views
5. **Warnings are required**: Not optional UI elements

---

## 2. Data Quality Components

### 2.1 UncertaintyBanner (Always Visible)

This component appears on ALL data exploration pages:

```tsx
// components/data-display/UncertaintyBanner.tsx
import { AlertTriangle, Info, BarChart3, Database } from 'lucide-react';

interface QualityMetrics {
  rSquared: number;
  sampleSize: number;
  dominantStudy: { name: string; pct: number } | null;
  fragmentMix: { fragmentPct: number; colonyPct: number } | null;
  ciWidthMean: number;
}

interface UncertaintyBannerProps {
  metrics: QualityMetrics;
  onStratifyByFragment?: () => void;
}

export function UncertaintyBanner({ metrics, onStratifyByFragment }: UncertaintyBannerProps) {
  const warnings: Warning[] = [];

  // Low explanatory power
  if (metrics.rSquared < 0.1) {
    warnings.push({
      type: 'info',
      icon: <BarChart3 size={16} />,
      message: `Size explains ${(metrics.rSquared * 100).toFixed(1)}% of survival variance`,
      detail: 'Other factors (study, fragment status, year) may be more important'
    });
  }

  // Single study dominance
  if (metrics.dominantStudy && metrics.dominantStudy.pct > 50) {
    warnings.push({
      type: metrics.dominantStudy.pct > 70 ? 'warning' : 'info',
      icon: <Database size={16} />,
      message: `${metrics.dominantStudy.pct.toFixed(0)}% from ${metrics.dominantStudy.name}`,
      detail: 'Consider viewing this study separately'
    });
  }

  // Fragment/colony mixing
  if (metrics.fragmentMix &&
      metrics.fragmentMix.fragmentPct > 10 &&
      metrics.fragmentMix.colonyPct > 10) {
    warnings.push({
      type: 'warning',
      icon: <AlertTriangle size={16} />,
      message: 'Fragments and colonies mixed',
      detail: `${metrics.fragmentMix.fragmentPct.toFixed(0)}% fragments, ${metrics.fragmentMix.colonyPct.toFixed(0)}% colonies`,
      action: onStratifyByFragment && {
        label: 'Separate',
        onClick: onStratifyByFragment
      }
    });
  }

  // High uncertainty
  if (metrics.ciWidthMean > 0.3) {
    warnings.push({
      type: 'warning',
      icon: <AlertTriangle size={16} />,
      message: 'High uncertainty in estimates',
      detail: `Average CI width: ±${(metrics.ciWidthMean * 50).toFixed(0)} percentage points`
    });
  }

  if (warnings.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Info size={18} className="text-amber-600" />
        <h4 className="font-semibold text-sm text-slate-800">
          Data Quality Notes
        </h4>
      </div>
      <ul className="space-y-3">
        {warnings.map((warning, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className={`mt-0.5 ${
              warning.type === 'warning' ? 'text-amber-500' : 'text-blue-500'
            }`}>
              {warning.icon}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-700">
                {warning.message}
              </p>
              {warning.detail && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {warning.detail}
                </p>
              )}
            </div>
            {warning.action && (
              <button
                onClick={warning.action.onClick}
                className="text-xs px-2 py-1 bg-amber-100 text-amber-700
                           rounded hover:bg-amber-200 transition-colors"
              >
                {warning.action.label}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 2.2 QualityBadge (Inline Indicator)

Small badge for inline use in tables and cards:

```tsx
// components/data-display/QualityBadge.tsx

interface QualityBadgeProps {
  n: number;
  ciWidth?: number;
  showDetails?: boolean;
}

export function QualityBadge({ n, ciWidth, showDetails = false }: QualityBadgeProps) {
  const getLevel = () => {
    if (n < 30) return { level: 'low', color: 'red', label: 'Low confidence' };
    if (n < 100 || (ciWidth && ciWidth > 0.3)) return { level: 'medium', color: 'amber', label: 'Moderate' };
    return { level: 'high', color: 'green', label: 'High confidence' };
  };

  const { level, color, label } = getLevel();

  const colorClasses = {
    red: 'bg-red-100 text-red-700 border-red-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    green: 'bg-green-100 text-green-700 border-green-200'
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                      text-xs font-medium border ${colorClasses[color]}`}>
      {n < 30 && <AlertTriangle size={10} />}
      {showDetails ? label : `n=${n}`}
    </span>
  );
}
```

### 2.3 CertaintyMatrix Component

Heatmap showing data reliability by size class and region:

```tsx
// components/visualizations/CertaintyMatrix.tsx

interface CertaintyCell {
  region: string;
  sizeClass: string;
  n: number;
  survivalRate: number | null;
  ciWidth: number | null;
  certaintyScore: number;
}

interface CertaintyMatrixProps {
  data: CertaintyCell[];
  onCellClick?: (cell: CertaintyCell) => void;
}

export function CertaintyMatrix({ data, onCellClick }: CertaintyMatrixProps) {
  const regions = [...new Set(data.map(d => d.region))];
  const sizeClasses = ['SC1', 'SC2', 'SC3', 'SC4', 'SC5'];

  const getCellColor = (score: number) => {
    if (score === 0) return 'bg-slate-100 text-slate-400';
    if (score < 0.3) return 'bg-red-100 text-red-800';
    if (score < 0.6) return 'bg-amber-100 text-amber-800';
    return 'bg-green-100 text-green-800';
  };

  const getCell = (region: string, sizeClass: string) => {
    return data.find(d => d.region === region && d.sizeClass === sizeClass);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2 text-left text-sm font-medium text-slate-600">
              Region
            </th>
            {sizeClasses.map(sc => (
              <th key={sc} className="p-2 text-center text-sm font-medium text-slate-600">
                {sc}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {regions.map(region => (
            <tr key={region} className="border-t border-slate-200">
              <td className="p-2 text-sm font-medium text-slate-700">
                {region}
              </td>
              {sizeClasses.map(sc => {
                const cell = getCell(region, sc);
                return (
                  <td key={sc} className="p-1">
                    <button
                      onClick={() => cell && onCellClick?.(cell)}
                      disabled={!cell || cell.n === 0}
                      className={`w-full p-2 rounded text-center transition-all
                                  ${getCellColor(cell?.certaintyScore || 0)}
                                  ${cell && cell.n > 0 ? 'hover:ring-2 hover:ring-offset-1 hover:ring-blue-400 cursor-pointer' : 'cursor-default'}`}
                    >
                      {cell && cell.n > 0 ? (
                        <div>
                          <div className="text-sm font-mono font-semibold">
                            {(cell.survivalRate! * 100).toFixed(0)}%
                          </div>
                          <div className="text-xs opacity-75">
                            n={cell.n}
                          </div>
                          {cell.n < 30 && (
                            <AlertTriangle size={12} className="mx-auto mt-1 opacity-75" />
                          )}
                        </div>
                      ) : (
                        <div className="text-xs">No data</div>
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-green-100 rounded" /> High confidence
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-amber-100 rounded" /> Moderate
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-red-100 rounded" /> Low confidence
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-slate-100 rounded" /> No data
        </span>
      </div>
    </div>
  );
}
```

---

## 3. Stratified Visualization Components

### 3.1 ForestPlotByStudy (Primary Survival View)

Forest plot showing per-study estimates WITHOUT pooled average:

```tsx
// components/visualizations/ForestPlotByStudy.tsx
import Plot from 'react-plotly.js';
import { STUDY_COLORS } from '@/utils/studyColors';

interface StudyEstimate {
  study: string;
  studyLabel: string;
  n: number;
  survivalRate: number;
  ciLower: number;
  ciUpper: number;
  isFragment: boolean;
  yearRange: string;
}

interface ForestPlotByStudyProps {
  data: StudyEstimate[];
  fragmentFilter: 'all' | 'fragment' | 'colony';
  height?: number;
}

export function ForestPlotByStudy({
  data,
  fragmentFilter,
  height = 400
}: ForestPlotByStudyProps) {

  // Filter and sort by sample size
  const filteredData = data
    .filter(d => {
      if (fragmentFilter === 'all') return true;
      if (fragmentFilter === 'fragment') return d.isFragment;
      return !d.isFragment;
    })
    .sort((a, b) => b.n - a.n);

  const trace: Plotly.Data = {
    type: 'scatter',
    mode: 'markers',
    x: filteredData.map(d => d.survivalRate),
    y: filteredData.map(d => d.studyLabel),
    error_x: {
      type: 'data',
      symmetric: false,
      arrayminus: filteredData.map(d => d.survivalRate - d.ciLower),
      array: filteredData.map(d => d.ciUpper - d.survivalRate),
      color: '#0a3d62',
      thickness: 2,
      width: 0,
    },
    marker: {
      size: filteredData.map(d => Math.max(8, Math.sqrt(d.n) / 3)),
      color: filteredData.map(d => STUDY_COLORS[d.study] || '#2e86ab'),
      line: { width: 2, color: 'white' },
    },
    hovertemplate:
      '<b>%{y}</b><br>' +
      'Survival: %{x:.1%}<br>' +
      '<extra></extra>',
  };

  const layout: Partial<Plotly.Layout> = {
    xaxis: {
      title: 'Annual Survival Probability',
      range: [0, 1],
      tickformat: '.0%',
      gridcolor: '#e5e7eb',
    },
    yaxis: {
      title: '',
      automargin: true,
    },
    shapes: [
      // Reference line at 0.5
      {
        type: 'line',
        x0: 0.5, x1: 0.5,
        y0: -0.5, y1: filteredData.length - 0.5,
        line: { dash: 'dot', color: '#9ca3af', width: 1 },
      },
    ],
    annotations: filteredData.map((d, i) => ({
      x: 1.02,
      y: i,
      text: `n=${d.n.toLocaleString()}`,
      showarrow: false,
      font: { size: 10, family: 'monospace', color: '#6b7280' },
      xref: 'paper',
      yref: 'y',
    })),
    margin: { l: 180, r: 80, t: 30, b: 50 },
    font: { family: 'Inter, system-ui, sans-serif' },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'white',
    showlegend: false,
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      {/* Important: No pooled estimate notice */}
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
        <Info size={14} />
        <span>
          Pooled estimate not shown due to study heterogeneity.
          Each point represents one study.
        </span>
      </div>

      <Plot
        data={[trace]}
        layout={{ ...layout, height }}
        config={{
          displayModeBar: true,
          modeBarButtonsToRemove: ['lasso2d', 'select2d'],
          displaylogo: false,
        }}
        style={{ width: '100%' }}
      />

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        {filteredData.map(d => (
          <span key={d.study} className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: STUDY_COLORS[d.study] }}
            />
            {d.studyLabel}
          </span>
        ))}
      </div>
    </div>
  );
}
```

### 3.2 SizeSurvivalPanels (Multi-Study View)

Multi-panel plot showing size-survival for each study separately:

```tsx
// components/visualizations/SizeSurvivalPanels.tsx

interface PanelData {
  study: string;
  records: SurvivalRecord[];
  modelPredictions?: PredictionPoint[];
  rSquared: number;
}

interface SizeSurvivalPanelsProps {
  panels: PanelData[];
  showCombined?: boolean;
}

export function SizeSurvivalPanels({ panels, showCombined = true }: SizeSurvivalPanelsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {panels.map(panel => (
        <div key={panel.study} className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="font-medium text-slate-800">
                {getStudyLabel(panel.study)}
              </h4>
              <p className="text-xs text-slate-500">
                n = {panel.records.length.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-mono font-semibold text-slate-700">
                R² = {(panel.rSquared * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-slate-500">
                variance explained
              </p>
            </div>
          </div>

          <SingleSurvivalPlot
            data={panel.records}
            predictions={panel.modelPredictions}
            color={STUDY_COLORS[panel.study]}
            height={250}
          />
        </div>
      ))}

      {showCombined && (
        <div className="col-span-2 bg-slate-50 rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-medium text-slate-800">
              Combined View
            </h4>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
              Interpret with caution
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Points colored by study. No fitted line shown for combined data.
          </p>

          <CombinedSurvivalPlot
            panels={panels}
            showFittedLine={false}
            height={300}
          />
        </div>
      )}
    </div>
  );
}
```

### 3.3 GrowthDistributionComparison

Show full growth distributions with quality warnings:

```tsx
// components/visualizations/GrowthDistributionComparison.tsx

interface GrowthDistributionComparisonProps {
  noaaData: GrowthRecord[];
  otherData: GrowthRecord[];
}

export function GrowthDistributionComparison({
  noaaData,
  otherData
}: GrowthDistributionComparisonProps) {

  const noaaStats = useMemo(() => ({
    mean: mean(noaaData.map(d => d.growth_cm2_yr)),
    pctShrinking: noaaData.filter(d => d.growth_cm2_yr < 0).length / noaaData.length * 100,
    pctGrowing: noaaData.filter(d => d.growth_cm2_yr > 0).length / noaaData.length * 100,
  }), [noaaData]);

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* NOAA Panel with Warning */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-medium text-slate-800">NOAA Survey</h4>
            <p className="text-xs text-slate-500">n = {noaaData.length.toLocaleString()}</p>
          </div>
          <QualityBadge n={noaaData.length} showDetails />
        </div>

        {/* Warning Box */}
        <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle size={16} />
            <span className="text-sm font-medium">Data Quality Note</span>
          </div>
          <ul className="mt-2 text-xs text-amber-600 space-y-1">
            <li>Mean growth: <strong>{noaaStats.mean.toFixed(0)} cm²/yr</strong> (negative)</li>
            <li>{noaaStats.pctShrinking.toFixed(0)}% of colonies showed shrinkage</li>
            <li>Large colonies may have partial mortality recorded as "shrinkage"</li>
          </ul>
        </div>

        <GrowthHistogram
          data={noaaData}
          highlightNegative={true}
          height={200}
        />
      </div>

      {/* Other Studies Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-medium text-slate-800">Other Studies</h4>
            <p className="text-xs text-slate-500">n = {otherData.length.toLocaleString()}</p>
          </div>
          <QualityBadge n={otherData.length} showDetails />
        </div>

        <GrowthViolinByStudy
          data={otherData}
          height={250}
        />
      </div>
    </div>
  );
}
```

---

## 4. State Management

### 4.1 Filter Store with Quality Metrics

```typescript
// stores/filterStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FilterState {
  // Data filters
  regions: string[];
  studies: string[];
  dataTypes: ('field' | 'nursery_in' | 'nursery_ex')[];
  fragmentStatus: 'all' | 'fragment' | 'colony';
  yearRange: [number, number];
  sizeRange: [number, number];

  // Display options
  showUncertainty: boolean;  // Always true in v2.0
  stratifyByStudy: boolean;  // Default true in v2.0
}

interface QualityMetrics {
  rSquared: number;
  sampleSize: number;
  dominantStudy: { name: string; pct: number } | null;
  fragmentMix: { fragmentPct: number; colonyPct: number } | null;
  ciWidthMean: number;
  warnings: string[];
}

interface FilterStore {
  filters: FilterState;
  qualityMetrics: QualityMetrics | null;

  setFilters: (filters: Partial<FilterState>) => void;
  setQualityMetrics: (metrics: QualityMetrics) => void;
  resetFilters: () => void;

  // v2.0: Helper to stratify by fragment
  stratifyByFragment: () => void;
}

const defaultFilters: FilterState = {
  regions: [],
  studies: [],
  dataTypes: ['field', 'nursery_in', 'nursery_ex'],
  fragmentStatus: 'all',  // Will trigger warning
  yearRange: [2004, 2024],
  sizeRange: [0, 100000],
  showUncertainty: true,
  stratifyByStudy: true,  // v2.0 default
};

export const useFilterStore = create<FilterStore>()(
  persist(
    (set, get) => ({
      filters: defaultFilters,
      qualityMetrics: null,

      setFilters: (newFilters) =>
        set((state) => ({
          filters: { ...state.filters, ...newFilters }
        })),

      setQualityMetrics: (metrics) =>
        set({ qualityMetrics: metrics }),

      resetFilters: () =>
        set({ filters: defaultFilters }),

      stratifyByFragment: () =>
        set((state) => ({
          filters: {
            ...state.filters,
            fragmentStatus: state.filters.fragmentStatus === 'all'
              ? 'colony'  // Start with colonies
              : state.filters.fragmentStatus
          }
        })),
    }),
    {
      name: 'rrse-filters-v2',
    }
  )
);
```

### 4.2 React Query Hooks with Quality Metrics

```typescript
// hooks/useDataWithQuality.ts
import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '@/stores/filterStore';

export function useSurvivalDataWithQuality() {
  const { filters, setQualityMetrics } = useFilterStore();

  return useQuery({
    queryKey: ['survival', 'with-quality', filters],
    queryFn: async () => {
      const params = buildQueryParams(filters);

      // Fetch data AND quality metrics together
      const [dataResponse, qualityResponse] = await Promise.all([
        api.get('/survival/by-study-stratified', { params }),
        api.get('/quality/metrics', { params }),
      ]);

      // Update global quality metrics
      setQualityMetrics(qualityResponse.data);

      return {
        data: dataResponse.data,
        quality: qualityResponse.data,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
```

---

## 5. R Backend Implementation

### 5.1 Quality Metrics Endpoint

```r
# R/endpoints/quality.R

library(dplyr)

#* Calculate data quality metrics for filtered data
#* @param region Comma-separated regions
#* @param data_type Comma-separated data types
#* @param fragment Fragment status (all, Y, N)
#* @get /metrics
function(region = "", data_type = "", fragment = "all") {

  # Apply filters
  data <- apply_filters(data_env$survival_individual, region, data_type, fragment)

  n_total <- nrow(data)

  if (n_total == 0) {
    return(list(
      total_n = 0,
      warnings = list("No data matches current filters")
    ))
  }

  # Calculate dominant study
  study_counts <- data %>%
    count(study, sort = TRUE) %>%
    mutate(pct = n / n_total * 100)

  dominant_study <- study_counts %>%
    slice(1) %>%
    select(name = study, pct)

  # Calculate fragment mix
  fragment_counts <- data %>%
    count(fragment) %>%
    mutate(pct = n / n_total * 100)

  fragment_pct <- fragment_counts %>%
    filter(fragment == "Y") %>%
    pull(pct)

  colony_pct <- fragment_counts %>%
    filter(fragment == "N") %>%
    pull(pct)

  # Calculate R-squared (size vs survival)
  r_squared <- tryCatch({
    model <- glm(survived ~ log(size_cm2), data = data, family = binomial)
    1 - model$deviance / model$null.deviance
  }, error = function(e) NA_real_)

  # Build warnings list
  warnings <- list()

  if (!is.na(r_squared) && r_squared < 0.1) {
    warnings <- c(warnings, sprintf(
      "Size explains only %.1f%% of survival variance",
      r_squared * 100
    ))
  }

  if (dominant_study$pct > 70) {
    warnings <- c(warnings, sprintf(
      "%.0f%% of data from %s",
      dominant_study$pct, dominant_study$name
    ))
  }

  if (length(fragment_pct) > 0 && length(colony_pct) > 0 &&
      fragment_pct > 10 && colony_pct > 10) {
    warnings <- c(warnings,
      "Fragment and colony data mixed - consider stratifying"
    )
  }

  list(
    total_n = n_total,
    n_studies = n_distinct(data$study),
    n_regions = n_distinct(data$region),
    r_squared = r_squared,
    dominant_study = as.list(dominant_study),
    fragment_mix = list(
      fragment_pct = if (length(fragment_pct) > 0) fragment_pct else 0,
      colony_pct = if (length(colony_pct) > 0) colony_pct else 0
    ),
    warnings = warnings
  )
}

#* Get certainty matrix (size class × region)
#* @get /certainty-matrix
function() {

  size_breaks <- c(0, 25, 100, 500, 2000, Inf)
  size_labels <- c("SC1", "SC2", "SC3", "SC4", "SC5")

  data_env$survival_individual %>%
    filter(!is.na(size_cm2), size_cm2 > 0) %>%
    mutate(size_class = cut(size_cm2, breaks = size_breaks,
                            labels = size_labels, include.lowest = TRUE)) %>%
    group_by(region, size_class) %>%
    summarise(
      n = n(),
      n_studies = n_distinct(study),
      survival_rate = mean(survived, na.rm = TRUE),
      se = sqrt(survival_rate * (1 - survival_rate) / n),
      ci_lower = pmax(0, survival_rate - 1.96 * se),
      ci_upper = pmin(1, survival_rate + 1.96 * se),
      ci_width = ci_upper - ci_lower,
      .groups = "drop"
    ) %>%
    mutate(
      # Certainty score: 0-1 scale
      n_score = pmin(1, log(n + 1) / log(100)),
      ci_score = pmax(0, 1 - ci_width / 0.5),
      study_score = pmin(1, n_studies / 3),
      certainty_score = (n_score + ci_score + study_score) / 3
    ) %>%
    select(region, size_class, n, survival_rate, ci_lower, ci_upper,
           ci_width, certainty_score, n_studies) %>%
    complete(region, size_class,
             fill = list(n = 0, certainty_score = 0))
}
```

### 5.2 Study-Stratified Endpoints

```r
# R/endpoints/stratified.R

#* Get survival by study with full metadata
#* @param fragment Fragment status filter (all, Y, N)
#* @get /survival/by-study
function(fragment = "all") {

  data <- data_env$survival_individual

  if (fragment != "all") {
    data <- data %>% filter(fragment == !!fragment)
  }

  data %>%
    group_by(study) %>%
    summarise(
      n = n(),
      survival_rate = mean(survived, na.rm = TRUE),
      se = sqrt(survival_rate * (1 - survival_rate) / n),
      ci_lower = pmax(0, survival_rate - 1.96 * se),
      ci_upper = pmin(1, survival_rate + 1.96 * se),

      # Size characteristics
      size_mean = mean(size_cm2, na.rm = TRUE),
      size_median = median(size_cm2, na.rm = TRUE),
      size_min = min(size_cm2, na.rm = TRUE),
      size_max = max(size_cm2, na.rm = TRUE),

      # Fragment/colony breakdown
      pct_fragment = mean(fragment == "Y", na.rm = TRUE) * 100,

      # Temporal coverage
      year_min = min(survey_yr),
      year_max = max(survey_yr),

      # R-squared for this study alone
      r_squared = {
        model <- tryCatch(
          glm(survived ~ log(size_cm2), family = binomial),
          error = function(e) NULL
        )
        if (is.null(model)) NA_real_
        else 1 - model$deviance / model$null.deviance
      },

      .groups = "drop"
    ) %>%
    left_join(
      data_env$studies_metadata %>%
        select(study = study_id, study_label = study_name,
               primary_caveat = notes),
      by = "study"
    ) %>%
    arrange(desc(n))
}
```

---

## 6. Global Styles & CSS Variables

### 6.1 Updated Color Tokens

```css
/* styles/globals.css */

:root {
  /* Study colors (consistent across all visualizations) */
  --study-noaa: #0a3d62;
  --study-pausch: #e07a5f;
  --study-kuffner: #2a9d8f;
  --study-usgs: #2e86ab;
  --study-fundemar: #f4a261;
  --study-mendoza: #8e44ad;

  /* Quality indicator colors */
  --quality-high: #22c55e;
  --quality-medium: #f59e0b;
  --quality-low: #ef4444;
  --quality-none: #94a3b8;

  /* Warning colors */
  --warning-bg: #fffbeb;
  --warning-border: #fcd34d;
  --warning-text: #92400e;
  --warning-icon: #f59e0b;

  /* Uncertainty visualization */
  --ci-band: rgba(10, 61, 98, 0.15);
  --ci-line: rgba(10, 61, 98, 0.5);
}
```

### 6.2 Warning Component Styles

```css
/* Warning banners */
.warning-banner {
  @apply bg-amber-50 border border-amber-200 rounded-lg p-4;
}

.warning-banner-title {
  @apply flex items-center gap-2 font-semibold text-sm text-slate-800 mb-2;
}

.warning-banner-item {
  @apply flex items-start gap-3 text-sm text-slate-700;
}

/* Quality badges */
.quality-badge {
  @apply inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border;
}

.quality-badge-high {
  @apply bg-green-100 text-green-700 border-green-200;
}

.quality-badge-medium {
  @apply bg-amber-100 text-amber-700 border-amber-200;
}

.quality-badge-low {
  @apply bg-red-100 text-red-700 border-red-200;
}
```

---

## 7. Implementation Checklist

### Phase 1: Transparency Foundation

- [ ] Create `UncertaintyBanner` component
- [ ] Create `QualityBadge` component
- [ ] Implement `/quality/metrics` R endpoint
- [ ] Add study color mapping constants
- [ ] Update filter store with quality metrics
- [ ] Build basic `ForestPlotByStudy` component

### Phase 2: Stratified Visualizations

- [ ] Build `SizeSurvivalPanels` component
- [ ] Build `GrowthDistributionComparison` component
- [ ] Build `CertaintyMatrix` component
- [ ] Implement `/quality/certainty-matrix` endpoint
- [ ] Add fragment/colony toggle to all views
- [ ] Create study comparison table

### Phase 3: User Guidance

- [ ] Build data selection wizard
- [ ] Create data quality dashboard page
- [ ] Add warning system to all data views
- [ ] Implement export with mandatory caveats
- [ ] Write per-study methodology notes

### Phase 4: Testing & Launch

- [ ] Test with restoration practitioners
- [ ] Verify warnings display on all views
- [ ] Check uncertainty is never hidden
- [ ] Review all messaging for clarity
- [ ] Launch with clear data limitations framing

---

*Document Version 2.0 | December 2025*
*Emphasizing transparency and honest uncertainty communication*
