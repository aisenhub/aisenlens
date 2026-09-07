import { useCallback } from "react";
import projectRepository from "../../project/services/projectRepository";
import type { ProjectRecord, ProjectTemplateSnapshotRecord } from "../../project/types";
import type { AnnotationMarker } from "../../annotation/types";
import type { ShotGroupRecord } from "../../group/types";
import { reconcileShotGroups } from "../../group/services/groupService";
import type { ShotDetectionMeta, ShotRecord } from "../../shot/types";
import type { AnalysisFieldValue, ProjectTemplateSnapshot } from "../../template/types";
import { getShotAnalysisCompleteness, normalizeShotAnalysisFields } from "../../template/services/templateValidation";
import type { ShotData } from "../constants/editorData";

interface UseEditorPersistenceInput {
  projectId: string;
  projectTitle: string;
  compositionOverlay: ProjectRecord["compositionOverlay"];
  contentOverlay: ProjectRecord["contentOverlay"];
  frameRate: number;
  shots: ShotData[];
  shotFrames: Record<string, { first: number; last: number }>;
  shotScreenshotIds: Record<string, string[]>;
  primaryShotScreenshotIds: Record<string, string | null>;
  shotBoundaryScreenshotIds: Record<string, { first: string | null; last: string | null }>;
  shotNotes: Record<string, { content: string; analysis: string }>;
  shotDims: Record<string, Record<string, AnalysisFieldValue>>;
  shotGroups: ShotGroupRecord[];
  annotationMarkers: AnnotationMarker[];
  template: ProjectTemplateSnapshot | null;
  loadedProjectId: string | null;
  loadedShotGroupProjectId: string | null;
  autoShotDetection: Record<string, ShotDetectionMeta>;
  onProjectUpdated: (project: ProjectRecord) => void;
}

export default function useEditorPersistence(input: UseEditorPersistenceInput) {
  const {
    projectId, projectTitle, compositionOverlay, contentOverlay, frameRate, shots,
    shotFrames, shotScreenshotIds, primaryShotScreenshotIds, shotBoundaryScreenshotIds,
    shotNotes, shotDims, shotGroups, annotationMarkers, template, loadedProjectId,
    loadedShotGroupProjectId, autoShotDetection, onProjectUpdated,
  } = input;

  return useCallback(async () => {
    if (loadedProjectId !== projectId || loadedShotGroupProjectId !== projectId || !template) return;
    const now = new Date().toISOString();
    const records: ShotRecord[] = shots.map((shot, index) => {
      const frames = shotFrames[shot.id] ?? {
        first: Math.round(shot.start * frameRate),
        last: Math.max(0, Math.round((shot.start + shot.duration) * frameRate) - 1),
      };
      const description = shotNotes[shot.id]?.content ?? "";
      const analysisFields = normalizeShotAnalysisFields(template.fields, shotDims[shot.id] ?? {});
      const completeness = getShotAnalysisCompleteness(template.fields, analysisFields, description);
      const boundaryScreenshots = shotBoundaryScreenshotIds[shot.id] ?? { first: null, last: null };
      return {
        id: shot.id,
        projectId,
        order: index,
        startFrame: frames.first,
        endFrame: frames.last + 1,
        status: completeness.missingRequiredFields.length ? "draft" : "confirmed",
        detection: autoShotDetection[shot.id] ?? { source: "manual" },
        primaryScreenshotId: primaryShotScreenshotIds[shot.id] ?? null,
        screenshotIds: shotScreenshotIds[shot.id] ?? [],
        firstFrameScreenshotId: boundaryScreenshots.first,
        lastFrameScreenshotId: boundaryScreenshots.last,
        analysisFields,
        description,
        notes: shotNotes[shot.id]?.analysis ?? "",
        createdAt: now,
        updatedAt: now,
      };
    });
    const reconciledGroups = reconcileShotGroups(shotGroups, shots.map((shot) => shot.id));
    const latestProject = await projectRepository.getProject(projectId);
    if (!latestProject) throw new Error("项目已不存在，无法保存当前编辑。");
    const updatedProject = await projectRepository.saveProjectEditorState({
      project: { ...latestProject, title: projectTitle, compositionOverlay, contentOverlay },
      shots: records,
      groups: reconciledGroups,
      markers: annotationMarkers,
      template: template as ProjectTemplateSnapshotRecord,
    }, latestProject.updatedAt);
    onProjectUpdated(updatedProject);
  }, [annotationMarkers, autoShotDetection, compositionOverlay, contentOverlay, frameRate, loadedProjectId, loadedShotGroupProjectId, onProjectUpdated, primaryShotScreenshotIds, projectId, projectTitle, shotBoundaryScreenshotIds, shotDims, shotFrames, shotGroups, shotNotes, shotScreenshotIds, shots, template]);
}
