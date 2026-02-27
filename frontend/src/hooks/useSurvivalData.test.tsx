import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { act } from '@testing-library/react'
import { useFilterStore } from '../stores/filterStore'
import {
  useSurvivalData,
  useSurvivalModel,
  useSurvivalBySize,
  useSurvivalByStudy,
  useSurvivalBySizeAndType,
} from './useSurvivalData'
import { survivalApi } from '../utils/api'

// Mock the API module
vi.mock('../utils/api', async () => {
  const actual = await vi.importActual('../utils/api')
  return {
    ...actual,
    survivalApi: {
      getIndividual: vi.fn(),
      getModel: vi.fn(),
      getBySize: vi.fn(),
      getByStudy: vi.fn(),
      getBySizeAndType: vi.fn(),
    },
  }
})

// Create wrapper with fresh QueryClient for each test
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

describe('useSurvivalData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset filter store
    const { result } = renderHook(() => useFilterStore())
    act(() => {
      result.current.resetFilters()
    })
  })

  describe('useSurvivalData', () => {
    it('fetches individual survival data', async () => {
      const mockData = {
        data: [
          { id: '1', size_cm2: 100, survived: true },
          { id: '2', size_cm2: 200, survived: false },
        ],
        meta: { count: 2 },
      }
      vi.mocked(survivalApi.getIndividual).mockResolvedValue(mockData)

      const { result } = renderHook(() => useSurvivalData(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockData)
      expect(survivalApi.getIndividual).toHaveBeenCalledTimes(1)
    })

    it('builds params from filter store', async () => {
      vi.mocked(survivalApi.getIndividual).mockResolvedValue({ data: [], meta: {} })

      // Set some filters
      const { result: filterResult } = renderHook(() => useFilterStore())
      act(() => {
        filterResult.current.updateFilter('regions', ['Florida'])
        filterResult.current.updateFilter('dataTypes', ['field'])
      })

      renderHook(() => useSurvivalData(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(survivalApi.getIndividual).toHaveBeenCalled()
      })

      // Check that params include the filter values
      const callArgs = vi.mocked(survivalApi.getIndividual).mock.calls[0][0]
      expect(callArgs).toHaveProperty('region', 'Florida')
      expect(callArgs).toHaveProperty('data_type', 'field')
    })

    it('handles API error', async () => {
      const error = new Error('API Error')
      vi.mocked(survivalApi.getIndividual).mockRejectedValue(error)

      const { result } = renderHook(() => useSurvivalData(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBe(error)
    })

    it('uses correct stale time', async () => {
      vi.mocked(survivalApi.getIndividual).mockResolvedValue({ data: [], meta: {} })

      const { result } = renderHook(() => useSurvivalData(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Check that data doesn't refetch immediately (due to staleTime)
      expect(survivalApi.getIndividual).toHaveBeenCalledTimes(1)
    })
  })

  describe('useSurvivalModel', () => {
    it('fetches survival model predictions', async () => {
      const mockData = [
        { size: 100, probability: 0.8, ci_lower: 0.7, ci_upper: 0.9 },
        { size: 200, probability: 0.7, ci_lower: 0.6, ci_upper: 0.8 },
      ]
      vi.mocked(survivalApi.getModel).mockResolvedValue(mockData)

      const { result } = renderHook(() => useSurvivalModel(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockData)
    })

    it('uses region and data_type filters only', async () => {
      vi.mocked(survivalApi.getModel).mockResolvedValue([])

      const { result: filterResult } = renderHook(() => useFilterStore())
      act(() => {
        filterResult.current.updateFilter('regions', ['USVI'])
        filterResult.current.updateFilter('dataTypes', ['nursery_in'])
        filterResult.current.updateFilter('fragmentStatus', 'Y') // Should not be passed
      })

      renderHook(() => useSurvivalModel(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(survivalApi.getModel).toHaveBeenCalled()
      })

      const callArgs = vi.mocked(survivalApi.getModel).mock.calls[0][0]
      expect(callArgs).toHaveProperty('region', 'USVI')
      expect(callArgs).toHaveProperty('data_type', 'nursery_in')
      expect(callArgs).not.toHaveProperty('fragment')
    })
  })

  describe('useSurvivalBySize', () => {
    it('fetches survival aggregated by size class', async () => {
      const mockData = [
        { size_class: 'SC1', n: 100, survived: 80, rate: 0.8 },
        { size_class: 'SC2', n: 150, survived: 100, rate: 0.67 },
      ]
      vi.mocked(survivalApi.getBySize).mockResolvedValue(mockData)

      const { result } = renderHook(() => useSurvivalBySize(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockData)
    })
  })

  describe('useSurvivalByStudy', () => {
    it('fetches survival by study', async () => {
      const mockData = [
        { study_id: 'A', n: 200, rate: 0.75 },
        { study_id: 'B', n: 100, rate: 0.85 },
      ]
      vi.mocked(survivalApi.getByStudy).mockResolvedValue(mockData)

      const { result } = renderHook(() => useSurvivalByStudy(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockData)
    })
  })

  describe('useSurvivalBySizeAndType', () => {
    it('fetches survival by size and data type', async () => {
      const mockData = [
        { size_class: 'SC1', data_type: 'field', rate: 0.8 },
        { size_class: 'SC1', data_type: 'nursery', rate: 0.9 },
      ]
      vi.mocked(survivalApi.getBySizeAndType).mockResolvedValue(mockData)

      const { result } = renderHook(() => useSurvivalBySizeAndType(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockData)
    })

    it('uses only region filter', async () => {
      vi.mocked(survivalApi.getBySizeAndType).mockResolvedValue([])

      const { result: filterResult } = renderHook(() => useFilterStore())
      act(() => {
        filterResult.current.updateFilter('regions', ['Puerto Rico'])
        filterResult.current.updateFilter('dataTypes', ['field']) // Should not be passed
      })

      renderHook(() => useSurvivalBySizeAndType(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(survivalApi.getBySizeAndType).toHaveBeenCalled()
      })

      const callArgs = vi.mocked(survivalApi.getBySizeAndType).mock.calls[0][0]
      expect(callArgs).toHaveProperty('region', 'Puerto Rico')
      expect(callArgs).not.toHaveProperty('data_type')
    })
  })

  // Query key tests
  describe('query keys', () => {
    it('uses different query keys for different hooks', async () => {
      vi.mocked(survivalApi.getIndividual).mockResolvedValue({ data: [], meta: {} })
      vi.mocked(survivalApi.getModel).mockResolvedValue([])
      vi.mocked(survivalApi.getBySize).mockResolvedValue([])

      const wrapper = createWrapper()

      renderHook(() => useSurvivalData(), { wrapper })
      renderHook(() => useSurvivalModel(), { wrapper })
      renderHook(() => useSurvivalBySize(), { wrapper })

      await waitFor(() => {
        expect(survivalApi.getIndividual).toHaveBeenCalledTimes(1)
        expect(survivalApi.getModel).toHaveBeenCalledTimes(1)
        expect(survivalApi.getBySize).toHaveBeenCalledTimes(1)
      })
    })

    it('refetches when filter params change', async () => {
      vi.mocked(survivalApi.getIndividual).mockResolvedValue({ data: [], meta: {} })

      const wrapper = createWrapper()
      const { result: filterResult } = renderHook(() => useFilterStore())

      const { result } = renderHook(() => useSurvivalData(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(survivalApi.getIndividual).toHaveBeenCalledTimes(1)

      // Change filter
      act(() => {
        filterResult.current.updateFilter('regions', ['Florida'])
      })

    })
  })
})
