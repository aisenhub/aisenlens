import type { WorkflowView, WorkflowWorkspace } from "../types.ts"
import { getWorkspaceDefinition } from "../constants/workflowWorkspaces.ts"

export const NATIVE_STUDIO_PREFERENCE_KEY = "aisenlens.ui.native-studio.v1"
export const NATIVE_STUDIO_PREFERENCE_VERSION = 1 as const

export type WorkspaceDensity = "comfort" | "standard" | "compact"
export type WorkspaceCollectionView = "grid" | "list"

export interface WorkspaceLayoutPreference {
  density: WorkspaceDensity
  navigationWidth: number
  inspectorWidth: number
  timelineHeight: number
  inspectorOpen: boolean
  navigationOpen: boolean
  collectionView: WorkspaceCollectionView
  lastView: WorkflowView | null
}

export interface NativeStudioPreferences {
  version: typeof NATIVE_STUDIO_PREFERENCE_VERSION
  railExpanded: boolean
  workspaces: Record<WorkflowWorkspace, WorkspaceLayoutPreference>
}

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

type PreferenceListener = () => void

let preferenceSnapshot: NativeStudioPreferences | null = null
const preferenceListeners = new Set<PreferenceListener>()
let storageListenerAttached = false

const resolveBrowserStorage = (): StorageLike | null => typeof window === "undefined" ? null : window.localStorage

const emitPreferenceChange = () => {
  for (const listener of preferenceListeners) listener()
}

const ensureStorageListener = () => {
  if (storageListenerAttached || typeof window === "undefined") return
  storageListenerAttached = true
  window.addEventListener("storage", (event) => {
    if (event.key !== NATIVE_STUDIO_PREFERENCE_KEY) return
    try {
      preferenceSnapshot = event.newValue
        ? normalizeNativeStudioPreferences(JSON.parse(event.newValue))
        : createDefaultNativeStudioPreferences()
    } catch {
      preferenceSnapshot = createDefaultNativeStudioPreferences()
    }
    emitPreferenceChange()
  })
}

export const createDefaultWorkspaceLayout = (workspace: WorkflowWorkspace): WorkspaceLayoutPreference => ({
  density: "standard",
  navigationWidth: 240,
  inspectorWidth: 320,
  timelineHeight: workspace === "analysis" ? 192 : 144,
  inspectorOpen: workspace !== "preparation",
  navigationOpen: true,
  collectionView: "list",
  lastView: null,
})

export const createDefaultNativeStudioPreferences = (): NativeStudioPreferences => ({
  version: NATIVE_STUDIO_PREFERENCE_VERSION,
  railExpanded: false,
  workspaces: {
    preparation: createDefaultWorkspaceLayout("preparation"),
    analysis: createDefaultWorkspaceLayout("analysis"),
    results: createDefaultWorkspaceLayout("results"),
  },
})

const finiteNumber = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback

const normalizeWorkspaceLayout = (
  workspace: WorkflowWorkspace,
  value: unknown,
  fallback: WorkspaceLayoutPreference,
): WorkspaceLayoutPreference => {
  if (!value || typeof value !== "object") return fallback
  const candidate = value as Partial<WorkspaceLayoutPreference>
  return {
    density:
      candidate.density === "comfort" || candidate.density === "compact" || candidate.density === "standard"
        ? candidate.density
        : fallback.density,
    navigationWidth: finiteNumber(candidate.navigationWidth, fallback.navigationWidth, 180, 360),
    inspectorWidth: finiteNumber(candidate.inspectorWidth, fallback.inspectorWidth, 280, 480),
    timelineHeight: finiteNumber(candidate.timelineHeight, fallback.timelineHeight, 32, 360),
    inspectorOpen: typeof candidate.inspectorOpen === "boolean" ? candidate.inspectorOpen : fallback.inspectorOpen,
    navigationOpen: typeof candidate.navigationOpen === "boolean" ? candidate.navigationOpen : fallback.navigationOpen,
    collectionView: candidate.collectionView === "grid" || candidate.collectionView === "list" ? candidate.collectionView : fallback.collectionView,
    lastView:
      typeof candidate.lastView === "string" && getWorkspaceDefinition(workspace).views.includes(candidate.lastView as WorkflowView)
        ? candidate.lastView as WorkflowView
        : fallback.lastView,
  }
}

export const normalizeNativeStudioPreferences = (value: unknown): NativeStudioPreferences => {
  const fallback = createDefaultNativeStudioPreferences()
  if (!value || typeof value !== "object") return fallback
  const candidate = value as Partial<NativeStudioPreferences>
  const candidateWorkspaces = candidate.workspaces && typeof candidate.workspaces === "object" ? candidate.workspaces : null
  return {
    version: NATIVE_STUDIO_PREFERENCE_VERSION,
    railExpanded: typeof candidate.railExpanded === "boolean" ? candidate.railExpanded : fallback.railExpanded,
    workspaces: {
      preparation: normalizeWorkspaceLayout("preparation", candidateWorkspaces?.preparation, fallback.workspaces.preparation),
      analysis: normalizeWorkspaceLayout("analysis", candidateWorkspaces?.analysis, fallback.workspaces.analysis),
      results: normalizeWorkspaceLayout("results", candidateWorkspaces?.results, fallback.workspaces.results),
    },
  }
}

export const readNativeStudioPreferences = (storage?: StorageLike | null): NativeStudioPreferences => {
  if (!storage) return createDefaultNativeStudioPreferences()
  try {
    const stored = storage.getItem(NATIVE_STUDIO_PREFERENCE_KEY)
    return stored ? normalizeNativeStudioPreferences(JSON.parse(stored)) : createDefaultNativeStudioPreferences()
  } catch {
    return createDefaultNativeStudioPreferences()
  }
}

export const writeNativeStudioPreferences = (
  preferences: NativeStudioPreferences,
  storage?: StorageLike | null,
) => {
  if (!storage) return
  try {
    storage.setItem(NATIVE_STUDIO_PREFERENCE_KEY, JSON.stringify(normalizeNativeStudioPreferences(preferences)))
  } catch {
    // UI preference persistence is best-effort and must never block the workspace.
  }
}

export const getNativeStudioPreferenceSnapshot = () => {
  ensureStorageListener()
  if (!preferenceSnapshot) preferenceSnapshot = readNativeStudioPreferences(resolveBrowserStorage())
  return preferenceSnapshot
}

export const subscribeNativeStudioPreferences = (listener: PreferenceListener) => {
  ensureStorageListener()
  preferenceListeners.add(listener)
  return () => preferenceListeners.delete(listener)
}

export const updateNativeStudioPreferences = (
  updater: (current: NativeStudioPreferences) => NativeStudioPreferences,
) => {
  const current = getNativeStudioPreferenceSnapshot()
  const next = normalizeNativeStudioPreferences(updater(current))
  if (JSON.stringify(current) === JSON.stringify(next)) return
  preferenceSnapshot = next
  writeNativeStudioPreferences(next, resolveBrowserStorage())
  emitPreferenceChange()
}
