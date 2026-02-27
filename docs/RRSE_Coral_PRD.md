# Product Requirements Document
## RRSE Coral Parameters Data Platform

**A Transparent, Uncertainty-Aware Platform for Exploring Acropora palmata Demographic Data**

> **Implementation Status (Feb 2026):** Platform is built and deployed on Render. Frontend (React + TypeScript) and Backend (R Plumber API) are operational. This PRD is retained as the design specification — the live platform implements the core requirements described below.

---

**Stier Lab | Ocean Recoveries Lab**
UC Santa Barbara
Version 2.0 | December 2025

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Product Vision and Goals](#3-product-vision-and-goals)
4. [Data Architecture](#4-data-architecture)
5. [Key Data Characteristics](#5-key-data-characteristics)
6. [Functional Requirements](#6-functional-requirements)
7. [Visualization Strategy](#7-visualization-strategy)
8. [User Interface Specifications](#8-user-interface-specifications)
9. [Non-Functional Requirements](#9-non-functional-requirements)
10. [Implementation Roadmap](#10-implementation-roadmap)
11. [Success Metrics](#11-success-metrics)

---

## 1. Executive Summary

This Product Requirements Document outlines the development of a **transparent, uncertainty-aware** data platform for the Restoration Strategy Evaluation (RSE/RRSE) project's coral demographic parameter database.

**Critical Design Philosophy:** Following a rigorous data audit, this platform prioritizes **honest presentation of data heterogeneity** over false precision. The synthesized dataset contains studies with fundamentally different methodologies (field surveys of large colonies vs. nursery experiments with small fragments), and the platform must make these differences visible rather than obscuring them in pooled estimates.

### Key Findings from Data Audit

| Issue | Finding | Platform Response |
|-------|---------|-------------------|
| Study heterogeneity | NOAA colonies 100-400x larger than fragment studies | **Stratify all visualizations by study/data type** |
| Fragment vs Colony confounding | 20-point survival difference persists within size classes | **Separate fragment/colony analyses by default** |
| Threshold detection unreliable | 95% CI spans 2-10,407 cm² (4,500x range) | **Abandon threshold claims; show continuous relationships** |
| Low R² values | Size explains 5.8% survival (GAM), 1% growth variance | **Display R² prominently; emphasize uncertainty** |
| Growth data issues | NOAA mean growth is negative (-189 cm²/yr) | **Flag data quality; show distributions not means** |

---

## 2. Problem Statement

### 2.1 Original Challenges (Still Valid)
- **Data Fragmentation:** Coral demographic parameters exist across disparate sources
- **Limited Accessibility:** Practitioners lack easy access to synthesized data
- **Collaboration Barriers:** No centralized platform for partner data contribution

### 2.2 New Challenge: Avoiding False Precision

The original vision assumed data could be pooled into unified parameter estimates. The data audit revealed:

1. **Studies measure different populations:** NOAA surveys large established colonies (mean 7,788 cm²); Pausch et al. tracks small fragments (mean 64 cm²)
2. **Confounding is severe:** Fragment status, region, year, and study are highly correlated with size
3. **Threshold detection is unstable:** No reliable "critical size" can be estimated from this dataset
4. **Low explanatory power:** Size alone explains very little of survival/growth variation

**The platform must help users understand these limitations, not hide them.**

### 2.3 Target Users (Refined)

1. **Coral Restoration Practitioners:** Need to understand which parameter estimates apply to their context (fragments vs. colonies, nursery vs. field)
2. **Academic Researchers:** Require transparent access to heterogeneous data for proper meta-analysis
3. **Conservation Managers:** Need honest uncertainty estimates for planning
4. **RSE Modelers:** Must choose appropriate parameters for their specific restoration scenarios

---

## 3. Product Vision and Goals

### 3.1 Revised Vision Statement

Create an **open-access platform that honestly represents the heterogeneity and uncertainty** in *Acropora palmata* demographic data, enabling users to explore study-specific patterns and make informed decisions about which parameter estimates apply to their restoration context.

### 3.2 Core Principles

1. **Transparency First:** Always show uncertainty, sample sizes, and data provenance
2. **Stratification by Default:** Present data by study, fragment status, and data type before showing pooled estimates
3. **Uncertainty is Information:** Wide confidence intervals and low R² values are important findings, not failures
4. **User-Appropriate Complexity:** Allow practitioners to access simple summaries while providing full complexity for researchers

### 3.3 Strategic Goals

1. **Explore:** Enable interactive exploration of study-specific patterns
2. **Compare:** Facilitate side-by-side comparison of estimates across contexts
3. **Understand:** Help users grasp why estimates vary and what that means for their application
4. **Export:** Provide filtered, well-documented data for external analysis
5. **Contribute:** Support community data contributions with quality metadata

---

## 4. Data Architecture

### 4.1 Core Data Entities

See [Data Methodology Reference](Data_Methodology_Reference.md) for complete column definitions and study-by-study notes.

**Primary Datasets:**
- `apal_surv_ind.csv` - Individual survival records with size, location, study, survival outcome
- `apal_growth_ind.csv` - Individual growth records with initial size and growth rate
- `apal_surv_summ.csv` - Summary survival data for studies without individual sizes
- `apal_growth_summ.csv` - Summary growth data for studies without individual sizes

**Size Measurement Standard:** Live planar area (length × width × percent alive), following Vardi et al. 2012.

### 4.2 Revised Size Class Definitions

Based on data distribution analysis:

| Size Class | Range (cm²) | Description | Dominant Data Source |
|------------|-------------|-------------|---------------------|
| SC1 | 0-25 | Recruits/small fragments | Fragment studies |
| SC2 | 25-100 | Juveniles | Pausch et al., fragments |
| SC3 | 100-500 | Large juveniles | Mixed |
| SC4 | 500-2000 | Small adults | NOAA survey |
| SC5 | >2000 | Large adults | NOAA survey only |

**Critical Note:** SC4 and SC5 data come almost exclusively from NOAA surveys. Generalizing these estimates to restoration contexts with small fragments is inappropriate.

---

## 5. Key Data Characteristics

### 5.1 Study-Level Summary

| Study | n | Size Range | Survival | Type | Primary Use |
|-------|---|------------|----------|------|-------------|
| NOAA_survey | 4,048 | 1-100,000+ cm² | 86% | Field colonies | Large colony demographics |
| pausch_et_al_2018 | 969 | 5-300 cm² | 57% | Outplant fragments | Fragment survival |
| kuffner_et_al_2020 | 53 | 8-40 cm² | 81% | Outplant | Assisted migration |
| USGS_USVI_exp | 46 | 14-200 cm² | 65% | Experimental | Growth rates |
| fundemar_fragments | 45 | 6-40 cm² | 84% | Nursery | Fragment survival |
| mendoza_quiroz_2023 | 52 | 3-2000 cm² | 100% | Nursery | Nursery survival |

### 5.2 Key Heterogeneity Patterns

**Simpson's Paradox in Action:**
- Overall: NOAA shows 86% survival, Pausch shows 57%
- Within SC2 (25-100 cm²): NOAA shows 75% survival, Pausch shows 58%
- **The 17-point gap persists even controlling for size**

**Growth Data Quality Issues:**
- NOAA growth data shows mean shrinkage (-189 cm²/yr)
- 32.6% of NOAA records show shrinkage
- Extreme values: -119,365 to +29,802 cm²/yr
- **R² = 0.01 for size vs. absolute growth**

### 5.3 Confounding Structure

```
Study ←→ Fragment Status ←→ Size ←→ Survival
  ↓           ↓              ↓
Region      Data Type       Year
```

All of these variables are correlated. Isolating the "true" effect of size is challenging or impossible with this dataset.

---

## 6. Functional Requirements

### 6.1 Data Exploration Module (Primary)

#### 6.1.1 Stratified Survival Visualization

**Default View:** Survival rate by study, not pooled

| Requirement | Specification |
|-------------|---------------|
| Primary display | Forest plot showing per-study survival estimates with CIs |
| Secondary display | Scatter plot of size vs. survival, colored by study |
| Filter defaults | Fragment/Colony separated by default |
| Uncertainty display | Always show 95% CI and sample size |
| Hover details | Study name, n, methodology notes |

#### 6.1.2 Growth Distribution Viewer

**Focus:** Show distributions, not just means

| Requirement | Specification |
|-------------|---------------|
| Primary display | Histogram/violin plot of growth rates by study |
| Highlight | % shrinking, % stable, % growing |
| Warning | Flag NOAA data quality issues prominently |
| Stratification | By size class, by study, by fragment status |

#### 6.1.3 Study Comparison Dashboard

**Purpose:** Side-by-side comparison of methodology and results

| Requirement | Specification |
|-------------|---------------|
| Study cards | Methodology summary, caveats, sample characteristics |
| Comparison table | Size range, survival, growth, fragment %, time intervals |
| Applicability guide | "Use this study if your context is..." |

#### 6.1.4 Interactive Geographic Map

*Unchanged from v1.0, but add:*
- Color by study, not just survival rate
- Click-through to study-specific statistics
- Clear labeling of sample sizes

### 6.2 Data Quality & Transparency Module (New)

#### 6.2.1 Data Audit Dashboard

Permanent display of data limitations:

| Element | Content |
|---------|---------|
| R² display | "Size explains X% of survival variance" |
| CI width | Visual representation of threshold uncertainty |
| Study dominance | "78% of data from NOAA survey" |
| Confounding alert | "Fragment status correlated with size (r=X)" |

#### 6.2.2 "Which Data Should I Use?" Wizard

Interactive guide for practitioners:

1. "Are you working with fragments or established colonies?"
2. "What size range are you interested in?"
3. "Field or nursery context?"
4. → Returns filtered, relevant data with appropriate caveats

### 6.3 Export & Citation Module

*Largely unchanged, but add:*
- Mandatory methodology notes in exports
- Warning text for pooled estimates
- Study-specific citation requirements

---

## 7. Visualization Strategy

### 7.1 Primary Figures (6 Total)

#### Figure 1: Data Landscape Overview

**Purpose:** Show the heterogeneity upfront

| Panel | Content |
|-------|---------|
| A | Map of study sites, colored by study |
| B | Size distribution histogram by study (stacked/overlaid) |
| C | Sample size by study × size class heatmap |
| D | Temporal coverage by study (timeline) |

**Key Message:** Data sources differ fundamentally in what they measure.

#### Figure 2: Survival by Study (Forest Plot)

**Purpose:** Show study-level estimates before any pooling

| Element | Specification |
|---------|---------------|
| Y-axis | Studies, ordered by sample size |
| X-axis | Survival probability (0-1) |
| Points | Mean survival with 95% CI whiskers |
| Facet | Left panel: Colonies; Right panel: Fragments |
| Annotation | n values, year ranges |

**Key Message:** Survival estimates vary substantially across studies.

#### Figure 3: Size-Survival Relationship (Stratified)

**Purpose:** Show size effect within studies, not pooled

| Panel | Content |
|-------|---------|
| A | NOAA survey: size vs. survival (log scale) with LOESS |
| B | Pausch et al.: size vs. survival with LOESS |
| C | Other studies: size vs. survival (if n sufficient) |
| D | Combined panel with studies color-coded |

**Annotations:**
- R² values displayed for each study
- Text: "Size explains X% of variation"
- CI bands if model fitted

**Key Message:** Size-survival relationship varies by study.

#### Figure 4: Growth Distribution Comparison

**Purpose:** Show full growth distributions, flag quality issues

| Panel | Content |
|-------|---------|
| A | NOAA growth distribution with shrinkage highlighted |
| B | Other studies growth distributions (violin plots) |
| C | Positive growth probability by size class |
| D | Warning panel about NOAA data characteristics |

**Key Message:** Growth data is highly variable; mean values obscure important patterns.

#### Figure 5: Confounding Visualization

**Purpose:** Make the confounding structure visible

| Panel | Content |
|-------|---------|
| A | Size distribution: fragments vs. colonies |
| B | Survival by size, colored by fragment status |
| C | Study × Fragment × Size class heatmap |
| D | "Adjusted" vs. "unadjusted" survival comparison |

**Key Message:** Fragment status, size, and study are confounded; interpret cautiously.

#### Figure 6: Data Certainty Matrix

**Purpose:** Show where we have reliable estimates vs. data gaps

| Rows | Size classes (SC1-SC5) |
| Columns | Regions |
| Cell color | Sample size / certainty score |
| Cell text | Survival estimate ± CI |
| Annotations | "Low confidence" for sparse cells |

**Key Message:** Confidence in estimates varies dramatically by size class and region.

### 7.2 Interactive Figure Enhancements

All static figures have interactive versions with:
- Hover tooltips showing individual study details
- Click to filter/isolate specific studies
- Toggle between pooled/stratified views
- Download data behind each figure

---

## 8. User Interface Specifications

### 8.1 Navigation Structure (Revised)

1. **Home/Overview:** Key findings, data limitations upfront
2. **Explore by Study:** Primary exploration mode, study-stratified
3. **Explore by Question:** Wizard-guided data selection
4. **Compare Studies:** Side-by-side methodology comparison
5. **Download:** Filtered export with mandatory caveats
6. **Documentation:** Full methods, data dictionary, audit report
7. **Contribute:** Data submission with quality standards

### 8.2 Key Interface Components

#### 8.2.1 Global Filter Panel

| Filter | Options | Default |
|--------|---------|---------|
| Data Context | Colonies / Fragments / Both | **Separated** |
| Study | Multi-select all studies | All |
| Region | Multi-select | All |
| Size Range | Slider (log scale) | Full range |
| Year Range | Slider | 2004-2024 |
| Show Uncertainty | Toggle | **On** |

#### 8.2.2 Uncertainty Display Widget

Persistent on all data views:
- R² value with interpretation
- CI width indicator
- Sample size summary
- Data dominance warning (if >50% from one study)

#### 8.2.3 Study Context Cards

When viewing pooled data, show cards for included studies:
- Study name and citation
- Key methodology notes
- Sample characteristics (size range, fragment %, etc.)
- Known caveats

### 8.3 Warning and Caveat System

| Trigger | Warning |
|---------|---------|
| Pooling fragment and colony data | "These data types have different survival patterns. Consider stratifying." |
| Low sample size (<30) | "Estimates based on small sample. Interpret with caution." |
| Wide CI (>30 percentage points) | "High uncertainty in this estimate." |
| NOAA dominance (>70%) | "Estimate dominated by NOAA survey data." |
| Growth data from NOAA | "NOAA growth data shows high variability and negative mean values." |

---

## 9. Non-Functional Requirements

### 9.1 Performance
*Unchanged from v1.0*

### 9.2 Accessibility
*Unchanged from v1.0*

### 9.3 Scientific Integrity (New)

| Requirement | Specification |
|-------------|---------------|
| No false precision | Never display estimates without uncertainty |
| Source attribution | Every visualization traces to source studies |
| Methodology transparency | Full audit trail for all transformations |
| Reproducibility | R code for all analyses available |
| Version control | Clear versioning of data and estimates |

---

## 10. Implementation Roadmap

### Phase 1: Foundation with Transparency (Months 1-2)

- Finalize database with full study metadata
- Implement study-stratified API endpoints
- Build uncertainty display components
- Create Figure 1 (Data Landscape) and Figure 2 (Forest Plot)
- Deploy data audit dashboard

### Phase 2: Stratified Visualizations (Months 3-4)

- Build Figure 3 (Size-Survival by Study)
- Build Figure 4 (Growth Distributions)
- Implement filter panel with stratification defaults
- Create study comparison dashboard
- Add warning/caveat system

### Phase 3: User Guidance (Months 5-6)

- Build "Which Data Should I Use?" wizard
- Create Figure 5 (Confounding) and Figure 6 (Certainty Matrix)
- Implement study context cards
- Data export with mandatory caveats
- Documentation and methods pages

### Phase 4: Launch (Month 7)

- User testing with practitioners and researchers
- Refine based on feedback
- Final audit report integration
- Public launch with clear framing

---

## 11. Success Metrics

### 11.1 Transparency Metrics (New)

| Metric | Target |
|--------|--------|
| Users viewing stratified (not pooled) data | >70% |
| Downloads including methodology notes | 100% (mandatory) |
| Wizard completion rate | >50% of new users |
| Uncertainty displays visible | 100% of data views |

### 11.2 Adoption Metrics

| Metric | Target |
|--------|--------|
| Monthly unique visitors | 300 in Year 1 |
| Data downloads | 50+ per month |
| Partner organizations using platform | 5+ |
| Academic citations | 5+ per year |

### 11.3 Impact Metrics

| Metric | Target |
|--------|--------|
| Users correctly identifying data limitations | >80% (via exit survey) |
| Restoration programs using context-appropriate estimates | >5 |
| Reduction in misapplied parameter estimates | Qualitative feedback |

---

## Appendices

### Appendix A: Data Audit Summary

The full data audit identified the following critical issues:

1. **NOAA survey dominates** (78% of survival data)
2. **Size distributions differ by 100-400x** across studies
3. **Fragment vs. colony confounding** explains much of survival variation
4. **Threshold detection is unreliable** (52% CV, 3-order-of-magnitude CI)
5. **Growth R² = 0.01** - size explains almost nothing
6. **Time intervals vary** from 0.2 to 4.3 years

These findings fundamentally shaped this revised PRD.

### Appendix B: What We're NOT Claiming

This platform explicitly does **not** claim:
- A single "critical size threshold" for survival
- Universal size-survival parameters applicable across contexts
- That pooled estimates represent any real population
- That fragment and colony data can be meaningfully combined

### Appendix C: Partner Organizations
*Unchanged from v1.0*

### Appendix D: Data Sources and Methodology

For complete documentation of:
- Literature search methods
- Size standardization approach (live planar area)
- Dataset column definitions (survival and growth, individual and summary)
- Study-by-study notes and caveats for all 18+ data sources
- Fragmentation rate methodology
- Short-term lab survival data

See: [Data Methodology Reference](Data_Methodology_Reference.md)

**Key Studies Included:**
| Study | n | Type | Key Caveat |
|-------|---|------|------------|
| NOAA Survey | 4,048 | Field colonies | 78% of data; large colonies only |
| Pausch et al. 2018 | 969 | Outplant fragments | Small fragments; nursery origin |
| USGS USVI | 46 | Experimental | Growth focus |
| Kuffner et al. 2020 | 53 | Outplant | Assisted migration context |
| Fundemar | 45 | Nursery fragments | Dominican Republic |
| Mendoza Quiroz 2023 | 52 | Nursery/outplant | Mexico |
| + 12 additional sources | varies | Mixed | See methodology reference |

---

*Document prepared by: Ocean Recoveries Lab, UC Santa Barbara*
*Contact: Adrian Stier (stier@ucsb.edu)*
*Version 2.0 - Revised following data audit, December 2025*
