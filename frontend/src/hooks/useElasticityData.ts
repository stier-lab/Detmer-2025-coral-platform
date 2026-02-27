import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { elasticityApi } from '../utils/api';
import type {
  ElasticityBreakdownResponse,
  ElasticitySummaryResponse,
} from '../types';

/**
 * Hook to fetch elasticity breakdown data for treemap visualization
 */
export function useElasticityBreakdown() {
  return useQuery({
    queryKey: ['elasticity', 'breakdown'],
    queryFn: () => elasticityApi.getBreakdown(),
    staleTime: 30 * 60 * 1000, // 30 minutes - rarely changes
    retry: 2,
  });
}

/**
 * Hook to fetch full elasticity matrix for heatmap visualization
 */
export function useElasticityMatrix() {
  return useQuery({
    queryKey: ['elasticity', 'matrix'],
    queryFn: () => elasticityApi.getMatrix(),
    staleTime: 30 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook to fetch elasticity summary with lambda statistics
 */
export function useElasticitySummary() {
  return useQuery({
    queryKey: ['elasticity', 'summary'],
    queryFn: () => elasticityApi.getSummary(),
    staleTime: 30 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook to fetch population projection data
 */
export function useElasticityProjection(years: number = 20) {
  const memoizedYears = useMemo(() => years, [years]);

  return useQuery({
    queryKey: ['elasticity', 'projection', memoizedYears],
    queryFn: () => elasticityApi.getProjection(memoizedYears),
    staleTime: 30 * 60 * 1000,
    retry: 2,
  });
}

// Default data for fallback when API is unavailable
export const DEFAULT_ELASTICITY_BREAKDOWN: ElasticityBreakdownResponse = {
  data: [
    {
      name: 'SC5 Survival',
      value: 54.8,
      category: 'Survival',
      description: 'Probability that a large adult survives and stays in the same size class',
      from: 'SC5',
      to: 'SC5',
      reliability: 'High',
      sampleSize: 1453,
      transitionType: 'stasis',
    },
    {
      name: 'SC4 Survival',
      value: 11.6,
      category: 'Survival',
      description: 'Probability that a small adult survives and stays in the same size class',
      from: 'SC4',
      to: 'SC4',
      reliability: 'High',
      sampleSize: 890,
      transitionType: 'stasis',
    },
    {
      name: 'SC4 → SC5',
      value: 6.8,
      category: 'Growth',
      description: 'Probability of growing from small adult to large adult',
      from: 'SC4',
      to: 'SC5',
      reliability: 'Moderate',
      sampleSize: 42,
      transitionType: 'growth',
    },
    {
      name: 'Fragmentation',
      value: 5.7,
      category: 'Reproduction',
      description: 'New recruits produced through fragmentation of larger colonies',
      from: 'SC5',
      to: 'SC1',
      reliability: 'Moderate',
      sampleSize: 35,
      transitionType: 'shrinkage',
    },
    {
      name: 'SC3 Survival',
      value: 5.9,
      category: 'Survival',
      description: 'Probability that a large juvenile survives and stays in the same size class',
      from: 'SC3',
      to: 'SC3',
      reliability: 'High',
      sampleSize: 412,
      transitionType: 'stasis',
    },
    {
      name: 'SC3 → SC4',
      value: 4.9,
      category: 'Growth',
      description: 'Probability of growing from large juvenile to small adult',
      from: 'SC3',
      to: 'SC4',
      reliability: 'High',
      sampleSize: 156,
      transitionType: 'growth',
    },
    {
      name: 'SC1-2 Survival',
      value: 1.3,
      category: 'Survival',
      description: 'Combined survival of recruits and small juveniles',
      from: 'SC1',
      to: 'SC1',
      reliability: 'High',
      sampleSize: 548,
      transitionType: 'stasis',
    },
    {
      name: 'SC2 → SC3',
      value: 2.9,
      category: 'Growth',
      description: 'Probability of growing from small juvenile to large juvenile',
      from: 'SC2',
      to: 'SC3',
      reliability: 'High',
      sampleSize: 201,
      transitionType: 'growth',
    },
    {
      name: 'Shrinkage',
      value: 1.0,
      category: 'Shrinkage',
      description: 'Combined probability of transitioning to smaller size classes',
      from: 'SC5',
      to: 'SC4',
      reliability: 'Moderate',
      sampleSize: 28,
      transitionType: 'shrinkage',
    },
  ],
  categoryTotals: [
    { category: 'Survival', total: 75.9, count: 4 },
    { category: 'Growth', total: 14.6, count: 3 },
    { category: 'Reproduction', total: 5.7, count: 1 },
    { category: 'Shrinkage', total: 1.0, count: 1 },
  ],
  meta: {
    totalTransitions: 9,
    totalElasticity: 97.7,
    note: 'Fallback data - API unavailable',
  },
};

export const DEFAULT_ELASTICITY_SUMMARY: ElasticitySummaryResponse = {
  data: {
    lambda: {
      estimate: 0.986,
      ciLower: 0.819,
      ciUpper: 1.020,
      pDecline: 87.3,
      interpretation: 'Population declining',
    },
    generationTime: 0.42,
    elasticity: {
      stasis: 75.9,
      growth: 14.7,
      shrinkage: 1.0,
      fragmentation: 8.1,
    },
    insights: {
      dominant: 'SC5 Adult Survival',
      dominantPct: 54.8,
      implication: 'Protecting large adults has 3-4x more impact on population growth than other interventions',
    },
  },
  meta: {
    source: 'Lefkovitch matrix model analysis',
    method: 'Bootstrap confidence intervals (n=1000 replicates)',
    note: 'Fallback data - API unavailable',
  },
};
