import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { useFilterStore } from '../stores/filterStore'
import {
  useGrowthData,
  useGrowthBySize,
  useGrowthDistribution,
  useTransitionMatrix,
  useGrowthBySizeAndType,
  useFragmentationBySize,
  usePositiveGrowthProbability,
} from './useGrowthData'
import { growthApi } from '../utils/api'

// Mock the API module
vi.mock('../utils/api', async () => {
  const actual = await vi.importActual('../utils/api')
  return {
    ...actual,
    growthApi: {
      getIndividual: vi.fn(),
      getBySize: vi.fn(),
      getDistribution: vi.fn(),
      getTransitions: vi.fn(),
      getBySizeAndType: vi.fn(),
      getFragmentationBySize: vi.fn(),
      getPositiveGrowthProbability: vi.fn(),
    },
  }
})

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('Growth Data Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const { result } = renderHook(() => useFilterStore())
    act(() => {
      result.current.resetFilters()
    })
  })

  describe('useGrowthData', () => {
    it('fetches individual growth records', async () => {
      const mockData = {
        data: [
          { id: '1', size_t0: 100, size_t1: 120, growth_rate: 20 },
          { id: '2', size_t0: 200, size_t1: 180, growth_rate: -20 },
        ],
        meta: { count: 2 },
      }
      vi.mocked(growthApi.getIndividual).mockResolvedValue(mockData)

      const { result } = renderHook(() => useGrowthData(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockData)
    })

    it('passes all relevant filters to API', async () => {
      vi.mocked(growthApi.getIndividual).mockResolvedValue({ data: [], meta: {} })

      const { result: filterResult } = renderHook(() => useFilterStore())
      act(() => {
        filterResult.current.updateFilter('regions', ['Florida'])
        filterResult.current.updateFilter('dataTypes', ['field'])
        filterResult.current.updateFilter('fragmentStatus', 'N')
      })

      renderHook(() => useGrowthData(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(growthApi.getIndividual).toHaveBeenCalled()
      })

      const callArgs = vi.mocked(growthApi.getIndividual).mock.calls[0][0]
      expect(callArgs).toHaveProperty('region', 'Florida')
      expect(callArgs).toHaveProperty('data_type', 'field')
      expect(callArgs).toHaveProperty('fragment', 'N')
    })
  })

  describe('useGrowthBySize', () => {
    it('fetches growth aggregated by size class', async () => {
      const mockData = [
        { size_class: 'SC1', mean_growth: 15.5, n: 100 },
        { size_class: 'SC2', mean_growth: 25.0, n: 150 },
      ]
      vi.mocked(growthApi.getBySize).mockResolvedValue(mockData)

      const { result } = renderHook(() => useGrowthBySize(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockData)
    })

    it('uses region and data_type filters only', async () => {
      vi.mocked(growthApi.getBySize).mockResolvedValue([])

      const { result: filterResult } = renderHook(() => useFilterStore())
      act(() => {
        filterResult.current.updateFilter('regions', ['USVI'])
        filterResult.current.updateFilter('fragmentStatus', 'Y') // Should not be passed
      })

      renderHook(() => useGrowthBySize(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(growthApi.getBySize).toHaveBeenCalled()
      })

      const callArgs = vi.mocked(growthApi.getBySize).mock.calls[0][0]
      expect(callArgs).toHaveProperty('region', 'USVI')
      expect(callArgs).not.toHaveProperty('fragment')
    })
  })

  describe('useGrowthDistribution', () => {
    it('fetches growth distribution data', async () => {
      const mockData = [
        { growth_rate: -20, count: 10 },
        { growth_rate: 0, count: 50 },
        { growth_rate: 20, count: 30 },
      ]
      vi.mocked(growthApi.getDistribution).mockResolvedValue(mockData)

      const { result } = renderHook(() => useGrowthDistribution(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockData)
    })
  })

  describe('useTransitionMatrix', () => {
    it('fetches size class transition matrix', async () => {
      const mockData = [
        { from: 'SC1', to: 'SC1', probability: 0.6 },
        { from: 'SC1', to: 'SC2', probability: 0.3 },
        { from: 'SC1', to: 'dead', probability: 0.1 },
      ]
      vi.mocked(growthApi.getTransitions).mockResolvedValue(mockData)

      const { result } = renderHook(() => useTransitionMatrix(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockData)
    })
  })

  describe('useGrowthBySizeAndType', () => {
    it('fetches growth by size and data type', async () => {
      const mockData = [
        { size_class: 'SC1', data_type: 'field', mean_growth: 10 },
        { size_class: 'SC1', data_type: 'nursery', mean_growth: 15 },
      ]
      vi.mocked(growthApi.getBySizeAndType).mockResolvedValue(mockData)

      const { result } = renderHook(() => useGrowthBySizeAndType(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockData)
    })

    it('uses only region filter', async () => {
      vi.mocked(growthApi.getBySizeAndType).mockResolvedValue([])

      const { result: filterResult } = renderHook(() => useFilterStore())
      act(() => {
        filterResult.current.updateFilter('regions', ['Puerto Rico'])
        filterResult.current.updateFilter('dataTypes', ['nursery_ex']) // Should not be passed
      })

      renderHook(() => useGrowthBySizeAndType(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(growthApi.getBySizeAndType).toHaveBeenCalled()
      })

      const callArgs = vi.mocked(growthApi.getBySizeAndType).mock.calls[0][0]
      expect(callArgs).toHaveProperty('region', 'Puerto Rico')
      expect(callArgs).not.toHaveProperty('data_type')
    })
  })

  describe('useFragmentationBySize', () => {
    it('fetches fragmentation rates by size', async () => {
      const mockData = [
        { size_class: 'SC1', fragmentation_rate: 0.05 },
        { size_class: 'SC3', fragmentation_rate: 0.15 },
        { size_class: 'SC5', fragmentation_rate: 0.25 },
      ]
      vi.mocked(growthApi.getFragmentationBySize).mockResolvedValue(mockData)

      const { result } = renderHook(() => useFragmentationBySize(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockData)
    })

    it('uses only region filter', async () => {
      vi.mocked(growthApi.getFragmentationBySize).mockResolvedValue([])

      const { result: filterResult } = renderHook(() => useFilterStore())
      act(() => {
        filterResult.current.updateFilter('regions', ['Bahamas'])
      })

      renderHook(() => useFragmentationBySize(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(growthApi.getFragmentationBySize).toHaveBeenCalled()
      })

      const callArgs = vi.mocked(growthApi.getFragmentationBySize).mock.calls[0][0]
      expect(callArgs).toHaveProperty('region', 'Bahamas')
    })
  })

  describe('usePositiveGrowthProbability', () => {
    it('fetches positive growth probability', async () => {
      const mockData = {
        overall: 0.65,
        by_size: [
          { size_class: 'SC1', probability: 0.75 },
          { size_class: 'SC5', probability: 0.55 },
        ],
      }
      vi.mocked(growthApi.getPositiveGrowthProbability).mockResolvedValue(mockData)

      const { result } = renderHook(() => usePositiveGrowthProbability(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockData)
    })

    it('uses region and data_type filters', async () => {
      vi.mocked(growthApi.getPositiveGrowthProbability).mockResolvedValue({ overall: 0.5 })

      const { result: filterResult } = renderHook(() => useFilterStore())
      act(() => {
        filterResult.current.updateFilter('regions', ['Curacao'])
        filterResult.current.updateFilter('dataTypes', ['field', 'nursery_in'])
      })

      renderHook(() => usePositiveGrowthProbability(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(growthApi.getPositiveGrowthProbability).toHaveBeenCalled()
      })

      const callArgs = vi.mocked(growthApi.getPositiveGrowthProbability).mock.calls[0][0]
      expect(callArgs).toHaveProperty('region', 'Curacao')
      expect(callArgs).toHaveProperty('data_type', 'field,nursery_in')
    })
  })

  // Error handling
  describe('error handling', () => {
    it('handles API errors gracefully', async () => {
      const error = new Error('Network error')
      vi.mocked(growthApi.getIndividual).mockRejectedValue(error)

      const { result } = renderHook(() => useGrowthData(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBe(error)
    })
  })

  // Loading states
  describe('loading states', () => {
    it('shows loading state while fetching', async () => {
      let resolvePromise: (value: unknown) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test helper needs type coercion for pending promise
      vi.mocked(growthApi.getIndividual).mockReturnValue(promise as Promise<any>)

      const { result } = renderHook(() => useGrowthData(), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(true)
      expect(result.current.data).toBeUndefined()

      // Resolve the promise
      resolvePromise!({ data: [], meta: {} })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })
  })
})
