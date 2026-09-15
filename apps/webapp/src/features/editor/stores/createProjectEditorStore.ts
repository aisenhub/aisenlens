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
 researchScope: { kind: "full-film" | "group" | "saved-range" | "transient-range"; id?: string; fromUs?: number; toUs?: number }
  researchTarget: { kind: "shot" | "group" | "range" | "evidence"; id: string } | null
 followPlayback: boolean
  targetDrafts: Record<string, { status: "editing" | "saving" | "saved" | "error" | "conflict"; content: string; error?: string }>
  setHydrated: (hydrated: boolean) => void
  setSelection: (selection: { shotId?: string | null; groupId?: string | null }) => void
  setPlaybackTime: (time: number) => void
  bumpDocumentRevision: () => void
  setLifecycle: (lifecycle: ProjectEditorState["lifecycle"]) => void
 setResearchScope: (scope: ProjectEditorState["researchScope"]) => void
  setResearchTarget: (target: ProjectEditorState["researchTarget"]) => void
 setFollowPlayback: (enabled: boolean) => void
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
   researchScope: { kind: "full-film" },
    researchTarget: null,
   followPlayback: false,
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
   setResearchScope: (researchScope) => set({ researchScope }),
    setResearchTarget: (researchTarget) => set((state) => ({ researchTarget, selectedShotId: researchTarget?.kind === "shot" ? researchTarget.id : state.selectedShotId, selectedGroupId: researchTarget?.kind === "group" ? researchTarget.id : state.selectedGroupId })),
   setFollowPlayback: (followPlayback) => set({ followPlayback }),
    setTargetDraft: (targetId, draft) => set((state) => ({ targetDrafts: { ...state.targetDrafts, [targetId]: draft } })),
  }))
}
