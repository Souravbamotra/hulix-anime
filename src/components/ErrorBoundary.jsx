"use client";

import { Component } from "react";

/**
 * React error boundary for scraping-dependent UI sections.
 *
 * Usage:
 *   <ErrorBoundary fallback={<p>Custom message</p>}>
 *     <SomeScraper-DependentComponent />
 *   </ErrorBoundary>
 *
 * When an uncaught render error bubbles up, the boundary logs it and
 * renders either the provided `fallback` prop or a default "Something
 * went wrong" card with a Retry button that resets the boundary state.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Caught render error:", error, info);
  }

  handleRetry = () => {
    // For Server Component children, resetting state alone won't re-run the server fetch.
    // A full page reload is the only way to actually retry the scrape.
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary-card glass-panel">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
          <p className="error-boundary-title">
            {this.props.title || "Something went wrong"}
          </p>
          <p className="error-boundary-desc">
            {this.props.description ||
              "This section couldn't load. The upstream source may be temporarily unavailable."}
          </p>
          <button
            type="button"
            className="glow-btn-secondary error-boundary-retry"
            onClick={this.handleRetry}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
