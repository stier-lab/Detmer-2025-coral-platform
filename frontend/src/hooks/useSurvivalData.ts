import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '../stores/filterStore';
import { survivalApi, buildFilterParams } from '../utils/api';

export function useSurvivalData() {
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
    queryKey: ['survival', 'individual', params],
    queryFn: () => survivalApi.getIndividual(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSurvivalModel() {
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
    queryKey: ['survival', 'model', params],
    queryFn: () => survivalApi.getModel(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSurvivalBySize() {
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
    queryKey: ['survival', 'by-size', params],
    queryFn: () => survivalApi.getBySize(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSurvivalByStudy() {
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
    queryKey: ['survival', 'by-study', params],
    queryFn: () => survivalApi.getByStudy(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSurvivalBySizeAndType() {
  const { filters } = useFilterStore();

  const params = useMemo(
    () =>
      buildFilterParams({
        region: filters.regions,
      }),
    [filters.regions]
  );

  return useQuery({
    queryKey: ['survival', 'by-size-and-type', params],
    queryFn: () => survivalApi.getBySizeAndType(params),
    staleTime: 5 * 60 * 1000,
  });
}
