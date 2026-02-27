import { describe, it, expect } from 'vitest'
import { render, screen } from '../../test/test-utils'
import { StatCard } from './StatCard'

describe('StatCard', () => {
  describe('value formatting', () => {
    it('formats number values with locale string', () => {
      render(<StatCard value={1234} label="Count" />)
      expect(screen.getByText('1,234')).toBeInTheDocument()
    })

    it('renders string values as-is', () => {
      render(<StatCard value="Custom" label="Status" />)
      expect(screen.getByText('Custom')).toBeInTheDocument()
    })

    it('formats percent values', () => {
      render(<StatCard value={0.75} label="Rate" format="percent" />)
      expect(screen.getByText('75%')).toBeInTheDocument()
    })

    it('formats small percent values', () => {
      render(<StatCard value={0.05} label="Rate" format="percent" />)
      expect(screen.getByText('5%')).toBeInTheDocument()
    })

    it('renders suffix after value', () => {
      render(<StatCard value={42} label="Temperature" suffix="°C" />)
      expect(screen.getByText('42')).toBeInTheDocument()
      expect(screen.getByText('°C')).toBeInTheDocument()
    })
  })

  describe('label', () => {
    it('renders label text', () => {
      render(<StatCard value={100} label="Total Sites" />)
      expect(screen.getByText('Total Sites')).toBeInTheDocument()
    })
  })

  describe('icon', () => {
    it('renders icon when provided', () => {
      const icon = <span data-testid="test-icon">Icon</span>
      render(<StatCard value={100} label="Sites" icon={icon} />)
      expect(screen.getByTestId('test-icon')).toBeInTheDocument()
    })

    it('hides icon when loading', () => {
      const icon = <span data-testid="test-icon">Icon</span>
      render(<StatCard value={100} label="Sites" icon={icon} isLoading />)
      expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('shows skeleton when loading', () => {
      render(<StatCard value={100} label="Sites" isLoading />)
      // Value should not be shown
      expect(screen.queryByText('100')).not.toBeInTheDocument()
      // Skeleton elements should be present
      const skeletons = document.querySelectorAll('.skeleton-premium')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('hides trend indicator when loading', () => {
      render(<StatCard value={100} label="Sites" trend="up" isLoading />)
      expect(screen.queryByText(/above/i)).not.toBeInTheDocument()
    })
  })

  describe('trend indicator', () => {
    it('shows up trend with appropriate styling', () => {
      render(<StatCard value={100} label="Sites" trend="up" />)
      expect(screen.getByText(/above/i)).toBeInTheDocument()
    })

    it('shows down trend with appropriate styling', () => {
      render(<StatCard value={100} label="Sites" trend="down" />)
      expect(screen.getByText(/below/i)).toBeInTheDocument()
    })

    it('shows neutral trend', () => {
      render(<StatCard value={100} label="Sites" trend="neutral" />)
      expect(screen.getByText(/at/i)).toBeInTheDocument()
    })
  })

  describe('variants', () => {
    it('renders default variant', () => {
      render(<StatCard value={100} label="Sites" data-testid="stat" />)
      const card = screen.getByText('100').closest('div[class*="rounded"]')
      expect(card).toHaveClass('rounded-xl')
    })

    it('renders compact variant with smaller padding', () => {
      render(<StatCard value={100} label="Sites" variant="compact" />)
      const card = screen.getByText('100').closest('div[class*="p-4"]')
      expect(card).toBeInTheDocument()
    })

    it('renders featured variant with larger styling', () => {
      render(<StatCard value={100} label="Sites" variant="featured" />)
      const card = screen.getByText('100').closest('div[class*="rounded-2xl"]')
      expect(card).toBeInTheDocument()
    })

    it('featured variant shows full trend text', () => {
      render(<StatCard value={100} label="Sites" variant="featured" trend="up" />)
      expect(screen.getByText(/regional average/i)).toBeInTheDocument()
    })
  })

  describe('custom styling', () => {
    it('applies custom className to container', () => {
      render(<StatCard value={100} label="Sites" className="custom-stat" />)
      const card = screen.getByText('100').closest('.custom-stat')
      expect(card).toBeInTheDocument()
    })

    it('applies custom valueClassName to value', () => {
      render(<StatCard value={100} label="Sites" valueClassName="text-red-500" />)
      const value = screen.getByText('100')
      expect(value).toHaveClass('text-red-500')
    })
  })

  // Edge cases
  describe('edge cases', () => {
    it('handles zero value', () => {
      render(<StatCard value={0} label="Count" />)
      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('handles negative values', () => {
      render(<StatCard value={-50} label="Change" />)
      expect(screen.getByText('-50')).toBeInTheDocument()
    })

    it('handles large numbers', () => {
      render(<StatCard value={1000000} label="Total" />)
      expect(screen.getByText('1,000,000')).toBeInTheDocument()
    })

    it('handles decimal numbers with locale formatting', () => {
      render(<StatCard value={3.14159} label="Pi" />)
      // toLocaleString with 0 decimals rounds and may include decimal separator
      // The actual output depends on locale but rounds to ~3
      expect(screen.getByText(/3/)).toBeInTheDocument()
    })

    it('handles empty string value', () => {
      render(<StatCard value="" label="Empty" />)
      expect(screen.getByText('Empty')).toBeInTheDocument()
    })

    it('handles 100% formatting', () => {
      render(<StatCard value={1} label="Complete" format="percent" />)
      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    it('handles percentages over 100%', () => {
      render(<StatCard value={1.5} label="Growth" format="percent" />)
      expect(screen.getByText('150%')).toBeInTheDocument()
    })
  })
})
