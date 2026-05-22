import React from "react";

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ZooWallet] Uncaught error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-forest px-6 text-center gap-6">
          {/* Error icon */}
          <div className="w-16 h-16 rounded-2xl bg-danger/10 border border-danger/30 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>

          <div>
            <h1 className="text-lg font-bold text-fog">应用崩溃了</h1>
            <p className="text-sm text-slate mt-1 max-w-xs leading-relaxed">
              {this.state.error?.message ?? "未知错误"}
            </p>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-neon text-forest rounded-lg text-sm font-semibold hover:bg-brand-hover transition-colors active:scale-95"
          >
            重新加载
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
