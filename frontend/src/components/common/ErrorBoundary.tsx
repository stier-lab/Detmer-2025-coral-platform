import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary catches JavaScript errors in child components and displays
 * a friendly fallback UI instead of crashing the entire app.
 *
 * Uses ocean-abyss dark theme for visual distinction from normal content.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error for debugging
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);

    this.setState({ errorInfo });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Return custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI with coral theme
      return (
        <div
          className="min-h-[400px] flex items-center justify-center p-8"
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-lg w-full bg-gradient-to-br from-ocean-deep to-ocean-mid rounded-2xl p-8 shadow-lg border border-ocean-light/20">
            {/* Coral icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-coral-warm/20 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-coral-warm"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>

            {/* Error message */}
            <h2 className="text-xl font-display font-semibold text-white text-center mb-3">
              Something went wrong
            </h2>
            <p className="text-ocean-light/80 text-center mb-6 font-body">
              We encountered an unexpected error while loading this section.
              Don't worry - your data is safe.
            </p>

            {/* Error details (collapsed by default in production) */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mb-6 bg-ocean-deep/50 rounded-lg p-4 border border-ocean-light/10">
                <summary className="text-sm text-reef-green cursor-pointer font-mono">
                  Technical details (dev only)
                </summary>
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-coral-pale font-mono break-all">
                    {this.state.error.message}
                  </p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="text-xs text-ocean-light/60 font-mono overflow-auto max-h-32 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="primary"
                onClick={this.handleReset}
                className="bg-coral-warm hover:bg-coral-warm/90"
              >
                Try Again
              </Button>
              <Button
                variant="secondary"
                onClick={() => window.location.reload()}
                className="border-ocean-light/50 text-white hover:bg-ocean-light/20 hover:text-white"
              >
                Reload Page
              </Button>
            </div>

            {/* Support hint */}
            <p className="text-xs text-ocean-light/50 text-center mt-6 font-body">
              If this keeps happening, please contact{' '}
              <a
                href="mailto:stier@ucsb.edu"
                className="text-reef-green hover:underline"
              >
                stier@ucsb.edu
              </a>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * A simpler inline error display for smaller sections
 */
interface InlineErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function InlineError({ message = 'Failed to load data', onRetry }: InlineErrorProps) {
  return (
    <div
      className="flex flex-col items-center justify-center p-6 bg-coral-warm/5 rounded-xl border border-coral-warm/20"
      role="alert"
    >
      <div className="w-10 h-10 rounded-full bg-coral-warm/10 flex items-center justify-center mb-3">
        <svg
          className="w-5 h-5 text-coral-warm"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <p className="text-sm text-text-secondary text-center mb-3">{message}</p>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
