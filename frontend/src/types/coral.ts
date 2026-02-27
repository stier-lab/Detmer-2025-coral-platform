// Core data types for RRSE Coral Parameters Platform

export type DataType = 'field' | 'nursery_in' | 'nursery_ex';
export type FragmentStatus = 'Y' | 'N';
export type DisturbanceType = 'storm' | 'MHW' | 'disease' | null;

/**
 * Individual survival record. In prepared data, size_cm2 contains live tissue
 * area (not total footprint). Size classes are assigned from live tissue area.
 */
export interface SurvivalRecord {
  id: string;
  study: string;
  region: string;
  location: string | null;
  plot: string | null;
  treatment_1: string | null;
  treatment_2: string | null;
  latitude: number;
  longitude: number;
  depth_m: number | null;
  survey_yr: number;
  data_type: DataType;
  coral_id: string;
  /** In prepared data: live tissue area (cm²). In raw data: total colony footprint. */
  size_cm2: number;
  /** Live tissue area (Length × Width × % Live) - the biologically meaningful size */
  size_live_cm2: number | null;
  survived: 0 | 1;
  fragment: FragmentStatus;
  time_interval_yr: number;
  disturbance: DisturbanceType;
  study_notes: string | null;
  study_n: number;
  group_n: number;
}

/**
 * Individual growth record for a tracked coral colony.
 * See SurvivalRecord for critical size variable documentation.
 */
export interface GrowthRecord {
  id: string;
  study: string;
  region: string;
  location: string | null;
  latitude: number;
  longitude: number;
  depth_m: number | null;
  survey_yr: number;
  data_type: DataType;
  coral_id: string;
  /** In prepared data: live tissue area (cm²). In raw data: total colony footprint. */
  size_cm2: number;
  /** Live tissue area (Length × Width × % Live) - the biologically meaningful size */
  size_live_cm2: number | null;
  growth_cm2_yr: number;
  growth_live_cm2_yr: number | null;
  fragment: FragmentStatus;
  time_interval_yr: number;
  disturbance: DisturbanceType;
}

export interface StudyMetadata {
  study_id: string;
  study_name: string;
  citation: string;
  doi: string | null;
  year_start: number;
  year_end: number;
  regions: string | string[];
  data_types: string | DataType[];
  has_individual_data: boolean;
  sample_size: number;
  notes: string;
}

export interface SiteLocation {
  site_id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  depth_m: number | null;
  studies: string | string[];
  total_observations: number;
  survival_rate: number | null;
  mean_growth: number | null;
}

export interface RegionSummary {
  region: string;
  n_sites: number;
  n_observations: number;
  n_studies: number;
  mean_survival: number;
  lat_center: number;
  lon_center: number;
  growth_n?: number;
  mean_growth?: number;
}

export interface PredictionPoint {
  size_cm2: number;
  survival_prob: number;
  ci_lower: number;
  ci_upper: number;
}

export interface SurvivalBySize {
  size_class: string;
  n: number;
  survival_rate: number;
  ci_lower: number;
  ci_upper: number;
  se: number;
}

export interface SurvivalByStudy {
  study: string;
  region: string;
  n: number;
  survival_rate: number;
  se: number;
  ci_lower: number;
  ci_upper: number;
  year_min: number;
  year_max: number;
}

export interface GrowthBySize {
  size_class: string;
  n: number;
  mean_growth: number;
  sd_growth: number;
  median_growth: number;
  q25: number;
  q75: number;
  pct_shrinking: number;
  pct_growing: number;
}

export interface TransitionMatrix {
  initial_class: string;
  SC1: number;
  SC2: number;
  SC3: number;
  SC4: number;
  SC5: number;
}

export interface OverviewStats {
  total_observations: number;
  survival_observations?: number;
  growth_observations?: number;
  total_studies: number;
  total_regions: number;
  total_sites?: number;
  year_range: [number, number];
  mean_survival: number;
  mean_growth: number;
  data_type_breakdown?: Record<string, number>;
  region_breakdown?: Record<string, number>;
}

/**
 * Size class definitions based on LIVE TISSUE AREA (cm²)
 *
 * IMPORTANT: These classes are assigned using size_live_cm2, NOT total colony size.
 * A partially dead colony with 5,000 cm² total but 200 cm² alive = SC3, not SC5.
 *
 * Size class constants (SIZE_CLASS_LABELS, SIZE_CLASS_BOUNDARIES, SIZE_CLASSES, etc.)
 * are defined in constants/sizeClasses.ts — import from there.
 */

// Quality metrics types
export interface QualityMetrics {
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

export interface CertaintyMatrixCell {
  size_class: string;
  region: string;
  certainty: number;
  tooltip: string;
  n: number;
  survival_rate: number;
}

export interface CertaintyMatrixResponse {
  matrix: CertaintyMatrixCell[];
  regions: string[];
  size_classes: string[];
  gaps: Array<{
    size_class: string;
    region: string;
    certainty: number;
    n: number;
    priority: number;
  }>;
  legend: Record<string, string>;
}

// Study-stratified survival response (PRD v2.0 default view)
export interface StudyStratifiedSurvival {
  study: string;
  n: number;
  survival_rate: number;
  se: number;
  ci_lower: number;
  ci_upper: number;
  year_min: number;
  year_max: number;
  regions: string;
  fragment?: string;
  fragment_pct?: number;
  mean_size: number;
  median_size: number;
}

export interface StudyStratifiedResponse {
  data: StudyStratifiedSurvival[];
  meta: {
    total_n: number;
    n_studies: number;
    quality: {
      r_squared: number | null;
      dominant_study: { name: string; n: number; pct: number };
      fragment_mix: boolean;
      warnings: string[];
    };
  };
}

export const REGIONS = [
  'Florida',
  'USVI',
  'Puerto Rico',
  'Curacao',
  'Jamaica',
  'Mexico',
  'Bahamas',
  'BVI',
  'Dominican Republic',
  'Navassa',  // Added to fix "All Regions" filter bug - Navassa appears in data
];

export const DATA_TYPE_LABELS: Record<DataType, string> = {
  field: 'Field',
  nursery_in: 'In-situ Nursery',
  nursery_ex: 'Ex-situ Nursery',
};


export type HeterogeneityLevel = 'LOW' | 'MODERATE' | 'SUBSTANTIAL' | 'CONSIDERABLE';
export type PopulationType = 'Natural colony' | 'Restoration fragment';

export interface HeterogeneityStats {
  I_squared: number;
  I_squared_ci_lower?: number;
  I_squared_ci_upper?: number;
  tau_squared: number;
  tau: number;
  Q: number;
  Q_df?: number;
  Q_pvalue: number;
  interpretation: HeterogeneityLevel;
}

export interface PublicationBias {
  eggers_intercept: number;
  eggers_pvalue: number;
  significant_asymmetry: boolean;
}

export interface StudyEffect {
  study: string;
  survival: number;
  se: number;
  ci_lower: number;
  ci_upper: number;
  n: number;
  weight: number;
  population_type: PopulationType;
}

export interface StratifiedResult {
  population_type: PopulationType;
  k: number;
  n: number;
  pooled_survival: number;
  ci_lower: number;
  ci_upper: number;
  I_squared: number;
  tau_squared: number;
}

export interface MetaAnalysisResults {
  // Main results
  pooled_survival: number;
  ci_lower: number;
  ci_upper: number;
  pi_lower: number;
  pi_upper: number;

  // Heterogeneity
  heterogeneity: HeterogeneityStats;

  // Publication bias
  publication_bias: PublicationBias;

  // Counts
  k: number;  // Number of studies
  N: number;  // Total observations

  // Stratified results
  stratified: Record<string, StratifiedResult> | null;

  // Study-level effects for forest plot
  study_effects: StudyEffect[] | null;

  // Moderator analysis
  moderators: ModeratorEffect[] | null;

  // Leave-one-out
  leave_one_out: LeaveOneOutResult[] | null;
}

export interface ModeratorEffect {
  predictor: string;
  coefficient: number;
  se: number;
  pvalue: number;
  R_squared: number;
  significant: boolean;
}

export interface LeaveOneOutResult {
  excluded_study: string;
  pooled_survival: number;
  I_squared: number;
}

export interface PopulationTypeComparison {
  natural_colonies: {
    n: number;
    survival: number;
    median_size: number;
  };
  restoration_fragments: {
    n: number;
    survival: number;
    median_size: number;
  };
  difference_pp: number;
  size_matched_difference: string;
}

export interface StratificationResults {
  summary: PopulationTypeComparison;
  key_insight: string;
  by_size_class: {
    size_classes: string[];
    natural_survival: number[];
    fragment_survival: number[];
    difference: number[];
  };
  meta_analysis: {
    natural_I_squared: number;
    fragment_I_squared: number;
    overall_I_squared: number;
    heterogeneity_reduction: string;
  };
  recommendations: string[];
}

// Types for Natural vs Restored comparisons
export type CoralType = 'Natural' | 'Restored';

export interface GrowthBySizeAndType {
  size_class: string;
  coral_type: CoralType;
  n: number;
  mean_growth: number;
  sd_growth: number;
  se: number;
  ci_lower: number;
  ci_upper: number;
  median_growth: number;
  q25: number;
  q75: number;
  pct_shrinking: number;
  pct_growing: number;
}

export interface SurvivalBySizeAndType {
  size_class: string;
  coral_type: CoralType;
  n: number;
  n_survived: number;
  survival_rate: number;
  se: number;
  ci_lower: number;
  ci_upper: number;
}

export interface FragmentationBySize {
  size_class: string;
  coral_type: CoralType;
  n: number;
  n_shrinking: number;
  pct_shrinking: number;
  se: number;
  ci_lower: number;
  ci_upper: number;
  mean_shrinkage: number;
  median_shrinkage: number;
}

// Positive growth probability data types
export interface PositiveGrowthPrediction {
  size_cm2: number;
  prob_positive: number;
  ci_lower: number;
  ci_upper: number;
}

export interface PositiveGrowthBinned {
  size_bin: string;
  log_size: number;
  size_cm2: number;
  pct_positive: number;
  n: number;
  se: number;
}

export interface PositiveGrowthResponse {
  predictions: PositiveGrowthPrediction[];
  binned: PositiveGrowthBinned[];
  thresholds: {
    threshold_50_cm2: number;
    threshold_70_cm2: number;
  };
  stats: {
    n: number;
    pct_positive: number;
    pct_shrinking: number;
    interpretation: string;
  };
  model_info: {
    method: string;
    formula: string;
  };
}

// Literature/Paper types
export interface Paper {
  paper_id: string;
  title: string;
  authors: string;
  year: number;
  journal: string;
  abstract: string;
  key_findings: string;
  region: string;
  species_focus: string;
  data_types: string;
  pdf_filename: string;
  extracted_date?: string;
}

export interface PapersResponse {
  data: Paper[];
  meta: {
    total: number;
    extracted_date?: string;
  };
}

export interface KeyFindings {
  survival_threshold: {
    threshold_cm2: number;
    ci_lower: number;
    ci_upper: number;
    shape: string;
    interpretation: string;
  } | null;
  growth: {
    rgr_r_squared: number;
    rgr_threshold_cm2: number;
    interpretation: string;
  } | null;
  heterogeneity: {
    I_squared: number;
    tau_squared: number;
    Q: number;
    level: HeterogeneityLevel;
    interpretation: string;
  } | null;
  stratification: {
    natural_survival: number;
    fragment_survival: number;
    difference_pp: number;
    size_matched_difference: string;
    key_finding: string;
    interpretation: string;
  };
  pooled_estimate: {
    survival: number;
    ci_lower: number;
    ci_upper: number;
    pi_lower: number;
    pi_upper: number;
    interpretation: string;
  } | null;
  summary: {
    analysis_complete: boolean;
    last_updated: string;
    total_observations: number;
    total_studies: number;
    key_message: string;
  };
}



export type ElasticityCategory = 'Survival' | 'Growth' | 'Reproduction' | 'Shrinkage';
export type ReliabilityLevel = 'High' | 'Moderate' | 'Low' | 'Very Low' | 'None' | 'Unknown';
export type TransitionType = 'stasis' | 'growth' | 'shrinkage';

export interface ElasticityItem {
  name: string;
  value: number;
  category: ElasticityCategory;
  description: string;
  from: string;
  to: string;
  reliability: ReliabilityLevel;
  sampleSize: number;
  transitionType: TransitionType;
}

export interface ElasticityMatrixCell {
  from_class: string;
  to_class: string;
  elasticity: number;
  elasticity_pct: number;
  from_label: string;
  to_label: string;
  from_short: string;
  to_short: string;
  transition_type: TransitionType;
  n_observations?: number;
  reliability?: ReliabilityLevel;
}

export interface ElasticityMatrixResponse {
  data: ElasticityMatrixCell[];
  labels: Record<string, string>;
  meta: {
    total_elasticity: number;
    size_classes: number;
    note: string;
  };
}

export interface ElasticityBreakdownResponse {
  data: ElasticityItem[];
  categoryTotals: {
    category: ElasticityCategory;
    total: number;
    count: number;
  }[];
  meta: {
    totalTransitions: number;
    totalElasticity: number;
    note: string;
  };
}

export interface ElasticitySummaryResponse {
  data: {
    lambda: {
      estimate: number;
      ciLower: number;
      ciUpper: number;
      pDecline: number;
      interpretation: string;
    };
    generationTime: number;
    elasticity: {
      stasis: number;
      growth: number;
      shrinkage: number;
      fragmentation: number;
    };
    insights: {
      dominant: string;
      dominantPct: number;
      implication: string;
    };
  };
  meta: {
    source: string;
    method: string;
    note: string;
  };
}

export interface ElasticityProjectionResponse {
  data: {
    year: number;
    relative_pop: number;
    lower: number;
    upper: number;
  }[];
  meta: {
    lambda: number;
    annualChange: number;
    projectionYears: number;
    note: string;
  };
}

// Restoration Scenarios Types
export interface ScenarioTransition {
  from_class: string;
  to_class: string;
  from_short: string;
  to_short: string;
  baseline_value: number;
  perturbed_value: number;
  baseline_lambda: number;
  new_lambda: number;
  delta_lambda: number;
  pct_lambda_change: number;
  elasticity_pct: number;
  restoration_action: string;
  transition_type: string;
  category: string;
}

export interface CombinedScenario {
  scenario_id: string;
  scenario_name: string;
  description: string;
  transitions_affected: string[];
  baseline_lambda: number;
  new_lambda: number;
  delta_lambda: number;
  pct_lambda_change: number;
  achieves_stability: boolean;
}

export interface PathToStability {
  scenario_id: string;
  scenario_name: string;
  improvement_needed_pct: number;
  feasibility: string;
  note: string;
}

export interface ScenariosResponse {
  data: {
    individual: ScenarioTransition[];
    combined: CombinedScenario[];
    path_to_stability: PathToStability[];
  };
  meta: {
    improvement_pct: number;
    baseline_lambda: number;
    target_lambda: number;
    note: string;
  };
}
