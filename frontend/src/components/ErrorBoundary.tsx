import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught:", error, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{ padding: "1rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
          <p>Something went wrong.</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            style={{ marginTop: "0.5rem", textDecoration: "underline", cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
