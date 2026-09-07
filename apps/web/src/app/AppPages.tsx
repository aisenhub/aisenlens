import { lazy, Suspense, type ReactNode } from "react";
import AppErrorBoundary from "./AppErrorBoundary";
import type { AppTheme } from "../types/theme";
import type { ProjectRecord } from "../features/project/types";

const ChangelogPage = lazy(() => import("../pages/ChangelogPage"));
const EditorPage = lazy(() => import("../pages/EditorPage"));
const FeedbackPage = lazy(() => import("../pages/FeedbackPage"));
const LandingPage = lazy(() => import("../pages/LandingPage"));
const PrivacyPolicyPage = lazy(() => import("../pages/PrivacyPolicyPage"));
const ProjectsPage = lazy(() => import("../pages/ProjectsPage"));
const SupportPage = lazy(() => import("../pages/SupportPage"));
const TutorialsPage = lazy(() => import("../pages/TutorialsPage"));
const UserAgreementPage = lazy(() => import("../pages/UserAgreementPage"));

interface AppPagesProps {
  page: number;
  onNavigate: (page: number) => void;
  activeProjectId: string | null;
  projectTitle: string;
  onProjectTitleChange: (title: string) => void;
  onProjectLoaded: (project: ProjectRecord) => void;
  isLoggedIn: boolean;
  onRequireAuth: () => void;
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
}

export default function AppPages({
  page,
  onNavigate,
  activeProjectId,
  projectTitle,
  onProjectTitleChange,
  onProjectLoaded,
  isLoggedIn,
  onRequireAuth,
  theme,
  onThemeChange,
}: AppPagesProps) {
  let content: ReactNode = null;
  if (page === 1) content = <LandingPage onNavigate={onNavigate} />;
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
  if (page === 4) content = <TutorialsPage onNavigate={onNavigate} />;
  if (page === 5) content = <SupportPage isLoggedIn={isLoggedIn} onRequireAuth={onRequireAuth} onNavigate={onNavigate} />;
  if (page === 6) content = <FeedbackPage isLoggedIn={isLoggedIn} onRequireAuth={onRequireAuth} />;
  if (page === 8) content = <ChangelogPage />;
  if (page === 9) content = <UserAgreementPage />;
  if (page === 10) content = <PrivacyPolicyPage />;

  return <AppErrorBoundary key={page} onNavigate={onNavigate}><Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center font-mono text-sm text-text-muted">正在加载页面…</div>}>{content}</Suspense></AppErrorBoundary>;
}
