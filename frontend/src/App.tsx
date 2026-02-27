import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, lazy } from 'react';
import { LoadingOverlay, ErrorBoundary, SkipLink } from './components/common';

const Story = lazy(() => import('./pages/Story').then(m => ({ default: m.Story })));
const FullAnalysis = lazy(() => import('./pages/FullAnalysis').then(m => ({ default: m.FullAnalysis })));
const Methods = lazy(() => import('./pages/Methods').then(m => ({ default: m.Methods })));
const Download = lazy(() => import('./pages/Download').then(m => ({ default: m.Download })));
const Literature = lazy(() => import('./pages/Literature').then(m => ({ default: m.Literature })));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

const OutplantingWizard = lazy(() => import('./pages/OutplantingWizard').then(m => ({ default: m.OutplantingWizard })));
const SurvivalTool = lazy(() => import('./pages/SurvivalTool').then(m => ({ default: m.SurvivalTool })));
const GrowthTool = lazy(() => import('./pages/GrowthTool').then(m => ({ default: m.GrowthTool })));
const RegionalTool = lazy(() => import('./pages/RegionalTool').then(m => ({ default: m.RegionalTool })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <ErrorBoundary
          onError={(error, errorInfo) => {
            console.error('[App ErrorBoundary]', error, errorInfo);
          }}
        >
          <SkipLink />
          <Suspense fallback={<LoadingOverlay message="Loading page..." />}>
            <Routes>
              {/* Main 3-page architecture */}
              <Route path="/" element={<Story />} />
              <Route path="/analysis" element={<FullAnalysis />} />
              <Route path="/methods" element={<Methods />} />

              {/* Interactive tools (linked from Analysis page) */}
              <Route path="/answers/outplant" element={<OutplantingWizard />} />
              <Route path="/answers/survival" element={<SurvivalTool />} />
              <Route path="/answers/growth" element={<GrowthTool />} />
              <Route path="/answers/region" element={<RegionalTool />} />

              {/* Reference pages */}
              <Route path="/download" element={<Download />} />
              <Route path="/literature" element={<Literature />} />

              {/* Redirects for old paths → new locations */}
              <Route path="/answers" element={<Navigate to="/analysis" replace />} />
              <Route path="/explore" element={<Navigate to="/analysis" replace />} />
              <Route path="/evidence" element={<Navigate to="/analysis#evidence" replace />} />
              <Route path="/questions" element={<Navigate to="/analysis" replace />} />
              <Route path="/key-findings" element={<Navigate to="/analysis" replace />} />
              <Route path="/dashboard" element={<Navigate to="/analysis" replace />} />
              <Route path="/documentation" element={<Navigate to="/methods" replace />} />
              <Route path="/about" element={<Navigate to="/" replace />} />

              {/* Custom 404 page */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
