# Coral Demographic Database API

REST API backend for serving *Acropora palmata* (Elkhorn Coral) demographic data to the stakeholder web platform.

## Overview

This R Plumber API provides endpoints for:
- Survival and growth data by size class, study, and colony type
- Population matrix elasticity analysis
- Meta-analysis and study metadata
- Data quality metrics and uncertainty information
- Outplanting size recommendations
- Data export in CSV format

## Requirements

- R 4.3+
- Required packages: `plumber`, `dplyr`, `tidyr`, `readr`, `jsonlite`
- Optional: `lme4` for mixed-effects models

## Project Structure

```
backend/
├── plumber.R              # Main router + filters + globalenv() setup
├── run.R                  # Server launcher
├── run_tests.R            # Test runner
├── Dockerfile             # Production Docker image
├── Dockerfile.dev         # Development Docker image
├── R/
│   ├── endpoints/         # 14 endpoint files (11 mounted + 3 unmounted)
│   │   ├── survival.R
│   │   ├── growth.R
│   │   ├── quality.R
│   │   ├── stats.R
│   │   ├── map.R
│   │   ├── studies.R
│   │   ├── analysis.R
│   │   ├── export.R
│   │   ├── recommendation.R
│   │   ├── papers.R
│   │   ├── elasticity.R
│   │   ├── meta_analysis_endpoints.R   # Not mounted
│   │   ├── model_comparison.R          # Not mounted
│   │   └── threshold_analysis.R        # Not mounted
│   ├── utils/
│   │   ├── constants.R    # SIZE_BREAKS, SIZE_LABELS, VALID_REGIONS
│   │   ├── responses.R    # create_success, create_error, create_empty
│   │   └── validation.R   # Input validation helpers
│   └── data/
│       └── load_data.R    # Data loading at startup
├── tests/
│   ├── testthat.R
│   └── testthat/
│       ├── setup.R
│       └── test-*.R       # 7 test files
└── README.md
```

## Running the API

```bash
cd web-platform/backend
Rscript run.R              # Starts server on port 8000
```

The API will be available at http://localhost:8000.

Health check: `GET /health`

## API Endpoints

All endpoints are mounted under `/api/`.

### Survival

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/survival/by-size` | Survival rates by size class |
| GET | `/api/survival/by-study-stratified` | Study-stratified survival with quality metrics |
| GET | `/api/survival/by-size-and-type` | Survival by size class and colony type |
| GET | `/api/survival/model` | Survival model predictions |

### Growth

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/growth/by-size` | Growth rates by size class |
| GET | `/api/growth/positive-growth-probability` | Probability of positive growth by size |
| GET | `/api/growth/distribution` | Growth rate distributions |
| GET | `/api/growth/by-study` | Growth rates by study |

### Quality

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quality/metrics` | R-squared, warnings, study dominance |
| GET | `/api/quality/certainty-matrix` | Data reliability by size class and region |

### Stats

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats/overview` | Dashboard summary statistics (also serves as health check) |
| GET | `/api/stats/summary` | Aggregated summary statistics |

### Map

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/map/regions` | Region metadata with coordinates |

### Studies

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/studies/list` | Study citations and statistics |
| GET | `/api/studies/summary` | Summary by study |

### Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analysis/diagnostics` | Model diagnostic information |

### Export

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/export/csv` | Export data as CSV |
| GET | `/api/export/report` | Export summary report |

### Recommendation

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recommendation/outplant-size` | Outplanting size recommendation |

### Papers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/papers/list` | Literature references |
| GET | `/api/papers/by-region` | Papers filtered by region |

### Elasticity

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/elasticity/matrix` | Population projection elasticity matrix |
| GET | `/api/elasticity/summary` | Elasticity analysis summary |

### Unmounted Endpoints

The following endpoint files exist in `R/endpoints/` but are **not mounted** in `plumber.R`:

- `meta_analysis_endpoints.R`
- `model_comparison.R`
- `threshold_analysis.R`

## Architecture: Endpoint Isolation

`plumb()` evaluates endpoint files in **isolated environments**. This has a critical consequence:

- **`source()` calls will FAIL inside endpoint files.** Do not add them.
- Shared functions and data are assigned to `globalenv()` in `plumber.R` before endpoints are mounted.
- Available globals include: `data_env`, `create_error`, `create_success`, `create_empty`, `SIZE_BREAKS`, `SIZE_LABELS`, `VALID_REGIONS`, `%||%`

## Size Classes

Biologically-informed size classes based on live planar area (cm²):

| Class | Size Range | Description |
|-------|------------|-------------|
| SC1 | 0 -- 25 | Recruits / fragments |
| SC2 | 25 -- 100 | Small juveniles |
| SC3 | 100 -- 500 | Large juveniles |
| SC4 | 500 -- 2,000 | Small adults |
| SC5 | > 2,000 | Large adults |

## CORS

CORS is enabled for all origins to support frontend development and cross-origin requests from the deployed frontend.

## Testing

```bash
cd web-platform/backend
Rscript run_tests.R
```

Seven test files cover the main endpoint modules.

## Docker

The Dockerfile build context is the **repository root**, not the backend directory:

```bash
# From the repo root:
docker build -t coral-api -f web-platform/backend/Dockerfile .
docker run -p 8000:8000 coral-api
```

The image copies `backend/`, `standardized_data/`, and `analysis/output/` into the container. A development Dockerfile (`Dockerfile.dev`) is also available.

## Deployment

The backend deploys to Render as a Docker service. See `render.yaml` at the repository root for configuration. Auto-deploys on push to `main`.

## License

UC Santa Barbara | Ocean Recoveries Lab
