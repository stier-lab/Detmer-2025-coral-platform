import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '../test/test-utils'

// Mock the API modules
vi.mock('../utils/api', () => ({
  growthApi: {
    getBySize: vi.fn(() => Promise.resolve([
      { size_class: 'SC1 (0-25)', mean_growth: 50, sd_growth: 20, n: 80, median_growth: 45, q25: 30, q75: 65, pct_shrinking: 5, pct_growing: 90 },
      { size_class: 'SC2 (25-100)', mean_growth: 75, sd_growth: 30, n: 400, median_growth: 70, q25: 50, q75: 95, pct_shrinking: 8, pct_growing: 85 },
      { size_class: 'SC3 (100-500)', mean_growth: 100, sd_growth: 50, n: 250, median_growth: 90, q25: 60, q75: 130, pct_shrinking: 15, pct_growing: 75 },
      { size_class: 'SC4 (500-2000)', mean_growth: 80, sd_growth: 100, n: 150, median_growth: 50, q25: -20, q75: 150, pct_shrinking: 30, pct_growing: 60 },
      { size_class: 'SC5 (>2000)', mean_growth: -50, sd_growth: 200, n: 100, median_growth: -30, q25: -150, q75: 80, pct_shrinking: 55, pct_growing: 40 },
    ])),
  },
  qualityApi: {
    getMetrics: vi.fn(() => Promise.resolve({
      r_squared: 0.015,
      sample_size: 4300,
      n_studies: 15,
      n_regions: 8,
      dominant_study: { name: 'NOAA', n: 3200, pct: 74 },
      fragment_mix: true,
      fragment_pct: 50,
      size_class_n: [],
      year_range: [2004, 2024],
      using_mock_data: false,
      warnings: [],
    })),
  },
}))

// Mock analytics
vi.mock('../utils/analytics', () => ({
  trackEvent: vi.fn(),
}))

// Mock layout components
vi.mock('../components/layout/Header', () => ({
  Header: () => <header data-testid="header">Header</header>,
}))

vi.mock('../components/layout/Footer', () => ({
  Footer: () => <footer data-testid="footer">Footer</footer>,
}))

// Mock UncertaintyBanner
vi.mock('../components/common/UncertaintyBanner', () => ({
  UncertaintyBanner: ({ loading }: { loading: boolean }) => (
    <div data-testid="uncertainty-banner">{loading ? 'Loading...' : 'Uncertainty info'}</div>
  ),
}))

import { GrowthTool } from './GrowthTool'

describe('GrowthTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the page title', async () => {
      render(<GrowthTool />)
      expect(screen.getByText('Growth Projector')).toBeInTheDocument()
      expect(screen.getByText('How long to reach target size?')).toBeInTheDocument()
    })

    it('renders header and footer', async () => {
      render(<GrowthTool />)
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })

    it('renders uncertainty banner', async () => {
      render(<GrowthTool />)
      await waitFor(() => {
        expect(screen.getByTestId('uncertainty-banner')).toBeInTheDocument()
      })
    })

    it('renders starting size input', async () => {
      render(<GrowthTool />)
      expect(screen.getByLabelText(/Starting Size/i)).toBeInTheDocument()
    })

    it('renders target size input', async () => {
      render(<GrowthTool />)
      expect(screen.getByLabelText(/Target Size/i)).toBeInTheDocument()
    })

    it('renders population type buttons', async () => {
      render(<GrowthTool />)
      expect(screen.getByRole('button', { name: 'Fragment' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Natural' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'All data' })).toBeInTheDocument()
    })

    it('renders presets', async () => {
      render(<GrowthTool />)
      expect(screen.getByText('Presets:')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'SC2 → SC3' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Fragment → Adult' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'SC3 → Reproductive' })).toBeInTheDocument()
    })
  })

  describe('inputs', () => {
    it('has default starting size of 50', async () => {
      render(<GrowthTool />)
      const startInput = screen.getByLabelText(/Starting Size/i) as HTMLInputElement
      expect(startInput.value).toBe('50')
    })

    it('has default target size of 2000', async () => {
      render(<GrowthTool />)
      const targetInput = screen.getByLabelText(/Target Size/i) as HTMLInputElement
      expect(targetInput.value).toBe('2000')
    })

    it('shows current size class for starting size', async () => {
      render(<GrowthTool />)
      await waitFor(() => {
        expect(screen.getByText(/Current: SC2/)).toBeInTheDocument()
      })
    })

    it('shows target size class', async () => {
      render(<GrowthTool />)
      await waitFor(() => {
        // Default target is 2000 cm², which is SC5 (≥2000)
        expect(screen.getByText(/Target: SC5/)).toBeInTheDocument()
      })
    })

    it('allows changing starting size', async () => {
      render(<GrowthTool />)
      const startInput = screen.getByLabelText(/Starting Size/i) as HTMLInputElement

      fireEvent.change(startInput, { target: { value: '100' } })

      expect(startInput.value).toBe('100')
    })

    it('allows changing target size', async () => {
      render(<GrowthTool />)
      const targetInput = screen.getByLabelText(/Target Size/i) as HTMLInputElement

      fireEvent.change(targetInput, { target: { value: '3000' } })

      expect(targetInput.value).toBe('3000')
    })
  })

  describe('presets', () => {
    it('applies SC2 → SC3 preset', async () => {
      const { user } = render(<GrowthTool />)

      const presetButton = screen.getByRole('button', { name: 'SC2 → SC3' })
      await user.click(presetButton)

      const startInput = screen.getByLabelText(/Starting Size/i) as HTMLInputElement
      const targetInput = screen.getByLabelText(/Target Size/i) as HTMLInputElement

      expect(startInput.value).toBe('25')
      expect(targetInput.value).toBe('500')
    })

    it('applies Fragment → Adult preset', async () => {
      const { user } = render(<GrowthTool />)

      const presetButton = screen.getByRole('button', { name: 'Fragment → Adult' })
      await user.click(presetButton)

      const startInput = screen.getByLabelText(/Starting Size/i) as HTMLInputElement
      const targetInput = screen.getByLabelText(/Target Size/i) as HTMLInputElement

      expect(startInput.value).toBe('50')
      expect(targetInput.value).toBe('2000')
    })

    it('applies SC3 → Reproductive preset', async () => {
      const { user } = render(<GrowthTool />)

      const presetButton = screen.getByRole('button', { name: 'SC3 → Reproductive' })
      await user.click(presetButton)

      const startInput = screen.getByLabelText(/Starting Size/i) as HTMLInputElement
      const targetInput = screen.getByLabelText(/Target Size/i) as HTMLInputElement

      expect(startInput.value).toBe('100')
      expect(targetInput.value).toBe('2000')
    })
  })

  describe('population type', () => {
    it('has Fragment selected by default', async () => {
      render(<GrowthTool />)
      const fragmentButton = screen.getByRole('button', { name: 'Fragment' })
      expect(fragmentButton).toHaveClass('border-bioluminescent')
    })

    it('allows switching to Natural', async () => {
      const { user } = render(<GrowthTool />)

      const naturalButton = screen.getByRole('button', { name: 'Natural' })
      await user.click(naturalButton)

      expect(naturalButton).toHaveClass('border-bioluminescent')
    })

    it('shows warning when All data is selected', async () => {
      const { user } = render(<GrowthTool />)

      const allDataButton = screen.getByRole('button', { name: 'All data' })
      await user.click(allDataButton)

      await waitFor(() => {
        expect(screen.getByText('Mixed fragments and colonies')).toBeInTheDocument()
      })
    })
  })

  describe('results', () => {
    it('displays estimated time to target', async () => {
      render(<GrowthTool />)
      await waitFor(() => {
        expect(screen.getByText('Estimated Time to Target')).toBeInTheDocument()
      })
      expect(screen.getByText('years')).toBeInTheDocument()
    })

    it('displays trajectory bars', async () => {
      render(<GrowthTool />)
      await waitFor(() => {
        expect(screen.getByText('Y0')).toBeInTheDocument()
        expect(screen.getByText('Y1')).toBeInTheDocument()
        expect(screen.getByText('Y2')).toBeInTheDocument()
      })
    })

    it('displays legend', async () => {
      render(<GrowthTool />)
      await waitFor(() => {
        expect(screen.getByText('Growing')).toBeInTheDocument()
        expect(screen.getByText('Uncertainty')).toBeInTheDocument()
        expect(screen.getByText('Target')).toBeInTheDocument()
      })
    })
  })

  describe('caveats', () => {
    it('displays projection assumptions', async () => {
      render(<GrowthTool />)
      await waitFor(() => {
        expect(screen.getByText('Projection assumptions')).toBeInTheDocument()
      })
    })

    it('displays R-squared warning', async () => {
      render(<GrowthTool />)
      await waitFor(() => {
        expect(screen.getByText(/Size explains only 8.6% of survival variance/)).toBeInTheDocument()
      })
    })
  })

  describe('RGR table', () => {
    it('displays RGR by size class table', async () => {
      render(<GrowthTool />)
      await waitFor(() => {
        expect(screen.getByText('Relative Growth Rate by Size Class')).toBeInTheDocument()
      })
      expect(screen.getByText('Size Class')).toBeInTheDocument()
      expect(screen.getByText('Size Range')).toBeInTheDocument()
      expect(screen.getByText('RGR (yr⁻¹)')).toBeInTheDocument()
      expect(screen.getByText('Interpretation')).toBeInTheDocument()
    })

    it('shows all size classes in table', async () => {
      render(<GrowthTool />)
      await waitFor(() => {
        // Look for size class labels in table cells
        const table = screen.getByRole('table')
        expect(table).toBeInTheDocument()
      })

      // Check that SC1-SC5 appear in the table
      const tableCells = screen.getAllByRole('cell')
      const sizeClasses = tableCells.filter(cell =>
        cell.textContent?.match(/^SC[1-5]$/)
      )
      expect(sizeClasses.length).toBe(5)
    })
  })

  describe('negative growth handling', () => {
    it('shows warning when negative growth data exists', async () => {
      render(<GrowthTool />)

      // Set a large starting size that would hit SC5 (which has negative growth in our mock)
      const { user } = render(<GrowthTool />)
      const startInput = screen.getAllByLabelText(/Starting Size/i)[0] as HTMLInputElement

      await user.clear(startInput)
      await user.type(startInput, '3000')

      await waitFor(() => {
        // The component should detect negative growth data for SC5
        expect(screen.getAllByText(/Negative growth observed|Net shrinkage/i).length).toBeGreaterThan(0)
      })
    })
  })

  describe('links', () => {
    it('renders evidence link', async () => {
      render(<GrowthTool />)
      const evidenceLink = screen.getByRole('link', { name: /See full growth analysis/i })
      expect(evidenceLink).toHaveAttribute('href', '/analysis#evidence')
    })

    it('renders outplanting recommendation link', async () => {
      render(<GrowthTool />)
      const outplantLink = screen.getByRole('link', { name: /Get outplanting recommendation/i })
      expect(outplantLink).toHaveAttribute('href', '/answers/outplant')
    })
  })

  describe('accessibility', () => {
    it('has proper heading hierarchy', async () => {
      render(<GrowthTool />)
      const h1 = document.querySelector('h1')
      expect(h1).toBeInTheDocument()
      expect(h1?.textContent).toContain('How long to reach target size?')
    })

    it('has labeled inputs', async () => {
      render(<GrowthTool />)
      expect(screen.getByLabelText(/Starting Size/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Target Size/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Population Type/i)).toBeInTheDocument()
    })
  })
})
