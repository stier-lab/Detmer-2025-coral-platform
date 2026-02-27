import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '../stores/filterStore';
import { growthApi, buildFilterParams } from '../utils/api';

export function useGrowthData() {
  const { filters } = useFilterStore();

  const params = useMemo(
    () =>
      buildFilterParams({
        region: filters.regions,
        data_type: filters.dataTypes,
        study: filters.studies,
        year: filters.yearRange,
        size: filters.sizeRange,
        fragment: filters.fragmentStatus,
      }),
    [filters.regions, filters.dataTypes, filters.studies, filters.yearRange, filters.sizeRange, filters.fragmentStatus]
  );

  return useQuery({
    queryKey: ['growth', 'individual', params],
    queryFn: () => growthApi.getIndividual(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useGrowthBySize() {
  const { filters } = useFilterStore();

  const params = useMemo(
    () =>
      buildFilterParams({
        region: filters.regions,
        data_type: filters.dataTypes,
      }),
    [filters.regions, filters.dataTypes]
  );

  return useQuery({
    queryKey: ['growth', 'by-size', params],
    queryFn: () => growthApi.getBySize(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useGrowthDistribution() {
  const { filters } = useFilterStore();

  const params = useMemo(
    () =>
      buildFilterParams({
        region: filters.regions,
        data_type: filters.dataTypes,
      }),
    [filters.regions, filters.dataTypes]
  );

  return useQuery({
    queryKey: ['growth', 'distribution', params],
    queryFn: () => growthApi.getDistribution(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTransitionMatrix() {
  const { filters } = useFilterStore();

  const params = useMemo(
    () =>
      buildFilterParams({
        region: filters.regions,
        data_type: filters.dataTypes,
      }),
    [filters.regions, filters.dataTypes]
  );

  return useQuery({
    queryKey: ['growth', 'transitions', params],
    queryFn: () => growthApi.getTransitions(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useGrowthBySizeAndType() {
  const { filters } = useFilterStore();

  const params = useMemo(
    () =>
      buildFilterParams({
        region: filters.regions,
      }),
    [filters.regions]
  );

  return useQuery({
    queryKey: ['growth', 'by-size-and-type', params],
    queryFn: () => growthApi.getBySizeAndType(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFragmentationBySize() {
  const { filters } = useFilterStore();

  const params = useMemo(
    () =>
      buildFilterParams({
        region: filters.regions,
      }),
    [filters.regions]
  );

  return useQuery({
    queryKey: ['growth', 'fragmentation-by-size', params],
    queryFn: () => growthApi.getFragmentationBySize(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePositiveGrowthProbability() {
  const { filters } = useFilterStore();

  const params = useMemo(
    () =>
      buildFilterParams({
        region: filters.regions,
        data_type: filters.dataTypes,
      }),
    [filters.regions, filters.dataTypes]
  );

  return useQuery({
    queryKey: ['growth', 'positive-growth-probability', params],
    queryFn: () => growthApi.getPositiveGrowthProbability(params),
    staleTime: 5 * 60 * 1000,
  });
}
