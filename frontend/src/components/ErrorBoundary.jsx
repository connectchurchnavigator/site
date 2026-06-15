import React from 'react';
import { AlertTriangle, RefreshCw, Home, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    console.error('ErrorBoundary caught an error:', error, errorInfo);

    if (window.location.hostname !== 'localhost') {
      fetch('https://api.churchnavigator.com/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: error.toString(),
          errorInfo: errorInfo.componentStack,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      }).catch(err => console.error('Failed to log error:', err));
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-purple-50 to-white flex items-center justify-center px-4">
          <div className="max-w-2xl w-full text-center">
            <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-4">
                  <AlertTriangle className="w-10 h-10 text-red-600" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                  Oops! Something Went Wrong
                </h1>
                <p className="text-lg text-gray-600">
                  We encountered an unexpected error. Our team has been notified and we're looking into it.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm font-mono text-gray-700 mb-2">
                  <strong>Error:</strong> {this.state.error?.toString()}
                </p>
                {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                      Technical Details (Development)
                    </summary>
                    <pre className="text-xs mt-2 p-2 bg-white rounded border overflow-auto max-h-40">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={this.handleReload}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-lg hover:from-purple-700 hover:to-purple-600 transition-all shadow-lg font-medium"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Try Again
                  </button>
                  <Link
                    to="/"
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium"
                  >
                    <Home className="w-5 h-5" />
                    Go Home
                  </Link>
                </div>

                <p className="text-sm text-gray-500">
                  If the problem persists, please{' '}
                  <a
                    href="mailto:support@churchnavigator.com?subject=Error Report"
                    className="text-purple-600 hover:text-purple-700 font-medium inline-flex items-center gap-1"
                  >
                    <Mail className="w-4 h-4" />
                    contact our support team
                  </a>
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">While you're here, you might want to:</h3>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Link to="/churches" className="text-sm px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                    Browse Churches
                  </Link>
                  <Link to="/events" className="text-sm px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                    View Events
                  </Link>
                  <Link to="/planner" className="text-sm px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                    Service Planner
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;