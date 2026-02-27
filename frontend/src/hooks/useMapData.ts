import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '../stores/filterStore';
import { mapApi, buildFilterParams } from '../utils/api';

export function useMapData() {
  return useMapSites();
}

export function useMapSites() {
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
    queryKey: ['map', 'sites', params],
    queryFn: () => mapApi.getSites(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRegionSummary() {
  return useQuery({
    queryKey: ['map', 'regions'],
    queryFn: () => mapApi.getRegions(),
    staleTime: 30 * 60 * 1000, // 30 minutes - rarely changes
  });
}
