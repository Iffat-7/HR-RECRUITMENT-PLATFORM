import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary - catches React rendering errors and displays a fallback UI
 * instead of crashing the entire application.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
    
    // TODO: In production, send to error monitoring service (Sentry, etc.)
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-paper p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lift border border-line p-8">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-danger-100">
              <AlertTriangle className="w-8 h-8 text-danger-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-ink-900 text-center mb-2">
              Something went wrong
            </h1>
            
            <p className="text-ink-500 text-center mb-6">
              The application encountered an unexpected error. Please try again or reload the page.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <details className="mb-6 p-4 bg-paper rounded-lg border border-line" open>
                <summary className="cursor-pointer text-sm font-semibold text-ink-700 mb-2">
                  Error Details (Development Only)
                </summary>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-ink-700 mb-1">Error Name:</p>
                    <p className="text-xs text-ink-600 font-mono">{this.state.error.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-ink-700 mb-1">Error Message:</p>
                    <p className="text-xs text-ink-600 font-mono">{this.state.error.message}</p>
                  </div>
                  {this.state.error.stack && (
                    <div>
                      <p className="text-xs font-semibold text-ink-700 mb-1">Stack Trace:</p>
                      <pre className="text-xs text-ink-600 overflow-auto max-h-48 font-mono whitespace-pre-wrap">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-2.5 bg-white text-ink-700 border border-line rounded-lg font-semibold hover:bg-paper transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>
            </div>

            <p className="mt-6 text-xs text-ink-400 text-center">
              If this problem persists, please contact support with reference code: {this.state.error?.name || "UNKNOWN"}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
