import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SimpleLayout } from '../components/layout';
import { Card, Button } from '../components/common';
import { useFilterStore } from '../stores/filterStore';
import { api, showErrorToast } from '../utils/api';
import { trackEvent } from '../utils/analytics';
import { Copy, Check, ChevronDown, FileText, HelpCircle } from 'lucide-react';

type ExportFormat = 'csv' | 'json';
type DataType = 'survival' | 'growth' | 'sites' | 'studies' | 'all';

// Map frontend data type selections to backend dataset parameter values
// Note: backend export.R only supports: survival_individual, survival_summary,
// growth_individual, growth_summary, fragmentation, lab_survival.
// Sites/studies/all don't have dedicated export datasets yet — default to survival.
const DATASET_MAP: Record<DataType, string> = {
  survival: 'survival_individual',
  growth: 'growth_individual',
  sites: 'survival_individual',
  studies: 'survival_summary',
  all: 'survival_individual',
};

// Column descriptions for each data type
const COLUMN_DESCRIPTIONS: Record<DataType, { name: string; description: string }[]> = {
  survival: [
    { name: 'colony_id', description: 'Unique identifier for each colony' },
    { name: 'size_cm2', description: 'Planar tissue area in cm²' },
    { name: 'size_class', description: 'Size class (SC1-SC5)' },
    { name: 'survived', description: 'Binary: 1 = survived, 0 = died' },
    { name: 'year', description: 'Year of observation' },
    { name: 'region', description: 'Geographic region' },
    { name: 'study', description: 'Source study identifier' },
    { name: 'origin', description: 'Natural colony or restoration fragment' },
  ],
  growth: [
    { name: 'colony_id', description: 'Unique identifier for each colony' },
    { name: 'initial_size_cm2', description: 'Starting planar area in cm²' },
    { name: 'final_size_cm2', description: 'Ending planar area in cm²' },
    { name: 'agr_cm2_yr', description: 'Absolute growth rate (cm²/year)' },
    { name: 'rgr', description: 'Relative growth rate (proportion/year)' },
    { name: 'size_class', description: 'Initial size class (SC1-SC5)' },
    { name: 'interval_days', description: 'Days between measurements' },
    { name: 'year', description: 'Year of initial measurement' },
  ],
  sites: [
    { name: 'site_id', description: 'Unique site identifier' },
    { name: 'lat', description: 'Latitude (decimal degrees)' },
    { name: 'lon', description: 'Longitude (decimal degrees)' },
    { name: 'region', description: 'Geographic region' },
    { name: 'n_observations', description: 'Total observations at site' },
    { name: 'mean_survival', description: 'Average survival rate' },
    { name: 'mean_growth', description: 'Average growth rate' },
  ],
  studies: [
    { name: 'study_id', description: 'Unique study identifier' },
    { name: 'authors', description: 'Author names' },
    { name: 'year', description: 'Publication year' },
    { name: 'title', description: 'Publication title' },
    { name: 'journal', description: 'Journal or source' },
    { name: 'n_colonies', description: 'Number of colonies studied' },
    { name: 'regions', description: 'Regions covered' },
  ],
  all: [
    { name: 'Multiple files', description: 'ZIP archive containing all data tables with full column descriptions in README.txt' },
  ],
};

interface DownloadOption {
  id: DataType;
  label: string;
  description: string;
  estimatedRows: number;
}

const DOWNLOAD_OPTIONS: DownloadOption[] = [
  {
    id: 'survival',
    label: 'Survival Data',
    description: 'Individual colony survival records with size, date, and fate',
    estimatedRows: 5000,
  },
  {
    id: 'growth',
    label: 'Growth Data',
    description: 'Annual growth measurements and size transitions',
    estimatedRows: 4000,
  },
  {
    id: 'sites',
    label: 'Site Metadata',
    description: 'Location coordinates, environmental data, and site summaries',
    estimatedRows: 150,
  },
  {
    id: 'studies',
    label: 'Study Information',
    description: 'Citation details, methods, and study-level statistics',
    estimatedRows: 25,
  },
  {
    id: 'all',
    label: 'Complete Dataset',
    description: 'All data tables in a single download (ZIP archive)',
    estimatedRows: 10000,
  },
];

export function Download() {
  const [selectedData, setSelectedData] = useState<DataType>('survival');
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [includeFilters, setIncludeFilters] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  const { filters, hasActiveFilters } = useFilterStore();

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const params = includeFilters ? filters : {};
      const response = await api.get(`/export/${format}`, { params: { dataset: DATASET_MAP[selectedData], ...params } });

      trackEvent('data_download', {
        dataType: selectedData,
        format,
        includeFilters,
      });

      // Create blob and download — response is the data itself (interceptor already unwraps)
      const content = typeof response === 'string' ? response : JSON.stringify(response, null, 2);
      const blob = new Blob([content], {
        type: format === 'csv' ? 'text/csv' : 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rrse_coral_${selectedData}_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      showErrorToast('Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const selectedOption = DOWNLOAD_OPTIONS.find((o) => o.id === selectedData);

  return (
    <SimpleLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-ocean-deep mb-2">
            Download Data
          </h1>
          <p className="text-text-secondary">
            Export data for your own analyses. All downloads include metadata
            and are citable using our DOI.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Options */}
          <div className="lg:col-span-2 space-y-6">
            {/* Data Selection */}
            <Card>
              <h2 className="font-semibold text-ocean-deep mb-4">
                Select Data Type
              </h2>
              <div className="space-y-3">
                {DOWNLOAD_OPTIONS.map((option) => (
                  <label
                    key={option.id}
                    className={`
                      flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer
                      transition-colors
                      ${
                        selectedData === option.id
                          ? 'border-ocean-mid bg-ocean-light/10'
                          : 'border-border-light hover:border-ocean-light'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="dataType"
                      value={option.id}
                      checked={selectedData === option.id}
                      onChange={() => setSelectedData(option.id)}
                      className="mt-1 w-4 h-4 text-ocean-mid focus:ring-ocean-mid"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-text-primary">
                          {option.label}
                        </span>
                        <span className="text-xs text-text-muted font-mono">
                          ~{option.estimatedRows.toLocaleString()} rows
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary mt-1">
                        {option.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </Card>

            {/* Format Selection */}
            <Card>
              <h2 className="font-semibold text-ocean-deep mb-4">
                Export Format
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <label
                  className={`
                    flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer
                    transition-colors
                    ${
                      format === 'csv'
                        ? 'border-ocean-mid bg-ocean-light/10'
                        : 'border-border-light hover:border-ocean-light'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="format"
                    value="csv"
                    checked={format === 'csv'}
                    onChange={() => setFormat('csv')}
                    className="w-4 h-4 text-ocean-mid focus:ring-ocean-mid"
                  />
                  <div>
                    <span className="font-medium text-text-primary">CSV</span>
                    <p className="text-xs text-text-secondary">
                      For Excel, R, Python
                    </p>
                  </div>
                </label>
                <label
                  className={`
                    flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer
                    transition-colors
                    ${
                      format === 'json'
                        ? 'border-ocean-mid bg-ocean-light/10'
                        : 'border-border-light hover:border-ocean-light'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="format"
                    value="json"
                    checked={format === 'json'}
                    onChange={() => setFormat('json')}
                    className="w-4 h-4 text-ocean-mid focus:ring-ocean-mid"
                  />
                  <div>
                    <span className="font-medium text-text-primary">JSON</span>
                    <p className="text-xs text-text-secondary">
                      For web applications
                    </p>
                  </div>
                </label>
              </div>
            </Card>

            {/* Filter Options */}
            {hasActiveFilters() && (
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-ocean-deep">
                      Apply Current Filters
                    </h2>
                    <p className="text-sm text-text-secondary mt-1">
                      Export only the filtered subset of data
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeFilters}
                      onChange={(e) => setIncludeFilters(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ocean-light/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ocean-mid" />
                  </label>
                </div>
              </Card>
            )}
          </div>

          {/* Right: Summary & Actions */}
          <div className="space-y-6">
            <Card className="sticky top-24">
              <h2 className="font-semibold text-ocean-deep mb-4">
                Download Summary
              </h2>

              <div className="space-y-3 text-sm mb-6">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Data type:</span>
                  <span className="font-medium">{selectedOption?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Format:</span>
                  <span className="font-mono uppercase">{format}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Est. rows:</span>
                  <span className="font-mono">
                    ~{selectedOption?.estimatedRows.toLocaleString()}
                  </span>
                </div>
                {hasActiveFilters() && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Filters:</span>
                    <span className={includeFilters ? 'text-reef-green' : 'text-text-muted'}>
                      {includeFilters ? 'Applied' : 'Ignored'}
                    </span>
                  </div>
                )}
              </div>

              <Button
                variant="primary"
                className="w-full"
                onClick={handleDownload}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Preparing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download {format.toUpperCase()}
                  </span>
                )}
              </Button>

              <p className="text-xs text-text-muted mt-4 text-center">
                By downloading, you agree to cite this dataset appropriately.
              </p>
            </Card>

            <Card className="border-amber-200 bg-amber-50">
              <h3 className="font-semibold text-amber-800 mb-2">Important caveats</h3>
              <ul className="text-sm text-amber-900/80 space-y-1">
                <li>- 78% of survival data come from Florida Keys monitoring (NOAA)</li>
                <li>- Fragment and natural colony data are confounded with size</li>
                <li>- Size explains only a small fraction of survival variance</li>
                <li>- Pooling across studies can be misleading</li>
              </ul>
            </Card>

            {/* Citation */}
            <CitationCard />

            {/* Column Descriptions */}
            <ColumnDescriptionsCard dataType={selectedData} />
          </div>
        </div>
      </div>
    </SimpleLayout>
  );
}

// Citation card with plain text and BibTeX options
function CitationCard() {
  const [copied, setCopied] = useState<'plain' | 'bibtex' | null>(null);
  const [showBibtex, setShowBibtex] = useState(false);

  const plainCitation = `Detmer, R. & Stier, A. (2025). Acropora palmata Demographic Parameters Database: Uncertainty-aware analysis of size-dependent survival and growth across the Caribbean. GitHub: stier-lab/Detmer-2025-coral-parameters`;

  const bibtexCitation = `@misc{detmer2025apal,
  author = {Detmer, Ryan and Stier, Adrian},
  title = {Acropora palmata Demographic Parameters Database},
  year = {2025},
  publisher = {GitHub},
  journal = {GitHub repository},
  howpublished = {\\url{https://github.com/stier-lab/Detmer-2025-coral-parameters}},
  note = {Uncertainty-aware analysis of size-dependent survival and growth across the Caribbean}
}`;

  const handleCopy = async (type: 'plain' | 'bibtex') => {
    const text = type === 'plain' ? plainCitation : bibtexCitation;
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Card className="bg-sand-warm/50">
      <h3 className="font-semibold text-ocean-deep mb-2">How to Cite</h3>
      <p className="text-sm text-text-secondary mb-3">
        Please cite this dataset when using it in publications:
      </p>

      {/* Plain text citation */}
      <div className="bg-white p-3 rounded-lg text-xs text-text-primary leading-relaxed mb-3 relative group">
        {plainCitation}
        <button
          onClick={() => handleCopy('plain')}
          className="absolute top-2 right-2 p-1.5 rounded bg-gray-100 hover:bg-gray-200 transition-colors opacity-0 group-hover:opacity-100"
          title="Copy citation"
        >
          {copied === 'plain' ? (
            <Check className="w-3.5 h-3.5 text-green-600" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-gray-500" />
          )}
        </button>
      </div>

      {/* BibTeX toggle */}
      <button
        onClick={() => setShowBibtex(!showBibtex)}
        className="flex items-center gap-2 text-sm text-ocean-light hover:text-ocean-deep transition-colors mb-2"
      >
        <ChevronDown className={`w-4 h-4 transition-transform ${showBibtex ? 'rotate-180' : ''}`} />
        {showBibtex ? 'Hide' : 'Show'} BibTeX
      </button>

      {showBibtex && (
        <div className="bg-gray-900 p-3 rounded-lg text-xs font-mono text-green-400 leading-relaxed relative group overflow-x-auto">
          <pre className="whitespace-pre-wrap">{bibtexCitation}</pre>
          <button
            onClick={() => handleCopy('bibtex')}
            className="absolute top-2 right-2 p-1.5 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
            title="Copy BibTeX"
          >
            {copied === 'bibtex' ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-gray-400" />
            )}
          </button>
        </div>
      )}
    </Card>
  );
}

// Column descriptions card
function ColumnDescriptionsCard({ dataType }: { dataType: DataType }) {
  const [isOpen, setIsOpen] = useState(false);
  const columns = COLUMN_DESCRIPTIONS[dataType];

  return (
    <Card>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-ocean-light" />
          <h3 className="font-semibold text-ocean-deep">Column Descriptions</h3>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="mt-4 space-y-2">
          {columns.map((col) => (
            <div key={col.name} className="flex items-start gap-3 text-sm">
              <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-ocean-deep flex-shrink-0">
                {col.name}
              </code>
              <span className="text-text-secondary">{col.description}</span>
            </div>
          ))}
          <div className="pt-3 border-t border-gray-100">
            <Link
              to="/methods"
              className="inline-flex items-center gap-2 text-sm text-ocean-light hover:text-ocean-deep transition-colors"
            >
              <FileText className="w-4 h-4" />
              See full documentation for size class definitions
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}
