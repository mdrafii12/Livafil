import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the real error to the browser console so you can still see exactly
    // what broke — this doesn't hide errors from you during development,
    // it just stops them from taking down the whole app for the end user.
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/#/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-8 text-center space-y-4">
            <div className="h-12 w-12 rounded-xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Something went wrong</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This page ran into an error. Your data is safe — this is just a display issue.
              Try going back to the dashboard.
            </p>
            {this.state.error && (
              <p className="text-[10px] font-mono text-gray-400 bg-gray-50 dark:bg-gray-950 p-2 rounded-lg break-all">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={this.handleReset}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Return to Dashboard</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}