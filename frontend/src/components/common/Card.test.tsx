import { describe, it, expect } from 'vitest'
import { render, screen } from '../../test/test-utils'
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from './Card'

describe('Card', () => {
  describe('rendering', () => {
    it('renders children', () => {
      render(<Card>Card content</Card>)
      expect(screen.getByText('Card content')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<Card className="custom-class" data-testid="card">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('custom-class')
    })
  })

  describe('variants', () => {
    it('applies default variant styling', () => {
      render(<Card data-testid="card">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('rounded-2xl')
      expect(card).toHaveClass('bg-gradient-to-br')
    })

    it('applies flat variant styling', () => {
      render(<Card variant="flat" data-testid="card">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('bg-white')
    })

    it('applies interactive variant styling', () => {
      render(<Card variant="interactive" data-testid="card">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('cursor-pointer')
      expect(card).toHaveClass('group')
    })

    it('applies glass variant styling', () => {
      render(<Card variant="glass" data-testid="card">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('backdrop-blur-md')
    })

    it('applies elevated variant styling', () => {
      render(<Card variant="elevated" data-testid="card">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('shadow-md')
    })
  })

  describe('padding', () => {
    it('applies default padding (md)', () => {
      render(<Card data-testid="card">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('p-5')
    })

    it('applies no padding', () => {
      render(<Card padding="none" data-testid="card">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card).not.toHaveClass('p-5')
      expect(card).not.toHaveClass('p-3')
    })

    it('applies small padding', () => {
      render(<Card padding="sm" data-testid="card">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('p-3')
    })

    it('applies large padding', () => {
      render(<Card padding="lg" data-testid="card">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('p-6')
    })

    it('applies xl padding', () => {
      render(<Card padding="xl" data-testid="card">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('p-8')
    })
  })

  describe('ref forwarding', () => {
    it('forwards ref to div element', () => {
      const ref = { current: null }
      render(<Card ref={ref}>Content</Card>)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })
})

describe('CardHeader', () => {
  it('renders children', () => {
    render(<CardHeader>Header content</CardHeader>)
    expect(screen.getByText('Header content')).toBeInTheDocument()
  })

  it('applies margin bottom', () => {
    render(<CardHeader data-testid="header">Header</CardHeader>)
    expect(screen.getByTestId('header')).toHaveClass('mb-4')
  })

  it('renders with divider when specified', () => {
    render(<CardHeader withDivider data-testid="header">Header</CardHeader>)
    const header = screen.getByTestId('header')
    expect(header).toHaveClass('pb-4')
    expect(header).toHaveClass('border-b')
  })

  it('applies custom className', () => {
    render(<CardHeader className="custom">Header</CardHeader>)
    expect(screen.getByText('Header')).toHaveClass('custom')
  })
})

describe('CardTitle', () => {
  it('renders as h3 by default', () => {
    render(<CardTitle>Title</CardTitle>)
    const title = screen.getByRole('heading', { level: 3 })
    expect(title).toHaveTextContent('Title')
  })

  it('renders as specified heading level', () => {
    render(<CardTitle as="h2">Title</CardTitle>)
    const title = screen.getByRole('heading', { level: 2 })
    expect(title).toHaveTextContent('Title')
  })

  it('renders with icon', () => {
    render(<CardTitle withIcon={<span data-testid="icon">Icon</span>}>Title</CardTitle>)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('applies font styling', () => {
    render(<CardTitle data-testid="title">Title</CardTitle>)
    const wrapper = screen.getByTestId('title').parentElement
    expect(wrapper).toHaveClass('flex')
    expect(wrapper).toHaveClass('items-center')
  })
})

describe('CardDescription', () => {
  it('renders paragraph text', () => {
    render(<CardDescription>Description text</CardDescription>)
    expect(screen.getByText('Description text')).toBeInTheDocument()
  })

  it('applies secondary text styling', () => {
    render(<CardDescription data-testid="desc">Description</CardDescription>)
    expect(screen.getByTestId('desc')).toHaveClass('text-sm')
    expect(screen.getByTestId('desc')).toHaveClass('text-text-secondary')
  })
})

describe('CardFooter', () => {
  it('renders children', () => {
    render(<CardFooter>Footer content</CardFooter>)
    expect(screen.getByText('Footer content')).toBeInTheDocument()
  })

  it('applies border and spacing', () => {
    render(<CardFooter data-testid="footer">Footer</CardFooter>)
    const footer = screen.getByTestId('footer')
    expect(footer).toHaveClass('mt-6')
    expect(footer).toHaveClass('pt-4')
    expect(footer).toHaveClass('border-t')
  })

  it('applies flexbox for actions layout', () => {
    render(<CardFooter data-testid="footer">Footer</CardFooter>)
    const footer = screen.getByTestId('footer')
    expect(footer).toHaveClass('flex')
    expect(footer).toHaveClass('justify-end')
  })
})

// Integration test
describe('Card composition', () => {
  it('renders complete card structure', () => {
    render(
      <Card data-testid="card">
        <CardHeader withDivider>
          <CardTitle as="h2">Card Title</CardTitle>
          <CardDescription>Card description text</CardDescription>
        </CardHeader>
        <p>Card body content</p>
        <CardFooter>
          <button>Action</button>
        </CardFooter>
      </Card>
    )

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Card Title')
    expect(screen.getByText('Card description text')).toBeInTheDocument()
    expect(screen.getByText('Card body content')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
  })
})
