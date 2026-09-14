import { lazy, Suspense, type ReactNode } from "react";
import AppErrorBoundary from "./AppErrorBoundary";
import type { ThemePreference } from "../types/theme";
import type { ProjectRecord } from "../features/project/types";

const EditorPage = lazy(() => import("../pages/EditorPage"));
const ProjectsPage = lazy(() => import("../pages/ProjectsPage"));

interface AppPagesProps {
  page: number;
  onNavigate: (page: number) => void;
  activeProjectId: string | null;
  projectTitle: string;
  onProjectTitleChange: (title: string) => void;
  onProjectLoaded: (project: ProjectRecord) => void;
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
}

export default function AppPages({
  page,
  onNavigate,
  activeProjectId,
  projectTitle,
  onProjectTitleChange,
  onProjectLoaded,
  theme,
  onThemeChange,
}: AppPagesProps) {
  let content: ReactNode = null;
  if (page === 2) {
    content = <ProjectsPage onOpenProject={(project) => {
      onProjectLoaded(project);
      onNavigate(3);
    }} />;
  }
  if (page === 3) {
    content = <EditorPage
      onNavigate={onNavigate}
      projectId={activeProjectId}
      projectTitle={projectTitle}
      setProjectTitle={onProjectTitleChange}
      onProjectLoaded={onProjectLoaded}
    />;
  }
  return <AppErrorBoundary key={page} onNavigate={onNavigate}><Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center font-mono text-sm text-text-muted">正在加载页面…</div>}>{content}</Suspense></AppErrorBoundary>;
}
