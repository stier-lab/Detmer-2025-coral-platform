import { useQuery } from '@tanstack/react-query';
import { studiesApi, statsApi } from '../utils/api';

export function useStudies() {
  return useQuery({
    queryKey: ['studies'],
    queryFn: () => studiesApi.getAll(),
    staleTime: 30 * 60 * 1000,
  });
}

export function useStudy(id: string) {
  return useQuery({
    queryKey: ['studies', id],
    queryFn: () => studiesApi.getById(id),
    enabled: !!id,
    staleTime: 30 * 60 * 1000,
  });
}

export function useOverviewStats() {
  return useQuery({
    queryKey: ['stats', 'overview'],
    queryFn: () => statsApi.getOverview(),
    staleTime: 5 * 60 * 1000,
  });
}
