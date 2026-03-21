"use client";

import { AlertTriangle } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {}

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center">
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-center">
            <AlertTriangle className="mx-auto mb-3 size-8 text-red-300" />
            <p className="text-sm text-red-200">Something went wrong loading this 3D view.</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-3 rounded-lg border border-red-300/20 px-3 py-1.5 text-xs text-red-100 hover:bg-red-400/10"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
