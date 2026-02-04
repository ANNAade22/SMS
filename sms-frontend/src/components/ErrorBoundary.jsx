import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log for debugging; can be replaced with remote logging
    console.error("ErrorBoundary caught an error:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <span className="text-red-500 text-2xl">⚠️</span>
              <div>
                <h3 className="text-sm font-semibold text-red-800">
                  Something went wrong
                </h3>
                <p className="mt-1 text-sm text-red-700">
                  {this.state.error?.message ||
                    "An unexpected error occurred while rendering this section."}
                </p>
                <button
                  onClick={this.handleReset}
                  className="mt-3 inline-flex items-center px-3 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
