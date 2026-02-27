# Coral Demographic Database - Frontend

Interactive web application for visualizing and exploring *Acropora palmata* (Elkhorn Coral) demographic data from across the Caribbean. Part of the Detmer et al. (2025) coral parameters project.

## Overview

This React application provides:

- **Story** (`/`): Narrative presentation of key findings with interactive visualizations
- **Full Analysis** (`/analysis`): Comprehensive data exploration with sidebar navigation
- **Methods** (`/methods`): FAQ and methodology documentation
- **Outplanting Wizard** (`/answers/outplant`): Size recommendation tool for restoration practitioners
- **Survival Tool** (`/answers/survival`): Survival estimates by colony size
- **Growth Tool** (`/answers/growth`): Growth projections and distributions
- **Regional Tool** (`/answers/region`): Geographic comparisons across Caribbean regions
- **Download** (`/download`): Data export options (CSV, reports)
- **Literature** (`/literature`): Source studies and references
- **404** (`*`): Not found page

## Technology Stack

| Category | Technology |
|----------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS |
| State Management | Zustand (filterStore, uiStore) |
| Server State | @tanstack/react-query |
| Routing | react-router-dom |
| HTTP Client | axios |
| Mapping | react-leaflet + leaflet |
| Icons | lucide-react |
| Testing | Vitest |

## Project Structure

```
src/
├── pages/                  # 10 page components
│   ├── Story.tsx
│   ├── FullAnalysis.tsx
│   ├── Methods.tsx
│   ├── OutplantingWizard.tsx
│   ├── SurvivalTool.tsx
│   ├── GrowthTool.tsx
│   ├── RegionalTool.tsx
│   ├── Download.tsx
│   ├── Literature.tsx
│   └── NotFound.tsx
├── components/
│   ├── common/             # Shared UI (Button, Card, ErrorBoundary,
│   │                       #   LoadingSpinner, Skeleton, StatCard,
│   │                       #   Tooltip, UncertaintyBanner, etc.)
│   ├── filters/            # Data filter controls (DataTypeToggle,
│   │                       #   FilterChips, FilterPanel, FragmentToggle,
│   │                       #   RangeSlider, RegionSelect)
│   ├── layout/             # Header, Footer, PageLayout, AnalysisSidebar
│   └── visualizations/
│       ├── SurvivalBySize.tsx
│       ├── SurvivalBySizeAndType.tsx
│       ├── GrowthBySizeAndType.tsx
│       ├── GrowthDistribution.tsx
│       ├── PositiveGrowthBySize.tsx
│       ├── FragmentationBySize.tsx
│       ├── MapView.tsx
│       └── KeyFindings/    # 13 key finding visualizations
│           ├── AGRvsRGRComparison.tsx
│           ├── ElasticityMatrix.tsx
│           ├── ElasticityPanel.tsx
│           ├── ElasticityTreemap.tsx
│           ├── ExecutiveSummary.tsx
│           ├── HeterogeneityPanel.tsx
│           ├── NaturalVsRestoredChart.tsx
│           ├── PopulationDeclineGauge.tsx
│           ├── RestorationScenarios.tsx
│           ├── RGRBySizeChart.tsx
│           ├── SurvivalByClassChart.tsx
│           ├── TemporalTrendChart.tsx
│           └── ThresholdUncertaintyPlot.tsx
├── hooks/                  # 9 custom React hooks
│   ├── useAnalysisData.ts
│   ├── useElasticityData.ts
│   ├── useGrowthData.ts
│   ├── useMapData.ts
│   ├── usePapers.ts
│   ├── useScenarioData.ts
│   ├── useStudies.ts
│   ├── useSurvivalData.ts
│   └── useUrlFilters.ts
├── utils/
│   └── api/                # API client and helpers
│       ├── client.ts       # axios instance + unwrapRValues()
│       ├── errors.ts       # Error handling utilities
│       └── services.ts     # Typed API service functions
├── stores/                 # Zustand state stores
│   ├── filterStore.ts
│   └── uiStore.ts
├── types/                  # TypeScript type definitions
├── constants/
│   └── sizeClasses.ts      # Canonical size class definitions
└── test/                   # Test setup and utilities
```

## Size Classes

| Class | Size Range (cm²) |
|-------|-------------------|
| SC1 | 0 - 25 |
| SC2 | 25 - 100 |
| SC3 | 100 - 500 |
| SC4 | 500 - 2,000 |
| SC5 | > 2,000 |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
cd web-platform/frontend
npm install
```

### Development

```bash
npm run dev
```

Opens at [http://localhost:5173](http://localhost:5173)

The frontend expects the R Plumber backend to be running at the URL specified by the `VITE_API_URL` environment variable (defaults to `http://localhost:8000`).

### Production Build

```bash
npm run build
```

Output in `dist/` directory.

### Testing

```bash
npm run test
```

### Linting

```bash
npm run lint
```

## API Backend

The frontend connects to an R Plumber REST API (see `../backend/`). All endpoints are prefixed with `/api/`.

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/survival/by-size` | Survival rates by size class |
| `GET /api/survival/by-study-stratified` | Survival stratified by study |
| `GET /api/growth/by-size` | Growth rates by size class |
| `GET /api/growth/positive-growth-probability` | Probability of positive growth by size |
| `GET /api/stats/overview` | Dashboard overview statistics |
| `GET /api/stats/summary` | Summary statistics |
| `GET /api/quality/metrics` | Data quality metrics |
| `GET /api/quality/certainty-matrix` | Certainty matrix for size classes |
| `GET /api/elasticity/matrix` | Population elasticity matrix |
| `GET /api/elasticity/summary` | Elasticity summary statistics |
| `GET /api/map/regions` | Geographic region data for mapping |
| `GET /api/recommendation/outplant-size` | Outplant size recommendations |
| `GET /api/papers/list` | List of source papers |
| `GET /api/papers/by-region` | Papers filtered by region |
| `GET /api/studies/list` | List of studies |
| `GET /api/studies/summary` | Study summary statistics |
| `GET /api/export/csv` | Export data as CSV |
| `GET /api/export/report` | Export formatted report |
| `GET /api/analysis/diagnostics` | Model diagnostics |

### R Scalar Unwrapping

R/Plumber returns scalars as single-element arrays (e.g., `[42]` instead of `42`). All API responses are processed through `unwrapRValues()` in `src/utils/api/client.ts` to normalize this behavior before data reaches components.

## Deployment

The frontend deploys as a static site on Render. Configuration is in `render.yaml` at the repository root.

- **Build command:** `cd web-platform/frontend && npm install && npm run build`
- **Publish directory:** `web-platform/frontend/dist`
- **Environment variable:** `VITE_API_URL` points to the backend Render service URL
