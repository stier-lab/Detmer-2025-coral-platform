
import { useState, useMemo, useEffect, useRef } from 'react';
import {
  BookOpen,
  Search,
  MapPin,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Database,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';

interface SummaryPaper {
  id: string;
  citation: string;
  authors: string;
  year: number | null;
  title: string;
  journal: string;
  doi: string | null;
  soWhat: string;
  studyContext: string;
  methods: string;
  keyResults: string;
  mechanisms: string;
  takeaways: string;
  limitations: string;
  anchorNumbers: string;
  tags: string[];
  region: string;
}

const SUMMARY_FILES = [
  'BrucknerBruckner2001_summary.txt',
  'Chamberland2015_summary.txt',
  'Forrester2011_summary.txt',
  'Forrester2013_summary.txt',
  'GarrisonWard2008_summary.txt',
  'Kuffner2020_summary.txt',
  'Maurer2022_summary.txt',
  'MendozaQuiroz2023_summary.txt',
  'OrtizProsper2005_summary.txt',
  'Papke2021_summary.txt',
  'Pausch_etal_2018_summary.txt',
  'Rosales_etal_2024_summary.txt',
  'Roth_etal_2013_summary.txt',
  'Schutter_etal_2023_summary.txt',
  'Vardi_2011_dissertation_summary.txt',
  'Vardi_etal_2012_summary.txt',
  'Williams_Miller_2010_summary.txt',
];

const ITEMS_PER_PAGE = 10;
const DEBOUNCE_DELAY_MS = 200;
const TAG_DISPLAY_LIMIT = 12;
const PREVIEW_TEXT_MAX_LENGTH = 350;
const HEADER_HEIGHT = 64; // Based on Header component
const SCROLL_THRESHOLD = HEADER_HEIGHT + 16; // Header + spacing
const SEARCH_INPUT_MAX_LENGTH = 200;

/**
 * Custom hook for debouncing a value with loading state indicator
 * Useful for search inputs to reduce unnecessary re-renders and API calls
 * Borrowed from Ocean Recovers PublicationList component
 *
 * @template T - Type of the value being debounced
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds before updating the debounced value
 * @returns Object containing the debounced value and debouncing status
 *
 * @example
 * const { debouncedValue, isDebouncing } = useDebounce(searchQuery, 300);
 */
function useDebounce<T>(value: T, delay: number): { debouncedValue: T; isDebouncing: boolean } {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isDebouncing, setIsDebouncing] = useState(false);

  useEffect(() => {
    if (value !== debouncedValue) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional synchronous state update for debounce indicator
      setIsDebouncing(true);
    }
    const handler = setTimeout(() => {
      setDebouncedValue(value);
      setIsDebouncing(false);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay, debouncedValue]);

  return { debouncedValue, isDebouncing };
}

const SECTION_MAP: Record<string, keyof SummaryPaper> = {
  'citation': 'citation',
  'so what (one sentence)': 'soWhat',
  'study context': 'studyContext',
  'methods (inference-relevant only)': 'methods',
  'key results (numbers first)': 'keyResults',
  'mechanisms / drivers': 'mechanisms',
  'restoration-relevant takeaways': 'takeaways',
  'limitations / external validity': 'limitations',
  'anchor numbers': 'anchorNumbers',
  'anchor numbers & quotable facts': 'anchorNumbers',
  'tags': 'tags',
};

/**
 * Detects which section a line of text belongs to in a literature summary file
 * @param line - The line of text to analyze
 * @returns The section key or null if not a section header
 */
const detectSection = (line: string): keyof SummaryPaper | null => {
  const normalized = line.trim().toLowerCase();
  if (SECTION_MAP[normalized]) return SECTION_MAP[normalized];
  if (normalized.startsWith('citation')) return 'citation';
  if (normalized.startsWith('abstract')) return 'soWhat';
  if (normalized.startsWith('study context')) return 'studyContext';
  if (normalized.startsWith('methods')) return 'methods';
  if (normalized.startsWith('key results') || normalized.startsWith('key findings')) return 'keyResults';
  if (normalized.startsWith('mechanisms')) return 'mechanisms';
  if (normalized.startsWith('restoration-relevant takeaways')) return 'takeaways';
  if (normalized.startsWith('limitations')) return 'limitations';
  if (normalized.startsWith('anchor numbers')) return 'anchorNumbers';
  if (normalized.startsWith('tags')) return 'tags';
  return null;
};

/**
 * Parses a literature summary text file into a structured SummaryPaper object
 * Extracts citation information, metadata, and all summary sections
 * @param id - Unique identifier for the paper (usually filename without extension)
 * @param text - Raw text content of the summary file
 * @returns Structured paper object with all parsed fields
 */
const parseSummary = (id: string, text: string): SummaryPaper => {
  const lines = text.split('\n');
  const sections: Record<string, string[]> = {};
  let currentKey: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentKey) {
        sections[currentKey].push('');
      }
      continue;
    }

    const detected = detectSection(trimmed);
    if (detected) {
      currentKey = detected;
      sections[currentKey] = [];
      continue;
    }

    if (currentKey) {
      sections[currentKey].push(trimmed);
    }
  }

  let citationText = (sections.citation || []).join(' ').replace(/\s+/g, ' ').trim();

  // Extract DOI - handle both "DOI: xxx" format and "https://doi.org/xxx" URL format
  let doi: string | null = null;
  const doiPrefixMatch = text.match(/DOI:\s*([^\s]+)/i);
  const doiUrlMatch = text.match(/https?:\/\/doi\.org\/([^\s]+)/i);

  if (doiPrefixMatch) {
    doi = doiPrefixMatch[1];
    // Remove DOI from citation text
    citationText = citationText
      .replace(`DOI: ${doi}`, '')
      .replace(`DOI:${doi}`, '')
      .trim();
  } else if (doiUrlMatch) {
    doi = doiUrlMatch[1];
    // Remove DOI URL from citation text
    citationText = citationText
      .replace(doiUrlMatch[0], '')
      .trim();
  }

  const yearMatch = citationText.match(/\((\d{4})\)/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : null;
  const authors = citationText.split('(')[0]?.trim().replace(/\s+\.$/, '') || 'Unknown';

  const titleMatch = citationText.match(/\)\.\s*([^.]+)\./);
  const title = titleMatch ? titleMatch[1].trim() : citationText || 'Untitled Paper';
  const journal = titleMatch
    ? citationText.slice((titleMatch.index || 0) + titleMatch[0].length).trim()
    : '';

  const studyContext = (sections.studyContext || []).join('\n').trim();
  const regionLine = studyContext
    .split('\n')
    .find(line => /^Regions?:/i.test(line));
  const region = regionLine
    ? regionLine.replace(/^Regions?:\s*/i, '').trim()
    : '';

  const tagsRaw = sections.tags ? sections.tags.join(' ') : '';
  const tags = tagsRaw
    .split(/\s+/)
    .filter(token => token.startsWith('#'))
    .map(tag => tag.replace('#', ''));

  return {
    id,
    citation: citationText,
    authors,
    year,
    title,
    journal,
    doi,
    soWhat: (sections.soWhat || []).join('\n').trim(),
    studyContext,
    methods: (sections.methods || []).join('\n').trim(),
    keyResults: (sections.keyResults || []).join('\n').trim(),
    mechanisms: (sections.mechanisms || []).join('\n').trim(),
    takeaways: (sections.takeaways || []).join('\n').trim(),
    limitations: (sections.limitations || []).join('\n').trim(),
    anchorNumbers: (sections.anchorNumbers || []).join('\n').trim(),
    tags,
    region,
  };
};

/**
 * Individual paper card component with expand/collapse functionality
 * Displays paper metadata, preview, and full summary details
 * @param paper - The paper data to display
 * @param isExpanded - Whether the card is currently expanded
 * @param onToggle - Callback to toggle expansion state
 */
function PaperCard({
  paper,
  isExpanded,
  onToggle,
}: {
  paper: SummaryPaper;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const tagList = paper.tags || [];
  const getPreviewText = (text: string, fallback: string) => {
    if (text && text.length <= PREVIEW_TEXT_MAX_LENGTH) return text;
    if (fallback) return fallback;
    if (!text) return '';
    const firstSentence = text.split(/(?<=\.)\s/)[0];
    return firstSentence.length > PREVIEW_TEXT_MAX_LENGTH
      ? `${text.slice(0, PREVIEW_TEXT_MAX_LENGTH).trim()}...`
      : firstSentence;
  };
  const previewText = getPreviewText(paper.soWhat, paper.keyResults);

  return (
    <article
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all hover:shadow-md"
      data-paper-id={paper.id}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 leading-snug">
              {paper.title}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {paper.authors}
            </p>
            {paper.journal && (
              <p className="mt-1 text-xs text-gray-500">
                {paper.journal}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {paper.year && (
              <span className="px-2.5 py-1 bg-ocean-deep/10 text-ocean-deep text-sm font-medium rounded-full">
                {paper.year}
              </span>
            )}
          </div>
        </div>

        {/* Metadata badges */}
        <div className="mt-4 flex flex-wrap gap-2">
          {paper.region && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-reef-green/10 text-reef-green text-xs font-medium rounded-full">
              <MapPin className="w-3 h-3" />
              {paper.region}
            </span>
          )}
          {paper.doi && (
            <a
              href={`https://doi.org/${paper.doi}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full hover:bg-gray-200"
            >
              <ExternalLink className="w-3 h-3" />
              DOI available
            </a>
          )}
          {tagList.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-bioluminescent/10 text-ocean-deep text-xs font-medium rounded-full"
            >
              <Database className="w-3 h-3" />
              {tag}
            </span>
          ))}
        </div>

        {/* So what preview */}
        {previewText && (
          <div className="mt-4">
            <p className={`text-sm text-gray-600 leading-relaxed ${!isExpanded ? 'line-clamp-3' : ''}`}>
              {previewText}
            </p>
          </div>
        )}

        {/* Expanded content */}
        {isExpanded && (
          <div
            className="mt-4 space-y-4"
            role="region"
            aria-label="Paper details"
            tabIndex={-1}
          >
            {paper.keyResults && (
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Key Results
                </h4>
                <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-line">
                  {paper.keyResults}
                </p>
              </div>
            )}

            {paper.takeaways && (
              <div className="p-4 bg-reef-green/10 rounded-lg border border-reef-green/20">
                <h4 className="text-sm font-semibold text-reef-green mb-2">Restoration Takeaways</h4>
                <p className="text-sm text-reef-green/90 leading-relaxed whitespace-pre-line">
                  {paper.takeaways}
                </p>
              </div>
            )}

            {paper.limitations && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Limitations</h4>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {paper.limitations}
                </p>
              </div>
            )}

            {paper.studyContext && (
              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Study Context</h4>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {paper.studyContext}
                </p>
              </div>
            )}

            {paper.methods && (
              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Methods (Inference-Relevant)</h4>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {paper.methods}
                </p>
              </div>
            )}

            {paper.anchorNumbers && (
              <div className="p-4 bg-sand-warm rounded-lg border border-border-medium">
                <h4 className="text-sm font-semibold text-ocean-deep mb-2">Anchor Numbers</h4>
                <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                  {paper.anchorNumbers}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Expand/collapse toggle */}
        <button
          onClick={onToggle}
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-ocean-light hover:text-ocean-deep transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show summary details
            </>
          )}
        </button>
      </div>
    </article>
  );
}

export function Literature() {
  const [papers, setPapers] = useState<SummaryPaper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'year-desc' | 'year-asc'>('year-desc');
  const [expandedPapers, setExpandedPapers] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [isScrolled, setIsScrolled] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);

  // Debounced search for performance
  const { debouncedValue: debouncedSearch, isDebouncing: isSearching } = useDebounce(
    searchQuery,
    DEBOUNCE_DELAY_MS
  );

  // Load summaries
  useEffect(() => {
    let isMounted = true;
    const loadSummaries = async () => {
      try {
        const results = await Promise.all(
          SUMMARY_FILES.map(async (file) => {
            const res = await fetch(`/literature/${file}`);
            if (!res.ok) {
              throw new Error(`Failed to load ${file}`);
            }
            const text = await res.text();
            const id = file.replace(/_summary\.txt$/i, '');
            return parseSummary(id, text);
          })
        );
        if (isMounted) {
          const sorted = results.sort((a, b) => (b.year || 0) - (a.year || 0));
          setPapers(sorted);
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage =
            err instanceof Error
              ? `Failed to load literature summaries: ${err.message}. Please check your connection or try refreshing the page.`
              : 'Failed to load literature summaries. Please try refreshing the page.';
          setError(errorMessage);
          console.error('Literature load error:', err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSummaries();
    return () => {
      isMounted = false;
    };
  }, []);

  // Keyboard shortcuts: "/" to focus search, "Esc" to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Track scroll for sticky bar shadow
  useEffect(() => {
    const handleScroll = () => {
      if (filterBarRef.current) {
        const rect = filterBarRef.current.getBoundingClientRect();
        setIsScrolled(rect.top <= SCROLL_THRESHOLD);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Compute available regions and tags
  const regions = useMemo(() => {
    const regionSet = new Set<string>();
    papers.forEach(p => {
      if (p.region) regionSet.add(p.region);
    });
    return Array.from(regionSet).sort();
  }, [papers]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    papers.forEach(p => {
      p.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [papers]);

  // Count papers per tag - optimized to O(n) from O(n×m)
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    papers.forEach(paper => {
      paper.tags.forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return counts;
  }, [papers]);

  // Filter and sort papers
  const filteredPapers = useMemo(() => {
    const query = debouncedSearch.toLowerCase();
    const result = papers.filter(paper => {
      const matchesSearch = !query ||
        paper.title.toLowerCase().includes(query) ||
        paper.authors.toLowerCase().includes(query) ||
        paper.soWhat.toLowerCase().includes(query) ||
        paper.keyResults.toLowerCase().includes(query) ||
        paper.tags.some(tag => tag.toLowerCase().includes(query));

      const matchesRegion = selectedRegion === 'all' || paper.region === selectedRegion;

      const matchesTags = selectedTags.length === 0 ||
        selectedTags.some(tag => paper.tags.includes(tag));

      return matchesSearch && matchesRegion && matchesTags;
    });

    // Sort papers
    result.sort((a, b) => {
      if (sortBy === 'year-desc') return (b.year || 0) - (a.year || 0);
      if (sortBy === 'year-asc') return (a.year || 0) - (b.year || 0);
      return 0;
    });

    return result;
  }, [papers, debouncedSearch, selectedRegion, selectedTags, sortBy]);

  // Paginated papers
  const visiblePapers = useMemo(() => {
    return filteredPapers.slice(0, visibleCount);
  }, [filteredPapers, visibleCount]);

  const hasMore = visibleCount < filteredPapers.length;

  // Helper functions
  const toggleExpanded = (paperId: string) => {
    setExpandedPapers(prev => {
      const next = new Set(prev);
      const isExpanding = !next.has(paperId);

      if (next.has(paperId)) {
        next.delete(paperId);
      } else {
        next.add(paperId);
      }

      // Move focus to expanded content for screen readers
      if (isExpanding) {
        setTimeout(() => {
          const expandedContent = document.querySelector(
            `[data-paper-id="${paperId}"] [role="region"]`
          );
          (expandedContent as HTMLElement)?.focus();
        }, 100);
      }

      return next;
    });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
    setVisibleCount(ITEMS_PER_PAGE);
  };

  const clearFilters = () => {
    setSelectedRegion('all');
    setSelectedTags([]);
    setSearchQuery('');
    setVisibleCount(ITEMS_PER_PAGE);
  };

  const loadMore = () => {
    setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, filteredPapers.length));
  };

  const showAll = () => {
    setVisibleCount(filteredPapers.length);
  };

  const hasFilters = selectedRegion !== 'all' || selectedTags.length > 0 || debouncedSearch;
  const activeFilterCount = (selectedRegion !== 'all' ? 1 : 0) + selectedTags.length + (searchQuery ? 1 : 0);

  // Calculate statistics
  const stats = useMemo(() => {
    const years = papers.map(p => p.year).filter((y): y is number => y !== null);
    const minYear = years.length > 0 ? Math.min(...years) : null;
    const maxYear = years.length > 0 ? Math.max(...years) : null;
    const yearRange = minYear && maxYear ? `${minYear}–${maxYear}` : 'N/A';

    return {
      total: papers.length,
      yearRange,
      regions: regions.length,
      tags: allTags.length,
    };
  }, [papers, regions, allTags]);

  return (
    <div className="min-h-screen bg-sand-light flex flex-col">
      <Header />

      {/* Page Header with Statistics */}
      <div className="bg-white border-b border-border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-semibold text-ocean-deep flex items-center gap-3">
                  <BookOpen className="w-8 h-8 text-coral-warm" />
                  Literature Database
                </h1>
                <p className="mt-2 text-text-secondary max-w-2xl">
                  Practitioner-friendly summaries with search, filtering, and full citation details.
                  Press <kbd className="px-2 py-0.5 text-xs bg-gray-100 border border-gray-300 rounded">/</kbd> to search.
                </p>
              </div>
            </div>

            {/* Statistics Dashboard */}
            {!isLoading && papers.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-ocean-deep/5 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-ocean-deep mb-1">
                    <FileText className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Total Papers</span>
                  </div>
                  <div className="text-2xl font-semibold text-ocean-deep">{stats.total}</div>
                </div>
                <div className="bg-reef-green/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-reef-green mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Year Range</span>
                  </div>
                  <div className="text-2xl font-semibold text-reef-green">{stats.yearRange}</div>
                </div>
                <div className="bg-coral-warm/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-coral-warm mb-1">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Regions</span>
                  </div>
                  <div className="text-2xl font-semibold text-coral-warm">{stats.regions}</div>
                </div>
                <div className="bg-bioluminescent/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-ocean-deep mb-1">
                    <Database className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Topics</span>
                  </div>
                  <div className="text-2xl font-semibold text-ocean-deep">{stats.tags}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Filters Bar */}
      <div
        ref={filterBarRef}
        className={`bg-white border-b border-border-light sticky top-16 z-20 transition-shadow duration-200 ${
          isScrolled ? 'shadow-lg' : ''
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Search + Controls */}
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by title, author, tag, or summary... (press /)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                maxLength={SEARCH_INPUT_MAX_LENGTH}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-light/50 focus:border-ocean-light text-sm"
                aria-label="Search publications"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-ocean-deep"></div>
                </div>
              )}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'year-desc' | 'year-asc')}
                aria-label="Sort by"
                className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-light/50 focus:border-ocean-light text-sm bg-white"
              >
                <option value="year-desc">Newest First</option>
                <option value="year-asc">Oldest First</option>
              </select>
            </div>

            {/* Region filter */}
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gray-400" />
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                aria-label="Filter by region"
                className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-light/50 focus:border-ocean-light text-sm bg-white"
              >
                <option value="all">All Regions</option>
                {regions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>

            {/* Clear filters */}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear {activeFilterCount > 0 && `(${activeFilterCount})`}
              </button>
            )}
          </div>

          {/* Tag filters */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-medium text-gray-500 self-center">Topics:</span>
              {allTags.slice(0, TAG_DISPLAY_LIMIT).map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  aria-pressed={selectedTags.includes(tag)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-ocean-deep text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Database className="w-3 h-3" />
                  {tag}
                  <span className="text-xs opacity-75">({tagCounts[tag]})</span>
                </button>
              ))}
              {allTags.length > TAG_DISPLAY_LIMIT && (
                <span className="text-xs text-gray-500 self-center">
                  +{allTags.length - TAG_DISPLAY_LIMIT} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20" role="status" aria-label="Loading papers">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ocean-deep"></div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-600">{error}</p>
          </div>
        ) : filteredPapers.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {hasFilters ? 'No papers found matching your filters.' : 'No papers available.'}
            </p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 text-ocean-light hover:text-ocean-deep underline text-sm"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Results count */}
            <div
              className="mb-6 flex items-center justify-between"
              aria-live="polite"
              aria-atomic="true"
            >
              <div className="text-sm text-gray-600">
                Showing <span className="font-medium">{visiblePapers.length}</span> of{' '}
                <span className="font-medium">{filteredPapers.length}</span> papers
                {selectedRegion !== 'all' && ` in ${selectedRegion}`}
                {debouncedSearch && ` matching "${debouncedSearch}"`}
                {selectedTags.length > 0 && ` tagged with ${selectedTags.join(', ')}`}
              </div>
              {filteredPapers.length > ITEMS_PER_PAGE && (
                <div className="text-sm text-gray-500">
                  {Math.ceil(filteredPapers.length / ITEMS_PER_PAGE)} pages
                </div>
              )}
            </div>

            {/* Papers grid */}
            <div className="grid gap-6">
              {visiblePapers.map(paper => (
                <PaperCard
                  key={paper.id}
                  paper={paper}
                  isExpanded={expandedPapers.has(paper.id)}
                  onToggle={() => toggleExpanded(paper.id)}
                />
              ))}
            </div>

            {/* Pagination controls */}
            {hasMore && (
              <div className="mt-8 flex flex-col items-center gap-4">
                <div className="flex gap-3">
                  <button
                    onClick={loadMore}
                    className="px-6 py-3 bg-ocean-light text-white rounded-lg hover:bg-ocean-deep transition-colors font-medium"
                  >
                    Load More ({Math.min(ITEMS_PER_PAGE, filteredPapers.length - visibleCount)} more)
                  </button>
                  <button
                    onClick={showAll}
                    className="px-6 py-3 border border-ocean-light text-ocean-light rounded-lg hover:bg-ocean-light/10 transition-colors font-medium"
                  >
                    Show All ({filteredPapers.length - visibleCount} remaining)
                  </button>
                </div>
                <div className="text-xs text-gray-500">
                  Loaded {visibleCount} of {filteredPapers.length}
                </div>
              </div>
            )}
          </>
        )}

        {/* Data attribution */}
        <div className="mt-12 p-6 bg-sand-warm rounded-xl border border-border-medium">
          <h3 className="text-sm font-semibold text-ocean-deep mb-2">About These Summaries</h3>
          <p className="text-sm text-text-secondary">
            Summaries are taken from curated text notes in the repository&apos;s literature folder.
            Key findings may be incomplete — always consult original publications for detailed methodology and results.
            If you use data from these papers, please cite both this database and the original source.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Literature;
