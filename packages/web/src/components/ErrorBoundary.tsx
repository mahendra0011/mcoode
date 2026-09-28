"use client";
import React from "react";
import { captureException } from "@sentry/react";

/** WEB-001: a crashing panel must never white-screen the whole dashboard. */
interface Props {
  children: React.ReactNode;
  label?: string;
}

interface State {
  error: Error | null;
}

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (SENTRY_DSN) {
      captureException(error, {
        tags: { boundary: this.props.label || "panel" },
      });
    }
    // eslint-disable-next-line no-console
    console.error(`[ErrorBoundary${this.props.label ? `:${this.props.label}` : ""}]`, error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-sm text-white/70">
          <p className="font-semibold text-red-300">
            {this.props.label || "Panel"} crashed
          </p>
          <p className="mt-1 font-mono text-xs text-white/40 break-all">
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs"
          >
            Retry panel
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
