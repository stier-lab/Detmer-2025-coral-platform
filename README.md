# Coral Demographics Platform

Interactive web application for visualizing and exploring *Acropora palmata* (Elkhorn Coral) demographic data from across the Caribbean. Part of Detmer et al. (2025).

The platform synthesizes ~9,500 individual-level observations from 6 studies and summary data from 10 additional studies to provide survival estimates, growth projections, population model results, and outplanting recommendations for coral restoration practitioners, managers, and researchers.

**Live site:** [coral-demographics.onrender.com](https://coral-demographics.onrender.com)

---

## Features

| Page | Route | Description |
|------|-------|-------------|
| Story | `/` | Narrative presentation of key findings with interactive D3 visualizations |
| Full Analysis | `/analysis` | Comprehensive data exploration with filtering and sidebar navigation |
| Methods | `/methods` | FAQ and methodology documentation |
| Outplanting Wizard | `/answers/outplant` | Size recommendation tool for restoration practitioners |
| Survival Tool | `/answers/survival` | Survival estimates by colony size class |
| Growth Tool | `/answers/growth` | Growth projections and distributions |
| Regional Tool | `/answers/region` | Geographic comparisons across Caribbean regions with interactive map |
| Download | `/download` | Data export (CSV, summary reports) |
| Literature | `/literature` | Source studies and references |

---

## Tech Stack

| Layer | Technology | Key Packages |
|-------|-----------|--------------|
| Frontend | React 19, TypeScript | Vite, Tailwind CSS, D3.js, React Query, Zustand, Leaflet |
| Backend | R Plumber REST API | plumber, dplyr, jsonlite, readr, tidyr |
| Deployment | Render | Docker (backend), static site (frontend) |
| Testing | Vitest + Testing Library | testthat (backend) |

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- R 4.3+ with packages: `plumber`, `dplyr`, `jsonlite`, `readr`, `tidyr`, `purrr`

### Clone and Run

```bash
git clone --recurse-submodules https://github.com/stier-lab/Detmer-2025-coral-platform.git
cd Detmer-2025-coral-platform

# Backend (Terminal 1)
cd backend && Rscript run.R

# Frontend (Terminal 2)
cd frontend && npm install && npm run dev
```

The backend starts on port 8000 and the frontend on port 5173. The frontend reads `VITE_API_URL` (defaults to `http://localhost:8000`).

If you cloned without `--recurse-submodules`, initialize the data submodule:

```bash
git submodule update --init --recursive
```

> **Note:** The backend generates mock data if the submodule is not present, so frontend development works without it.

---

## Architecture

```
                    +-----------+
                    |  Browser  |
                    +-----+-----+
                          |
                    +-----v-----+
                    |  React    |  Port 5173 (dev) / static site (prod)
                    |  Frontend |  Tailwind CSS + D3 visualizations
                    +-----+-----+
                          |  Axios + React Query
                    +-----v-----+
                    | R Plumber |  Port 8000
                    |  Backend  |  19 API endpoints under /api/
                    +-----+-----+
                          |
                    +-----v-----+
                    | data-repo |  Git submodule
                    | (CSV/RDS) |  standardized_data/ + analysis/output/
                    +-----------+
```

### Repository Structure

```
Detmer-2025-coral-platform/
├── frontend/               React 19 + TypeScript + Tailwind + D3
│   └── src/
│       ├── pages/          10 lazy-loaded page components
│       ├── components/     Shared UI, filters, layout, visualizations
│       ├── hooks/          9 custom React hooks (data fetching)
│       ├── utils/api/      Axios client with R scalar unwrapping
│       ├── stores/         Zustand state management
│       └── types/          TypeScript type definitions
├── backend/                R Plumber REST API
│   ├── plumber.R           Main router, CORS, rate limiting
│   ├── R/endpoints/        14 endpoint modules (11 mounted)
│   ├── R/utils/            Constants, validation, response helpers
│   ├── R/data/             Data loading (with mock fallback)
│   └── Dockerfile          Production Docker image
├── data-repo/              Git submodule -> Detmer-2025-coral-parameters
│   ├── standardized_data/  Individual + summary CSV datasets
│   └── analysis/output/    Pre-computed analysis results (168+ files)
├── docs/                   PRD, technical spec, implementation guide
└── render.yaml             Render deployment blueprint
```

---

## Data Source

Data is sourced from the companion analysis repository via a git submodule at `data-repo/`:

**Repository:** [stier-lab/Detmer-2025-coral-parameters](https://github.com/stier-lab/Detmer-2025-coral-parameters)

The analysis pipeline produces standardized datasets and pre-computed outputs that the web platform serves through its API. Key datasets include:

- **Individual survival** (~5,200 records from 6 studies)
- **Individual growth** (~4,300 records)
- **Summary-level data** from 10 additional Caribbean studies
- **Population transition matrix** and elasticity analysis
- **Meta-analysis results** (k=16 studies, pooled survival 81.1%)

### Updating Data

When the analysis pipeline produces new outputs:

```bash
cd data-repo
git pull origin main
cd ..
git add data-repo
git commit -m "Update data submodule to latest analysis outputs"
git push
```

Pushing triggers an automatic redeploy on Render.

---

## API Endpoints

All endpoints are mounted under `/api/`. The backend includes rate limiting (100 req/60s), CORS handling, and a health check at `GET /health`.

| Module | Routes | Description |
|--------|--------|-------------|
| Survival | `/survival/by-size`, `/survival/by-study-stratified` | Size-dependent survival estimates |
| Growth | `/growth/by-size`, `/growth/positive-growth-probability` | Growth rates and projections |
| Elasticity | `/elasticity/matrix`, `/elasticity/summary` | Population model elasticity |
| Stats | `/stats/overview`, `/stats/summary` | Summary statistics |
| Quality | `/quality/metrics`, `/quality/certainty-matrix` | Data quality and certainty |
| Map | `/map/regions` | Geographic region data for Leaflet maps |
| Recommendation | `/recommendation/outplant-size` | Outplanting size recommendations |
| Export | `/export/csv`, `/export/report` | Data download |
| Studies | `/studies/list`, `/studies/summary` | Study metadata |
| Papers | `/papers/list`, `/papers/by-region` | Literature references |
| Analysis | `/analysis/diagnostics` | Model diagnostics |

---

## Testing

```bash
# Frontend
cd frontend && npm run test          # Watch mode
cd frontend && npm run test:run      # Single run
cd frontend && npm run lint          # Lint check
cd frontend && npm run build         # Production build check

# Backend
cd backend && Rscript run_tests.R    # Unit tests
curl http://localhost:8000/health     # Health check (while running)
```

---

## Deployment

Both services deploy to [Render](https://render.com) and auto-deploy on push to `main`. Configuration is in `render.yaml`.

| Service | Type | Details |
|---------|------|---------|
| coral-demographics | Static site | `frontend/dist` after Vite build |
| coral-demographics-api | Docker container | `rocker/r-ver:4.3.2` base image |

The Docker build context is the repository root. The container copies `backend/`, `data-repo/standardized_data/`, and `data-repo/analysis/output/` into the image.

### Environment Variables

| Variable | Service | Purpose |
|----------|---------|---------|
| `PORT` | Backend | Plumber listening port (default: 8000) |
| `VITE_API_URL` | Frontend | Backend URL (auto-set from Render) |
| `CORS_ALLOWED_ORIGINS` | Backend | Allowed origins (default: all) |

---

## Related

- **Analysis repository:** [stier-lab/Detmer-2025-coral-parameters](https://github.com/stier-lab/Detmer-2025-coral-parameters) -- R analysis pipeline, manuscript figures, and raw data
- **Manuscript:** Detmer et al. (2025), "Size-structured variation in demographic rates of *Acropora palmata*," submitted to *Coral Reefs*

---

## License

Stier Lab / Ocean Recoveries Lab, UC Santa Barbara
