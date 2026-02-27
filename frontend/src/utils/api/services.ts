import {
  SurvivalRecord,
  GrowthRecord,
  SurvivalBySize,
  SurvivalByStudy,
  GrowthBySize,
  TransitionMatrix,
  PredictionPoint,
  SiteLocation,
  StudyMetadata,
  OverviewStats,
  QualityMetrics,
  CertaintyMatrixResponse,
  StudyStratifiedResponse,
  GrowthBySizeAndType,
  SurvivalBySizeAndType,
  FragmentationBySize,
  PositiveGrowthResponse,
  Paper,
  PapersResponse,
  RegionSummary,
  IndividualRecordsResponse,
  CommonFilterParams,
  ElasticityMatrixResponse,
  ElasticityBreakdownResponse,
  ElasticitySummaryResponse,
  ElasticityProjectionResponse,
  ScenariosResponse,
} from '../../types';
import { api } from './client';

export const survivalApi = {
  getIndividual: (params?: CommonFilterParams | Record<string, string>): Promise<IndividualRecordsResponse<SurvivalRecord>> =>
    api.get('/survival/individual', { params }),

  getBySize: (params?: CommonFilterParams | Record<string, string>): Promise<SurvivalBySize[]> =>
    api.get('/survival/by-size', { params }),

  getModel: (params?: CommonFilterParams | Record<string, string>): Promise<PredictionPoint[]> =>
    api.get('/survival/model', { params }),

  getByStudy: (params?: CommonFilterParams | Record<string, string>): Promise<SurvivalByStudy[]> =>
    api.get('/survival/by-study', { params }),

  getByStudyStratified: (params?: CommonFilterParams | Record<string, string>): Promise<StudyStratifiedResponse> =>
    api.get('/survival/by-study-stratified', { params }),

  getBySizeAndType: (params?: CommonFilterParams | Record<string, string>): Promise<SurvivalBySizeAndType[]> =>
    api.get('/survival/by-size-and-type', { params }),
};

export const growthApi = {
  getIndividual: (params?: CommonFilterParams | Record<string, string>): Promise<IndividualRecordsResponse<GrowthRecord>> =>
    api.get('/growth/individual', { params }),

  getBySize: (params?: CommonFilterParams | Record<string, string>): Promise<GrowthBySize[]> =>
    api.get('/growth/by-size', { params }),

  getDistribution: (params?: CommonFilterParams | Record<string, string>): Promise<GrowthRecord[]> =>
    api.get('/growth/distribution', { params }),

  getTransitions: (params?: CommonFilterParams | Record<string, string>): Promise<TransitionMatrix[]> =>
    api.get('/growth/transitions', { params }),

  getBySizeAndType: (params?: CommonFilterParams | Record<string, string>): Promise<GrowthBySizeAndType[]> =>
    api.get('/growth/by-size-and-type', { params }),

  getFragmentationBySize: (params?: CommonFilterParams | Record<string, string>): Promise<FragmentationBySize[]> =>
    api.get('/growth/fragmentation-by-size', { params }),

  getPositiveGrowthProbability: (params?: CommonFilterParams | Record<string, string>): Promise<PositiveGrowthResponse> =>
    api.get('/growth/positive-growth-probability', { params }),
};

export const mapApi = {
  getSites: (params?: CommonFilterParams | Record<string, string>): Promise<SiteLocation[]> =>
    api.get('/map/sites', { params }),

  getRegions: (): Promise<RegionSummary[]> =>
    api.get('/map/regions'),
};

export const studiesApi = {
  getAll: (): Promise<StudyMetadata[]> =>
    api.get('/studies/'),

  getById: (id: string): Promise<StudyMetadata> =>
    api.get(`/studies/${id}`),
};

export const statsApi = {
  getOverview: (): Promise<OverviewStats> =>
    api.get('/stats/overview'),
};

export const qualityApi = {
  getMetrics: (params?: CommonFilterParams | Record<string, string>): Promise<QualityMetrics> =>
    api.get('/quality/metrics', { params }),

  getCertaintyMatrix: (): Promise<CertaintyMatrixResponse> =>
    api.get('/quality/certainty-matrix'),

  getCoverage: (): Promise<Record<string, unknown>> =>
    api.get('/quality/coverage'),
};

export const papersApi = {
  getAll: (): Promise<PapersResponse> =>
    api.get('/papers/all'),

  getById: (id: string): Promise<Paper> =>
    api.get('/papers/by-id', { params: { id } }),

  search: (query: string): Promise<PapersResponse> =>
    api.get('/papers/search', { params: { q: query } }),

  getByRegion: (region?: string): Promise<PapersResponse> =>
    api.get('/papers/by-region', { params: region ? { region } : {} }),
};

export const elasticityApi = {
  getMatrix: (): Promise<ElasticityMatrixResponse> =>
    api.get('/elasticity/matrix'),

  getBreakdown: (): Promise<ElasticityBreakdownResponse> =>
    api.get('/elasticity/breakdown'),

  getSummary: (): Promise<ElasticitySummaryResponse> =>
    api.get('/elasticity/summary'),

  getProjection: (years?: number): Promise<ElasticityProjectionResponse> =>
    api.get('/elasticity/projection', { params: years ? { years } : {} }),

  getScenarios: (improvementPct?: number): Promise<ScenariosResponse> =>
    api.get('/elasticity/scenarios', { params: improvementPct ? { improvement_pct: improvementPct } : {} }),
};
