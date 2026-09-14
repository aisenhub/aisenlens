import { useCallback, useEffect, useMemo, useState } from "react"
import useLocalStorage from "./useLocalStorage.ts"
import type { ResolvedTheme, ThemePreference } from "../types/theme.ts"

const STORAGE_KEY = "aisenlens:theme"

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "dark" || value === "light" || value === "system"
}

export function normalizeThemePreference(value: unknown): ThemePreference {
  return isThemePreference(value) ? value : "dark"
}

export function resolveThemePreference(preference: ThemePreference, systemTheme: ResolvedTheme): ResolvedTheme {
  return preference === "system" ? systemTheme : preference
}

function getSystemTheme(): ResolvedTheme {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
}

export default function useAppTheme() {
  const [storedPreference, setStoredPreference] = useLocalStorage<unknown>(STORAGE_KEY, "dark")
  const preference = normalizeThemePreference(storedPreference)
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme)

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)")
    const update = (event: MediaQueryListEvent) => setSystemTheme(event.matches ? "light" : "dark")
    setSystemTheme(media.matches ? "light" : "dark")
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  const resolvedTheme = useMemo<ResolvedTheme>(() => resolveThemePreference(preference, systemTheme), [preference, systemTheme])
  const setPreference = useCallback((next: ThemePreference) => setStoredPreference(next), [setStoredPreference])

  return { preference, resolvedTheme, setPreference }
}
