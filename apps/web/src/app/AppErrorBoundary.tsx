import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "../components/ui/button";

interface AppErrorBoundaryProps {
  children: ReactNode;
  onNavigate: (page: number) => void;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export default class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("AisenLens 页面渲染失败", error, info.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-bg px-6 py-16 text-center text-text-base">
        <div className="max-w-md">
          <h1 className="font-display text-3xl font-black text-white">页面暂时无法显示</h1>
          <p className="mt-3 text-sm leading-6 text-text-muted">当前页面遇到异常。可以先重试；如果仍然无法恢复，请返回项目库，项目数据不会因此被删除。</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button type="button" variant="outline" onClick={this.handleRetry} className="border-border text-text-dim hover:text-white">重试</Button>
            <Button type="button" onClick={() => this.props.onNavigate(2)} className="bg-accent text-white hover:bg-accent/90">返回项目库</Button>
          </div>
        </div>
      </div>
    );
  }
}
