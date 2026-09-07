import { useEffect, useState } from "react"

import { Navigate, useLocation, useNavigate } from "react-router-dom"

import AppNavigation from "../components/layout/AppNavigation"

import { Toaster } from "../components/ui/sonner"

import { TooltipProvider } from "../components/ui/tooltip"

import AuthModal from "../features/auth/components/AuthModal"

import PasswordResetPage from "../features/auth/components/PasswordResetPage"

import UserCenterModal from "../features/auth/components/UserCenterModal"

import LiteSettingsModal from "../features/editor/components/LiteSettingsModal"

import type { ProjectRecord } from "../features/project/types"

import useLocalStorage from "../hooks/useLocalStorage"

import type { AppTheme } from "../types/theme"
import useAppSession from "../features/auth/hooks/useAppSession"

import SeoContentPage from "../features/marketing/components/SeoContentPage"

import { getSeoContentPage } from "../features/marketing/seo/seoContent"

import { PAGE_METADATA } from "../features/marketing/seo/siteMetadata"

import usePageMetadata from "../features/marketing/seo/usePageMetadata"

import AppPages from "./AppPages"

const PAGE_PATHS: Record<number, string> = {
  1: "/",

  2: "/projects",

  3: "/app",

  4: "/tutorials",

  5: "/support",

  6: "/feedback",

  8: "/changelog",

  9: "/terms",

  10: "/privacy",
}

const getPageForPath = (pathname: string) => {
  if (pathname.startsWith("/tutorials")) return 4

  return Number(
    Object.entries(PAGE_PATHS).find(([, path]) => path === pathname)?.[0] ?? 1,
  )
}

function isPageReload() {
  const navigationEntry = performance.getEntriesByType(
    "navigation",
  )[0] as PerformanceNavigationTiming | undefined

  return navigationEntry?.type === "reload"
}

export default function App() {
  const location = useLocation()

  const navigate = useNavigate()

  const [page, setPage] = useState(() => getPageForPath(location.pathname))

  const { isLoggedIn, currentProfile, setIsLoggedIn, setCurrentProfile, handleSignOut } = useAppSession()

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  const [isUserCenterOpen, setIsUserCenterOpen] = useState(false)

  const [isLiteSettingsOpen, setIsLiteSettingsOpen] = useState(false)

  const [theme, setTheme] = useLocalStorage<AppTheme>("aisenlens:theme", "dark")

  const [projectTitle, setProjectTitle] = useState("《2001太空漫游》· 视觉分析")

  const [activeProjectId, setActiveProjectId] = useState<string | null>(() =>
    isPageReload()
      ? window.sessionStorage.getItem("aisenlens:active-project-id")
      : null,
  )

  const seoContentPage = getSeoContentPage(location.pathname)

  const isEditor = location.pathname === "/app"

  const isKnownPath = Boolean(
    PAGE_METADATA[location.pathname] || seoContentPage,
  )

  usePageMetadata(location.pathname)

  useEffect(() => {
    setPage(getPageForPath(location.pathname))
  }, [location.pathname])

  useEffect(() => {
    document.documentElement.dataset.theme = theme

    return () => {
      delete document.documentElement.dataset.theme
    }
  }, [theme])

  useEffect(() => {
    if (activeProjectId)
      window.sessionStorage.setItem(
        "aisenlens:active-project-id",
        activeProjectId,
      )
    else window.sessionStorage.removeItem("aisenlens:active-project-id")
  }, [activeProjectId])

  const handleNavigate = (nextPage: number) => {
    const path = PAGE_PATHS[nextPage]

    if (path) navigate(path)
  }

  if (location.pathname === "/reset-password") {
    return <PasswordResetPage />
  }

  if (!isKnownPath) {
    return <Navigate to="/" replace />
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
            onNavigate={handleNavigate}
            theme={theme}
            onThemeChange={setTheme}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onOpenLiteSettings={() => setIsLiteSettingsOpen(true)}
            onOpenUserCenter={() => setIsUserCenterOpen(true)}
            onSignOut={() => void handleSignOut()}
          />
        )}
        <main className={isEditor ? "" : "pt-14"}>
          {seoContentPage ? (
            <SeoContentPage
              page={seoContentPage}
              onStart={() => navigate("/app")}
            />
          ) : (
            <AppPages
              page={page}
              onNavigate={handleNavigate}
              activeProjectId={activeProjectId}
              projectTitle={projectTitle}
              onProjectTitleChange={setProjectTitle}
              onProjectLoaded={(project: ProjectRecord) => {
                setActiveProjectId(project.id)

                setProjectTitle(project.title)
              }}
              isLoggedIn={isLoggedIn}
              onRequireAuth={() => setIsAuthModalOpen(true)}
              theme={theme}
              onThemeChange={setTheme}
            />
          )}
        </main>
        {isAuthModalOpen && (
          <AuthModal
            onClose={() => setIsAuthModalOpen(false)}
            onComplete={() => setIsLoggedIn(true)}
          />
        )}
        {isUserCenterOpen && (
          <UserCenterModal
            onClose={() => setIsUserCenterOpen(false)}
            onProfileUpdated={setCurrentProfile}
          />
        )}
        {isLiteSettingsOpen && (
          <LiteSettingsModal onClose={() => setIsLiteSettingsOpen(false)} />
        )}
        <Toaster theme={theme} position="top-center" />
      </div>
    </TooltipProvider>
  )
}
