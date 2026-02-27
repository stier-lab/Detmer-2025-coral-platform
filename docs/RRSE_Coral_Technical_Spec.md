# Technical Specification
## RRSE Coral Parameters Data Platform

**Frontend + R Backend Implementation Guide**
**Version 2.0 - Uncertainty-Aware Design**

> **Implementation Status (Feb 2026):** This spec has been implemented. The platform is deployed on Render with all core components operational. This document is retained as the architectural reference.

---

**Stier Lab | Ocean Recoveries Lab**
Department of Ecology, Evolution & Marine Biology
UC Santa Barbara

Version 2.0 | December 2025

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Design System & Visual Identity](#2-design-system--visual-identity)
3. [Data Quality Indicators](#3-data-quality-indicators)
4. [Visualization Specifications](#4-visualization-specifications)
5. [R Backend Specification](#5-r-backend-specification)
6. [API Endpoints Reference](#6-api-endpoints-reference)
7. [Frontend Components Specification](#7-frontend-components-specification)
8. [Page-by-Page Implementation Guide](#8-page-by-page-implementation-guide)
9. [File Structure & Project Setup](#9-file-structure--project-setup)

---

## 1. Architecture Overview

### 1.1 System Architecture

*Unchanged from v1.0 - React frontend + Plumber R API backend*

### 1.2 Technology Stack

*Unchanged from v1.0*

### 1.3 Key Design Changes (v2.0)

| Aspect | v1.0 Approach | v2.0 Approach |
|--------|---------------|---------------|
| Default view | Pooled estimates | **Stratified by study** |
| Uncertainty | Optional display | **Always visible** |
| Thresholds | Prominent feature | **De-emphasized/removed** |
| Warnings | Minimal | **Prominent caveat system** |
| R² display | Hidden | **Always visible** |

### 1.4 Data Reference

For complete documentation of data sources, column definitions, and study-specific methodology notes, see [Data Methodology Reference](Data_Methodology_Reference.md).

**Key Data Characteristics:**
- **Size measurement:** Live planar area (length × width × % alive) following Vardi et al. 2012
- **Time standardization:** All survival rates interpolated/extrapolated to annual rates
- **Fragment vs Colony:** Tracked in `fragment` column (Y/N)
- **Data types:** `field`, `nursery_in` (in situ), `nursery_ex` (ex situ/aquaria)

---

## 2. Design System & Visual Identity

### 2.1 Design Philosophy (Updated)

**Aesthetic Direction:** "Honest Scientific Editorial" - Clean, data-forward design that emphasizes transparency, uncertainty, and data provenance. The interface should feel like a rigorous scientific publication that respects the complexity of the underlying data.

#### Core Design Principles (Updated)

1. **Uncertainty First:** Always show confidence intervals, sample sizes, and R² values
2. **Stratification by Default:** Study-level views before pooled views
3. **Warnings are Features:** Data quality alerts are helpful, not annoying
4. **Provenance is Required:** Every data point traces to its source

### 2.2 Color Palette

*Base palette unchanged, with additions:*

| Token Name | Hex Value | Usage |
|------------|-----------|-------|
| `--warning-yellow` | `#f39c12` | Data quality warnings |
| `--warning-bg` | `#fef9e7` | Warning message backgrounds |
| `--uncertainty-gray` | `#bdc3c7` | Confidence interval bands |
| `--low-confidence` | `#e74c3c` | Low sample size indicators |

### 2.3 Study Color Mapping

Consistent colors for each study across all visualizations:

| Study | Color | Hex |
|-------|-------|-----|
| NOAA_survey | Ocean Deep | `#0a3d62` |
| pausch_et_al_2018 | Coral Warm | `#e07a5f` |
| kuffner_et_al_2020 | Reef Green | `#2a9d8f` |
| USGS_USVI_exp | Ocean Light | `#2e86ab` |
| fundemar_fragments | Coral Pale | `#f4a261` |
| mendoza_quiroz_2023 | Purple | `#8e44ad` |

### 2.4 Data Type Markers

| Data Type | Marker Shape | Color Modifier |
|-----------|--------------|----------------|
| Colony (field) | Circle | Solid fill |
| Fragment (outplant) | Diamond | Hollow/outline |
| Nursery | Triangle | Striped pattern |

---

## 3. Data Quality Indicators

### 3.1 Uncertainty Badge Component

Always-visible badge showing data reliability:

```typescript
interface UncertaintyBadgeProps {
  r_squared: number;        // Model R²
  sample_size: number;      // Total n
  ci_width: number;         // CI upper - CI lower
  dominant_study_pct: number; // % from largest study
}
```

**Display Logic:**

| Condition | Badge Color | Icon | Text |
|-----------|-------------|------|------|
| R² < 0.1 | Yellow | ⚠ | "Size explains <10% of variance" |
| n < 50 | Orange | ⚠ | "Small sample size" |
| CI width > 0.3 | Yellow | ↔ | "High uncertainty" |
| Dominant study > 70% | Blue | ℹ | "X% from single study" |

### 3.2 Study Dominance Warning

When any single study contributes >50% of data:

```tsx
<WarningBanner type="info">
  <strong>{dominantStudy.name}</strong> contributes {pct}% of these data.
  <Link to="/compare-studies">Compare study methodologies</Link>
</WarningBanner>
```

### 3.3 Fragment/Colony Mixing Warning

When displaying mixed fragment and colony data:

```tsx
<WarningBanner type="warning">
  Data includes both fragments ({fragPct}%) and colonies ({colPct}%).
  These populations have different survival patterns.
  <Button onClick={stratifyByFragment}>Separate by type</Button>
</WarningBanner>
```

---

## 4. Visualization Specifications

### 4.1 Figure 1: Data Landscape Overview (4-Panel)

**Purpose:** Immediately show users the heterogeneous nature of the data

#### Panel A: Geographic Map by Study

| Element | Specification |
|---------|---------------|
| Type | Leaflet map with CircleMarkers |
| Color encoding | Study (not survival rate) |
| Size encoding | Sample size (sqrt scale) |
| Legend | Study names with n values |
| Interactivity | Click → study filter; hover → site details |

#### Panel B: Size Distribution by Study

| Element | Specification |
|---------|---------------|
| Type | Overlaid histograms or ridge plot |
| X-axis | Colony size (cm²) - LOG SCALE |
| Y-axis | Density |
| Colors | Study color palette |
| Annotation | Median lines per study |
| Key insight | Show 100-400x size difference |

#### Panel C: Sample Size Heatmap

| Element | Specification |
|---------|---------------|
| Type | Heatmap matrix |
| Rows | Size classes (SC1-SC5) |
| Columns | Studies |
| Cell color | n (log scale) |
| Cell text | Exact n value |
| Annotation | Highlight empty/sparse cells |

#### Panel D: Temporal Coverage

| Element | Specification |
|---------|---------------|
| Type | Timeline/Gantt chart |
| Y-axis | Studies |
| X-axis | Years (2004-2024) |
| Bars | Study duration |
| Markers | Sample intensity by year |

### 4.2 Figure 2: Forest Plot - Survival by Study

**Purpose:** Show study-level estimates BEFORE any pooling

| Element | Specification |
|---------|---------------|
| Chart type | Horizontal forest plot |
| Y-axis | Studies, ordered by sample size (largest top) |
| X-axis | Survival probability (0-1) |
| Points | Mean survival estimate |
| Error bars | 95% CI whiskers |
| Faceting | Left: Colonies; Right: Fragments |
| Annotations | n value, year range right of each row |
| Reference line | Vertical line at 0.5 (gray dashed) |
| NO pooled estimate | Do NOT show diamond/pooled meta-analytic estimate |

**Key Design Decisions:**
- NO pooled "overall" estimate - this would be misleading
- Clear visual separation of colony vs fragment data
- Sample size prominently displayed

### 4.3 Figure 3: Size-Survival Relationship (Multi-Panel)

**Purpose:** Show size effect within studies separately

#### Panel Layout: 2x2 or 1x4 grid

| Panel | Content | Min n |
|-------|---------|-------|
| A | NOAA survey only | ~4000 |
| B | Pausch et al. only | ~900 |
| C | Other studies combined (if n>100) | Varies |
| D | All data with study coloring | All |

#### Per-Panel Specifications

| Element | Specification |
|---------|---------------|
| Chart type | Scatter plot with smoothed curve |
| X-axis | Size (cm²) - LOG SCALE |
| Y-axis | Survival (0/1 with jitter) |
| Points | Individual corals, opacity 0.3 |
| Smoother | LOESS or GAM with CI band |
| CI band | 95% confidence interval, opacity 0.2 |
| R² annotation | Top-right corner, prominent |
| n annotation | Sample size in subtitle |

**Panel D (Combined) Specific:**
- Points colored by study
- NO fitted line (or very faint overall)
- Legend showing study colors
- Text: "Combined view - interpret with caution"

### 4.4 Figure 4: Growth Distribution Comparison

**Purpose:** Show full distributions, highlight data quality issues

#### Panel A: NOAA Growth Distribution

| Element | Specification |
|---------|---------------|
| Chart type | Histogram with KDE overlay |
| X-axis | Growth rate (cm²/yr) |
| Y-axis | Density |
| Coloring | Red for negative growth, green for positive |
| Annotations | % shrinking, % growing, median |
| Warning box | "Mean = -189 cm²/yr; high variability" |

#### Panel B: Other Studies Growth (Violin/Box)

| Element | Specification |
|---------|---------------|
| Chart type | Violin plot or box plot |
| Groups | Studies (excluding NOAA or separate) |
| Colors | Study color palette |
| Annotations | n per study |
| Key insight | Show non-NOAA studies have positive growth |

#### Panel C: Positive Growth Probability by Size

| Element | Specification |
|---------|---------------|
| Chart type | Line plot with CI band |
| X-axis | Size class or continuous size |
| Y-axis | P(growth > 0) |
| Stratification | By study |
| Note | This may be more interpretable than mean growth |

#### Panel D: Data Quality Warning Panel

Static text/infographic explaining:
- NOAA growth data characteristics
- Why mean growth is negative
- Recommendations for use

### 4.5 Figure 5: Confounding Structure Visualization

**Purpose:** Make users understand why simple interpretations fail

#### Panel A: Size Distribution by Fragment Status

| Element | Specification |
|---------|---------------|
| Chart type | Overlaid density plots |
| X-axis | Size (cm²) - log scale |
| Groups | Fragment (Y) vs Colony (N) |
| Colors | Distinct, colorblind-safe |
| Annotations | Median lines, overlap region |
| Key insight | Fragments are much smaller |

#### Panel B: Survival by Size, Colored by Fragment Status

| Element | Specification |
|---------|---------------|
| Chart type | Scatter with two smooth lines |
| X-axis | Size (log scale) |
| Y-axis | Survival probability |
| Colors | Fragment vs Colony |
| Annotations | Gap between lines at same size |
| Key insight | At same size, colonies survive better |

#### Panel C: Study × Fragment × Size Heatmap

| Element | Specification |
|---------|---------------|
| Chart type | Nested heatmap |
| Rows | Studies |
| Columns | Size classes |
| Cell divisions | Top: fragments, Bottom: colonies |
| Cell color | Survival rate |
| Cell annotations | n if > 10 |

#### Panel D: Simpson's Paradox Illustration

| Element | Specification |
|---------|---------------|
| Chart type | Slope graph or paired comparison |
| Show | Overall survival by study |
| Also show | Survival within same size class |
| Key insight | Gap persists within size class |

### 4.6 Figure 6: Data Certainty Matrix

**Purpose:** Show where estimates are reliable vs. unreliable

| Element | Specification |
|---------|---------------|
| Chart type | Heatmap matrix |
| Rows | Size classes (SC1-SC5) |
| Columns | Regions |
| Cell background | Certainty score color (green→yellow→red) |
| Cell text | "Survival: X% ± Y%" |
| Cell markers | ⚠ if n < 30 |
| Empty cells | Gray with "No data" |

**Certainty Score Calculation:**
```r
certainty_score <- function(n, ci_width, n_studies) {
  # Scale 0-1, higher = more certain
  n_score <- min(1, log(n + 1) / log(100))
  ci_score <- max(0, 1 - ci_width / 0.5)
  study_score <- min(1, n_studies / 3)
  return(mean(c(n_score, ci_score, study_score)))
}
```

---

## 5. R Backend Specification

### 5.1 New/Modified Endpoints for v2.0

#### Study-Stratified Summary Endpoint

```r
#* Get survival summary stratified by study
#* @get /survival/by-study-stratified
function(fragment_status = "all") {

  data <- data_env$survival_individual

  if (fragment_status != "all") {
    data <- data %>% filter(fragment == fragment_status)
  }

  data %>%
    group_by(study, fragment) %>%
    summarise(
      n = n(),
      survival_rate = mean(survived),
      se = sqrt(survival_rate * (1 - survival_rate) / n),
      ci_lower = pmax(0, survival_rate - 1.96 * se),
      ci_upper = pmin(1, survival_rate + 1.96 * se),
      mean_size = mean(size_cm2, na.rm = TRUE),
      median_size = median(size_cm2, na.rm = TRUE),
      size_min = min(size_cm2, na.rm = TRUE),
      size_max = max(size_cm2, na.rm = TRUE),
      year_min = min(survey_yr),
      year_max = max(survey_yr),
      pct_fragment = mean(fragment == "Y") * 100,
      .groups = "drop"
    ) %>%
    left_join(data_env$studies_metadata, by = c("study" = "study_id"))
}
```

#### Data Quality Metrics Endpoint

```r
#* Get data quality metrics for current filter
#* @get /quality/metrics
function(region = "", data_type = "", fragment = "all") {

  # Apply filters...
  data <- apply_standard_filters(data_env$survival_individual,
                                  region, data_type, fragment)

  # Calculate quality metrics
  list(
    total_n = nrow(data),
    n_studies = n_distinct(data$study),
    n_regions = n_distinct(data$region),

    # Dominance
    dominant_study = data %>%
      count(study, sort = TRUE) %>%
      slice(1) %>%
      mutate(pct = n / sum(data$study) * 100),

    # Fragment mix
    fragment_mix = data %>%
      count(fragment) %>%
      mutate(pct = n / sum(n) * 100),

    # Size range
    size_range = list(
      min = min(data$size_cm2, na.rm = TRUE),
      max = max(data$size_cm2, na.rm = TRUE),
      median = median(data$size_cm2, na.rm = TRUE)
    ),

    # Model fit if calculable
    model_r_squared = tryCatch({
      model <- glm(survived ~ log(size_cm2), data = data, family = binomial)
      1 - model$deviance / model$null.deviance
    }, error = function(e) NA)
  )
}
```

#### Certainty Matrix Endpoint

```r
#* Get certainty matrix for size × region
#* @get /quality/certainty-matrix
function() {

  size_breaks <- c(0, 25, 100, 500, 2000, Inf)
  size_labels <- c("SC1", "SC2", "SC3", "SC4", "SC5")

  data_env$survival_individual %>%
    mutate(size_class = cut(size_cm2, breaks = size_breaks,
                            labels = size_labels, include.lowest = TRUE)) %>%
    group_by(region, size_class) %>%
    summarise(
      n = n(),
      n_studies = n_distinct(study),
      survival_rate = mean(survived),
      se = sqrt(survival_rate * (1 - survival_rate) / n),
      ci_lower = pmax(0, survival_rate - 1.96 * se),
      ci_upper = pmin(1, survival_rate + 1.96 * se),
      ci_width = ci_upper - ci_lower,
      certainty_score = calculate_certainty(n, ci_width, n_studies),
      .groups = "drop"
    ) %>%
    complete(region, size_class,
             fill = list(n = 0, certainty_score = 0))
}
```

---

## 6. API Endpoints Reference

### 6.1 Updated Endpoint Summary

| Endpoint | Method | Description | New in v2.0? |
|----------|--------|-------------|--------------|
| `/survival/by-study-stratified` | GET | Study-level survival with CI | Yes |
| `/survival/by-fragment-status` | GET | Survival split by fragment/colony | Yes |
| `/quality/metrics` | GET | Data quality indicators | Yes |
| `/quality/certainty-matrix` | GET | Size × Region certainty grid | Yes |
| `/growth/distribution-by-study` | GET | Full growth distributions | Yes |
| `/studies/methodology-notes` | GET | Study caveats and methods | Yes |
| `/export/with-caveats` | GET | Export with mandatory warnings | Yes |

### 6.2 Response Format Updates

All data responses now include quality metadata:

```json
{
  "data": [...],
  "meta": {
    "query": {...},
    "total_n": 1234,
    "quality": {
      "dominant_study": {"name": "NOAA_survey", "pct": 78.2},
      "r_squared": 0.086,
      "ci_width_mean": 0.12,
      "fragment_mix": {"fragment_pct": 23, "colony_pct": 77},
      "warnings": [
        "78% of data from single study",
        "Fragment and colony data mixed"
      ]
    }
  }
}
```

---

## 7. Frontend Components Specification

### 7.1 New Components for v2.0

#### UncertaintyBanner Component

```tsx
// components/data-display/UncertaintyBanner.tsx

interface UncertaintyBannerProps {
  rSquared: number;
  sampleSize: number;
  dominantStudy?: { name: string; pct: number };
  fragmentMix?: { fragmentPct: number; colonyPct: number };
}

export function UncertaintyBanner({
  rSquared,
  sampleSize,
  dominantStudy,
  fragmentMix,
}: UncertaintyBannerProps) {

  const warnings = [];

  if (rSquared < 0.1) {
    warnings.push({
      type: 'info',
      message: `Size explains only ${(rSquared * 100).toFixed(1)}% of survival variance`,
      icon: 'chart-line'
    });
  }

  if (dominantStudy && dominantStudy.pct > 70) {
    warnings.push({
      type: 'info',
      message: `${dominantStudy.pct.toFixed(0)}% of data from ${dominantStudy.name}`,
      icon: 'database'
    });
  }

  if (fragmentMix && fragmentMix.fragmentPct > 10 && fragmentMix.colonyPct > 10) {
    warnings.push({
      type: 'warning',
      message: 'Fragments and colonies mixed. Consider stratifying.',
      icon: 'exclamation-triangle',
      action: { label: 'Separate', onClick: () => {} }
    });
  }

  if (warnings.length === 0) return null;

  return (
    <div className="bg-warning-bg border border-warning-yellow rounded-lg p-4 mb-4">
      <h4 className="font-semibold text-sm text-ocean-deep mb-2 flex items-center gap-2">
        <InfoIcon /> Data Quality Notes
      </h4>
      <ul className="space-y-2">
        {warnings.map((w, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <Icon name={w.icon} className="text-warning-yellow mt-0.5" />
            <span>{w.message}</span>
            {w.action && (
              <Button size="xs" onClick={w.action.onClick}>
                {w.action.label}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

#### StudyComparisonTable Component

```tsx
// components/data-display/StudyComparisonTable.tsx

interface StudyComparisonTableProps {
  studies: StudyMetadata[];
  highlightedStudy?: string;
}

export function StudyComparisonTable({ studies, highlightedStudy }: StudyComparisonTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border-light">
        <thead className="bg-sand-warm">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">
              Study
            </th>
            <th className="px-4 py-3 text-right">n</th>
            <th className="px-4 py-3 text-right">Survival</th>
            <th className="px-4 py-3 text-right">Size Range</th>
            <th className="px-4 py-3 text-center">Type</th>
            <th className="px-4 py-3 text-left">Key Caveat</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-light">
          {studies.map((study) => (
            <tr
              key={study.study_id}
              className={clsx(
                "hover:bg-sand-warm transition-colors",
                highlightedStudy === study.study_id && "bg-ocean-light/10"
              )}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <StudyColorDot color={STUDY_COLORS[study.study_id]} />
                  <span className="font-medium">{study.study_name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-right font-mono">
                {study.sample_size.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right font-mono">
                {(study.survival_rate * 100).toFixed(0)}%
                <span className="text-text-muted text-xs ml-1">
                  ± {(study.survival_ci_width * 100 / 2).toFixed(0)}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-mono text-sm">
                {study.size_min}–{study.size_max.toLocaleString()} cm²
              </td>
              <td className="px-4 py-3 text-center">
                <DataTypeBadge type={study.primary_data_type} />
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary max-w-xs truncate">
                {study.primary_caveat}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

#### ForestPlot Component (Study-Stratified)

```tsx
// components/visualizations/ForestPlot.tsx

interface ForestPlotProps {
  data: StudySurvivalSummary[];
  stratifyBy?: 'fragment' | 'region' | null;
  showPooledEstimate?: boolean; // Default FALSE in v2.0
  height?: number;
}

export function ForestPlot({
  data,
  stratifyBy = 'fragment',
  showPooledEstimate = false, // IMPORTANT: false by default
  height = 500,
}: ForestPlotProps) {

  const sortedData = useMemo(() =>
    [...data].sort((a, b) => b.n - a.n), // Sort by sample size
    [data]
  );

  const plotData = useMemo(() => {
    const traces: Plotly.Data[] = [];

    // Main points and CI whiskers
    traces.push({
      type: 'scatter',
      mode: 'markers',
      name: 'Survival Estimate',
      x: sortedData.map(d => d.survival_rate),
      y: sortedData.map(d => d.study),
      error_x: {
        type: 'data',
        symmetric: false,
        arrayminus: sortedData.map(d => d.survival_rate - d.ci_lower),
        array: sortedData.map(d => d.ci_upper - d.survival_rate),
        color: '#0a3d62',
        thickness: 2,
        width: 0,
      },
      marker: {
        size: sortedData.map(d => Math.sqrt(d.n) / 2 + 6),
        color: sortedData.map(d => STUDY_COLORS[d.study] || '#2e86ab'),
        line: { width: 2, color: 'white' },
      },
      hovertemplate:
        '<b>%{y}</b><br>' +
        'Survival: %{x:.1%}<br>' +
        'n = %{customdata.n}<extra></extra>',
      customdata: sortedData,
    });

    // Reference line at 0.5
    traces.push({
      type: 'scatter',
      mode: 'lines',
      x: [0.5, 0.5],
      y: [sortedData[sortedData.length - 1].study, sortedData[0].study],
      line: { dash: 'dash', color: '#bdc3c7', width: 1 },
      showlegend: false,
      hoverinfo: 'skip',
    });

    return traces;
  }, [sortedData]);

  const layout = useMemo(() => ({
    xaxis: {
      title: 'Annual Survival Probability',
      range: [0, 1],
      tickformat: '.0%',
      gridcolor: '#e8e8e8',
    },
    yaxis: {
      title: '',
      automargin: true,
    },
    margin: { l: 150, r: 100, t: 40, b: 60 },
    font: { family: 'Inter, sans-serif' },
    annotations: sortedData.map(d => ({
      x: 1.05,
      y: d.study,
      text: `n=${d.n.toLocaleString()}`,
      showarrow: false,
      font: { size: 10, family: 'JetBrains Mono', color: '#5d6d7e' },
      xref: 'paper',
    })),
    shapes: [], // No pooled estimate line by default
  }), [sortedData]);

  return (
    <div className="bg-white rounded-xl border border-border-medium p-4">
      {!showPooledEstimate && (
        <div className="text-xs text-text-muted mb-2 flex items-center gap-1">
          <InfoIcon size={12} />
          Pooled estimate not shown due to high study heterogeneity
        </div>
      )}
      <Plot
        data={plotData}
        layout={{ ...layout, height }}
        config={{ displayModeBar: true, displaylogo: false }}
        style={{ width: '100%' }}
      />
    </div>
  );
}
```

---

## 8. Page-by-Page Implementation Guide

### 8.1 Home Page (Updated)

**Key Change:** Lead with data limitations, not just data summary

#### Hero Section

```tsx
<Hero>
  <HeroTitle>
    Acropora palmata Demographic Data
  </HeroTitle>
  <HeroSubtitle>
    Explore survival and growth data from 6 studies across the Caribbean.
    <strong> Understand the heterogeneity before using these estimates.</strong>
  </HeroSubtitle>
  <HeroActions>
    <Button primary>Explore by Study</Button>
    <Button secondary>Which data should I use?</Button>
  </HeroActions>
</Hero>
```

#### Key Findings Cards (NEW)

Replace simple statistics with honest summaries:

```tsx
<FindingsGrid>
  <FindingCard type="warning">
    <FindingValue>78%</FindingValue>
    <FindingLabel>Data from NOAA Survey</FindingLabel>
    <FindingDetail>Other studies have smaller samples</FindingDetail>
  </FindingCard>

  <FindingCard type="info">
    <FindingValue>100-400x</FindingValue>
    <FindingLabel>Size Difference</FindingLabel>
    <FindingDetail>NOAA colonies vs. fragment studies</FindingDetail>
  </FindingCard>

  <FindingCard type="warning">
    <FindingValue>8.6%</FindingValue>
    <FindingLabel>Variance Explained</FindingLabel>
    <FindingDetail>Size alone predicts little about survival</FindingDetail>
  </FindingCard>

  <FindingCard type="info">
    <FindingValue>6</FindingValue>
    <FindingLabel>Studies Synthesized</FindingLabel>
    <FindingDetail>Each with different methods and populations</FindingDetail>
  </FindingCard>
</FindingsGrid>
```

### 8.2 Explore by Study Page (NEW - Primary View)

**Layout:**

```
┌──────────────────────────────────────────────────────────────────┐
│  Header: "Explore by Study"                                       │
├──────────────────────────────────────────────────────────────────┤
│  UncertaintyBanner (always visible)                               │
├──────────────────────────────────────────────────────────────────┤
│  [All Studies] [Colonies Only] [Fragments Only]  ← Toggle tabs    │
├───────────────┬──────────────────────────────────────────────────┤
│               │                                                   │
│   Study       │   Forest Plot (Figure 2)                         │
│   Filter      │                                                   │
│   List        │                                                   │
│               ├──────────────────────────────────────────────────┤
│   [✓] NOAA    │                                                   │
│   [✓] Pausch  │   Size-Survival Panels (Figure 3)                │
│   [✓] Kuffner │   [NOAA] [Pausch] [Other] [Combined]             │
│   etc.        │                                                   │
│               ├──────────────────────────────────────────────────┤
│               │                                                   │
│               │   Study Comparison Table                          │
│               │                                                   │
└───────────────┴──────────────────────────────────────────────────┘
```

### 8.3 Data Quality Dashboard (NEW)

Permanent page showing full audit results:

```tsx
<PageLayout>
  <PageHeader>
    <h1>Data Quality & Limitations</h1>
    <p>Understand what this dataset can and cannot tell us.</p>
  </PageHeader>

  <Section title="Key Findings from Data Audit">
    <AuditFindingCard
      title="Study Heterogeneity"
      severity="high"
      description="Studies measure fundamentally different populations..."
      visualization={<SizeDistributionByStudy />}
    />

    <AuditFindingCard
      title="Simpson's Paradox"
      severity="high"
      description="Survival differences persist even within size classes..."
      visualization={<SimpsonParadoxDemo />}
    />

    <AuditFindingCard
      title="Low Explanatory Power"
      severity="medium"
      description="Size explains only 8.6% of survival variance..."
      visualization={<RSquaredComparison />}
    />
  </Section>

  <Section title="Data Certainty Matrix">
    <CertaintyMatrix />
  </Section>

  <Section title="What We're NOT Claiming">
    <ul>
      <li>A single "critical size threshold"</li>
      <li>Universal parameters across contexts</li>
      <li>That pooled estimates represent any real population</li>
    </ul>
  </Section>
</PageLayout>
```

---

## 9. File Structure & Project Setup

### 9.1 Updated Project Structure

```
web-platform/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── visualizations/
│   │   │   │   ├── ForestPlot.tsx         # Study-stratified forest plot
│   │   │   │   ├── SizeSurvivalPanel.tsx  # Multi-panel size-survival
│   │   │   │   ├── GrowthDistribution.tsx # Growth histograms/violins
│   │   │   │   ├── CertaintyMatrix.tsx    # Data quality heatmap
│   │   │   │   ├── ConfoundingViz.tsx     # Simpson's paradox demo
│   │   │   │   └── MapView.tsx            # Geographic map
│   │   │   ├── data-display/
│   │   │   │   ├── UncertaintyBanner.tsx  # Always-visible warnings
│   │   │   │   ├── StudyComparisonTable.tsx
│   │   │   │   ├── WarningCard.tsx
│   │   │   │   └── QualityBadge.tsx
│   │   │   └── wizard/
│   │   │       ├── DataSelectionWizard.tsx
│   │   │       └── WizardStep.tsx
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── ExploreByStudy.tsx         # NEW: Primary exploration
│   │   │   ├── ExploreByQuestion.tsx      # NEW: Wizard-guided
│   │   │   ├── DataQuality.tsx            # NEW: Audit dashboard
│   │   │   ├── CompareStudies.tsx         # Study comparison
│   │   │   ├── Download.tsx
│   │   │   └── Documentation.tsx
│   │   ├── hooks/
│   │   │   ├── useStudyData.ts
│   │   │   ├── useQualityMetrics.ts       # NEW
│   │   │   └── useFilterWithWarnings.ts   # NEW
│   │   └── utils/
│   │       ├── qualityScoring.ts          # NEW
│   │       └── studyColors.ts             # NEW
│   │
├── backend/
│   ├── R/
│   │   ├── endpoints/
│   │   │   ├── quality.R                  # NEW: Quality metrics
│   │   │   └── stratified.R               # NEW: Study-stratified
│   │   └── analysis/
│   │       └── certainty_scoring.R        # NEW
│   │
└── docs/
    ├── data-audit-report.md               # NEW: Full audit findings
    └── methodology-notes/                 # NEW: Per-study notes
```

### 9.2 Implementation Checklist (Updated)

#### Phase 1: Transparency Foundation

- [ ] Create `UncertaintyBanner` component
- [ ] Create `QualityBadge` component
- [ ] Implement `/quality/metrics` endpoint
- [ ] Add study color mapping
- [ ] Build Figure 1: Data Landscape
- [ ] Build Figure 2: Forest Plot (no pooled estimate)

#### Phase 2: Stratified Visualizations

- [ ] Build Figure 3: Size-Survival by Study
- [ ] Build Figure 4: Growth Distributions
- [ ] Build Figure 5: Confounding Visualization
- [ ] Build Figure 6: Certainty Matrix
- [ ] Implement study comparison table
- [ ] Add fragment/colony stratification toggle

#### Phase 3: User Guidance

- [ ] Build "Which Data Should I Use?" wizard
- [ ] Create data quality dashboard page
- [ ] Add warning system to all data views
- [ ] Implement export with mandatory caveats
- [ ] Write per-study methodology notes

#### Phase 4: Polish & Launch

- [ ] User testing with practitioners
- [ ] Verify all warnings display correctly
- [ ] Check that uncertainty is never hidden
- [ ] Final review of messaging
- [ ] Public launch

---

*Document Version 2.0 | December 2025*
*Revised following data audit - emphasizing transparency and uncertainty*
