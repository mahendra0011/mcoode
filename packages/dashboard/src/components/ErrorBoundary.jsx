import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[mcode dashboard] render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-mcode-bg p-8">
          <div className="max-w-md rounded-lg border border-mcode-border bg-mcode-panel p-6">
            <h1 className="font-mono text-lg font-semibold text-white">Something went wrong</h1>
            <pre className="mt-3 overflow-auto whitespace-pre-wrap font-mono text-xs text-red-400">
              {String(this.state.error.message || this.state.error)}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded border border-mcode-border px-4 py-2 font-mono text-xs text-mcode-green hover:border-mcode-green/50"
            >
              reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
