import { useEffect, useState } from "react";
import AppNavigation from "../components/layout/AppNavigation";
import { Toaster } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";
import AuthModal from "../features/auth/components/AuthModal";
import PasswordResetPage from "../features/auth/components/PasswordResetPage";
import UserCenterModal from "../features/auth/components/UserCenterModal";
import type { UserProfile } from "../features/auth/types";
import LiteSettingsModal from "../features/editor/components/LiteSettingsModal";
import type { ProjectRecord } from "../features/project/types";
import useLocalStorage from "../hooks/useLocalStorage";
import { getCurrentSession, onAuthStateChange, signOut } from "../services/supabase/auth";
import { getCurrentProfile } from "../services/supabase/profiles";
import type { AppTheme } from "../types/theme";
import AppPages from "./AppPages";

function isPageReload() {
  const navigationEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return navigationEntry?.type === "reload";
}

export default function App() {
  const [page, setPage] = useState(() => {
    if (!isPageReload()) return 1;
    const savedPage = Number(window.sessionStorage.getItem("aisenlens:page"));
    return Number.isInteger(savedPage) && savedPage > 0 ? savedPage : 1;
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUserCenterOpen, setIsUserCenterOpen] = useState(false);
  const [isLiteSettingsOpen, setIsLiteSettingsOpen] = useState(false);
  const [theme, setTheme] = useLocalStorage<AppTheme>("aisenlens:theme", "dark");
  const [projectTitle, setProjectTitle] = useState("《2001太空漫游》· 视觉分析");
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() =>
    isPageReload() ? window.sessionStorage.getItem("aisenlens:active-project-id") : null,
  );
  const isEditor = page === 3;

  useEffect(() => {
    let isMounted = true;

    void getCurrentSession()
      .then((session) => {
        if (!isMounted) return;
        setIsLoggedIn(Boolean(session));
        if (session) {
          void getCurrentProfile().then((profile) => {
            if (isMounted) setCurrentProfile(profile);
          });
        }
      })
      .catch(() => {
        if (isMounted) setIsLoggedIn(false);
      });

    const { data: { subscription } } = onAuthStateChange((session) => {
      setIsLoggedIn(Boolean(session));
      if (!session) {
        setCurrentProfile(null);
        return;
      }
      void getCurrentProfile().then(setCurrentProfile);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    return () => { delete document.documentElement.dataset.theme; };
  }, [theme]);

  useEffect(() => {
    window.sessionStorage.setItem("aisenlens:page", String(page));
  }, [page]);

  useEffect(() => {
    if (activeProjectId) window.sessionStorage.setItem("aisenlens:active-project-id", activeProjectId);
    else window.sessionStorage.removeItem("aisenlens:active-project-id");
  }, [activeProjectId]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      setIsLoggedIn(false);
      setCurrentProfile(null);
    }
  };

  if (window.location.pathname === "/reset-password") {
    return <PasswordResetPage />;
  }

  return (
    <TooltipProvider>
      <div data-theme={theme} className="bg-bg min-h-screen text-text-base">
      {!isEditor && (
        <AppNavigation
          activePage={page}
          isLoggedIn={isLoggedIn}
          userName={currentProfile?.displayName}
          userEmail={currentProfile?.email}
          onNavigate={setPage}
          theme={theme}
          onThemeChange={setTheme}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenLiteSettings={() => setIsLiteSettingsOpen(true)}
          onOpenUserCenter={() => setIsUserCenterOpen(true)}
          onSignOut={() => void handleSignOut()}
        />
      )}
      <main className={isEditor ? "" : "pt-14"}>
        <AppPages
          page={page}
          onNavigate={setPage}
          activeProjectId={activeProjectId}
          projectTitle={projectTitle}
          onProjectTitleChange={setProjectTitle}
          onProjectLoaded={(project: ProjectRecord) => {
            setActiveProjectId(project.id);
            setProjectTitle(project.title);
          }}
          theme={theme}
          onThemeChange={setTheme}
        />
      </main>
      {isAuthModalOpen && <AuthModal onClose={() => setIsAuthModalOpen(false)} onComplete={() => setIsLoggedIn(true)} />}
      {isUserCenterOpen && <UserCenterModal onClose={() => setIsUserCenterOpen(false)} onProfileUpdated={setCurrentProfile} />}
      {isLiteSettingsOpen && <LiteSettingsModal onClose={() => setIsLiteSettingsOpen(false)} />}
      <Toaster theme={theme} position="top-center" />
      </div>
    </TooltipProvider>
  );
}
