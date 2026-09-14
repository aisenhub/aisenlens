import { useEffect, useState } from "react"

import { Navigate, useLocation, useNavigate } from "react-router-dom"

import AppNavigation from "../components/layout/AppNavigation"

import { Toaster } from "../components/ui/sonner"

import { TooltipProvider } from "../components/ui/tooltip"

import LiteSettingsModal from "../features/editor/components/LiteSettingsModal"

import type { ProjectRecord } from "../features/project/types"

import useAppTheme from "../hooks/useAppTheme"

import AppPages from "./AppPages"

const PAGE_PATHS: Record<number, string> = {
  2: "/projects",
  3: "/app",
}

const getPageForPath = (pathname: string) => {
  return Number(
    Object.entries(PAGE_PATHS).find(([, path]) => path === pathname)?.[0] ?? 2,
  )
}

function getInitialActiveProjectId() {
  const projectIdFromLocation = new URLSearchParams(window.location.search).get(
    "project",
  )
  if (projectIdFromLocation) return projectIdFromLocation
  return window.sessionStorage.getItem("aisenlens:active-project-id")
}

export default function App() {
  const location = useLocation()

  const navigate = useNavigate()

  const [page, setPage] = useState(() => getPageForPath(location.pathname))

  const [isLiteSettingsOpen, setIsLiteSettingsOpen] = useState(false)

  const { preference: theme, resolvedTheme, setPreference: setTheme } = useAppTheme()

  const [projectTitle, setProjectTitle] = useState("《2001太空漫游》· 视觉分析")

  const [activeProjectId, setActiveProjectId] = useState<string | null>(
    getInitialActiveProjectId,
  )

  const isEditor = location.pathname === "/app"

  const isKnownPath = location.pathname === "/projects" || isEditor

  useEffect(() => {
    setPage(getPageForPath(location.pathname))
  }, [location.pathname])

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
  }, [resolvedTheme])

  useEffect(() => {
    if (activeProjectId)
      window.sessionStorage.setItem(
        "aisenlens:active-project-id",
        activeProjectId,
      )
    else window.sessionStorage.removeItem("aisenlens:active-project-id")
  }, [activeProjectId])

  useEffect(() => {
    if (location.pathname !== "/app" || !activeProjectId) return
    const params = new URLSearchParams(location.search)
    if (params.get("project") === activeProjectId) return
    params.set("project", activeProjectId)
    navigate({ pathname: "/app", search: `?${params.toString()}` }, { replace: true })
  }, [activeProjectId, location.pathname, location.search, navigate])

  const handleNavigate = (nextPage: number) => {
    const path = PAGE_PATHS[nextPage]

    if (path) navigate(path)
  }

  if (!isKnownPath) {
    return <Navigate to="/projects" replace />
  }

  return (
    <TooltipProvider>
      <div data-theme={resolvedTheme} className="bg-bg min-h-screen text-text-base">
        {!isEditor && (
          <AppNavigation
            activePage={page}
            onNavigate={handleNavigate}
            theme={theme}
            onThemeChange={setTheme}
            onOpenLiteSettings={() => setIsLiteSettingsOpen(true)}
          />
        )}
        <main className={isEditor ? "" : "pt-14"}>
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
            theme={theme}
            onThemeChange={setTheme}
          />
        </main>
        {isLiteSettingsOpen && (
          <LiteSettingsModal onClose={() => setIsLiteSettingsOpen(false)} theme={theme} onThemeChange={setTheme} />
        )}
        <Toaster theme={resolvedTheme} position="top-center" />
      </div>
    </TooltipProvider>
  )
}
