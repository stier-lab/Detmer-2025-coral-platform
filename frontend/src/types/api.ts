/**
 * Standard successful API response wrapper.
 */
export interface ApiResponse<T> {
  error: false;
  data: T;
  meta?: ApiMeta;
}

/**
 * Standard error API response.
 */
export interface ApiErrorResponse {
  error: true;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Metadata included with paginated or aggregated responses.
 */
export interface ApiMeta {
  total_records?: number;
  page?: number;
  per_page?: number;
  total_pages?: number;
  [key: string]: unknown;
}

/** Recommendation data from the Outplanting Wizard. */
export interface RecommendationData {
  recommendation: {
    recommended_size_class: string;
    size_range: string;
    goal: string;
    score: number;
  };
  survival: {
    rate: number;
    ci_lower: number;
    ci_upper: number;
    n: number;
  };
  growth: {
    mean_rate: number;
    pct_growing: number;
    pct_shrinking: number;
    n: number;
  };
  confidence: 'high' | 'medium' | 'low';
  caveats: string[];
  all_sizes: Array<{
    size_class: string;
    score: number;
    survival_rate: number;
    growth_pct: number;
    n: number;
  }>;
}

/** Citation response from /export/citation. */
export interface CitationData {
  main_citation: string;
  studies_to_cite: string[];
  download_date: string;
}

/**
 * Quality metrics response for data subset assessment.
 */
export interface QualityMetricsData {
  r_squared: number | null;
  sample_size: number;
  n_studies: number;
  n_regions: number;
  dominant_study: {
    name: string;
    n: number;
    pct: number;
  } | null;
  fragment_mix: boolean;
  fragment_pct: number;
  size_class_n: Array<{ size_class: string; n: number }>;
  year_range: [number, number];
  using_mock_data: boolean;
  warnings: string[];
}

/**
 * Individual record response with metadata.
 * Used for survival and growth individual endpoints.
 */
export interface IndividualRecordsResponse<T> {
  data: T[];
  meta: {
    total_records?: number;
    [key: string]: unknown;
  };
}

/**
 * Paginated list response structure.
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: ApiMeta & {
    total_records: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

/** Type guard to check if a response is an API error. */
export function isApiError(response: unknown): response is ApiErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    (response as ApiErrorResponse).error === true
  );
}

/**
 * Type guard to check if a response is a successful API response.
 */
export function isApiSuccess<T>(response: unknown): response is ApiResponse<T> {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    (response as ApiResponse<T>).error === false
  );
}

/**
 * Type guard to check if response has metadata.
 */
export function hasApiMeta<T extends { meta?: ApiMeta }>(
  response: T
): response is T & { meta: ApiMeta } {
  return response.meta !== undefined && response.meta !== null;
}


/**
 * Extracts the data type from an ApiResponse.
 */
export type ExtractApiData<T> = T extends ApiResponse<infer D> ? D : never;

/**
 * Union type for API responses that can be either success or error.
 */
export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;

/**
 * Type for API endpoints that return arrays directly (without wrapper).
 * This is common for R/Plumber backends that return data frames.
 */
export type DirectArrayResponse<T> = T[];

/**
 * Type for API endpoints that return a single object directly.
 */
export type DirectObjectResponse<T> = T;


/**
 * Common filter parameters used across multiple endpoints.
 */
export interface CommonFilterParams {
  region?: string;
  regions?: string;
  data_type?: string;
  study?: string;
  year_min?: string;
  year_max?: string;
  size_min?: string;
  size_max?: string;
  size_class?: string;
  fragment?: 'Y' | 'N' | 'all';
}

/**
 * Parameters for survival-related endpoints.
 */
export interface SurvivalParams extends CommonFilterParams {
  include_model?: 'true' | 'false';
}

/**
 * Parameters for growth-related endpoints.
 */
export interface GrowthParams extends CommonFilterParams {
  include_negative?: 'true' | 'false';
}

/**
 * Parameters for export endpoints.
 */
export interface ExportParams extends CommonFilterParams {
  format?: 'csv' | 'json';
  include_metadata?: 'true' | 'false';
}
