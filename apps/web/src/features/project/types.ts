import type { AnalysisFieldValue } from "../template/types";
import type { ShotDetectionMeta } from "../shot/types";
import type { AnnotationMarker } from "../annotation/types";
import type { ShotGroupRecord } from "../group/types";
import type { ShotRecord } from "../shot/types";
import type { CompositionOverlaySettings } from "../composition-overlay/types";
import type { ContentOverlaySettings } from "../content-overlay/types";
import type { AutoShotTaskRecord } from "../auto-shot/types";

export type MediaAssetStatus = "unlinked" | "linked" | "missing" | "unsupported";
export type MediaAssetKind = "video" | "audio";
export type MediaAssetOrigin = "imported" | "recorded";

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
  analysisFields: Record<string, AnalysisFieldValue>;
  description: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTemplateSnapshotRecord {
  id: string;
  projectId: string;
  name: string;
  version: number;
  fields: Array<{
    id: string;
    label: string;
    kind: "single-select" | "multi-select" | "text" | "number" | "boolean";
    order: number;
    options: string[];
    referenceTerms: Array<{ label: string; hint: string }>;
    required: boolean;
    isFixed: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}

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
  listProjectShotGroups: (projectId: string) => Promise<ShotGroupRecord[]>;
  replaceProjectShotGroups: (projectId: string, groups: ShotGroupRecord[]) => Promise<void>;
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
