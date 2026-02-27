import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import {
  MetaAnalysisResults,
  StratificationResults,
  KeyFindings,
} from '../types/coral';

// Hook for meta-analysis results
export function useMetaAnalysis() {
  return useQuery<MetaAnalysisResults>({
    queryKey: ['analysis', 'meta-analysis'],
    queryFn: () => api.get('/analysis/meta-analysis'),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook for heterogeneity analysis
export function useHeterogeneity() {
  return useQuery({
    queryKey: ['analysis', 'heterogeneity'],
    queryFn: () => api.get('/analysis/heterogeneity'),
    staleTime: 10 * 60 * 1000,
  });
}

// Hook for stratification results
export function useStratification() {
  return useQuery<StratificationResults>({
    queryKey: ['analysis', 'stratification'],
    queryFn: () => api.get('/analysis/stratification'),
    staleTime: 10 * 60 * 1000,
  });
}

// Hook for key findings summary
export function useKeyFindings() {
  return useQuery<KeyFindings>({
    queryKey: ['analysis', 'key-findings'],
    queryFn: () => api.get('/analysis/key-findings'),
    staleTime: 10 * 60 * 1000,
  });
}

// Hook for survival threshold results
export function useSurvivalThreshold() {
  return useQuery({
    queryKey: ['analysis', 'survival-threshold'],
    queryFn: () => api.get('/analysis/survival-threshold'),
    staleTime: 10 * 60 * 1000,
  });
}

// Hook for growth threshold results
export function useGrowthThreshold() {
  return useQuery({
    queryKey: ['analysis', 'growth-threshold'],
    queryFn: () => api.get('/analysis/growth-threshold'),
    staleTime: 10 * 60 * 1000,
  });
}

// Hook for analysis summary
export function useAnalysisSummary() {
  return useQuery({
    queryKey: ['analysis', 'summary'],
    queryFn: () => api.get('/analysis/summary'),
    staleTime: 10 * 60 * 1000,
  });
}

// Hook for model comparison (GAM, Beta, NLME)
export function useModelComparison() {
  return useQuery({
    queryKey: ['analysis', 'model-comparison'],
    queryFn: () => api.get('/analysis/model-comparison'),
    staleTime: 10 * 60 * 1000,
  });
}

// Hook for data type effects (Field/Lab/Nursery)
export function useDataTypeEffects() {
  return useQuery({
    queryKey: ['analysis', 'data-type-effects'],
    queryFn: () => api.get('/analysis/data-type-effects'),
    staleTime: 10 * 60 * 1000,
  });
}
