/**
 * Integration tests for Literature page
 * Tests user workflows and component interactions
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Literature } from './Literature';

// Mock fetch for literature files
global.fetch = vi.fn();

// Helper to render component with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

// Mock literature summary data
const mockPaperSummary = `Citation
Author, A.B. & Researcher, C.D. (2024). Test Paper on Coral Restoration. Marine Biology Journal, 45(2), 123-145.
DOI: 10.1234/test.2024

So what (one sentence)
This study demonstrates effective coral outplanting techniques in the Caribbean.

Study context
Region: Caribbean
Species: Acropora cervicornis
Methods: Field experiment with 200 fragments

Key results (numbers first)
- 85% survival rate at 12 months
- Growth rate of 3.5 cm/month
- Significant difference between fragment sizes (p < 0.01)

Restoration-relevant takeaways
Size matters: larger fragments (>10cm) show better survival.
Optimal outplanting season is spring-early summer.

Limitations / external validity
Limited to Caribbean species.
Single site study.

Tags
#coral #restoration #Caribbean #survival #growth`;

const mockPaperSummary2 = `Citation
Smith, J. (2023). Pacific Coral Growth Patterns. Ocean Science, 12(1), 56-78.
DOI: 10.5678/ocean.2023

So what (one sentence)
Analysis of coral growth rates across Pacific regions.

Study context
Region: Pacific
Species: Pocillopora damicornis

Tags
#coral #growth #Pacific`;

describe('Literature Page Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup successful fetch responses
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock requires type coercion for global.fetch
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('summary.txt')) {
        return Promise.resolve({
          ok: true,
          text: async () => url.includes('2024') ? mockPaperSummary : mockPaperSummary2,
        });
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  describe('Page Loading', () => {
    it('should display loading state initially', () => {
      renderWithRouter(<Literature />);
      expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
    });

    it('should load and display papers after fetch', async () => {
      renderWithRouter(<Literature />);

      await waitFor(() => {
        expect(screen.getByText(/Test Paper on Coral Restoration/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should display statistics dashboard after loading', async () => {
      renderWithRouter(<Literature />);

      await waitFor(() => {
        expect(screen.getByText(/Total Papers/i)).toBeInTheDocument();
        expect(screen.getByText(/Year Range/i)).toBeInTheDocument();
      });
    });

    it('should handle fetch errors gracefully', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock requires type coercion for global.fetch
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      renderWithRouter(<Literature />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should filter papers by search query', async () => {
      renderWithRouter(<Literature />);

      await waitFor(() => {
        expect(screen.getByText(/Test Paper on Coral Restoration/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByLabelText('Search publications');
      fireEvent.change(searchInput, { target: { value: 'Caribbean' } });

      // Wait for debounce
      await waitFor(
        () => {
          const results = screen.queryAllByText(/Caribbean/i);
          expect(results.length).toBeGreaterThan(0);
        },
        { timeout: 500 }
      );
    });

    it('should show "no results" when search matches nothing', async () => {
      renderWithRouter(<Literature />);

      await waitFor(() => {
        expect(screen.getByText(/Test Paper/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByLabelText('Search publications');
      fireEvent.change(searchInput, { target: { value: 'nonexistentterm' } });

      await waitFor(
        () => {
          expect(screen.getByText(/No papers found/i)).toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });

    it('should display loading indicator during search debounce', async () => {
      renderWithRouter(<Literature />);

      await waitFor(() => {
        expect(screen.getByText(/Test Paper/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByLabelText('Search publications');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Spinner should appear briefly
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeTruthy();
    });
  });

  describe('Filter Functionality', () => {
    it('should filter papers by region', async () => {
      renderWithRouter(<Literature />);

      await waitFor(() => {
        expect(screen.getByText(/Test Paper/i)).toBeInTheDocument();
      });

      const regionSelect = screen.getByRole('combobox', { name: /region/i });
      fireEvent.change(regionSelect, { target: { value: 'Caribbean' } });

      await waitFor(() => {
        // Should show Caribbean papers (header also contains "Caribbean")
        expect(screen.getAllByText(/Caribbean/i).length).toBeGreaterThan(0);
      });
    });

    it('should filter papers by tag click', async () => {
      renderWithRouter(<Literature />);

      await waitFor(() => {
        const tagButtons = screen.getAllByRole('button', { pressed: false });
        expect(tagButtons.length).toBeGreaterThan(0);
      });

      const coralTagButton = screen.getByRole('button', { name: /coral/i });
      fireEvent.click(coralTagButton);

      await waitFor(() => {
        expect(coralTagButton).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('should clear all filters when clear button is clicked', async () => {
      renderWithRouter(<Literature />);

      await waitFor(() => {
        expect(screen.getByText(/Test Paper/i)).toBeInTheDocument();
      });

      // Apply search filter
      const searchInput = screen.getByLabelText('Search publications');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        const clearButton = screen.getByRole('button', { name: /clear/i });
        expect(clearButton).toBeInTheDocument();
      });

      const clearButton = screen.getByRole('button', { name: /clear/i });
      fireEvent.click(clearButton);

      // Filters should be cleared
      expect(searchInput).toHaveValue('');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should focus search input when "/" key is pressed', async () => {
      renderWithRouter(<Literature />);

      await waitFor(() => {
        expect(screen.getByText(/Test Paper/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByLabelText('Search publications');

      // Simulate "/" key press
      fireEvent.keyDown(window, { key: '/' });

      await waitFor(() => {
        expect(document.activeElement).toBe(searchInput);
      });
    });

    it('should blur search input when Escape key is pressed', async () => {
      renderWithRouter(<Literature />);

      await waitFor(() => {
        expect(screen.getByText(/Test Paper/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByLabelText('Search publications');
      searchInput.focus();

      expect(document.activeElement).toBe(searchInput);

      fireEvent.keyDown(searchInput, { key: 'Escape' });

      await waitFor(() => {
        expect(document.activeElement).not.toBe(searchInput);
      });
    });
  });

  describe('Paper Card Interactions', () => {
    it('should expand paper card when "Show summary details" is clicked', async () => {
      renderWithRouter(<Literature />);

      await waitFor(() => {
        expect(screen.getByText(/Test Paper/i)).toBeInTheDocument();
      });

      const expandButtons = screen.getAllByRole('button', { name: /Show summary details/i });
      fireEvent.click(expandButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Key Results/i)).toBeVisible();
        expect(screen.getByText(/Restoration Takeaways/i)).toBeVisible();
      });
    });

    it('should collapse paper card when "Show less" is clicked', async () => {
      renderWithRouter(<Literature />);

      await waitFor(() => {
        expect(screen.getByText(/Test Paper/i)).toBeInTheDocument();
      });

      // Expand first
      const expandButtons = screen.getAllByRole('button', { name: /Show summary details/i });
      fireEvent.click(expandButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Key Results/i)).toBeVisible();
      });

      // Then collapse
      const collapseButton = screen.getByRole('button', { name: /Show less/i });
      fireEvent.click(collapseButton);

      await waitFor(() => {
        expect(screen.queryByText(/Key Results/i)).toBeNull();
      });
    });

    it('should move focus to expanded content when card is expanded', async () => {
      renderWithRouter(<Literature />);

      await waitFor(() => {
        expect(screen.getByText(/Test Paper/i)).toBeInTheDocument();
      });

      const expandButtons = screen.getAllByRole('button', { name: /Show summary details/i });
      fireEvent.click(expandButtons[0]);

      await waitFor(() => {
        const expandedRegion = screen.getByRole('region', { name: /Paper details/i });
        expect(document.activeElement).toBe(expandedRegion);
      }, { timeout: 200 });
    });
  });

  describe('Sorting', () => {
    it('should sort papers by year descending (default)', async () => {
      renderWithRouter(<Literature />);

      await waitFor(() => {
        const sortSelect = screen.getByRole('combobox', { name: /sort/i });
        expect(sortSelect).toHaveValue('year-desc');
      });
    });

    it('should sort papers by year ascending when selected', async () => {
      renderWithRouter(<Literature />);

      await waitFor(() => {
        expect(screen.getByText(/Test Paper/i)).toBeInTheDocument();
      });

      const sortSelect = screen.getByRole('combobox', { name: /sort/i });
      fireEvent.change(sortSelect, { target: { value: 'year-asc' } });

      expect(sortSelect).toHaveValue('year-asc');
    });
  });

  describe('Pagination', () => {
    it('should show "Load More" button when more papers exist', async () => {
      // 17 summary files are fetched, ITEMS_PER_PAGE=10, so Load More should appear
      renderWithRouter(<Literature />);

      await waitFor(() => {
        const loadMoreButton = screen.getByRole('button', { name: /Load More/i });
        expect(loadMoreButton).toBeInTheDocument();
      });
    });

    it('should display results count', async () => {
      renderWithRouter(<Literature />);

      await waitFor(() => {
        expect(screen.getByText(/Showing.*of.*papers/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have ARIA live region for results', async () => {
      renderWithRouter(<Literature />);

      await waitFor(() => {
        const liveRegion = document.querySelector('[aria-live="polite"]');
        expect(liveRegion).toBeInTheDocument();
      });
    });

    it('should have aria-pressed on tag filter buttons', async () => {
      renderWithRouter(<Literature />);

      await waitFor(() => {
        const tagButtons = screen.getAllByRole('button', { pressed: false });
        expect(tagButtons.length).toBeGreaterThan(0);
      });
    });

    it('should have proper roles on expanded content', async () => {
      renderWithRouter(<Literature />);

      await waitFor(() => {
        expect(screen.getByText(/Test Paper/i)).toBeInTheDocument();
      });

      const expandButtons = screen.getAllByRole('button', { name: /Show summary details/i });
      fireEvent.click(expandButtons[0]);

      await waitFor(() => {
        const region = screen.getByRole('region', { name: /Paper details/i });
        expect(region).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should render without errors on mobile viewport', async () => {
      // Set mobile viewport
      global.innerWidth = 375;
      global.innerHeight = 667;

      renderWithRouter(<Literature />);

      await waitFor(() => {
        expect(screen.getByText(/Literature Database/i)).toBeInTheDocument();
      });
    });
  });
});
