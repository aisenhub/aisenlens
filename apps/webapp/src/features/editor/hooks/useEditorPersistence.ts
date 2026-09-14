import { useCallback } from "react"
import projectRepository from "../../project/services/projectRepository"
import type { ProjectRecord, ProjectTemplateSnapshotRecord } from "../../project/types"
import type { AnnotationMarker } from "../../annotation/types"
import type { ShotGroupRecord } from "../../group/types"
import { reconcileShotGroups } from "../../group/services/groupService"
import type { ShotDetectionMeta, ShotRecord, ShotStatus } from "../../shot/types"
import type { AnalysisFieldEntry, ProjectAnalysisProfileSnapshot } from "../../template/types"
import { getShotAnalysisCompleteness } from "../../template/services/templateValidation"
import type { ShotData } from "../constants/editorData"
import type { ResearchContext, ResearchRange } from "../../analysis/types"

interface UseEditorPersistenceInput {
  projectId: string
  currentProject: ProjectRecord
  expectedUpdatedAt: string
  projectTitle: string
  compositionOverlay: ProjectRecord["compositionOverlay"]
  contentOverlay: ProjectRecord["contentOverlay"]
  frameRate: number
  shots: ShotData[]
  shotStatuses: Record<string, ShotStatus>
  shotFrames: Record<string, { first: number; last: number }>
  shotScreenshotIds: Record<string, string[]>
  primaryShotScreenshotIds: Record<string, string | null>
  shotBoundaryScreenshotIds: Record<string, { first: string | null; last: string | null }>
  shotNotes: Record<string, { content: string; analysis: string }>
  shotEntries: Record<string, Record<string, AnalysisFieldEntry>>
  shotGroups: ShotGroupRecord[]
  annotationMarkers: AnnotationMarker[]
  template: ProjectAnalysisProfileSnapshot | null
  loadedProjectId: string | null
  loadedShotGroupProjectId: string | null
  autoShotDetection: Record<string, ShotDetectionMeta>
  researchRanges: ResearchRange[]
  researchContexts: ResearchContext[]
  onProjectUpdated: (project: ProjectRecord) => void
}

export default function useEditorPersistence(input: UseEditorPersistenceInput) {
  const {
    projectId, currentProject, expectedUpdatedAt, projectTitle, compositionOverlay, contentOverlay, frameRate, shots,
    shotStatuses, shotFrames, shotScreenshotIds, primaryShotScreenshotIds, shotBoundaryScreenshotIds,
    shotNotes, shotEntries, shotGroups, annotationMarkers, template, loadedProjectId,
    loadedShotGroupProjectId, autoShotDetection, researchRanges, researchContexts, onProjectUpdated,
  } = input

  return useCallback(async () => {
    if (loadedProjectId !== projectId || loadedShotGroupProjectId !== projectId || !template) return
    const now = new Date().toISOString()
    const records: ShotRecord[] = shots.map((shot, index) => {
      const frames = shotFrames[shot.id] ?? {
        first: Math.round(shot.start * frameRate),
        last: Math.max(0, Math.round((shot.start + shot.duration) * frameRate) - 1),
      }
      const description = shotNotes[shot.id]?.content ?? ""
      const analysisFields = structuredClone(shotEntries[shot.id] ?? {})
      const boundaryScreenshots = shotBoundaryScreenshotIds[shot.id] ?? { first: null, last: null }
      // Completeness is a non-blocking progress signal. It must never invent
      // a human confirmation state or rewrite a stored entry.
      getShotAnalysisCompleteness(template, analysisFields, description)
      return {
        id: shot.id,
        projectId,
        order: index,
        startFrame: frames.first,
        endFrame: frames.last + 1,
        status: shotStatuses[shot.id] ?? "draft",
        detection: autoShotDetection[shot.id] ?? { source: "manual" },
        primaryScreenshotId: primaryShotScreenshotIds[shot.id] ?? null,
        screenshotIds: shotScreenshotIds[shot.id] ?? [],
        firstFrameScreenshotId: boundaryScreenshots.first,
        lastFrameScreenshotId: boundaryScreenshots.last,
        analysisFields,
        description,
        notes: shotNotes[shot.id]?.analysis ?? "",
        createdAt: currentProject.createdAt,
        updatedAt: now,
      }
    })
    const reconciledGroups = reconcileShotGroups(shotGroups, shots.map((shot) => shot.id))
    const updatedProject = await projectRepository.saveProjectEditorState({
      project: { ...currentProject, title: projectTitle, compositionOverlay, contentOverlay },
      shots: records,
      groups: reconciledGroups,
      markers: annotationMarkers,
      template: template as ProjectTemplateSnapshotRecord,
      researchRanges,
      researchContexts,
    }, expectedUpdatedAt)
    onProjectUpdated(updatedProject)
  }, [annotationMarkers, autoShotDetection, compositionOverlay, contentOverlay, currentProject, expectedUpdatedAt, frameRate, loadedProjectId, loadedShotGroupProjectId, onProjectUpdated, primaryShotScreenshotIds, projectId, projectTitle, researchContexts, researchRanges, shotBoundaryScreenshotIds, shotEntries, shotFrames, shotGroups, shotNotes, shotScreenshotIds, shotStatuses, shots, template])
}
