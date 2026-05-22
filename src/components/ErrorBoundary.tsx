import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

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
        <div className="flex flex-col items-center justify-center h-screen bg-bg-primary text-white p-6 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold mb-2">出现了一个错误</h1>
          <p className="text-muted text-sm mb-6 max-w-xs">
            {this.state.error?.message ?? "未知错误"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-brand rounded-lg text-sm font-medium hover:bg-brand-hover transition-colors"
          >
            重新加载
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
