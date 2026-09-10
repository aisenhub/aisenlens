import type { AnalysisFieldEntry, ProjectAnalysisProfileSnapshot } from "../template/types";
import type { ShotDetectionMeta } from "../shot/types";
import type { AnnotationMarker } from "../annotation/types";
import type { ShotGroupRecord } from "../group/types";
import type { ShotRecord } from "../shot/types";
import type { CompositionOverlaySettings } from "../composition-overlay/types";
import type { ContentOverlaySettings } from "../content-overlay/types";
import type { AutoShotTaskRecord } from "../auto-shot/types";
import type { CalibrationAnnotationRecord } from "../scene-calibration/types";
import type { CalibrationDraft } from "../shot-calibration/types";
import type { ResearchContext, ResearchRange } from "../analysis/types";

export type MediaAssetStatus = "unlinked" | "linked" | "missing" | "unsupported";
export type MediaAssetKind = "video" | "audio";
export type MediaAssetOrigin = "imported";

export interface MediaSourceFingerprint {
  name: string;
  size: number;
  lastModified: number;
  mimeType: string;
}

export interface MediaAssetMetadata {
  durationSeconds: number;
  durationFrames: number | null;
  frameRate: number | null;
  width: number | null;
  height: number | null;
  hasAudio: boolean | null;
  audioChannelCount: number | null;
  audioSampleRate: number | null;
}

export interface MediaAsset {
  id: string;
  projectId: string;
  kind: MediaAssetKind;
  origin: MediaAssetOrigin;
  name: string;
  status: MediaAssetStatus;
  source: MediaSourceFingerprint | null;
  metadata: MediaAssetMetadata | null;
  linkedAt: string | null;
  relinkedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AudioClip {
  id: string;
  assetId: string;
  startFrame: number;
  inFrame: number;
  durationFrames: number;
  gainDb: number;
  muted: boolean;
  fadeInFrames: number;
  fadeOutFrames: number;
}

export interface AudioTrack {
  id: string;
  projectId: string;
  name: string;
  order: number;
  muted: boolean;
  gainDb: number;
  clips: AudioClip[];
}

export interface ScreenshotRecord {
  id: string;
  projectId: string;
  frame: number;
  capturedAt: string;
  width: number;
  height: number;
  mimeType: "image/jpeg";
  size: number;
  compositionOverlayIncluded: boolean;
  compositionOverlaySignature: string;
}

export interface DerivedFrameThumbnail {
  id: string;
  projectId: string;
  mediaFingerprint: MediaSourceFingerprint;
  frame: number;
  width: number;
  height: number;
  mimeType: "image/jpeg";
  size: number;
  createdAt: string;
  lastAccessedAt: string;
}

export interface DerivedWaveform {
  id: string;
  projectId: string;
  mediaFingerprint: MediaSourceFingerprint;
  durationSeconds: number;
  peaks: number[];
  createdAt: string;
  lastAccessedAt: string;
}

export interface StoredShotRecord {
  id: string;
  projectId: string;
  order: number;
  startFrame: number;
  endFrame: number;
  status: "draft" | "confirmed";
  detection: ShotDetectionMeta | null;
  primaryScreenshotId: string | null;
  screenshotIds: string[];
  firstFrameScreenshotId: string | null;
  lastFrameScreenshotId: string | null;
  analysisFields: Record<string, AnalysisFieldEntry>;
  description: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type ProjectTemplateSnapshotRecord = ProjectAnalysisProfileSnapshot;

export interface ProjectRecord {
  id: string;
  title: string;
  description: string;
  shots: number;
  notes: number;
  folderId: string | null;
  coverScreenshotId: string | null;
  mediaAssets: MediaAsset[];
  primaryVideoAssetId: string | null;
  audioTracks: AudioTrack[];
  compositionOverlay: CompositionOverlaySettings;
  contentOverlay: ContentOverlaySettings;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFolder {
  id: string;
  name: string;
  expanded: boolean;
}

export interface ProjectRecoverySnapshot {
  id: string;
  projectId: string;
  createdAt: string;
  project: ProjectRecord;
  shots: ShotRecord[];
  groups: ShotGroupRecord[];
  markers: AnnotationMarker[];
  template: ProjectTemplateSnapshotRecord | null;
  researchRanges?: ResearchRange[];
  researchContexts?: ResearchContext[];
}

export interface ProjectEditorState {
  project: ProjectRecord;
  shots: StoredShotRecord[];
  groups: ShotGroupRecord[];
  markers: AnnotationMarker[];
  template: ProjectTemplateSnapshotRecord | null;
  researchRanges?: ResearchRange[];
  researchContexts?: ResearchContext[];
}

export interface CreateProjectInput {
  title?: string;
  folderId?: string | null;
}

export interface ProjectRepository {
  listProjects: () => Promise<ProjectRecord[]>;
  getProject: (projectId: string) => Promise<ProjectRecord | null>;
  createProject: (input?: CreateProjectInput) => Promise<ProjectRecord>;
  updateProject: (project: ProjectRecord) => Promise<ProjectRecord>;
  updateProjectAtomically: (projectId: string, update: (project: ProjectRecord) => ProjectRecord) => Promise<ProjectRecord>;
  readProjectEditorState: (projectId: string) => Promise<ProjectEditorState | null>;
  saveProjectEditorState: (state: ProjectEditorState, expectedUpdatedAt?: string) => Promise<ProjectRecord>;
  deleteProject: (projectId: string) => Promise<void>;
  saveMediaAssetHandle: (assetId: string, handle: FileSystemFileHandle) => Promise<void>;
  getMediaAssetHandle: (assetId: string) => Promise<FileSystemFileHandle | null>;
  deleteMediaAssetHandle: (assetId: string) => Promise<void>;
  saveMediaAssetBlob: (assetId: string, blob: Blob) => Promise<void>;
  getMediaAssetBlob: (assetId: string) => Promise<Blob | null>;
  deleteMediaAssetBlob: (assetId: string) => Promise<void>;
  saveScreenshot: (screenshot: ScreenshotRecord, blob: Blob) => Promise<void>;
  getScreenshot: (screenshotId: string) => Promise<{ screenshot: ScreenshotRecord; blob: Blob } | null>;
  listProjectScreenshots: (projectId: string) => Promise<Array<{ screenshot: ScreenshotRecord; blob: Blob }>>;
  deleteScreenshot: (screenshotId: string) => Promise<void>;
  deleteProjectScreenshots: (projectId: string) => Promise<void>;
  listDerivedFrameThumbnails: (projectId: string, mediaFingerprint: MediaSourceFingerprint) => Promise<Array<{ thumbnail: DerivedFrameThumbnail; blob: Blob }>>;
  getDerivedFrameThumbnail: (projectId: string, mediaFingerprint: MediaSourceFingerprint, frame: number) => Promise<{ thumbnail: DerivedFrameThumbnail; blob: Blob } | null>;
  saveDerivedFrameThumbnail: (thumbnail: DerivedFrameThumbnail, blob: Blob) => Promise<void>;
  deleteProjectDerivedFrameThumbnails: (projectId: string) => Promise<void>;
  getDerivedWaveform: (projectId: string, mediaFingerprint: MediaSourceFingerprint) => Promise<DerivedWaveform | null>;
  saveDerivedWaveform: (waveform: DerivedWaveform) => Promise<void>;
  deleteProjectDerivedWaveform: (projectId: string) => Promise<void>;
  getAutoShotTask: (projectId: string, mediaIdentity: import("../auto-shot/mediaIdentity").AutoShotMediaIdentity) => Promise<AutoShotTaskRecord | null>;
  saveAutoShotTask: (task: AutoShotTaskRecord) => Promise<void>;
  deleteAutoShotTask: (projectId: string) => Promise<void>;
  getCalibrationAnnotation: (projectId: string, mediaIdentity: import("../auto-shot/mediaIdentity").AutoShotMediaIdentity) => Promise<CalibrationAnnotationRecord | null>;
  saveCalibrationAnnotation: (annotation: CalibrationAnnotationRecord) => Promise<void>;
  deleteCalibrationAnnotation: (projectId: string) => Promise<void>;
  getCalibrationDraft: (projectId: string, mediaIdentity: import("../auto-shot/mediaIdentity").AutoShotMediaIdentity) => Promise<CalibrationDraft | null>;
  saveCalibrationDraft: (draft: CalibrationDraft, expectedRevision?: number) => Promise<void>;
  deleteCalibrationDraft: (projectId: string, mediaIdentity?: import("../auto-shot/mediaIdentity").AutoShotMediaIdentity) => Promise<void>;
  applyCalibrationDraft: (input: { state: ProjectEditorState; draft: CalibrationDraft; expectedUpdatedAt: string; recoverySnapshotId: string; task: AutoShotTaskRecord | null }) => Promise<ProjectRecord>;
  listProjectShotGroups: (projectId: string) => Promise<ShotGroupRecord[]>;
  replaceProjectShotGroups: (projectId: string, groups: ShotGroupRecord[]) => Promise<void>;
  listProjectResearchRanges: (projectId: string) => Promise<ResearchRange[]>;
  saveProjectResearchRange: (range: ResearchRange, expectedRevision?: number) => Promise<void>;
  deleteProjectResearchRange: (projectId: string, rangeId: string) => Promise<void>;
  listProjectResearchContexts: (projectId: string) => Promise<ResearchContext[]>;
  saveProjectResearchContext: (context: ResearchContext, expectedRevision?: number) => Promise<void>;
  deleteProjectResearchContext: (projectId: string, contextId: string) => Promise<void>;
  listProjectAnnotationMarkers: (projectId: string) => Promise<AnnotationMarker[]>;
  replaceProjectAnnotationMarkers: (projectId: string, markers: AnnotationMarker[]) => Promise<void>;
  saveProjectAnnotationMarker: (marker: AnnotationMarker) => Promise<void>;
  deleteProjectAnnotationMarker: (markerId: string) => Promise<void>;
  listProjectShots: (projectId: string) => Promise<StoredShotRecord[]>;
  replaceProjectShots: (projectId: string, shots: StoredShotRecord[]) => Promise<ProjectRecord>;
  getProjectTemplate: (projectId: string) => Promise<ProjectTemplateSnapshotRecord | null>;
  saveProjectTemplate: (template: ProjectTemplateSnapshotRecord) => Promise<void>;
  deleteProjectTemplate: (projectId: string) => Promise<void>;
  listProjectRecoverySnapshots: (projectId: string) => Promise<ProjectRecoverySnapshot[]>;
  saveProjectRecoverySnapshot: (snapshot: ProjectRecoverySnapshot) => Promise<void>;
  restoreProjectRecoverySnapshot: (snapshot: ProjectRecoverySnapshot) => Promise<void>;
  deleteProjectRecoverySnapshot: (snapshotId: string) => Promise<void>;
  clearDerivedCaches: () => Promise<void>;
}
