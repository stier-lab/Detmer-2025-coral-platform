import { useQuery } from '@tanstack/react-query';
import { papersApi } from '../utils/api';

export function usePapers() {
  return useQuery({
    queryKey: ['papers'],
    queryFn: () => papersApi.getAll(),
    staleTime: 30 * 60 * 1000, // Papers don't change often
  });
}

export function usePaper(id: string) {
  return useQuery({
    queryKey: ['papers', id],
    queryFn: () => papersApi.getById(id),
    enabled: !!id,
    staleTime: 30 * 60 * 1000,
  });
}

export function usePaperSearch(query: string) {
  return useQuery({
    queryKey: ['papers', 'search', query],
    queryFn: () => papersApi.search(query),
    enabled: query.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePapersByRegion(region?: string) {
  return useQuery({
    queryKey: ['papers', 'by-region', region],
    queryFn: () => papersApi.getByRegion(region),
    staleTime: 30 * 60 * 1000,
  });
}
