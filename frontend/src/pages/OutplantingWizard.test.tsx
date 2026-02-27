import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test/test-utils'

// Mock the API modules
vi.mock('../utils/api', () => ({
  survivalApi: {
    getBySize: vi.fn(() => Promise.resolve([
      { size_class: 'SC1 (0-25)', survival_rate: 0.72, ci_lower: 0.65, ci_upper: 0.79, n: 100, se: 0.03 },
      { size_class: 'SC2 (25-100)', survival_rate: 0.64, ci_lower: 0.60, ci_upper: 0.68, n: 500, se: 0.02 },
      { size_class: 'SC3 (100-500)', survival_rate: 0.77, ci_lower: 0.73, ci_upper: 0.81, n: 300, se: 0.02 },
      { size_class: 'SC4 (500-2000)', survival_rate: 0.88, ci_lower: 0.84, ci_upper: 0.92, n: 200, se: 0.02 },
      { size_class: 'SC5 (>2000)', survival_rate: 0.94, ci_lower: 0.91, ci_upper: 0.97, n: 150, se: 0.02 },
    ])),
  },
  growthApi: {
    getBySize: vi.fn(() => Promise.resolve([
      { size_class: 'SC1 (0-25)', mean_growth: 50, n: 80 },
      { size_class: 'SC2 (25-100)', mean_growth: 75, n: 400 },
      { size_class: 'SC3 (100-500)', mean_growth: 100, n: 250 },
      { size_class: 'SC4 (500-2000)', mean_growth: 80, n: 150 },
      { size_class: 'SC5 (>2000)', mean_growth: 50, n: 100 },
    ])),
  },
  qualityApi: {
    getMetrics: vi.fn(() => Promise.resolve({
      r_squared: 0.086,
      sample_size: 5200,
      n_studies: 18,
      n_regions: 10,
      dominant_study: { name: 'NOAA', n: 4000, pct: 78 },
      fragment_mix: true,
      fragment_pct: 45,
      size_class_n: [],
      year_range: [2004, 2024],
      using_mock_data: false,
      warnings: ['Test warning'],
    })),
  },
  ApiError: class ApiError extends Error {
    statusCode: number
    userMessage: string
    constructor(message: string, statusCode: number) {
      super(message)
      this.statusCode = statusCode
      this.userMessage = message
    }
  },
  NetworkError: class NetworkError extends Error {},
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

import { OutplantingWizard } from './OutplantingWizard'

describe('OutplantingWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the page title', async () => {
      render(<OutplantingWizard />)
      expect(screen.getByText('Outplanting Decision Wizard')).toBeInTheDocument()
      expect(screen.getByText('What size should I outplant?')).toBeInTheDocument()
    })

    it('renders header and footer', async () => {
      render(<OutplantingWizard />)
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })

    it('renders step indicators', async () => {
      render(<OutplantingWizard />)
      // 5 steps total (4 input + 1 results)
      const stepIndicators = document.querySelectorAll('.rounded-full.w-3.h-3')
      expect(stepIndicators.length).toBe(5)
    })

    it('renders uncertainty banner', async () => {
      render(<OutplantingWizard />)
      await waitFor(() => {
        expect(screen.getByTestId('uncertainty-banner')).toBeInTheDocument()
      })
    })
  })

  describe('step 0 - goal selection', () => {
    it('renders all goal options', async () => {
      render(<OutplantingWizard />)
      await waitFor(() => {
        expect(screen.getByText("What's your primary goal?")).toBeInTheDocument()
      })
      expect(screen.getByText('Maximize survival')).toBeInTheDocument()
      expect(screen.getByText('Fastest growth')).toBeInTheDocument()
      expect(screen.getByText('Balance both')).toBeInTheDocument()
    })

    it('allows selecting a goal', async () => {
      const { user } = render(<OutplantingWizard />)
      await waitFor(() => {
        expect(screen.getByText('Maximize survival')).toBeInTheDocument()
      })

      const survivalOption = screen.getByText('Maximize survival').closest('button')!
      await user.click(survivalOption)

      // Check button is now selected (has check icon sibling)
      expect(survivalOption.querySelector('[class*="text-bioluminescent"]')).toBeInTheDocument()
    })

    it('disables continue button until goal is selected', async () => {
      render(<OutplantingWizard />)
      await waitFor(() => {
        expect(screen.getByText('Continue')).toBeInTheDocument()
      })

      const continueButton = screen.getByText('Continue').closest('button')!
      expect(continueButton).toHaveClass('cursor-not-allowed')
    })
  })

  describe('navigation', () => {
    it('advances to step 1 when goal is selected and continue clicked', async () => {
      const { user } = render(<OutplantingWizard />)
      await waitFor(() => {
        expect(screen.getByText('Maximize survival')).toBeInTheDocument()
      })

      // Select goal
      const survivalOption = screen.getByText('Maximize survival').closest('button')!
      await user.click(survivalOption)

      // Click continue
      const continueButton = screen.getByText('Continue').closest('button')!
      await user.click(continueButton)

      // Should now see size class selection
      await waitFor(() => {
        expect(screen.getByText('What size are your fragments?')).toBeInTheDocument()
      })
    })

    it('shows back button on steps after first', async () => {
      const { user } = render(<OutplantingWizard />)
      await waitFor(() => {
        expect(screen.getByText('Maximize survival')).toBeInTheDocument()
      })

      // Select goal and advance
      const survivalOption = screen.getByText('Maximize survival').closest('button')!
      await user.click(survivalOption)
      const continueButton = screen.getByText('Continue').closest('button')!
      await user.click(continueButton)

      // Check for back button
      await waitFor(() => {
        expect(screen.getByText('Back')).toBeInTheDocument()
      })
    })

    it('allows going back to previous step', async () => {
      const { user } = render(<OutplantingWizard />)
      await waitFor(() => {
        expect(screen.getByText('Maximize survival')).toBeInTheDocument()
      })

      // Go to step 1
      const survivalOption = screen.getByText('Maximize survival').closest('button')!
      await user.click(survivalOption)
      await user.click(screen.getByText('Continue').closest('button')!)

      // Wait for step 1
      await waitFor(() => {
        expect(screen.getByText('What size are your fragments?')).toBeInTheDocument()
      })

      // Go back
      await user.click(screen.getByText('Back').closest('button')!)

      // Should be back at step 0
      await waitFor(() => {
        expect(screen.getByText("What's your primary goal?")).toBeInTheDocument()
      })
    })
  })

  describe('step 1 - size class selection', () => {
    it('renders all size class options', async () => {
      const { user } = render(<OutplantingWizard />)
      await waitFor(() => {
        expect(screen.getByText('Maximize survival')).toBeInTheDocument()
      })

      // Navigate to step 1
      await user.click(screen.getByText('Maximize survival').closest('button')!)
      await user.click(screen.getByText('Continue').closest('button')!)

      await waitFor(() => {
        expect(screen.getByText(/Very Small \(SC1\)/)).toBeInTheDocument()
        expect(screen.getByText(/Small \(SC2\)/)).toBeInTheDocument()
        expect(screen.getByText(/Medium \(SC3\)/)).toBeInTheDocument()
        expect(screen.getByText(/Large \(SC4\)/)).toBeInTheDocument()
        expect(screen.getByText(/Very Large \(SC5\)/)).toBeInTheDocument()
      })
    })
  })

  describe('step 2 - region selection', () => {
    it('renders region options', async () => {
      const { user } = render(<OutplantingWizard />)
      await waitFor(() => {
        expect(screen.getByText('Maximize survival')).toBeInTheDocument()
      })

      // Navigate through steps
      await user.click(screen.getByText('Maximize survival').closest('button')!)
      await user.click(screen.getByText('Continue').closest('button')!)

      await waitFor(() => {
        expect(screen.getByText(/Medium \(SC3\)/)).toBeInTheDocument()
      })
      await user.click(screen.getByText(/Medium \(SC3\)/).closest('button')!)
      await user.click(screen.getByText('Continue').closest('button')!)

      await waitFor(() => {
        expect(screen.getByText('Where are you planting?')).toBeInTheDocument()
        expect(screen.getByText('Florida Keys')).toBeInTheDocument()
        expect(screen.getByText('Curaçao')).toBeInTheDocument()
        expect(screen.getByText('US Virgin Islands')).toBeInTheDocument()
        expect(screen.getByText('Puerto Rico')).toBeInTheDocument()
      })
    })
  })

  describe('step 3 - population type selection', () => {
    it('renders population type options', async () => {
      const { user } = render(<OutplantingWizard />)
      await waitFor(() => {
        expect(screen.getByText('Maximize survival')).toBeInTheDocument()
      })

      // Navigate through steps
      await user.click(screen.getByText('Maximize survival').closest('button')!)
      await user.click(screen.getByText('Continue').closest('button')!)

      await waitFor(() => {
        expect(screen.getByText(/Medium \(SC3\)/)).toBeInTheDocument()
      })
      await user.click(screen.getByText(/Medium \(SC3\)/).closest('button')!)
      await user.click(screen.getByText('Continue').closest('button')!)

      await waitFor(() => {
        expect(screen.getByText('Florida Keys')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Florida Keys').closest('button')!)
      await user.click(screen.getByText('Continue').closest('button')!)

      await waitFor(() => {
        expect(screen.getByText('Natural colonies or nursery fragments?')).toBeInTheDocument()
        expect(screen.getByText('Natural colonies')).toBeInTheDocument()
        expect(screen.getByText('Nursery-raised fragments')).toBeInTheDocument()
      })
    })
  })

  describe('step 4 - results', () => {
    it('displays survival results after completing all steps', async () => {
      const { user } = render(<OutplantingWizard />)

      // Complete all steps
      await waitFor(() => {
        expect(screen.getByText('Maximize survival')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Maximize survival').closest('button')!)
      await user.click(screen.getByText('Continue').closest('button')!)

      await waitFor(() => {
        expect(screen.getByText(/Medium \(SC3\)/)).toBeInTheDocument()
      })
      await user.click(screen.getByText(/Medium \(SC3\)/).closest('button')!)
      await user.click(screen.getByText('Continue').closest('button')!)

      await waitFor(() => {
        expect(screen.getByText('Florida Keys')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Florida Keys').closest('button')!)
      await user.click(screen.getByText('Continue').closest('button')!)

      await waitFor(() => {
        expect(screen.getByText('Nursery-raised fragments')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Nursery-raised fragments').closest('button')!)
      await user.click(screen.getByText('Continue').closest('button')!)

      // Check results
      await waitFor(() => {
        expect(screen.getByText('Your Personalized Estimate')).toBeInTheDocument()
      })
      expect(screen.getByText('Expected first-year survival')).toBeInTheDocument()
      expect(screen.getByText('Years to reproductive size')).toBeInTheDocument()
    })

    it('shows start over button on results page', async () => {
      const { user } = render(<OutplantingWizard />)

      // Complete all steps
      await waitFor(() => {
        expect(screen.getByText('Maximize survival')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Maximize survival').closest('button')!)
      await user.click(screen.getByText('Continue').closest('button')!)

      await waitFor(() => {
        expect(screen.getByText(/Medium \(SC3\)/)).toBeInTheDocument()
      })
      await user.click(screen.getByText(/Medium \(SC3\)/).closest('button')!)
      await user.click(screen.getByText('Continue').closest('button')!)

      await waitFor(() => {
        expect(screen.getByText('Florida Keys')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Florida Keys').closest('button')!)
      await user.click(screen.getByText('Continue').closest('button')!)

      await waitFor(() => {
        expect(screen.getByText('Nursery-raised fragments')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Nursery-raised fragments').closest('button')!)
      await user.click(screen.getByText('Continue').closest('button')!)

      await waitFor(() => {
        expect(screen.getByText('Start over')).toBeInTheDocument()
      })
    })

    it('shows caveats on results page', async () => {
      const { user } = render(<OutplantingWizard />)

      // Complete all steps
      await waitFor(() => {
        expect(screen.getByText('Maximize survival')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Maximize survival').closest('button')!)
      await user.click(screen.getByText('Continue').closest('button')!)

      await waitFor(() => {
        expect(screen.getByText(/Medium \(SC3\)/)).toBeInTheDocument()
      })
      await user.click(screen.getByText(/Medium \(SC3\)/).closest('button')!)
      await user.click(screen.getByText('Continue').closest('button')!)

      await waitFor(() => {
        expect(screen.getByText('Florida Keys')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Florida Keys').closest('button')!)
      await user.click(screen.getByText('Continue').closest('button')!)

      await waitFor(() => {
        expect(screen.getByText('Nursery-raised fragments')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Nursery-raised fragments').closest('button')!)
      await user.click(screen.getByText('Continue').closest('button')!)

      await waitFor(() => {
        expect(screen.getByText('Important caveats')).toBeInTheDocument()
      })
    })
  })

  describe('reset functionality', () => {
    it('resets wizard to step 0 when start over is clicked', async () => {
      const { user } = render(<OutplantingWizard />)

      // Complete all steps
      await waitFor(() => {
        expect(screen.getByText('Maximize survival')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Maximize survival').closest('button')!)
      await user.click(screen.getByText('Continue').closest('button')!)

      await waitFor(() => {
        expect(screen.getByText(/Medium \(SC3\)/)).toBeInTheDocument()
      })
      await user.click(screen.getByText(/Medium \(SC3\)/).closest('button')!)
      await user.click(screen.getByText('Continue').closest('button')!)

      await waitFor(() => {
        expect(screen.getByText('Florida Keys')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Florida Keys').closest('button')!)
      await user.click(screen.getByText('Continue').closest('button')!)

      await waitFor(() => {
        expect(screen.getByText('Nursery-raised fragments')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Nursery-raised fragments').closest('button')!)
      await user.click(screen.getByText('Continue').closest('button')!)

      // Click start over
      await waitFor(() => {
        expect(screen.getByText('Start over')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Start over').closest('button')!)

      // Should be back at step 0
      await waitFor(() => {
        expect(screen.getByText("What's your primary goal?")).toBeInTheDocument()
      })
    })
  })

  describe('links', () => {
    it('renders evidence link on results page', async () => {
      const { user } = render(<OutplantingWizard />)

      // Complete all steps
      await waitFor(() => {
        expect(screen.getByText('Maximize survival')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Maximize survival').closest('button')!)
      await user.click(screen.getByText('Continue').closest('button')!)

      await waitFor(() => {
        expect(screen.getByText(/Medium \(SC3\)/)).toBeInTheDocument()
      })
      await user.click(screen.getByText(/Medium \(SC3\)/).closest('button')!)
      await user.click(screen.getByText('Continue').closest('button')!)

      await waitFor(() => {
        expect(screen.getByText('Florida Keys')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Florida Keys').closest('button')!)
      await user.click(screen.getByText('Continue').closest('button')!)

      await waitFor(() => {
        expect(screen.getByText('Nursery-raised fragments')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Nursery-raised fragments').closest('button')!)
      await user.click(screen.getByText('Continue').closest('button')!)

      await waitFor(() => {
        const evidenceLink = screen.getByRole('link', { name: /full evidence base/i })
        expect(evidenceLink).toHaveAttribute('href', '/analysis#evidence')
      })
    })
  })
})
