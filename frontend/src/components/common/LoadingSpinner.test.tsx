import { describe, it, expect } from 'vitest'
import { render, screen } from '../../test/test-utils'
import { LoadingSpinner, LoadingOverlay, Skeleton } from './LoadingSpinner'

describe('LoadingSpinner', () => {
  describe('rendering', () => {
    it('renders svg spinner element', () => {
      render(<LoadingSpinner />)
      const svg = document.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveClass('animate-spin')
    })
  })

  describe('sizes', () => {
    it('renders small size', () => {
      render(<LoadingSpinner size="sm" />)
      const svg = document.querySelector('svg')
      expect(svg).toHaveClass('w-4', 'h-4')
    })

    it('renders medium size (default)', () => {
      render(<LoadingSpinner />)
      const svg = document.querySelector('svg')
      expect(svg).toHaveClass('w-8', 'h-8')
    })

    it('renders large size', () => {
      render(<LoadingSpinner size="lg" />)
      const svg = document.querySelector('svg')
      expect(svg).toHaveClass('w-12', 'h-12')
    })
  })

  describe('styling', () => {
    it('applies custom className', () => {
      render(<LoadingSpinner className="custom-spinner" />)
      const container = document.querySelector('.custom-spinner')
      expect(container).toBeInTheDocument()
    })

    it('centers content with flexbox', () => {
      render(<LoadingSpinner data-testid="spinner" />)
      const container = document.querySelector('.flex')
      expect(container).toHaveClass('items-center', 'justify-center')
    })
  })
})

describe('LoadingOverlay', () => {
  describe('rendering', () => {
    it('renders with default message', () => {
      render(<LoadingOverlay />)
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('renders with custom message', () => {
      render(<LoadingOverlay message="Fetching data..." />)
      expect(screen.getByText('Fetching data...')).toBeInTheDocument()
    })

    it('renders spinner inside overlay', () => {
      render(<LoadingOverlay />)
      const svg = document.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveClass('animate-spin')
    })
  })

  describe('styling', () => {
    it('applies overlay positioning', () => {
      render(<LoadingOverlay />)
      const overlay = screen.getByText('Loading...').parentElement
      expect(overlay).toHaveClass('absolute', 'inset-0')
    })

    it('applies backdrop blur', () => {
      render(<LoadingOverlay />)
      const overlay = screen.getByText('Loading...').parentElement
      expect(overlay).toHaveClass('backdrop-blur-sm')
    })

    it('sets high z-index for overlay', () => {
      render(<LoadingOverlay />)
      const overlay = screen.getByText('Loading...').parentElement
      expect(overlay).toHaveClass('z-10')
    })
  })
})

describe('Skeleton', () => {
  describe('variants', () => {
    it('renders rectangular variant by default', () => {
      render(<Skeleton data-testid="skeleton" />)
      const skeleton = document.querySelector('.skeleton')
      expect(skeleton).toHaveClass('rounded-lg')
    })

    it('renders text variant', () => {
      render(<Skeleton variant="text" />)
      const skeleton = document.querySelector('.skeleton')
      expect(skeleton).toHaveClass('h-4', 'rounded')
    })

    it('renders circular variant', () => {
      render(<Skeleton variant="circular" />)
      const skeleton = document.querySelector('.skeleton')
      expect(skeleton).toHaveClass('rounded-full')
    })
  })

  describe('styling', () => {
    it('applies pulse animation', () => {
      render(<Skeleton />)
      const skeleton = document.querySelector('.skeleton')
      expect(skeleton).toHaveClass('animate-pulse')
    })

    it('applies custom className', () => {
      render(<Skeleton className="w-24 h-24" />)
      const skeleton = document.querySelector('.skeleton')
      expect(skeleton).toHaveClass('w-24', 'h-24')
    })

    it('applies base background color', () => {
      render(<Skeleton />)
      const skeleton = document.querySelector('.skeleton')
      expect(skeleton).toHaveClass('bg-sand-warm')
    })
  })

  // Edge case
  describe('edge cases', () => {
    it('combines variant classes with custom className', () => {
      render(<Skeleton variant="circular" className="w-10 h-10" />)
      const skeleton = document.querySelector('.skeleton')
      expect(skeleton).toHaveClass('rounded-full', 'w-10', 'h-10')
    })
  })
})
