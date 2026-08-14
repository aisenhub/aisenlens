import type { AutoShotRunRecord, CreateProjectInput, DerivedFrameThumbnail, DerivedWaveform, MediaAsset, MediaAssetMetadata, MediaSourceFingerprint, ProjectRecord, ProjectRepository, ProjectTemplateSnapshotRecord, ScreenshotRecord, StoredShotRecord } from "../types";
import type { AnnotationMarker } from "../../annotation/types";
import type { ShotGroupRecord } from "../../group/types";
import { DEFAULT_COMPOSITION_OVERLAY_SETTINGS, normalizeCompositionOverlaySettings } from "../../composition-overlay/types";
import { DEFAULT_CONTENT_OVERLAY_SETTINGS, normalizeContentOverlaySettings } from "../../content-overlay/types";

const DATABASE_NAME = "aisenlens-projects";
const DATABASE_VERSION = 12;
const PROJECTS_STORE = "projects";
const LEGACY_MEDIA_HANDLES_STORE = "media-handles";
const MEDIA_ASSET_HANDLES_STORE = "media-asset-handles";
const MEDIA_ASSET_BLOBS_STORE = "media-asset-blobs";
const SCREENSHOTS_STORE = "screenshots";
const SCREENSHOT_BLOBS_STORE = "screenshot-blobs";
const SHOTS_STORE = "shots";
const PROJECT_TEMPLATES_STORE = "project-templates";
const ANNOTATION_MARKERS_STORE = "annotation-markers";
const DERIVED_FRAME_THUMBNAILS_STORE = "derived-frame-thumbnails";
const DERIVED_WAVEFORMS_STORE = "derived-waveforms";
const AUTO_SHOT_RUNS_STORE = "auto-shot-runs";
const SHOT_GROUPS_STORE = "shot-groups";
const RECOVERY_SNAPSHOTS_STORE = "recovery-snapshots";

interface MediaHandleRecord {
  assetId: string;
  handle: FileSystemFileHandle;
}

interface LegacyProjectMedia {
  status: MediaAsset["status"];
  source: MediaSourceFingerprint | null;
  metadata: Omit<MediaAssetMetadata, "durationFrames" | "width" | "height" | "audioChannelCount" | "audioSampleRate"> & {
    durationFrames: number;
    width: number;
    height: number;
  } | null;
  linkedAt: string | null;
  relinkedAt: string | null;
}

interface LegacyProjectRecord extends Omit<ProjectRecord, "mediaAssets" | "primaryVideoAssetId" | "audioTracks"> {
  media?: LegacyProjectMedia;
  mediaAssets?: unknown;
  primaryVideoAssetId?: unknown;
  audioTracks?: unknown;
}

interface MediaAssetBlobRecord {
  assetId: string;
  blob: Blob;
}

interface ScreenshotBlobRecord {
  id: string;
  blob: Blob;
}

interface DerivedFrameThumbnailBlobRecord {
  id: string;
  blob: Blob;
}

let databasePromise: Promise<IDBDatabase> | null = null;

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("本地项目数据操作失败。"));
  });
}

function transactionResult(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("本地项目数据保存失败。"));
    transaction.onabort = () => reject(transaction.error ?? new Error("本地项目数据保存已取消。"));
  });
}

function deleteProjectShotRecords(store: IDBObjectStore, projectId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = store.index("projectId").openCursor(IDBKeyRange.only(projectId));
    request.onerror = () => reject(request.error ?? new Error("无法清理项目分镜数据。"));
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }
      const deleteRequest = cursor.delete();
      deleteRequest.onerror = () => reject(deleteRequest.error ?? new Error("无法清理项目分镜数据。"));
      deleteRequest.onsuccess = () => cursor.continue();
    };
  });
}

function deleteProjectRecords(store: IDBObjectStore, projectId: string): void {
  const request = store.index("projectId").openCursor(IDBKeyRange.only(projectId));
  request.onsuccess = () => {
    const cursor = request.result;
    if (!cursor) return;
    cursor.delete();
    cursor.continue();
  };
}

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => reject(request.error ?? new Error("无法打开本地项目仓库。"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PROJECTS_STORE)) {
        const projects = database.createObjectStore(PROJECTS_STORE, { keyPath: "id" });
        projects.createIndex("updatedAt", "updatedAt", { unique: false });
        projects.createIndex("folderId", "folderId", { unique: false });
      }
      if (!database.objectStoreNames.contains(MEDIA_ASSET_HANDLES_STORE)) {
        database.createObjectStore(MEDIA_ASSET_HANDLES_STORE, { keyPath: "assetId" });
      }
      if (!database.objectStoreNames.contains(MEDIA_ASSET_BLOBS_STORE)) {
        database.createObjectStore(MEDIA_ASSET_BLOBS_STORE, { keyPath: "assetId" });
      }
      if (!database.objectStoreNames.contains(SCREENSHOTS_STORE)) {
        const screenshots = database.createObjectStore(SCREENSHOTS_STORE, { keyPath: "id" });
        screenshots.createIndex("projectId", "projectId", { unique: false });
      }
      if (!database.objectStoreNames.contains(SCREENSHOT_BLOBS_STORE)) {
        database.createObjectStore(SCREENSHOT_BLOBS_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(SHOTS_STORE)) {
        const shots = database.createObjectStore(SHOTS_STORE, { keyPath: "id" });
        shots.createIndex("projectId", "projectId", { unique: false });
      }
      if (!database.objectStoreNames.contains(PROJECT_TEMPLATES_STORE)) {
        const templates = database.createObjectStore(PROJECT_TEMPLATES_STORE, { keyPath: "id" });
        templates.createIndex("projectId", "projectId", { unique: true });
      }
      if (!database.objectStoreNames.contains(ANNOTATION_MARKERS_STORE)) {
        const markers = database.createObjectStore(ANNOTATION_MARKERS_STORE, { keyPath: "id" });
        markers.createIndex("projectId", "projectId", { unique: false });
        markers.createIndex("projectFrame", ["projectId", "frame"], { unique: false });
      }
      if (!database.objectStoreNames.contains(DERIVED_FRAME_THUMBNAILS_STORE)) {
        const thumbnails = database.createObjectStore(DERIVED_FRAME_THUMBNAILS_STORE, { keyPath: "id" });
        thumbnails.createIndex("projectId", "projectId", { unique: false });
        thumbnails.createIndex("projectFrame", ["projectId", "frame"], { unique: true });
      }
      if (!database.objectStoreNames.contains(DERIVED_WAVEFORMS_STORE)) {
        const waveforms = database.createObjectStore(DERIVED_WAVEFORMS_STORE, { keyPath: "id" });
        waveforms.createIndex("projectId", "projectId", { unique: true });
      }
      if (!database.objectStoreNames.contains(AUTO_SHOT_RUNS_STORE)) {
        const runs = database.createObjectStore(AUTO_SHOT_RUNS_STORE, { keyPath: "id" });
        runs.createIndex("projectId", "projectId", { unique: true });
      }
      if (!database.objectStoreNames.contains(SHOT_GROUPS_STORE)) {
        const groups = database.createObjectStore(SHOT_GROUPS_STORE, { keyPath: "id" });
        groups.createIndex("projectId", "projectId", { unique: false });
      }
      if (!database.objectStoreNames.contains(RECOVERY_SNAPSHOTS_STORE)) {
        const snapshots = database.createObjectStore(RECOVERY_SNAPSHOTS_STORE, { keyPath: "id" });
        snapshots.createIndex("projectId", "projectId", { unique: false });
        snapshots.createIndex("projectCreatedAt", ["projectId", "createdAt"], { unique: false });
      }
    };
  });

  return databasePromise;
}

function normalizeProject(project: ProjectRecord): ProjectRecord {
  return { ...project, compositionOverlay: normalizeCompositionOverlaySettings(project.compositionOverlay), contentOverlay: normalizeContentOverlaySettings(project.contentOverlay) };
}

function hasMediaAssetLibrary(project: LegacyProjectRecord): boolean {
  return Array.isArray(project.mediaAssets) && Array.isArray(project.audioTracks) && (typeof project.primaryVideoAssetId === "string" || project.primaryVideoAssetId === null);
}

function convertLegacyProjectRecord(project: LegacyProjectRecord): ProjectRecord {
  const { media, mediaAssets: _mediaAssets, primaryVideoAssetId: _primaryVideoAssetId, audioTracks: _audioTracks, ...baseProject } = project;
  const source = media?.source ?? null;
  const metadata = media?.metadata ?? null;
  const asset: MediaAsset | null = source ? {
    id: project.id,
    projectId: project.id,
    kind: "video",
    origin: "imported",
    name: source.name,
    status: media?.status ?? "unlinked",
    source,
    metadata: metadata ? {
      ...metadata,
      durationFrames: metadata.durationFrames || null,
      width: metadata.width || null,
      height: metadata.height || null,
      audioChannelCount: null,
      audioSampleRate: null,
    } : null,
    linkedAt: media?.linkedAt ?? null,
    relinkedAt: media?.relinkedAt ?? null,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  } : null;
  return {
    ...baseProject,
    mediaAssets: asset ? [asset] : [],
    primaryVideoAssetId: asset?.id ?? null,
    audioTracks: [],
  };
}

async function persistConvertedLegacyProject(project: LegacyProjectRecord): Promise<ProjectRecord> {
  const converted = convertLegacyProjectRecord(project);
  const database = await openDatabase();
  const storeNames = [PROJECTS_STORE, MEDIA_ASSET_HANDLES_STORE] as string[];
  if (database.objectStoreNames.contains(LEGACY_MEDIA_HANDLES_STORE)) storeNames.push(LEGACY_MEDIA_HANDLES_STORE);
  const transaction = database.transaction(storeNames, "readwrite");
  transaction.objectStore(PROJECTS_STORE).put(converted);
  const primaryVideoAsset = converted.mediaAssets.find((asset) => asset.id === converted.primaryVideoAssetId);
  if (primaryVideoAsset && database.objectStoreNames.contains(LEGACY_MEDIA_HANDLES_STORE)) {
    const legacyHandle = await requestResult(transaction.objectStore(LEGACY_MEDIA_HANDLES_STORE).get(project.id)) as { projectId: string; handle: FileSystemFileHandle } | undefined;
    if (legacyHandle) {
      transaction.objectStore(MEDIA_ASSET_HANDLES_STORE).put({ assetId: primaryVideoAsset.id, handle: legacyHandle.handle } satisfies MediaHandleRecord);
      transaction.objectStore(LEGACY_MEDIA_HANDLES_STORE).delete(project.id);
    }
  }
  await transactionResult(transaction);
  return normalizeProject(converted);
}

async function readCurrentProject(project: LegacyProjectRecord | undefined): Promise<ProjectRecord | null> {
  if (!project) return null;
  return hasMediaAssetLibrary(project) ? normalizeProject(project as ProjectRecord) : persistConvertedLegacyProject(project);
}

function createDefaultTitle(): string {
  return "未命名拉片项目";
}

export function createProjectRepository(): ProjectRepository {
  return {
    async listProjects() {
      const database = await openDatabase();
      const transaction = database.transaction(PROJECTS_STORE, "readonly");
      const projects = await requestResult(transaction.objectStore(PROJECTS_STORE).getAll()) as LegacyProjectRecord[];
      const currentProjects = await Promise.all(projects.map(readCurrentProject));
      return currentProjects.filter((project): project is ProjectRecord => Boolean(project)).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    },

    async getProject(projectId) {
      const database = await openDatabase();
      const transaction = database.transaction(PROJECTS_STORE, "readonly");
      const project = await requestResult(transaction.objectStore(PROJECTS_STORE).get(projectId)) as LegacyProjectRecord | undefined;
      return readCurrentProject(project);
    },

    async createProject(input: CreateProjectInput = {}) {
      const now = new Date().toISOString();
      const project: ProjectRecord = {
        id: crypto.randomUUID(),
        title: input.title?.trim() || createDefaultTitle(),
        description: "",
        shots: 0,
        notes: 0,
        folderId: input.folderId ?? null,
        coverScreenshotId: null,
        mediaAssets: [],
        primaryVideoAssetId: null,
        audioTracks: [],
        compositionOverlay: DEFAULT_COMPOSITION_OVERLAY_SETTINGS,
        contentOverlay: DEFAULT_CONTENT_OVERLAY_SETTINGS,
        createdAt: now,
        updatedAt: now,
      };
      const database = await openDatabase();
      const transaction = database.transaction(PROJECTS_STORE, "readwrite");
      transaction.objectStore(PROJECTS_STORE).add(project);
      await transactionResult(transaction);
      return project;
    },

    async updateProject(project: ProjectRecord) {
      const updatedProject: ProjectRecord = { ...normalizeProject(project), updatedAt: new Date().toISOString() };
      const database = await openDatabase();
      const transaction = database.transaction(PROJECTS_STORE, "readwrite");
      transaction.objectStore(PROJECTS_STORE).put(updatedProject);
      await transactionResult(transaction);
      return updatedProject;
    },

    async deleteProject(projectId: string) {
      const database = await openDatabase();
      const transaction = database.transaction([PROJECTS_STORE, MEDIA_ASSET_HANDLES_STORE, MEDIA_ASSET_BLOBS_STORE, SCREENSHOTS_STORE, SCREENSHOT_BLOBS_STORE, SHOTS_STORE, PROJECT_TEMPLATES_STORE, ANNOTATION_MARKERS_STORE, DERIVED_FRAME_THUMBNAILS_STORE, DERIVED_WAVEFORMS_STORE, AUTO_SHOT_RUNS_STORE, SHOT_GROUPS_STORE, RECOVERY_SNAPSHOTS_STORE], "readwrite");
      const mediaAssets = await requestResult(transaction.objectStore(PROJECTS_STORE).get(projectId)) as ProjectRecord | undefined;
      mediaAssets?.mediaAssets.forEach((asset) => {
        transaction.objectStore(MEDIA_ASSET_HANDLES_STORE).delete(asset.id);
        transaction.objectStore(MEDIA_ASSET_BLOBS_STORE).delete(asset.id);
      });
      transaction.objectStore(PROJECTS_STORE).delete(projectId);
      const screenshotIndex = transaction.objectStore(SCREENSHOTS_STORE).index("projectId");
      const screenshotRequest = screenshotIndex.openCursor(IDBKeyRange.only(projectId));
      screenshotRequest.onsuccess = () => {
        const cursor = screenshotRequest.result;
        if (!cursor) return;
        transaction.objectStore(SCREENSHOT_BLOBS_STORE).delete((cursor.value as ScreenshotRecord).id);
        cursor.delete();
        cursor.continue();
      };
      const shotIndex = transaction.objectStore(SHOTS_STORE).index("projectId");
      const shotRequest = shotIndex.openCursor(IDBKeyRange.only(projectId));
      shotRequest.onsuccess = () => {
        const cursor = shotRequest.result;
        if (!cursor) return;
        cursor.delete();
        cursor.continue();
      };
      deleteProjectRecords(transaction.objectStore(PROJECT_TEMPLATES_STORE), projectId);
      deleteProjectRecords(transaction.objectStore(ANNOTATION_MARKERS_STORE), projectId);
      deleteProjectRecords(transaction.objectStore(DERIVED_FRAME_THUMBNAILS_STORE), projectId);
      transaction.objectStore(DERIVED_WAVEFORMS_STORE).index("projectId").openCursor(IDBKeyRange.only(projectId)).onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (!cursor) return;
        cursor.delete();
        cursor.continue();
      };
      transaction.objectStore(AUTO_SHOT_RUNS_STORE).index("projectId").openCursor(IDBKeyRange.only(projectId)).onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (!cursor) return;
        cursor.delete();
        cursor.continue();
      };
      deleteProjectRecords(transaction.objectStore(SHOT_GROUPS_STORE), projectId);
      deleteProjectRecords(transaction.objectStore(RECOVERY_SNAPSHOTS_STORE), projectId);
      await transactionResult(transaction);
    },

    async saveMediaAssetHandle(assetId: string, handle: FileSystemFileHandle) {
      const database = await openDatabase();
      const transaction = database.transaction(MEDIA_ASSET_HANDLES_STORE, "readwrite");
      transaction.objectStore(MEDIA_ASSET_HANDLES_STORE).put({ assetId, handle } satisfies MediaHandleRecord);
      await transactionResult(transaction);
    },

    async getMediaAssetHandle(assetId: string) {
      const database = await openDatabase();
      const transaction = database.transaction(MEDIA_ASSET_HANDLES_STORE, "readonly");
      const record = await requestResult(transaction.objectStore(MEDIA_ASSET_HANDLES_STORE).get(assetId)) as MediaHandleRecord | undefined;
      return record?.handle ?? null;
    },

    async deleteMediaAssetHandle(assetId: string) {
      const database = await openDatabase();
      const transaction = database.transaction(MEDIA_ASSET_HANDLES_STORE, "readwrite");
      transaction.objectStore(MEDIA_ASSET_HANDLES_STORE).delete(assetId);
      await transactionResult(transaction);
    },

    async saveMediaAssetBlob(assetId: string, blob: Blob) {
      const database = await openDatabase();
      const transaction = database.transaction(MEDIA_ASSET_BLOBS_STORE, "readwrite");
      transaction.objectStore(MEDIA_ASSET_BLOBS_STORE).put({ assetId, blob } satisfies MediaAssetBlobRecord);
      await transactionResult(transaction);
    },

    async getMediaAssetBlob(assetId: string) {
      const database = await openDatabase();
      const transaction = database.transaction(MEDIA_ASSET_BLOBS_STORE, "readonly");
      const record = await requestResult(transaction.objectStore(MEDIA_ASSET_BLOBS_STORE).get(assetId)) as MediaAssetBlobRecord | undefined;
      return record?.blob ?? null;
    },

    async deleteMediaAssetBlob(assetId: string) {
      const database = await openDatabase();
      const transaction = database.transaction(MEDIA_ASSET_BLOBS_STORE, "readwrite");
      transaction.objectStore(MEDIA_ASSET_BLOBS_STORE).delete(assetId);
      await transactionResult(transaction);
    },

    async saveScreenshot(screenshot: ScreenshotRecord, blob: Blob) {
      const database = await openDatabase();
      const transaction = database.transaction([SCREENSHOTS_STORE, SCREENSHOT_BLOBS_STORE], "readwrite");
      transaction.objectStore(SCREENSHOTS_STORE).put(screenshot);
      transaction.objectStore(SCREENSHOT_BLOBS_STORE).put({ id: screenshot.id, blob } satisfies ScreenshotBlobRecord);
      await transactionResult(transaction);
    },

    async getScreenshot(screenshotId: string) {
      const database = await openDatabase();
      const transaction = database.transaction([SCREENSHOTS_STORE, SCREENSHOT_BLOBS_STORE], "readonly");
      const [screenshot, blobRecord] = await Promise.all([
        requestResult(transaction.objectStore(SCREENSHOTS_STORE).get(screenshotId)) as Promise<ScreenshotRecord | undefined>,
        requestResult(transaction.objectStore(SCREENSHOT_BLOBS_STORE).get(screenshotId)) as Promise<ScreenshotBlobRecord | undefined>,
      ]);
      if (!screenshot || !blobRecord) return null;
      return { screenshot, blob: blobRecord.blob };
    },

    async listProjectScreenshots(projectId: string) {
      const database = await openDatabase();
      const transaction = database.transaction(SCREENSHOTS_STORE, "readonly");
      const screenshots = await requestResult(transaction.objectStore(SCREENSHOTS_STORE).index("projectId").getAll(IDBKeyRange.only(projectId))) as ScreenshotRecord[];
      const resources = await Promise.all(screenshots.map(async (screenshot) => {
        const blobTransaction = database.transaction(SCREENSHOT_BLOBS_STORE, "readonly");
        const blobRecord = await requestResult(blobTransaction.objectStore(SCREENSHOT_BLOBS_STORE).get(screenshot.id)) as ScreenshotBlobRecord | undefined;
        return blobRecord ? { screenshot, blob: blobRecord.blob } : null;
      }));
      return resources.filter((resource): resource is { screenshot: ScreenshotRecord; blob: Blob } => Boolean(resource));
    },

    async deleteScreenshot(screenshotId: string) {
      const database = await openDatabase();
      const transaction = database.transaction([SCREENSHOTS_STORE, SCREENSHOT_BLOBS_STORE], "readwrite");
      transaction.objectStore(SCREENSHOTS_STORE).delete(screenshotId);
      transaction.objectStore(SCREENSHOT_BLOBS_STORE).delete(screenshotId);
      await transactionResult(transaction);
    },

    async deleteProjectScreenshots(projectId: string) {
      const database = await openDatabase();
      const transaction = database.transaction([SCREENSHOTS_STORE, SCREENSHOT_BLOBS_STORE], "readwrite");
      const index = transaction.objectStore(SCREENSHOTS_STORE).index("projectId");
      const request = index.openCursor(IDBKeyRange.only(projectId));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        transaction.objectStore(SCREENSHOT_BLOBS_STORE).delete((cursor.value as ScreenshotRecord).id);
        cursor.delete();
        cursor.continue();
      };
      await transactionResult(transaction);
    },

    async listDerivedFrameThumbnails(projectId: string, mediaFingerprint: MediaSourceFingerprint) {
      const database = await openDatabase();
      const transaction = database.transaction(DERIVED_FRAME_THUMBNAILS_STORE, "readonly");
      const records = await requestResult(transaction.objectStore(DERIVED_FRAME_THUMBNAILS_STORE).index("projectId").getAll(IDBKeyRange.only(projectId))) as Array<DerivedFrameThumbnail & Partial<DerivedFrameThumbnailBlobRecord>>;
      return records
        .filter((thumbnail) => thumbnail.mediaFingerprint.name === mediaFingerprint.name && thumbnail.mediaFingerprint.size === mediaFingerprint.size && thumbnail.mediaFingerprint.lastModified === mediaFingerprint.lastModified && thumbnail.mediaFingerprint.mimeType === mediaFingerprint.mimeType && thumbnail.blob instanceof Blob)
        .map((thumbnail) => ({ thumbnail, blob: thumbnail.blob! }))
        .sort((left, right) => left.thumbnail.frame - right.thumbnail.frame);
    },

    async getDerivedFrameThumbnail(projectId: string, mediaFingerprint: MediaSourceFingerprint, frame: number) {
      const database = await openDatabase();
      const transaction = database.transaction(DERIVED_FRAME_THUMBNAILS_STORE, "readonly");
      const record = await requestResult(transaction.objectStore(DERIVED_FRAME_THUMBNAILS_STORE).get(`frame-thumbnail:${projectId}:${frame}`)) as (DerivedFrameThumbnail & Partial<DerivedFrameThumbnailBlobRecord>) | undefined;
      if (!record || !(record.blob instanceof Blob)) return null;
      const fingerprint = record.mediaFingerprint;
      const matches = fingerprint.name === mediaFingerprint.name && fingerprint.size === mediaFingerprint.size && fingerprint.lastModified === mediaFingerprint.lastModified && fingerprint.mimeType === mediaFingerprint.mimeType;
      return matches ? { thumbnail: record, blob: record.blob } : null;
    },

    async saveDerivedFrameThumbnail(thumbnail: DerivedFrameThumbnail, blob: Blob) {
      const database = await openDatabase();
      const transaction = database.transaction(DERIVED_FRAME_THUMBNAILS_STORE, "readwrite");
      transaction.objectStore(DERIVED_FRAME_THUMBNAILS_STORE).put({ ...thumbnail, blob } satisfies DerivedFrameThumbnail & DerivedFrameThumbnailBlobRecord);
      await transactionResult(transaction);
    },

    async deleteProjectDerivedFrameThumbnails(projectId: string) {
      const database = await openDatabase();
      const transaction = database.transaction(DERIVED_FRAME_THUMBNAILS_STORE, "readwrite");
      deleteProjectRecords(transaction.objectStore(DERIVED_FRAME_THUMBNAILS_STORE), projectId);
      await transactionResult(transaction);
    },

    async getDerivedWaveform(projectId: string, mediaFingerprint: MediaSourceFingerprint) {
      const database = await openDatabase();
      const transaction = database.transaction(DERIVED_WAVEFORMS_STORE, "readonly");
      const waveform = await requestResult(transaction.objectStore(DERIVED_WAVEFORMS_STORE).index("projectId").get(projectId)) as DerivedWaveform | undefined;
      if (!waveform) return null;
      return waveform.mediaFingerprint.name === mediaFingerprint.name && waveform.mediaFingerprint.size === mediaFingerprint.size && waveform.mediaFingerprint.lastModified === mediaFingerprint.lastModified && waveform.mediaFingerprint.mimeType === mediaFingerprint.mimeType ? waveform : null;
    },

    async saveDerivedWaveform(waveform: DerivedWaveform) {
      const database = await openDatabase();
      const transaction = database.transaction(DERIVED_WAVEFORMS_STORE, "readwrite");
      transaction.objectStore(DERIVED_WAVEFORMS_STORE).put(waveform);
      await transactionResult(transaction);
    },

    async deleteProjectDerivedWaveform(projectId: string) {
      const database = await openDatabase();
      const transaction = database.transaction(DERIVED_WAVEFORMS_STORE, "readwrite");
      const store = transaction.objectStore(DERIVED_WAVEFORMS_STORE);
      const request = store.index("projectId").openCursor(IDBKeyRange.only(projectId));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        cursor.delete();
        cursor.continue();
      };
      await transactionResult(transaction);
    },

    async getProjectAutoShotRun(projectId: string, mediaFingerprint: MediaSourceFingerprint) {
      const database = await openDatabase();
      const transaction = database.transaction(AUTO_SHOT_RUNS_STORE, "readonly");
      const run = await requestResult(transaction.objectStore(AUTO_SHOT_RUNS_STORE).index("projectId").get(projectId)) as AutoShotRunRecord | undefined;
      if (!run) return null;
      return run.mediaFingerprint.name === mediaFingerprint.name && run.mediaFingerprint.size === mediaFingerprint.size && run.mediaFingerprint.lastModified === mediaFingerprint.lastModified && run.mediaFingerprint.mimeType === mediaFingerprint.mimeType ? run : null;
    },

    async saveProjectAutoShotRun(run: AutoShotRunRecord) {
      const database = await openDatabase();
      const transaction = database.transaction(AUTO_SHOT_RUNS_STORE, "readwrite");
      transaction.objectStore(AUTO_SHOT_RUNS_STORE).put({ ...run, updatedAt: new Date().toISOString() });
      await transactionResult(transaction);
    },

    async deleteProjectAutoShotRun(projectId: string) {
      const database = await openDatabase();
      const transaction = database.transaction(AUTO_SHOT_RUNS_STORE, "readwrite");
      const request = transaction.objectStore(AUTO_SHOT_RUNS_STORE).index("projectId").openCursor(IDBKeyRange.only(projectId));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        cursor.delete();
        cursor.continue();
      };
      await transactionResult(transaction);
    },

    async listProjectShotGroups(projectId: string) {
      const database = await openDatabase();
      const transaction = database.transaction(SHOT_GROUPS_STORE, "readonly");
      const groups = await requestResult(transaction.objectStore(SHOT_GROUPS_STORE).index("projectId").getAll(IDBKeyRange.only(projectId))) as ShotGroupRecord[];
      return groups.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    },

    async replaceProjectShotGroups(projectId: string, groups: ShotGroupRecord[]) {
      const database = await openDatabase();
      const transaction = database.transaction(SHOT_GROUPS_STORE, "readwrite");
      const store = transaction.objectStore(SHOT_GROUPS_STORE);
      const request = store.index("projectId").openCursor(IDBKeyRange.only(projectId));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        cursor.delete();
        cursor.continue();
      };
      groups.forEach((group) => store.put({ ...group, projectId, updatedAt: new Date().toISOString() }));
      await transactionResult(transaction);
    },

    async listProjectAnnotationMarkers(projectId: string) {
      const database = await openDatabase();
      const transaction = database.transaction(ANNOTATION_MARKERS_STORE, "readonly");
      const markers = await requestResult(transaction.objectStore(ANNOTATION_MARKERS_STORE).index("projectId").getAll(IDBKeyRange.only(projectId))) as AnnotationMarker[];
      return markers.sort((left, right) => left.frame - right.frame || left.createdAt.localeCompare(right.createdAt));
    },

    async replaceProjectAnnotationMarkers(projectId: string, markers: AnnotationMarker[]) {
      const database = await openDatabase();
      const transaction = database.transaction(ANNOTATION_MARKERS_STORE, "readwrite");
      const store = transaction.objectStore(ANNOTATION_MARKERS_STORE);
      const request = store.index("projectId").openCursor(IDBKeyRange.only(projectId));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        cursor.delete();
        cursor.continue();
      };
      markers.forEach((marker) => store.put({ ...marker, projectId }));
      await transactionResult(transaction);
    },

    async saveProjectAnnotationMarker(marker: AnnotationMarker) {
      const database = await openDatabase();
      const transaction = database.transaction(ANNOTATION_MARKERS_STORE, "readwrite");
      transaction.objectStore(ANNOTATION_MARKERS_STORE).put({ ...marker, updatedAt: new Date().toISOString() });
      await transactionResult(transaction);
    },

    async deleteProjectAnnotationMarker(markerId: string) {
      const database = await openDatabase();
      const transaction = database.transaction(ANNOTATION_MARKERS_STORE, "readwrite");
      transaction.objectStore(ANNOTATION_MARKERS_STORE).delete(markerId);
      await transactionResult(transaction);
    },

    async listProjectShots(projectId: string) {
      const database = await openDatabase();
      const transaction = database.transaction(SHOTS_STORE, "readonly");
      const index = transaction.objectStore(SHOTS_STORE).index("projectId");
      const shots = await requestResult(index.getAll(IDBKeyRange.only(projectId))) as StoredShotRecord[];
      return shots.sort((left, right) => left.order - right.order);
    },

    async replaceProjectShots(projectId: string, shots: StoredShotRecord[]) {
      const database = await openDatabase();
      const transaction = database.transaction([PROJECTS_STORE, SHOTS_STORE], "readwrite");
      const projectStore = transaction.objectStore(PROJECTS_STORE);
      const shotStore = transaction.objectStore(SHOTS_STORE);
      const existing = await requestResult(projectStore.get(projectId)) as ProjectRecord | undefined;
      if (!existing) throw new Error("项目不存在或已删除。");
      await deleteProjectShotRecords(shotStore, projectId);
      const now = new Date().toISOString();
      shots.forEach((shot, order) => shotStore.put({ ...shot, projectId, order, updatedAt: now }));
      const updatedProject: ProjectRecord = { ...normalizeProject(existing), shots: shots.length, updatedAt: now };
      projectStore.put(updatedProject);
      await transactionResult(transaction);
      return updatedProject;
    },

    async getProjectTemplate(projectId: string) {
      const database = await openDatabase();
      const transaction = database.transaction(PROJECT_TEMPLATES_STORE, "readonly");
      const template = await requestResult(transaction.objectStore(PROJECT_TEMPLATES_STORE).index("projectId").get(projectId)) as ProjectTemplateSnapshotRecord | undefined;
      return template ?? null;
    },

    async saveProjectTemplate(template: ProjectTemplateSnapshotRecord) {
      const database = await openDatabase();
      const transaction = database.transaction(PROJECT_TEMPLATES_STORE, "readwrite");
      transaction.objectStore(PROJECT_TEMPLATES_STORE).put({ ...template, updatedAt: new Date().toISOString() });
      await transactionResult(transaction);
    },

    async deleteProjectTemplate(projectId: string) {
      const database = await openDatabase();
      const transaction = database.transaction(PROJECT_TEMPLATES_STORE, "readwrite");
      const store = transaction.objectStore(PROJECT_TEMPLATES_STORE);
      const existing = await requestResult(store.index("projectId").get(projectId)) as ProjectTemplateSnapshotRecord | undefined;
      if (existing) store.delete(existing.id);
      await transactionResult(transaction);
    },

    async listProjectRecoverySnapshots(projectId: string) {
      const database = await openDatabase();
      const transaction = database.transaction(RECOVERY_SNAPSHOTS_STORE, "readonly");
      const snapshots = await requestResult(transaction.objectStore(RECOVERY_SNAPSHOTS_STORE).index("projectId").getAll(IDBKeyRange.only(projectId))) as import("../types").ProjectRecoverySnapshot[];
      return snapshots.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    },

    async saveProjectRecoverySnapshot(snapshot: import("../types").ProjectRecoverySnapshot) {
      const database = await openDatabase();
      const transaction = database.transaction(RECOVERY_SNAPSHOTS_STORE, "readwrite");
      const store = transaction.objectStore(RECOVERY_SNAPSHOTS_STORE);
      const existing = await requestResult(store.index("projectId").getAll(IDBKeyRange.only(snapshot.projectId))) as import("../types").ProjectRecoverySnapshot[];
      store.put(snapshot);
      [...existing, snapshot]
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .slice(3)
        .forEach((item) => store.delete(item.id));
      await transactionResult(transaction);
    },

    async deleteProjectRecoverySnapshot(snapshotId: string) {
      const database = await openDatabase();
      const transaction = database.transaction(RECOVERY_SNAPSHOTS_STORE, "readwrite");
      transaction.objectStore(RECOVERY_SNAPSHOTS_STORE).delete(snapshotId);
      await transactionResult(transaction);
    },

    async clearDerivedCaches() {
      const database = await openDatabase();
      const transaction = database.transaction([DERIVED_FRAME_THUMBNAILS_STORE, DERIVED_WAVEFORMS_STORE], "readwrite");
      transaction.objectStore(DERIVED_FRAME_THUMBNAILS_STORE).clear();
      transaction.objectStore(DERIVED_WAVEFORMS_STORE).clear();
      await transactionResult(transaction);
    },
  };
}

const projectRepository = createProjectRepository();

export default projectRepository;
