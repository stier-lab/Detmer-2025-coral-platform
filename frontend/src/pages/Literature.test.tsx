/**
 * Unit tests for Literature page helper functions
 * Focus on parseSummary function which handles complex text parsing
 */

import { describe, it, expect } from 'vitest';

const parseSummary = (id: string, text: string) => {
  const lines = text.split('\n');
  const sections: Record<string, string[]> = {};
  let currentKey: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const normalized = trimmed.toLowerCase();
    if (normalized.startsWith('citation')) {
      currentKey = 'citation';
      sections[currentKey] = [];
      continue;
    }
    if (normalized.startsWith('so what')) {
      currentKey = 'soWhat';
      sections[currentKey] = [];
      continue;
    }
    if (normalized.startsWith('tags')) {
      currentKey = 'tags';
      sections[currentKey] = [];
      continue;
    }
    if (normalized.startsWith('study context')) {
      currentKey = 'studyContext';
      sections[currentKey] = [];
      continue;
    }

    if (currentKey) {
      sections[currentKey].push(trimmed);
    }
  }

  const citationText = (sections.citation || []).join(' ').replace(/\s+/g, ' ').trim();
  const doiMatch = text.match(/DOI:\s*([^\s]+)/i);
  const doi = doiMatch ? doiMatch[1] : null;

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
    methods: '',
    keyResults: '',
    mechanisms: '',
    takeaways: '',
    limitations: '',
    anchorNumbers: '',
    tags,
    region,
  };
};

describe('parseSummary', () => {
  describe('Citation Parsing', () => {
    it('should extract year from citation', () => {
      const text = `Citation
Author, A.B. (2024). Paper Title. Journal Name.
DOI: 10.1234/test

So what (one sentence)
This is the abstract.`;

      const paper = parseSummary('test-2024', text);
      expect(paper.year).toBe(2024);
      expect(paper.authors).toBe('Author, A.B.');
    });

    it('should extract authors correctly', () => {
      const text = `Citation
Smith, J. & Jones, K. (2023). Study Title. Science.`;

      const paper = parseSummary('test-authors', text);
      expect(paper.authors).toBe('Smith, J. & Jones, K.');
      expect(paper.year).toBe(2023);
    });

    it('should handle missing year gracefully', () => {
      const text = `Citation
Author without year. Title. Journal.`;

      const paper = parseSummary('test-no-year', text);
      expect(paper.year).toBeNull();
      expect(paper.authors).not.toBe('Unknown');
    });
  });

  describe('DOI Extraction', () => {
    it('should extract DOI when present', () => {
      const text = `Citation
Author (2020). Title. Journal.
DOI: 10.1234/example`;

      const paper = parseSummary('test-doi', text);
      expect(paper.doi).toBe('10.1234/example');
    });

    it('should handle missing DOI gracefully', () => {
      const text = `Citation
Author (2020). Title. Journal.`;

      const paper = parseSummary('test-no-doi', text);
      expect(paper.doi).toBeNull();
    });

    it('should handle DOI with various formats', () => {
      const text = `Citation
Author (2021). Title. Journal.
DOI:10.1000/test123`;

      const paper = parseSummary('test-doi-no-space', text);
      expect(paper.doi).toBe('10.1000/test123');
    });
  });

  describe('Tag Extraction', () => {
    it('should extract tags correctly', () => {
      const text = `Tags
#coral #growth #survival`;

      const paper = parseSummary('test-tags', text);
      expect(paper.tags).toEqual(['coral', 'growth', 'survival']);
    });

    it('should handle tags with multiple tags per line', () => {
      const text = `Tags
#marine #ecosystem #restoration #conservation`;

      const paper = parseSummary('test-multiple-tags', text);
      expect(paper.tags).toHaveLength(4);
      expect(paper.tags).toContain('marine');
      expect(paper.tags).toContain('conservation');
    });

    it('should handle missing tags section', () => {
      const text = `Citation
Author (2020). Title. Journal.`;

      const paper = parseSummary('test-no-tags', text);
      expect(paper.tags).toEqual([]);
    });

    it('should filter out non-hashtag text', () => {
      const text = `Tags
#valid notvalid #alsovalid`;

      const paper = parseSummary('test-mixed-tags', text);
      expect(paper.tags).toEqual(['valid', 'alsovalid']);
    });
  });

  describe('Region Extraction', () => {
    it('should extract region from study context', () => {
      const text = `Study context
Region: Caribbean
Other details here.`;

      const paper = parseSummary('test-region', text);
      expect(paper.region).toBe('Caribbean');
    });

    it('should handle "Regions" plural', () => {
      const text = `Study context
Regions: Pacific Ocean
More context.`;

      const paper = parseSummary('test-regions-plural', text);
      expect(paper.region).toBe('Pacific Ocean');
    });

    it('should handle missing region', () => {
      const text = `Study context
No region specified here.`;

      const paper = parseSummary('test-no-region', text);
      expect(paper.region).toBe('');
    });
  });

  describe('Edge Cases', () => {
    it('should handle completely malformed citations', () => {
      const text = `Citation
Bad format without year or proper structure`;

      const paper = parseSummary('test-bad-format', text);
      expect(paper.year).toBeNull();
      expect(paper.authors).toBe('Bad format without year or proper structure');
    });

    it('should handle empty text', () => {
      const paper = parseSummary('test-empty', '');
      expect(paper.id).toBe('test-empty');
      expect(paper.tags).toEqual([]);
      expect(paper.year).toBeNull();
    });

    it('should handle text with only whitespace', () => {
      const paper = parseSummary('test-whitespace', '   \n   \n   ');
      expect(paper.id).toBe('test-whitespace');
      expect(paper.citation).toBe('');
    });

    it('should preserve paper ID', () => {
      const text = `Citation
Author (2024). Title. Journal.`;

      const paper = parseSummary('unique-id-123', text);
      expect(paper.id).toBe('unique-id-123');
    });
  });

  describe('Title and Journal Extraction', () => {
    it('should extract title from well-formatted citation', () => {
      const text = `Citation
Author (2024). This is the Paper Title. Journal of Science.`;

      const paper = parseSummary('test-title', text);
      expect(paper.title).toBe('This is the Paper Title');
      expect(paper.journal).toBe('Journal of Science.');
    });

    it('should use full citation as title when parsing fails', () => {
      const text = `Citation
Malformed citation without proper structure`;

      const paper = parseSummary('test-fallback-title', text);
      expect(paper.title).toBe('Malformed citation without proper structure');
    });
  });

  describe('Abstract/So What Extraction', () => {
    it('should extract "so what" section', () => {
      const text = `So what (one sentence)
This paper is important because it shows X.`;

      const paper = parseSummary('test-sowhat', text);
      expect(paper.soWhat).toBe('This paper is important because it shows X.');
    });

    it('should handle multi-line abstracts', () => {
      const text = `So what (one sentence)
First line of abstract.
Second line continues here.
Third line finishes.`;

      const paper = parseSummary('test-multiline', text);
      expect(paper.soWhat).toContain('First line');
      expect(paper.soWhat).toContain('Third line');
    });
  });
});

describe('Performance Tests', () => {
  it('should parse complex paper in reasonable time', () => {
    const complexText = `Citation
Smith, J., Jones, K., Brown, L., & Davis, M. (2024). A comprehensive study of coral reef restoration techniques in the Caribbean. Marine Ecology Progress Series, 123(4), 567-589.
DOI: 10.1234/meps.2024.123456

So what (one sentence)
This groundbreaking study examines restoration techniques.

Study context
Region: Caribbean
Species: Acropora cervicornis
Time period: 2020-2023

Tags
#coral #restoration #Caribbean #growth #survival #outplanting`;

    const startTime = performance.now();
    const paper = parseSummary('performance-test', complexText);
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(10); // Should parse in <10ms
    expect(paper.authors).toContain('Smith');
    expect(paper.tags).toHaveLength(6);
    expect(paper.region).toBe('Caribbean');
  });
});
