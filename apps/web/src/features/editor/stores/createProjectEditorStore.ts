import { createStore } from "zustand/vanilla"
import type { StoreApi } from "zustand/vanilla"

export interface ProjectEditorState {
  projectId: string
  hydrated: boolean
  selectedShotId: string | null
  selectedGroupId: string | null
  playbackTime: number
  documentRevision: number
  lifecycle: "loading" | "ready" | "saving" | "error"
  researchMode: "sequential" | "range"
  researchScope: { kind: "full-film" | "group" | "saved-range" | "transient-range"; id?: string; fromUs?: number; toUs?: number }
  researchTarget: { kind: "shot" | "group" | "range" | "evidence"; id: string } | null
  researchQueue: string[]
  researchQueueIndex: number
  followPlayback: boolean
  returnContext: { mode: "sequential" | "range"; scope: ProjectEditorState["researchScope"]; target: ProjectEditorState["researchTarget"]; queue: string[]; queueIndex: number; scrollTop: number } | null
  targetDrafts: Record<string, { status: "editing" | "saving" | "saved" | "error" | "conflict"; content: string; error?: string }>
  setHydrated: (hydrated: boolean) => void
  setSelection: (selection: { shotId?: string | null; groupId?: string | null }) => void
  setPlaybackTime: (time: number) => void
  bumpDocumentRevision: () => void
  setLifecycle: (lifecycle: ProjectEditorState["lifecycle"]) => void
  setResearchMode: (mode: ProjectEditorState["researchMode"]) => void
  setResearchScope: (scope: ProjectEditorState["researchScope"]) => void
  setResearchTarget: (target: ProjectEditorState["researchTarget"]) => void
  setResearchQueue: (queue: string[], index?: number) => void
  setFollowPlayback: (enabled: boolean) => void
  setReturnContext: (context: ProjectEditorState["returnContext"]) => void
  setTargetDraft: (targetId: string, draft: ProjectEditorState["targetDrafts"][string]) => void
}

export type ProjectEditorStore = StoreApi<ProjectEditorState>

export function createProjectEditorStore(projectId: string): ProjectEditorStore {
  return createStore<ProjectEditorState>((set) => ({
    projectId,
    hydrated: false,
    selectedShotId: null,
    selectedGroupId: null,
    playbackTime: 0,
    documentRevision: 0,
    lifecycle: "loading",
    researchMode: "sequential",
    researchScope: { kind: "full-film" },
    researchTarget: null,
    researchQueue: [],
    researchQueueIndex: 0,
    followPlayback: false,
    returnContext: null,
    targetDrafts: {},
    setHydrated: (hydrated) => set({ hydrated, lifecycle: hydrated ? "ready" : "loading" }),
    setSelection: ({ shotId, groupId }) =>
      set((state) => ({
        selectedShotId: shotId === undefined ? state.selectedShotId : shotId,
        selectedGroupId: groupId === undefined ? state.selectedGroupId : groupId,
      })),
    setPlaybackTime: (playbackTime) => set({ playbackTime }),
    bumpDocumentRevision: () => set((state) => ({ documentRevision: state.documentRevision + 1 })),
    setLifecycle: (lifecycle) => set({ lifecycle }),
    setResearchMode: (researchMode) => set({ researchMode }),
    setResearchScope: (researchScope) => set({ researchScope }),
    setResearchTarget: (researchTarget) => set((state) => ({ researchTarget, selectedShotId: researchTarget?.kind === "shot" ? researchTarget.id : state.selectedShotId, selectedGroupId: researchTarget?.kind === "group" ? researchTarget.id : state.selectedGroupId })),
    setResearchQueue: (researchQueue, researchQueueIndex = 0) => set({ researchQueue, researchQueueIndex }),
    setFollowPlayback: (followPlayback) => set({ followPlayback }),
    setReturnContext: (returnContext) => set({ returnContext }),
    setTargetDraft: (targetId, draft) => set((state) => ({ targetDrafts: { ...state.targetDrafts, [targetId]: draft } })),
  }))
}
