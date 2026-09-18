import type { CreateProjectInput, DerivedFrameThumbnail, DerivedWaveform, MediaSourceFingerprint, ProjectEditorState, ProjectRecord, ProjectRecoverySnapshot, ProjectRepository, ProjectTemplateSnapshotRecord, ScreenshotRecord, StoredShotRecord } from "../types";
import type { AnalysisCandidate, AnalysisContextManifest, AnalysisEvidenceRecord, AnalysisRecord, ResearchContext, ResearchRange } from "../../analysis/types";
import { reconcileAnalysisAfterStructureChange } from "../../analysis/services/analysisRecordService.ts";
import type { AnnotationMarker } from "../../annotation/types";
import { normalizeStoredAnnotationMarker, toStoredAnnotationMarker } from "../../annotation/services/annotationStorageCompatibility";
import type { ShotGroupRecord } from "../../group/types";
import type { AutoShotTaskRecord } from "../../auto-shot/types";
import type { AutoShotMediaIdentity } from "../../auto-shot/mediaIdentity";
import type { CalibrationAnnotationRecord } from "../../scene-calibration/types";
import type { CalibrationDraft, CalibrationDraftRecord } from "../../shot-calibration/types";
import { fromCalibrationDraftRecord, toCalibrationDraftRecord, validateCalibrationDraft } from "../../shot-calibration/services/calibrationDraftService";
import { hashSceneDetectionConfig } from "../../../../../../packages/scene-engine/src/api/configHash.ts";
import { DEFAULT_COMPOSITION_OVERLAY_SETTINGS, normalizeCompositionOverlaySettings } from "../../composition-overlay/types";
import { DEFAULT_CONTENT_OVERLAY_SETTINGS, normalizeContentOverlaySettings } from "../../content-overlay/types";
import { RuntimeContractError, createRevisionConflictError, toPersistenceRuntimeError } from "../../../types/runtime";
import { PROJECT_DATABASE_SCHEMA_VERSION, planProjectDatabaseMigration, resetDevelopmentDatabaseStores } from "./projectDatabaseMigration";

const DATABASE_NAME = "aisenlens-projects";
// Keep the database at the highest version already used by the shipped app.
// IndexedDB does not support opening an existing database at a lower version.
const DATABASE_VERSION = PROJECT_DATABASE_SCHEMA_VERSION;
const PROJECTS_STORE = "projects";
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
const CALIBRATION_ANNOTATIONS_STORE = "scene-calibration-annotations";
const SHOT_GROUPS_STORE = "shot-groups";
const RECOVERY_SNAPSHOTS_STORE = "recovery-snapshots";
const CALIBRATION_DRAFTS_STORE = "shot-calibration-drafts";
const RESEARCH_RANGES_STORE = "research-ranges";
const RESEARCH_CONTEXTS_STORE = "research-contexts";
const ANALYSIS_RECORDS_STORE = "analysis-records";
const ANALYSIS_CANDIDATES_STORE = "analysis-candidates";
const ANALYSIS_EVIDENCE_STORE = "analysis-evidence";
const ANALYSIS_CONTEXT_MANIFESTS_STORE = "analysis-context-manifests";

export type ProjectRepositoryFaultPoint = "project-write" | "shots-write" | "groups-write" | "markers-write" | "template-write" | "task-write" | "draft-receipt-write" | "research-range-write" | "research-context-write" | "analysis-record-write" | "analysis-candidate-write" | "analysis-evidence-write";
let projectRepositoryFaultInjector: ((point: ProjectRepositoryFaultPoint) => void) | null = null;

export function setProjectRepositoryFaultInjector(injector: ((point: ProjectRepositoryFaultPoint) => void) | null): void {
  projectRepositoryFaultInjector = injector;
}

function injectProjectRepositoryFault(point: ProjectRepositoryFaultPoint): void {
  projectRepositoryFaultInjector?.(point);
}

interface MediaHandleRecord {
  assetId: string;
  handle: FileSystemFileHandle;
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

function requestResult<T>(request: IDBRequest<T>, operation = "indexeddb-request"): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(toPersistenceRuntimeError(request.error, operation, { schemaVersion: PROJECT_DATABASE_SCHEMA_VERSION }));
  });
}

function transactionResult(transaction: IDBTransaction, operation = "indexeddb-transaction"): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(toPersistenceRuntimeError(transaction.error, operation, { schemaVersion: PROJECT_DATABASE_SCHEMA_VERSION }));
    transaction.onabort = () => reject(toPersistenceRuntimeError(transaction.error, operation, { schemaVersion: PROJECT_DATABASE_SCHEMA_VERSION }, "TRANSACTION_ABORTED"));
  });
}

function nextProjectUpdatedAt(previous: string): string {
  const now = new Date()
  const previousTime = Date.parse(previous)
  if (Number.isFinite(previousTime) && now.getTime() <= previousTime) now.setTime(previousTime + 1)
  return now.toISOString()
}

function deleteProjectShotRecords(store: IDBObjectStore, projectId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = store.index("projectId").openCursor(IDBKeyRange.only(projectId));
    request.onerror = () => reject(toPersistenceRuntimeError(request.error, "delete-project-shot-records", { schemaVersion: PROJECT_DATABASE_SCHEMA_VERSION }));
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }
      const deleteRequest = cursor.delete();
      deleteRequest.onerror = () => reject(toPersistenceRuntimeError(deleteRequest.error, "delete-project-shot-record", { schemaVersion: PROJECT_DATABASE_SCHEMA_VERSION }));
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
    const fail = (error: unknown) => {
      databasePromise = null;
      reject(toPersistenceRuntimeError(error, "open-project-database", { schemaVersion: PROJECT_DATABASE_SCHEMA_VERSION }));
    };
    request.onerror = () => fail(request.error);
    request.onblocked = () => fail(new RuntimeContractError({
      code: "PERSISTENCE_UNAVAILABLE",
      message: "本地项目仓库正在被其他标签页占用，请关闭其他 AisenLens 标签页后重试。",
      context: { subsystem: "persistence", operation: "open-project-database", schemaVersion: PROJECT_DATABASE_SCHEMA_VERSION },
      retryable: true,
      recoveryActions: ["retry", "reload"],
    }));
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        databasePromise = null;
      };
      database.onclose = () => {
        databasePromise = null;
      };
      resolve(database);
    };
    request.onupgradeneeded = (event) => {
      const migration = planProjectDatabaseMigration(event.oldVersion, event.newVersion ?? DATABASE_VERSION);
      const database = request.result;
      if (migration.resetDevelopmentData && request.transaction) resetDevelopmentDatabaseStores(request.transaction, database);
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
      if (!database.objectStoreNames.contains(CALIBRATION_ANNOTATIONS_STORE)) {
        const annotations = database.createObjectStore(CALIBRATION_ANNOTATIONS_STORE, { keyPath: "annotationId" });
        annotations.createIndex("projectId", "projectId", { unique: false });
        annotations.createIndex("projectMediaIdentity", ["projectId", "mediaIdentity.mediaIdentityDigest"], { unique: true });
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
      if (!database.objectStoreNames.contains(CALIBRATION_DRAFTS_STORE)) {
        const drafts = database.createObjectStore(CALIBRATION_DRAFTS_STORE, { keyPath: "id" });
        drafts.createIndex("projectId", "projectId", { unique: false });
        drafts.createIndex("projectMediaKey", "projectMediaKey", { unique: true });
      }
      if (!database.objectStoreNames.contains(RESEARCH_RANGES_STORE)) {
        const ranges = database.createObjectStore(RESEARCH_RANGES_STORE, { keyPath: "id" });
        ranges.createIndex("projectId", "projectId", { unique: false });
        ranges.createIndex("projectMedia", ["projectId", "mediaIdentityDigest"], { unique: false });
      }
      if (!database.objectStoreNames.contains(RESEARCH_CONTEXTS_STORE)) {
        const contexts = database.createObjectStore(RESEARCH_CONTEXTS_STORE, { keyPath: "id" });
        contexts.createIndex("projectId", "projectId", { unique: false });
        contexts.createIndex("projectTarget", ["projectId", "target.kind", "target.id"], { unique: true });
      }
      if (!database.objectStoreNames.contains(ANALYSIS_RECORDS_STORE)) {
        const records = database.createObjectStore(ANALYSIS_RECORDS_STORE, { keyPath: "id" });
        records.createIndex("projectId", "projectId", { unique: false });
        records.createIndex("projectSubjectField", ["projectId", "subject.kind", "subject.id", "fieldId"], { unique: true });
      }
      if (!database.objectStoreNames.contains(ANALYSIS_CANDIDATES_STORE)) {
        const candidates = database.createObjectStore(ANALYSIS_CANDIDATES_STORE, { keyPath: "id" });
        candidates.createIndex("projectId", "projectId", { unique: false });
        candidates.createIndex("projectStatus", ["projectId", "status"], { unique: false });
      }
      if (!database.objectStoreNames.contains(ANALYSIS_EVIDENCE_STORE)) {
        const evidence = database.createObjectStore(ANALYSIS_EVIDENCE_STORE, { keyPath: "id" });
        evidence.createIndex("projectId", "projectId", { unique: false });
        evidence.createIndex("recordId", "recordId", { unique: false });
        evidence.createIndex("candidateId", "candidateId", { unique: false });
      }
      if (!database.objectStoreNames.contains(ANALYSIS_CONTEXT_MANIFESTS_STORE)) {
        const manifests = database.createObjectStore(ANALYSIS_CONTEXT_MANIFESTS_STORE, { keyPath: "id" });
        manifests.createIndex("projectId", "projectId", { unique: false });
        manifests.createIndex("projectTaskKind", ["projectId", "taskKind"], { unique: false });
      }
    };
  });

  return databasePromise;
}


function structureSignature(shots: readonly StoredShotRecord[], groups: readonly ShotGroupRecord[]): string {
  return JSON.stringify({
    shots: [...shots].sort((a, b) => a.order - b.order).map((shot) => [shot.id, shot.order, shot.startFrame, shot.endFrame, shot.status, shot.detection, shot.lineage]),
    groups: [...groups].sort((a, b) => a.id.localeCompare(b.id)).map((group) => [group.id, group.kind, group.shotIds]),
  });
}

function analysisStateSignature(records: readonly AnalysisRecord[], candidates: readonly AnalysisCandidate[], evidence: readonly AnalysisEvidenceRecord[]): string {
  return JSON.stringify({
    records: [...records].sort((a, b) => a.id.localeCompare(b.id)),
    candidates: [...candidates].sort((a, b) => a.id.localeCompare(b.id)),
    evidence: [...evidence].sort((a, b) => a.id.localeCompare(b.id)),
  });
}
function normalizeProject(project: ProjectRecord): ProjectRecord {
  return { ...project, structureRevision: project.structureRevision ?? 0, analysisRevision: project.analysisRevision ?? 0, compositionOverlay: normalizeCompositionOverlaySettings(project.compositionOverlay), contentOverlay: normalizeContentOverlaySettings(project.contentOverlay) };
}

function deleteProjectRecordsAndWait(store: IDBObjectStore, projectId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = store.index("projectId").openCursor(IDBKeyRange.only(projectId));
    request.onerror = () => reject(toPersistenceRuntimeError(request.error, "delete-project-records", { schemaVersion: PROJECT_DATABASE_SCHEMA_VERSION }));
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }
      const deleteRequest = cursor.delete();
      deleteRequest.onerror = () => reject(toPersistenceRuntimeError(deleteRequest.error, "delete-project-record", { schemaVersion: PROJECT_DATABASE_SCHEMA_VERSION }));
      deleteRequest.onsuccess = () => cursor.continue();
    };
  });
}

function markResearchContextsAfterStructureChange(contexts: ResearchContext[], shotIds: string[], groupIds: string[], now: string): ResearchContext[] {
  const shotSet = new Set(shotIds);
  const groupSet = new Set(groupIds);
  return contexts.map((context) => {
    const reasons = new Set(context.needsReviewReasons);
    if (context.target.kind === "shot" && !shotSet.has(context.target.id)) reasons.add("原镜头结构已变化，请重新关联目标。");
    if (context.target.kind === "group" && !groupSet.has(context.target.id)) reasons.add("原结构已变化，请重新关联目标。");
    if (context.status === "completed") reasons.add("正式镜头结构已更新，请复核研究结论。");
    if (context.evidence.some((item) => item.kind === "shot" && !shotSet.has(item.shotId))) reasons.add("引用的原镜头已不存在，证据需要重新关联。");
    return reasons.size ? { ...context, needsReview: true, needsReviewReasons: [...reasons], updatedAt: now, revision: context.revision + 1 } : context;
  });
}

async function markStoredResearchContextsAfterStructureChange(store: IDBObjectStore, projectId: string, shotIds: string[], groupIds: string[], now: string): Promise<void> {
  const contexts = await requestResult(store.index("projectId").getAll(IDBKeyRange.only(projectId))) as ResearchContext[];
  markResearchContextsAfterStructureChange(contexts, shotIds, groupIds, now).forEach((context) => store.put(context));
}

function sameMediaFingerprint(left: MediaSourceFingerprint, right: MediaSourceFingerprint): boolean {
  return left.name === right.name && left.size === right.size && left.lastModified === right.lastModified && left.mimeType === right.mimeType;
}

function sameAutoShotMediaIdentity(left: AutoShotMediaIdentity, right: AutoShotMediaIdentity): boolean {
  return left.identitySchema === right.identitySchema && left.schemaVersion === right.schemaVersion
    && left.contentDigestStrategy === right.contentDigestStrategy && left.contentDigest === right.contentDigest
    && left.size === right.size && left.codec === right.codec
    && left.codedWidth === right.codedWidth && left.codedHeight === right.codedHeight
    && left.displayWidth === right.displayWidth && left.displayHeight === right.displayHeight
    && left.rotation === right.rotation && left.durationUs === right.durationUs
    && left.mediaIdentityDigest === right.mediaIdentityDigest;
}

function assertAutoShotTaskRecord(task: AutoShotTaskRecord): void {
  if (!task.id || !task.projectId) throw new Error("自动分镜任务缺少标识。");
  if (!task.mediaIdentity || (task.mediaIdentity.identitySchema !== "aisenlens-auto-shot-media-identity" || task.mediaIdentity.schemaVersion !== 1 || !/^[0-9a-f]{64}$/.test(task.mediaIdentity.contentDigest) || !/^[0-9a-f]{64}$/.test(task.mediaIdentity.mediaIdentityDigest))) {
    throw new Error("自动分镜任务缺少有效强媒体身份。");
  }
  if (!task.config || !task.progress || !Array.isArray(task.candidates)) throw new Error("自动分镜任务结构无效。");
  if (task.configHash && hashSceneDetectionConfig(task.config).text !== task.configHash) {
    throw new Error("自动分镜任务配置哈希与完整配置不一致。");
  }
  if (task.controlSnapshot !== null && task.controlSnapshot !== undefined && (task.controlSnapshot.schemaVersion !== 1 || !task.controlSnapshot.preset || !task.controlSnapshot.preset.id || !task.controlSnapshot.preset.version || !task.controlSnapshot.preset.catalog)) {
    throw new Error("自动分镜控制快照无效。");
  }
  if (!task.review || !Array.isArray(task.review.excludedCandidateIds) || (task.review.updatedAt !== null && typeof task.review.updatedAt !== "string") || (task.review.appliedAt !== null && typeof task.review.appliedAt !== "string")) {
    throw new Error("自动分镜任务审阅状态无效。");
  }
  if (!Number.isSafeInteger(task.progress.processedUs) || task.progress.processedUs < 0 || !Number.isSafeInteger(task.progress.durationUs) || task.progress.durationUs < 0 || !Number.isSafeInteger(task.progress.decodedFrames) || task.progress.decodedFrames < 0 || !Number.isSafeInteger(task.progress.candidateCount) || task.progress.candidateCount < 0) {
    throw new Error("自动分镜任务进度无效。");
  }
  if (task.checkpoint && (task.checkpoint.schemaVersion !== 1 || !task.checkpoint.engineVersion || !task.checkpoint.configHash || !(task.checkpoint.coreState instanceof ArrayBuffer))) {
    throw new Error("自动分镜 checkpoint schema、engine version 或 config hash 无效。");
  }
}

function assertCalibrationAnnotationRecord(annotation: CalibrationAnnotationRecord): void {
  if (!annotation.annotationId || !annotation.projectId || !annotation.fixtureId) {
    throw new Error("标定记录缺少项目或标识。");
  }
  if (!annotation.mediaIdentity || annotation.mediaIdentity.identitySchema !== "aisenlens-auto-shot-media-identity" || annotation.mediaIdentity.schemaVersion !== 1 || !/^[0-9a-f]{64}$/.test(annotation.mediaIdentity.mediaIdentityDigest)) {
    throw new Error("标定记录缺少有效强媒体身份。");
  }
  if (!Array.isArray(annotation.hardCuts) || !Array.isArray(annotation.uncertainRanges) || !annotation.candidateReviews || typeof annotation.candidateReviews !== "object") {
    throw new Error("标定记录结构无效。");
  }
  if (Object.values(annotation.candidateReviews).some((status) => status !== "accepted" && status !== "rejected" && status !== "corrected")) {
    throw new Error("标定候选判定状态无效。");
  }
}

function createDefaultTitle(): string {
  return "未命名拉片项目";
}

export function createProjectRepository(): ProjectRepository {
  return {
    async listProjects() {
      const database = await openDatabase();
      const transaction = database.transaction(PROJECTS_STORE, "readonly");
      const projects = await requestResult(transaction.objectStore(PROJECTS_STORE).getAll()) as ProjectRecord[];
      return projects.map(normalizeProject).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    },

    async getProject(projectId) {
      const database = await openDatabase();
      const transaction = database.transaction(PROJECTS_STORE, "readonly");
      const project = await requestResult(transaction.objectStore(PROJECTS_STORE).get(projectId)) as ProjectRecord | undefined;
      return project ? normalizeProject(project) : null;
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
        structureRevision: 0,
        analysisRevision: 0,
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
      const database = await openDatabase();
      const transaction = database.transaction(PROJECTS_STORE, "readwrite");
      const store = transaction.objectStore(PROJECTS_STORE);
      const current = await requestResult(store.get(project.id), "update-project:read-current") as ProjectRecord | undefined;
      if (!current) throw new Error("项目不存在或已删除。");
      if (current.updatedAt !== project.updatedAt) throw createRevisionConflictError("update-project", project.updatedAt, current.updatedAt, project.id);
      const updatedProject: ProjectRecord = { ...normalizeProject(project), updatedAt: nextProjectUpdatedAt(current.updatedAt) };
      store.put(updatedProject);
      await transactionResult(transaction, "update-project");
      return updatedProject;
    },

    async updateProjectAtomically(projectId, update) {
      const database = await openDatabase();
      const transaction = database.transaction(PROJECTS_STORE, "readwrite");
      const store = transaction.objectStore(PROJECTS_STORE);
      const current = await requestResult(store.get(projectId)) as ProjectRecord | undefined;
      if (!current) throw new Error("项目不存在或已删除。");
      const updatedProject: ProjectRecord = { ...normalizeProject(update(normalizeProject(current))), id: projectId, updatedAt: nextProjectUpdatedAt(current.updatedAt) };
      store.put(updatedProject);
      await transactionResult(transaction);
      return updatedProject;
    },

    async readProjectEditorState(projectId) {
      const database = await openDatabase();
      const transaction = database.transaction([PROJECTS_STORE, SHOTS_STORE, SHOT_GROUPS_STORE, ANNOTATION_MARKERS_STORE, PROJECT_TEMPLATES_STORE, RESEARCH_RANGES_STORE, RESEARCH_CONTEXTS_STORE, ANALYSIS_RECORDS_STORE, ANALYSIS_CANDIDATES_STORE, ANALYSIS_EVIDENCE_STORE, ANALYSIS_CONTEXT_MANIFESTS_STORE], "readonly");
      const [project, shots, groups, markers, template, researchRanges, researchContexts, analysisRecords, analysisCandidates, analysisEvidence, analysisContextManifests] = await Promise.all([
        requestResult(transaction.objectStore(PROJECTS_STORE).get(projectId)) as Promise<ProjectRecord | undefined>,
        requestResult(transaction.objectStore(SHOTS_STORE).index("projectId").getAll(IDBKeyRange.only(projectId))) as Promise<StoredShotRecord[]>,
        requestResult(transaction.objectStore(SHOT_GROUPS_STORE).index("projectId").getAll(IDBKeyRange.only(projectId))) as Promise<ShotGroupRecord[]>,
        requestResult(transaction.objectStore(ANNOTATION_MARKERS_STORE).index("projectId").getAll(IDBKeyRange.only(projectId))) as Promise<unknown[]>,
        requestResult(transaction.objectStore(PROJECT_TEMPLATES_STORE).index("projectId").get(projectId)) as Promise<ProjectTemplateSnapshotRecord | undefined>,
        requestResult(transaction.objectStore(RESEARCH_RANGES_STORE).index("projectId").getAll(IDBKeyRange.only(projectId))) as Promise<ResearchRange[]>,
        requestResult(transaction.objectStore(RESEARCH_CONTEXTS_STORE).index("projectId").getAll(IDBKeyRange.only(projectId))) as Promise<ResearchContext[]>,
        requestResult(transaction.objectStore(ANALYSIS_RECORDS_STORE).index("projectId").getAll(IDBKeyRange.only(projectId))) as Promise<AnalysisRecord[]>,
        requestResult(transaction.objectStore(ANALYSIS_CANDIDATES_STORE).index("projectId").getAll(IDBKeyRange.only(projectId))) as Promise<AnalysisCandidate[]>,
        requestResult(transaction.objectStore(ANALYSIS_EVIDENCE_STORE).index("projectId").getAll(IDBKeyRange.only(projectId))) as Promise<AnalysisEvidenceRecord[]>,
        requestResult(transaction.objectStore(ANALYSIS_CONTEXT_MANIFESTS_STORE).index("projectId").getAll(IDBKeyRange.only(projectId))) as Promise<AnalysisContextManifest[]>,
      ]);
      await transactionResult(transaction);
      if (!project) return null;
      const normalizedMarkers = markers.map(normalizeStoredAnnotationMarker);
      return {
        project: normalizeProject(project),
        shots: shots.sort((left, right) => left.order - right.order),
        groups: groups.sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
        markers: normalizedMarkers.sort((left, right) => left.frame - right.frame || left.createdAt.localeCompare(right.createdAt)),
        template: template ?? null,
        researchRanges: researchRanges.sort((left, right) => left.startUs - right.startUs),
        researchContexts: researchContexts.sort((left, right) => left.updatedAt.localeCompare(right.updatedAt)),
        analysisRecords: analysisRecords.sort((left, right) => left.id.localeCompare(right.id)),
        analysisCandidates: analysisCandidates.sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
        analysisEvidence: analysisEvidence.sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
        analysisContextManifests: analysisContextManifests.sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
      } satisfies ProjectEditorState;
    },

    async saveProjectEditorState(state, expectedUpdatedAt) {
      const database = await openDatabase();
      const transaction = database.transaction([PROJECTS_STORE, SHOTS_STORE, SHOT_GROUPS_STORE, ANNOTATION_MARKERS_STORE, PROJECT_TEMPLATES_STORE, RESEARCH_RANGES_STORE, RESEARCH_CONTEXTS_STORE, ANALYSIS_RECORDS_STORE, ANALYSIS_CANDIDATES_STORE, ANALYSIS_EVIDENCE_STORE, ANALYSIS_CONTEXT_MANIFESTS_STORE], "readwrite");
      const completion = transactionResult(transaction);
      const projectStore = transaction.objectStore(PROJECTS_STORE);
      try {
        const current = await requestResult(projectStore.get(state.project.id)) as ProjectRecord | undefined;
        if (!current) throw new Error("项目不存在或已删除。");
        if (expectedUpdatedAt && current.updatedAt !== expectedUpdatedAt) throw createRevisionConflictError("save-project-editor-state", expectedUpdatedAt, current.updatedAt, state.project.id);

        const [existingShots, existingGroups, existingRecords, existingCandidates, existingEvidence] = await Promise.all([
          requestResult(transaction.objectStore(SHOTS_STORE).index("projectId").getAll(IDBKeyRange.only(state.project.id))) as Promise<StoredShotRecord[]>,
          requestResult(transaction.objectStore(SHOT_GROUPS_STORE).index("projectId").getAll(IDBKeyRange.only(state.project.id))) as Promise<ShotGroupRecord[]>,
          requestResult(transaction.objectStore(ANALYSIS_RECORDS_STORE).index("projectId").getAll(IDBKeyRange.only(state.project.id))) as Promise<AnalysisRecord[]>,
          requestResult(transaction.objectStore(ANALYSIS_CANDIDATES_STORE).index("projectId").getAll(IDBKeyRange.only(state.project.id))) as Promise<AnalysisCandidate[]>,
          requestResult(transaction.objectStore(ANALYSIS_EVIDENCE_STORE).index("projectId").getAll(IDBKeyRange.only(state.project.id))) as Promise<AnalysisEvidenceRecord[]>,
        ]);

        const structureChanged = structureSignature(existingShots, existingGroups) !== structureSignature(state.shots, state.groups);
        const structureRevision = normalizeProject(current).structureRevision + (structureChanged ? 1 : 0);
        let analysisRecords = structuredClone(state.analysisRecords ?? existingRecords);
        let analysisCandidates = structuredClone(state.analysisCandidates ?? existingCandidates);
        let analysisEvidence = structuredClone(state.analysisEvidence ?? existingEvidence);

        if (structureChanged) {
          const reconciled = reconcileAnalysisAfterStructureChange({
            records: analysisRecords,
            candidates: analysisCandidates,
            evidence: analysisEvidence,
            previousShots: existingShots,
            nextShots: state.shots,
            previousGroups: existingGroups,
            nextGroups: state.groups,
            invalidatedByRevision: structureRevision,
          });
          analysisRecords = reconciled.records;
          analysisCandidates = reconciled.candidates;
          analysisEvidence = reconciled.evidence;
        }

        const analysisChanged = analysisStateSignature(existingRecords, existingCandidates, existingEvidence) !== analysisStateSignature(analysisRecords, analysisCandidates, analysisEvidence);
        const now = nextProjectUpdatedAt(current.updatedAt);
        const updatedProject: ProjectRecord = {
          ...normalizeProject(state.project),
          id: state.project.id,
          shots: state.shots.length,
          structureRevision,
          analysisRevision: normalizeProject(current).analysisRevision + (analysisChanged ? 1 : 0),
          updatedAt: now,
        };

        injectProjectRepositoryFault("project-write");
        projectStore.put(updatedProject);

        const shotStore = transaction.objectStore(SHOTS_STORE);
        await deleteProjectShotRecords(shotStore, state.project.id);
        const existingShotMap = new Map(existingShots.map((shot) => [shot.id, shot]));
        injectProjectRepositoryFault("shots-write");
        state.shots.forEach((shot, order) => {
          const previous = existingShotMap.get(shot.id);
          const changed = !previous || JSON.stringify([previous.order, previous.startFrame, previous.endFrame, previous.status, previous.detection, previous.lineage]) !== JSON.stringify([order, shot.startFrame, shot.endFrame, shot.status, shot.detection, shot.lineage]);
          shotStore.put({
            ...shot,
            projectId: state.project.id,
            order,
            structureRevision,
            revision: previous ? previous.revision + (changed ? 1 : 0) : Math.max(1, shot.revision),
            updatedAt: now,
          });
        });

        await deleteProjectRecordsAndWait(transaction.objectStore(SHOT_GROUPS_STORE), state.project.id);
        injectProjectRepositoryFault("groups-write");
        state.groups.forEach((group) => transaction.objectStore(SHOT_GROUPS_STORE).put({ ...group, projectId: state.project.id, updatedAt: now }));

        await deleteProjectRecordsAndWait(transaction.objectStore(ANNOTATION_MARKERS_STORE), state.project.id);
        injectProjectRepositoryFault("markers-write");
        state.markers.forEach((marker) => transaction.objectStore(ANNOTATION_MARKERS_STORE).put(toStoredAnnotationMarker(marker, state.project.id, now)));

        const templateStore = transaction.objectStore(PROJECT_TEMPLATES_STORE);
        const existingTemplate = await requestResult(templateStore.index("projectId").get(state.project.id)) as ProjectTemplateSnapshotRecord | undefined;
        if (existingTemplate) templateStore.delete(existingTemplate.id);
        injectProjectRepositoryFault("template-write");
        if (state.template) templateStore.put({ ...state.template, projectId: state.project.id, updatedAt: now });

        if (state.researchRanges !== undefined) {
          await deleteProjectRecordsAndWait(transaction.objectStore(RESEARCH_RANGES_STORE), state.project.id);
          injectProjectRepositoryFault("research-range-write");
          state.researchRanges.forEach((range) => transaction.objectStore(RESEARCH_RANGES_STORE).put({ ...range, projectId: state.project.id, updatedAt: now }));
        }
        if (state.researchContexts !== undefined) {
          await deleteProjectRecordsAndWait(transaction.objectStore(RESEARCH_CONTEXTS_STORE), state.project.id);
          injectProjectRepositoryFault("research-context-write");
          state.researchContexts.forEach((context) => transaction.objectStore(RESEARCH_CONTEXTS_STORE).put({ ...context, projectId: state.project.id, updatedAt: now }));
        }

        await deleteProjectRecordsAndWait(transaction.objectStore(ANALYSIS_RECORDS_STORE), state.project.id);
        injectProjectRepositoryFault("analysis-record-write");
        analysisRecords.forEach((record) => transaction.objectStore(ANALYSIS_RECORDS_STORE).put({ ...record, projectId: state.project.id }));

        await deleteProjectRecordsAndWait(transaction.objectStore(ANALYSIS_CANDIDATES_STORE), state.project.id);
        injectProjectRepositoryFault("analysis-candidate-write");
        analysisCandidates.forEach((candidate) => transaction.objectStore(ANALYSIS_CANDIDATES_STORE).put({ ...candidate, projectId: state.project.id }));

        await deleteProjectRecordsAndWait(transaction.objectStore(ANALYSIS_EVIDENCE_STORE), state.project.id);
        injectProjectRepositoryFault("analysis-evidence-write");
        analysisEvidence.forEach((evidence) => transaction.objectStore(ANALYSIS_EVIDENCE_STORE).put({ ...evidence, projectId: state.project.id }));
        if (state.analysisContextManifests !== undefined) {
          await deleteProjectRecordsAndWait(transaction.objectStore(ANALYSIS_CONTEXT_MANIFESTS_STORE), state.project.id);
          state.analysisContextManifests.forEach((manifest) => transaction.objectStore(ANALYSIS_CONTEXT_MANIFESTS_STORE).put({ ...manifest, projectId: state.project.id }));
        }

        await completion;
        return updatedProject;
      } catch (error) {
        try { transaction.abort(); } catch { /* already completed or aborted */ }
        await completion.catch(() => undefined);
        throw error;
      }
    },

    async deleteProject(projectId: string) {
      const database = await openDatabase();
      const transaction = database.transaction([PROJECTS_STORE, MEDIA_ASSET_HANDLES_STORE, MEDIA_ASSET_BLOBS_STORE, SCREENSHOTS_STORE, SCREENSHOT_BLOBS_STORE, SHOTS_STORE, PROJECT_TEMPLATES_STORE, ANNOTATION_MARKERS_STORE, DERIVED_FRAME_THUMBNAILS_STORE, DERIVED_WAVEFORMS_STORE, AUTO_SHOT_RUNS_STORE, CALIBRATION_ANNOTATIONS_STORE, CALIBRATION_DRAFTS_STORE, SHOT_GROUPS_STORE, RECOVERY_SNAPSHOTS_STORE, RESEARCH_RANGES_STORE, RESEARCH_CONTEXTS_STORE, ANALYSIS_RECORDS_STORE, ANALYSIS_CANDIDATES_STORE, ANALYSIS_EVIDENCE_STORE, ANALYSIS_CONTEXT_MANIFESTS_STORE], "readwrite");
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
      deleteProjectRecords(transaction.objectStore(CALIBRATION_ANNOTATIONS_STORE), projectId);
      deleteProjectRecords(transaction.objectStore(SHOT_GROUPS_STORE), projectId);
      deleteProjectRecords(transaction.objectStore(RECOVERY_SNAPSHOTS_STORE), projectId);
      deleteProjectRecords(transaction.objectStore(CALIBRATION_DRAFTS_STORE), projectId);
      deleteProjectRecords(transaction.objectStore(RESEARCH_RANGES_STORE), projectId);
      deleteProjectRecords(transaction.objectStore(RESEARCH_CONTEXTS_STORE), projectId);
      deleteProjectRecords(transaction.objectStore(ANALYSIS_RECORDS_STORE), projectId);
      deleteProjectRecords(transaction.objectStore(ANALYSIS_CANDIDATES_STORE), projectId);
      deleteProjectRecords(transaction.objectStore(ANALYSIS_EVIDENCE_STORE), projectId);
      deleteProjectRecords(transaction.objectStore(ANALYSIS_CONTEXT_MANIFESTS_STORE), projectId);
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

    async getAutoShotTask(projectId: string, mediaIdentity: AutoShotMediaIdentity) {
      const database = await openDatabase();
      const transaction = database.transaction(AUTO_SHOT_RUNS_STORE, "readonly");
      const task = await requestResult(transaction.objectStore(AUTO_SHOT_RUNS_STORE).index("projectId").get(projectId)) as AutoShotTaskRecord | undefined;
      if (!task) return null;
      try {
        assertAutoShotTaskRecord(task);
      } catch {
        return null;
      }
      return sameAutoShotMediaIdentity(task.mediaIdentity, mediaIdentity) ? task : null;
    },

    async saveAutoShotTask(task: AutoShotTaskRecord) {
      assertAutoShotTaskRecord(task);
      const database = await openDatabase();
      const transaction = database.transaction(AUTO_SHOT_RUNS_STORE, "readwrite");
      const store = transaction.objectStore(AUTO_SHOT_RUNS_STORE);
      const existing = await requestResult(store.index("projectId").get(task.projectId)) as AutoShotTaskRecord | undefined;
      if (existing && existing.id !== task.id) store.delete(existing.id);
      store.put({ ...task, updatedAt: new Date().toISOString() });
      await transactionResult(transaction);
    },

    async deleteAutoShotTask(projectId: string) {
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

    async getCalibrationAnnotation(projectId: string, mediaIdentity: AutoShotMediaIdentity) {
      const database = await openDatabase();
      const transaction = database.transaction(CALIBRATION_ANNOTATIONS_STORE, "readonly");
      const annotation = await requestResult(transaction.objectStore(CALIBRATION_ANNOTATIONS_STORE).index("projectMediaIdentity").get([projectId, mediaIdentity.mediaIdentityDigest])) as CalibrationAnnotationRecord | undefined;
      if (!annotation) return null;
      try {
        assertCalibrationAnnotationRecord(annotation);
      } catch {
        return null;
      }
      return sameAutoShotMediaIdentity(annotation.mediaIdentity, mediaIdentity) ? annotation : null;
    },

    async saveCalibrationAnnotation(annotation: CalibrationAnnotationRecord) {
      assertCalibrationAnnotationRecord(annotation);
      const database = await openDatabase();
      const transaction = database.transaction(CALIBRATION_ANNOTATIONS_STORE, "readwrite");
      const store = transaction.objectStore(CALIBRATION_ANNOTATIONS_STORE);
      const existing = await requestResult(store.index("projectMediaIdentity").get([annotation.projectId, annotation.mediaIdentity.mediaIdentityDigest])) as CalibrationAnnotationRecord | undefined;
      if (existing && existing.annotationId !== annotation.annotationId) store.delete(existing.annotationId);
      store.put({ ...annotation, updatedAt: new Date().toISOString() });
      await transactionResult(transaction);
    },

    async deleteCalibrationAnnotation(projectId: string) {
      const database = await openDatabase();
      const transaction = database.transaction(CALIBRATION_ANNOTATIONS_STORE, "readwrite");
      await deleteProjectRecordsAndWait(transaction.objectStore(CALIBRATION_ANNOTATIONS_STORE), projectId);
      await transactionResult(transaction);
    },

    async getCalibrationDraft(projectId: string, mediaIdentity: AutoShotMediaIdentity) {
      const database = await openDatabase();
      const transaction = database.transaction(CALIBRATION_DRAFTS_STORE, "readonly");
      const record = await requestResult(transaction.objectStore(CALIBRATION_DRAFTS_STORE).index("projectMediaKey").get([projectId, mediaIdentity.mediaIdentityDigest])) as CalibrationDraftRecord | undefined;
      await transactionResult(transaction);
      if (!record) return null;
      try {
        const draft = fromCalibrationDraftRecord(record);
        return sameAutoShotMediaIdentity(draft.mediaIdentity, mediaIdentity) ? draft : null;
      } catch {
        return null;
      }
    },

    async saveCalibrationDraft(draft: CalibrationDraft, expectedRevision?: number) {
      validateCalibrationDraft(draft);
      const database = await openDatabase();
      const transaction = database.transaction(CALIBRATION_DRAFTS_STORE, "readwrite");
      const store = transaction.objectStore(CALIBRATION_DRAFTS_STORE);
      const existing = await requestResult(store.index("projectMediaKey").get([draft.projectId, draft.mediaIdentity.mediaIdentityDigest])) as CalibrationDraftRecord | undefined;
      if (existing && expectedRevision !== undefined && existing.revision !== expectedRevision) throw createRevisionConflictError("save-calibration-draft", expectedRevision, existing.revision, draft.id);
      store.put(toCalibrationDraftRecord(draft));
      await transactionResult(transaction);
    },

    async deleteCalibrationDraft(projectId: string, mediaIdentity?: AutoShotMediaIdentity) {
      const database = await openDatabase();
      const transaction = database.transaction(CALIBRATION_DRAFTS_STORE, "readwrite");
      const store = transaction.objectStore(CALIBRATION_DRAFTS_STORE);
      if (mediaIdentity) {
        const existing = await requestResult(store.index("projectMediaKey").get([projectId, mediaIdentity.mediaIdentityDigest])) as CalibrationDraftRecord | undefined;
        if (existing) store.delete(existing.id);
      } else {
        await deleteProjectRecordsAndWait(store, projectId);
      }
      await transactionResult(transaction);
    },

    async applyCalibrationDraft({ state, draft, expectedUpdatedAt, recoverySnapshotId, task }) {
      validateCalibrationDraft(draft);
      const database = await openDatabase();
      const transaction = database.transaction([PROJECTS_STORE, SHOTS_STORE, SHOT_GROUPS_STORE, ANNOTATION_MARKERS_STORE, PROJECT_TEMPLATES_STORE, CALIBRATION_DRAFTS_STORE, AUTO_SHOT_RUNS_STORE, RESEARCH_RANGES_STORE, RESEARCH_CONTEXTS_STORE, ANALYSIS_RECORDS_STORE, ANALYSIS_CANDIDATES_STORE, ANALYSIS_EVIDENCE_STORE], "readwrite");
      const completion = transactionResult(transaction);
      try {
        const projectStore = transaction.objectStore(PROJECTS_STORE);
        const current = await requestResult(projectStore.get(state.project.id)) as ProjectRecord | undefined;
        if (!current) throw new Error("项目不存在或已删除，无法应用校准草稿。");
        if (current.updatedAt !== expectedUpdatedAt) throw createRevisionConflictError("apply-calibration-draft:project", expectedUpdatedAt, current.updatedAt, state.project.id);
        const draftStore = transaction.objectStore(CALIBRATION_DRAFTS_STORE);
        const storedDraft = await requestResult(draftStore.index("projectMediaKey").get([draft.projectId, draft.mediaIdentity.mediaIdentityDigest])) as CalibrationDraftRecord | undefined;
        if (storedDraft && storedDraft.revision !== draft.revision) throw createRevisionConflictError("apply-calibration-draft:draft", draft.revision, storedDraft.revision, draft.id);
        if (storedDraft?.status === "applied" && storedDraft.applyReceipt?.draftId === draft.id && storedDraft.applyReceipt.appliedDraftRevision === draft.revision) {
          await completion;
          return current;
        }

        const shotStore = transaction.objectStore(SHOTS_STORE);
        const [existingShots, existingGroups, records, candidates, evidence] = await Promise.all([
          requestResult(shotStore.index("projectId").getAll(IDBKeyRange.only(state.project.id))) as Promise<StoredShotRecord[]>,
          requestResult(transaction.objectStore(SHOT_GROUPS_STORE).index("projectId").getAll(IDBKeyRange.only(state.project.id))) as Promise<ShotGroupRecord[]>,
          requestResult(transaction.objectStore(ANALYSIS_RECORDS_STORE).index("projectId").getAll(IDBKeyRange.only(state.project.id))) as Promise<AnalysisRecord[]>,
          requestResult(transaction.objectStore(ANALYSIS_CANDIDATES_STORE).index("projectId").getAll(IDBKeyRange.only(state.project.id))) as Promise<AnalysisCandidate[]>,
          requestResult(transaction.objectStore(ANALYSIS_EVIDENCE_STORE).index("projectId").getAll(IDBKeyRange.only(state.project.id))) as Promise<AnalysisEvidenceRecord[]>,
        ]);
        const structureChanged = structureSignature(existingShots, existingGroups) !== structureSignature(state.shots, state.groups);
        const structureRevision = normalizeProject(current).structureRevision + (structureChanged ? 1 : 0);
        const reconciled = structureChanged
          ? reconcileAnalysisAfterStructureChange({
              records,
              candidates,
              evidence,
              previousShots: existingShots,
              nextShots: state.shots,
              previousGroups: existingGroups,
              nextGroups: state.groups,
              invalidatedByRevision: structureRevision,
            })
          : { records, candidates, evidence };
        const analysisChanged = analysisStateSignature(records, candidates, evidence) !== analysisStateSignature(reconciled.records, reconciled.candidates, reconciled.evidence);
        const now = nextProjectUpdatedAt(current.updatedAt);
        const updatedProject: ProjectRecord = {
          ...normalizeProject(state.project),
          id: state.project.id,
          shots: state.shots.length,
          structureRevision,
          analysisRevision: normalizeProject(current).analysisRevision + (analysisChanged ? 1 : 0),
          updatedAt: now,
        };

        injectProjectRepositoryFault("project-write");
        projectStore.put(updatedProject);
        injectProjectRepositoryFault("shots-write");
        await deleteProjectShotRecords(shotStore, state.project.id);
        const previousById = new Map(existingShots.map((shot) => [shot.id, shot]));
        state.shots.forEach((shot, order) => {
          const previous = previousById.get(shot.id);
          const changed = !previous || JSON.stringify([previous.order, previous.startFrame, previous.endFrame, previous.status, previous.detection, previous.lineage]) !== JSON.stringify([order, shot.startFrame, shot.endFrame, shot.status, shot.detection, shot.lineage]);
          shotStore.put({ ...shot, projectId: state.project.id, order, structureRevision, revision: previous ? previous.revision + (changed ? 1 : 0) : Math.max(1, shot.revision), updatedAt: now });
        });
        await deleteProjectRecordsAndWait(transaction.objectStore(SHOT_GROUPS_STORE), state.project.id);
        await deleteProjectRecordsAndWait(transaction.objectStore(ANNOTATION_MARKERS_STORE), state.project.id);
        const templateStore = transaction.objectStore(PROJECT_TEMPLATES_STORE);
        const existingTemplate = await requestResult(templateStore.index("projectId").get(state.project.id)) as ProjectTemplateSnapshotRecord | undefined;
        if (existingTemplate) templateStore.delete(existingTemplate.id);
        injectProjectRepositoryFault("groups-write");
        state.groups.forEach((group) => transaction.objectStore(SHOT_GROUPS_STORE).put({ ...group, projectId: state.project.id, updatedAt: now }));
        injectProjectRepositoryFault("markers-write");
        state.markers.forEach((marker) => transaction.objectStore(ANNOTATION_MARKERS_STORE).put(toStoredAnnotationMarker(marker, state.project.id, now)));
        injectProjectRepositoryFault("template-write");
        if (state.template) templateStore.put({ ...state.template, projectId: state.project.id, updatedAt: now });
        injectProjectRepositoryFault("task-write");
        if (task) transaction.objectStore(AUTO_SHOT_RUNS_STORE).put({ ...task, review: { ...task.review, appliedAt: now, updatedAt: now }, updatedAt: now });
        const appliedDraft: CalibrationDraft = { ...structuredClone(draft), status: "applied", applyReceipt: { draftId: draft.id, appliedDraftRevision: draft.revision, projectUpdatedAt: now, appliedAt: now, recoverySnapshotId }, updatedAt: now };
        injectProjectRepositoryFault("draft-receipt-write");
        draftStore.put(toCalibrationDraftRecord(appliedDraft));
        if (state.researchRanges !== undefined) {
          await deleteProjectRecordsAndWait(transaction.objectStore(RESEARCH_RANGES_STORE), state.project.id);
          injectProjectRepositoryFault("research-range-write");
          state.researchRanges.forEach((range) => transaction.objectStore(RESEARCH_RANGES_STORE).put({ ...range, projectId: state.project.id, updatedAt: now }));
        }
        if (state.researchContexts !== undefined) {
          await deleteProjectRecordsAndWait(transaction.objectStore(RESEARCH_CONTEXTS_STORE), state.project.id);
          injectProjectRepositoryFault("research-context-write");
          markResearchContextsAfterStructureChange(state.researchContexts, state.shots.map((shot) => shot.id), state.groups.map((group) => group.id), now).forEach((context) => transaction.objectStore(RESEARCH_CONTEXTS_STORE).put({ ...context, projectId: state.project.id, updatedAt: now }));
        } else {
          await markStoredResearchContextsAfterStructureChange(transaction.objectStore(RESEARCH_CONTEXTS_STORE), state.project.id, state.shots.map((shot) => shot.id), state.groups.map((group) => group.id), now);
        }

        await deleteProjectRecordsAndWait(transaction.objectStore(ANALYSIS_RECORDS_STORE), state.project.id);
        reconciled.records.forEach((record) => transaction.objectStore(ANALYSIS_RECORDS_STORE).put(record));
        await deleteProjectRecordsAndWait(transaction.objectStore(ANALYSIS_CANDIDATES_STORE), state.project.id);
        reconciled.candidates.forEach((candidate) => transaction.objectStore(ANALYSIS_CANDIDATES_STORE).put(candidate));
        await deleteProjectRecordsAndWait(transaction.objectStore(ANALYSIS_EVIDENCE_STORE), state.project.id);
        reconciled.evidence.forEach((item) => transaction.objectStore(ANALYSIS_EVIDENCE_STORE).put(item));

        await completion;
        return updatedProject;
      } catch (error) {
        try { transaction.abort(); } catch { /* already completed or aborted */ }
        await completion.catch(() => undefined);
        throw error;
      }
    },

    async listProjectShotGroups(projectId: string) {
      const database = await openDatabase();
      const transaction = database.transaction(SHOT_GROUPS_STORE, "readonly");
      const groups = await requestResult(transaction.objectStore(SHOT_GROUPS_STORE).index("projectId").getAll(IDBKeyRange.only(projectId))) as ShotGroupRecord[];
      return groups.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    },

    async replaceProjectShotGroups(projectId: string, groups: ShotGroupRecord[], expectedUpdatedAt: string) {
      const database = await openDatabase();
      const transaction = database.transaction([PROJECTS_STORE, SHOT_GROUPS_STORE, SHOTS_STORE, RESEARCH_CONTEXTS_STORE, ANALYSIS_RECORDS_STORE, ANALYSIS_CANDIDATES_STORE, ANALYSIS_EVIDENCE_STORE], "readwrite");
      const completion = transactionResult(transaction, "replace-project-shot-groups");
      try {
        const projectStore = transaction.objectStore(PROJECTS_STORE);
        const groupStore = transaction.objectStore(SHOT_GROUPS_STORE);
        const current = await requestResult(projectStore.get(projectId), "replace-project-shot-groups:read-current") as ProjectRecord | undefined;
        if (!current) throw new Error("项目不存在或已删除。");
        if (current.updatedAt !== expectedUpdatedAt) throw createRevisionConflictError("replace-project-shot-groups", expectedUpdatedAt, current.updatedAt, projectId);

        const [shots, existingGroups, records, candidates, evidence] = await Promise.all([
          requestResult(transaction.objectStore(SHOTS_STORE).index("projectId").getAll(IDBKeyRange.only(projectId))) as Promise<StoredShotRecord[]>,
          requestResult(groupStore.index("projectId").getAll(IDBKeyRange.only(projectId))) as Promise<ShotGroupRecord[]>,
          requestResult(transaction.objectStore(ANALYSIS_RECORDS_STORE).index("projectId").getAll(IDBKeyRange.only(projectId))) as Promise<AnalysisRecord[]>,
          requestResult(transaction.objectStore(ANALYSIS_CANDIDATES_STORE).index("projectId").getAll(IDBKeyRange.only(projectId))) as Promise<AnalysisCandidate[]>,
          requestResult(transaction.objectStore(ANALYSIS_EVIDENCE_STORE).index("projectId").getAll(IDBKeyRange.only(projectId))) as Promise<AnalysisEvidenceRecord[]>,
        ]);

        const structureChanged = structureSignature(shots, existingGroups) !== structureSignature(shots, groups);
        const structureRevision = normalizeProject(current).structureRevision + (structureChanged ? 1 : 0);
        const reconciled = structureChanged
          ? reconcileAnalysisAfterStructureChange({
              records,
              candidates,
              evidence,
              previousShots: shots,
              nextShots: shots,
              previousGroups: existingGroups,
              nextGroups: groups,
              invalidatedByRevision: structureRevision,
            })
          : { records, candidates, evidence };
        const analysisChanged = analysisStateSignature(records, candidates, evidence) !== analysisStateSignature(reconciled.records, reconciled.candidates, reconciled.evidence);
        const now = nextProjectUpdatedAt(current.updatedAt);

        await deleteProjectRecordsAndWait(groupStore, projectId);
        groups.forEach((group) => groupStore.put({ ...group, projectId, updatedAt: now }));

        if (structureChanged) {
          await markStoredResearchContextsAfterStructureChange(
            transaction.objectStore(RESEARCH_CONTEXTS_STORE),
            projectId,
            shots.map((shot) => shot.id),
            groups.map((group) => group.id),
            now,
          );
          await deleteProjectRecordsAndWait(transaction.objectStore(ANALYSIS_RECORDS_STORE), projectId);
          reconciled.records.forEach((record) => transaction.objectStore(ANALYSIS_RECORDS_STORE).put(record));
          await deleteProjectRecordsAndWait(transaction.objectStore(ANALYSIS_CANDIDATES_STORE), projectId);
          reconciled.candidates.forEach((candidate) => transaction.objectStore(ANALYSIS_CANDIDATES_STORE).put(candidate));
          await deleteProjectRecordsAndWait(transaction.objectStore(ANALYSIS_EVIDENCE_STORE), projectId);
          reconciled.evidence.forEach((item) => transaction.objectStore(ANALYSIS_EVIDENCE_STORE).put(item));
        }

        const updatedProject: ProjectRecord = {
          ...normalizeProject(current),
          structureRevision,
          analysisRevision: normalizeProject(current).analysisRevision + (analysisChanged ? 1 : 0),
          updatedAt: now,
        };
        projectStore.put(updatedProject);
        await completion;
        return updatedProject;
      } catch (error) {
        try { transaction.abort(); } catch { /* already completed or aborted */ }
        await completion.catch(() => undefined);
        throw error;
      }
    },

    async listProjectResearchRanges(projectId: string) {
      const database = await openDatabase();
      const transaction = database.transaction(RESEARCH_RANGES_STORE, "readonly");
      const ranges = await requestResult(transaction.objectStore(RESEARCH_RANGES_STORE).index("projectId").getAll(IDBKeyRange.only(projectId))) as ResearchRange[];
      return ranges.sort((left, right) => left.startUs - right.startUs || left.createdAt.localeCompare(right.createdAt));
    },

    async saveProjectResearchRange(range: ResearchRange, expectedRevision?: number) {
      if (!Number.isSafeInteger(range.startUs) || !Number.isSafeInteger(range.endUs) || range.endUs <= range.startUs) throw new Error("研究范围必须是正向整数微秒区间。");
      const database = await openDatabase();
      const transaction = database.transaction(RESEARCH_RANGES_STORE, "readwrite");
      const store = transaction.objectStore(RESEARCH_RANGES_STORE);
      const existing = await requestResult(store.get(range.id)) as ResearchRange | undefined;
      if (expectedRevision !== undefined && existing && existing.revision !== expectedRevision) throw createRevisionConflictError("save-research-range", expectedRevision, existing.revision, range.id);
      injectProjectRepositoryFault("research-range-write");
      store.put(structuredClone(range));
      await transactionResult(transaction);
    },

    async deleteProjectResearchRange(projectId: string, rangeId: string) {
      const database = await openDatabase();
      const transaction = database.transaction(RESEARCH_RANGES_STORE, "readwrite");
      const store = transaction.objectStore(RESEARCH_RANGES_STORE);
      const range = await requestResult(store.get(rangeId)) as ResearchRange | undefined;
      if (range?.projectId === projectId) store.delete(rangeId);
      await transactionResult(transaction);
    },

    async listProjectResearchContexts(projectId: string) {
      const database = await openDatabase();
      const transaction = database.transaction(RESEARCH_CONTEXTS_STORE, "readonly");
      const contexts = await requestResult(transaction.objectStore(RESEARCH_CONTEXTS_STORE).index("projectId").getAll(IDBKeyRange.only(projectId))) as ResearchContext[];
      return contexts.sort((left, right) => left.updatedAt.localeCompare(right.updatedAt));
    },

    async saveProjectResearchContext(context: ResearchContext, expectedRevision?: number) {
      const database = await openDatabase();
      const transaction = database.transaction(RESEARCH_CONTEXTS_STORE, "readwrite");
      const store = transaction.objectStore(RESEARCH_CONTEXTS_STORE);
      const key = [context.projectId, context.target.kind, context.target.id];
      const existing = await requestResult(store.index("projectTarget").get(key)) as ResearchContext | undefined;
      if (expectedRevision !== undefined && existing && existing.revision !== expectedRevision) throw createRevisionConflictError("save-research-context", expectedRevision, existing.revision, context.id);
      if (existing && existing.id !== context.id) store.delete(existing.id);
      injectProjectRepositoryFault("research-context-write");
      store.put(structuredClone(context));
      await transactionResult(transaction);
    },

    async deleteProjectResearchContext(projectId: string, contextId: string) {
      const database = await openDatabase();
      const transaction = database.transaction(RESEARCH_CONTEXTS_STORE, "readwrite");
      const store = transaction.objectStore(RESEARCH_CONTEXTS_STORE);
      const context = await requestResult(store.get(contextId)) as ResearchContext | undefined;
      if (context?.projectId === projectId) store.delete(contextId);
      await transactionResult(transaction);
    },


    async listProjectAnalysisRecords(projectId: string) {
      const database = await openDatabase();
      const transaction = database.transaction(ANALYSIS_RECORDS_STORE, "readonly");
      const records = await requestResult(transaction.objectStore(ANALYSIS_RECORDS_STORE).index("projectId").getAll(IDBKeyRange.only(projectId))) as AnalysisRecord[];
      return records.sort((left, right) => left.id.localeCompare(right.id));
    },

    async saveProjectAnalysisRecord(record: AnalysisRecord, expectedRevision: number | undefined, expectedProjectRevision: string) {
      const database = await openDatabase();
      const transaction = database.transaction([PROJECTS_STORE, ANALYSIS_RECORDS_STORE], "readwrite");
      const completion = transactionResult(transaction, "save-analysis-record");
      try {
        const projectStore = transaction.objectStore(PROJECTS_STORE);
        const recordStore = transaction.objectStore(ANALYSIS_RECORDS_STORE);
        const currentProject = await requestResult(projectStore.get(record.projectId)) as ProjectRecord | undefined;
        if (!currentProject) throw new Error("项目不存在或已删除。");
        if (currentProject.updatedAt !== expectedProjectRevision) throw createRevisionConflictError("save-analysis-record:project", expectedProjectRevision, currentProject.updatedAt, record.projectId);
        const existing = await requestResult(recordStore.get(record.id)) as AnalysisRecord | undefined;
        if (existing && expectedRevision !== undefined && existing.revision !== expectedRevision) throw createRevisionConflictError("save-analysis-record", expectedRevision, existing.revision, record.id);
        const now = nextProjectUpdatedAt(currentProject.updatedAt);
        const saved: AnalysisRecord = { ...structuredClone(record), revision: (existing?.revision ?? 0) + 1, updatedAt: now };
        injectProjectRepositoryFault("analysis-record-write");
        recordStore.put(saved);
        projectStore.put({ ...normalizeProject(currentProject), analysisRevision: currentProject.analysisRevision + 1, updatedAt: now });
        await completion;
        return saved;
      } catch (error) {
        try { transaction.abort(); } catch { /* already completed or aborted */ }
        await completion.catch(() => undefined);
        throw error;
      }
    },

    async listProjectAnalysisCandidates(projectId: string) {
      const database = await openDatabase();
      const transaction = database.transaction(ANALYSIS_CANDIDATES_STORE, "readonly");
      const candidates = await requestResult(transaction.objectStore(ANALYSIS_CANDIDATES_STORE).index("projectId").getAll(IDBKeyRange.only(projectId))) as AnalysisCandidate[];
      return candidates.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    },

    async saveProjectAnalysisCandidate(candidate: AnalysisCandidate, expectedRevision?: number) {
      const database = await openDatabase();
      const transaction = database.transaction(ANALYSIS_CANDIDATES_STORE, "readwrite");
      const store = transaction.objectStore(ANALYSIS_CANDIDATES_STORE);
      const existing = await requestResult(store.get(candidate.id)) as AnalysisCandidate | undefined;
      if (existing && expectedRevision !== undefined && existing.revision !== expectedRevision) throw createRevisionConflictError("save-analysis-candidate", expectedRevision, existing.revision, candidate.id);
      injectProjectRepositoryFault("analysis-candidate-write");
      store.put({ ...structuredClone(candidate), revision: (existing?.revision ?? 0) + 1, updatedAt: new Date().toISOString() });
      await transactionResult(transaction, "save-analysis-candidate");
    },

    async acceptProjectAnalysisCandidate(candidateId: string, expectedCandidateRevision: number, expectedProjectRevision: string) {
      const database = await openDatabase();
      const transaction = database.transaction([PROJECTS_STORE, ANALYSIS_RECORDS_STORE, ANALYSIS_CANDIDATES_STORE], "readwrite");
      const completion = transactionResult(transaction, "accept-analysis-candidate");
      try {
        const projectStore = transaction.objectStore(PROJECTS_STORE);
        const candidateStore = transaction.objectStore(ANALYSIS_CANDIDATES_STORE);
        const recordStore = transaction.objectStore(ANALYSIS_RECORDS_STORE);
        const candidate = await requestResult(candidateStore.get(candidateId)) as AnalysisCandidate | undefined;
        if (!candidate) throw new Error("分析候选不存在。");
        if (candidate.revision !== expectedCandidateRevision) throw createRevisionConflictError("accept-analysis-candidate:candidate", expectedCandidateRevision, candidate.revision, candidateId);
        if (candidate.status !== "pending") throw new Error("只有 pending Candidate 可以被接受。");
        const currentProject = await requestResult(projectStore.get(candidate.projectId)) as ProjectRecord | undefined;
        if (!currentProject) throw new Error("项目不存在或已删除。");
        if (currentProject.updatedAt !== expectedProjectRevision) throw createRevisionConflictError("accept-analysis-candidate:project", expectedProjectRevision, currentProject.updatedAt, candidate.projectId);
        if (candidate.dependencyRevision.structureRevision !== currentProject.structureRevision || candidate.dependencyRevision.analysisRevision !== currentProject.analysisRevision) throw createRevisionConflictError("accept-analysis-candidate:dependency", candidate.dependencyRevision.structureRevision + ":" + candidate.dependencyRevision.analysisRevision, currentProject.structureRevision + ":" + currentProject.analysisRevision, candidateId);
        const recordId = [candidate.projectId, candidate.subject.kind, candidate.subject.id, candidate.fieldId].join(":");
        const existing = await requestResult(recordStore.get(recordId)) as AnalysisRecord | undefined;
        const now = nextProjectUpdatedAt(currentProject.updatedAt);
        const record: AnalysisRecord = {
          id: recordId,
          projectId: candidate.projectId,
          subject: structuredClone(candidate.subject),
          fieldId: candidate.fieldId,
          entry: structuredClone(candidate.proposedEntry),
          status: "confirmed",
          staleReason: null,
          provenance: { kind: "ai-confirmed", provider: candidate.source.provider, model: candidate.source.model, promptVersion: candidate.source.promptVersion, contextDefinitionVersion: candidate.source.contextDefinitionVersion, confirmedAt: now },
          evidenceRefs: [...candidate.evidenceRefs],
          structureRevision: currentProject.structureRevision,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          revision: (existing?.revision ?? 0) + 1,
        };
        recordStore.put(record);
        candidateStore.put({ ...candidate, status: "accepted", acceptedRecordId: record.id, updatedAt: now, revision: candidate.revision + 1 });
        projectStore.put({ ...normalizeProject(currentProject), analysisRevision: currentProject.analysisRevision + 1, updatedAt: now });
        await completion;
        return record;
      } catch (error) {
        try { transaction.abort(); } catch { /* already completed or aborted */ }
        await completion.catch(() => undefined);
        throw error;
      }
    },

    async listProjectAnalysisEvidence(projectId: string) {
      const database = await openDatabase();
      const transaction = database.transaction(ANALYSIS_EVIDENCE_STORE, "readonly");
      const evidence = await requestResult(transaction.objectStore(ANALYSIS_EVIDENCE_STORE).index("projectId").getAll(IDBKeyRange.only(projectId))) as AnalysisEvidenceRecord[];
      return evidence.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    },

    async saveProjectAnalysisEvidence(evidence: AnalysisEvidenceRecord, expectedRevision: number | undefined, expectedProjectRevision: string) {
      const database = await openDatabase();
      const transaction = database.transaction([PROJECTS_STORE, ANALYSIS_EVIDENCE_STORE], "readwrite");
      const completion = transactionResult(transaction, "save-analysis-evidence");
      try {
        const projectStore = transaction.objectStore(PROJECTS_STORE);
        const evidenceStore = transaction.objectStore(ANALYSIS_EVIDENCE_STORE);
        const currentProject = await requestResult(projectStore.get(evidence.projectId)) as ProjectRecord | undefined;
        if (!currentProject) throw new Error("项目不存在或已删除。");
        if (currentProject.updatedAt !== expectedProjectRevision) throw createRevisionConflictError("save-analysis-evidence:project", expectedProjectRevision, currentProject.updatedAt, evidence.projectId);
        const existing = await requestResult(evidenceStore.get(evidence.id)) as AnalysisEvidenceRecord | undefined;
        if (existing && expectedRevision !== undefined && existing.revision !== expectedRevision) throw createRevisionConflictError("save-analysis-evidence", expectedRevision, existing.revision, evidence.id);
        const now = nextProjectUpdatedAt(currentProject.updatedAt);
        const saved: AnalysisEvidenceRecord = { ...structuredClone(evidence), revision: (existing?.revision ?? 0) + 1, updatedAt: now };
        injectProjectRepositoryFault("analysis-evidence-write");
        evidenceStore.put(saved);
        projectStore.put({ ...normalizeProject(currentProject), analysisRevision: currentProject.analysisRevision + 1, updatedAt: now });
        await completion;
        return saved;
      } catch (error) {
        try { transaction.abort(); } catch { /* already completed or aborted */ }
        await completion.catch(() => undefined);
        throw error;
      }
    },
    async listProjectAnalysisContextManifests(projectId: string) {
      const database = await openDatabase();
      const transaction = database.transaction(ANALYSIS_CONTEXT_MANIFESTS_STORE, "readonly");
      const manifests = await requestResult(transaction.objectStore(ANALYSIS_CONTEXT_MANIFESTS_STORE).index("projectId").getAll(IDBKeyRange.only(projectId))) as AnalysisContextManifest[];
      return manifests.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    },

    async saveProjectAnalysisContextManifest(manifest: AnalysisContextManifest) {
      const database = await openDatabase();
      const transaction = database.transaction(ANALYSIS_CONTEXT_MANIFESTS_STORE, "readwrite");
      transaction.objectStore(ANALYSIS_CONTEXT_MANIFESTS_STORE).put(structuredClone(manifest));
      await transactionResult(transaction, "save-analysis-context-manifest");
    },

    async listProjectAnnotationMarkers(projectId: string) {
      const database = await openDatabase();
      const transaction = database.transaction(ANNOTATION_MARKERS_STORE, "readonly");
      const storedMarkers = await requestResult(transaction.objectStore(ANNOTATION_MARKERS_STORE).index("projectId").getAll(IDBKeyRange.only(projectId))) as unknown[];
      const markers = storedMarkers.map(normalizeStoredAnnotationMarker);
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
      const updatedAt = new Date().toISOString();
      markers.forEach((marker) => store.put(toStoredAnnotationMarker(marker, projectId, updatedAt)));
      await transactionResult(transaction);
    },

    async saveProjectAnnotationMarker(marker: AnnotationMarker) {
      const database = await openDatabase();
      const transaction = database.transaction(ANNOTATION_MARKERS_STORE, "readwrite");
      const updatedAt = new Date().toISOString();
      transaction.objectStore(ANNOTATION_MARKERS_STORE).put(toStoredAnnotationMarker(marker, marker.projectId, updatedAt));
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
      const transaction = database.transaction([PROJECTS_STORE, SHOTS_STORE, SHOT_GROUPS_STORE, ANALYSIS_RECORDS_STORE, ANALYSIS_CANDIDATES_STORE, ANALYSIS_EVIDENCE_STORE], "readwrite");
      const completion = transactionResult(transaction, "replace-project-shots");
      try {
        const projectStore = transaction.objectStore(PROJECTS_STORE);
        const shotStore = transaction.objectStore(SHOTS_STORE);
        const current = await requestResult(projectStore.get(projectId)) as ProjectRecord | undefined;
        if (!current) throw new Error("项目不存在或已删除。");
        const [existingShots, groups, records, candidates, evidence] = await Promise.all([
          requestResult(shotStore.index("projectId").getAll(IDBKeyRange.only(projectId))) as Promise<StoredShotRecord[]>,
          requestResult(transaction.objectStore(SHOT_GROUPS_STORE).index("projectId").getAll(IDBKeyRange.only(projectId))) as Promise<ShotGroupRecord[]>,
          requestResult(transaction.objectStore(ANALYSIS_RECORDS_STORE).index("projectId").getAll(IDBKeyRange.only(projectId))) as Promise<AnalysisRecord[]>,
          requestResult(transaction.objectStore(ANALYSIS_CANDIDATES_STORE).index("projectId").getAll(IDBKeyRange.only(projectId))) as Promise<AnalysisCandidate[]>,
          requestResult(transaction.objectStore(ANALYSIS_EVIDENCE_STORE).index("projectId").getAll(IDBKeyRange.only(projectId))) as Promise<AnalysisEvidenceRecord[]>,
        ]);
        const structureChanged = structureSignature(existingShots, groups) !== structureSignature(shots, groups);
        const structureRevision = normalizeProject(current).structureRevision + (structureChanged ? 1 : 0);
        const reconciled = structureChanged
          ? reconcileAnalysisAfterStructureChange({
              records,
              candidates,
              evidence,
              previousShots: existingShots,
              nextShots: shots,
              previousGroups: groups,
              nextGroups: groups,
              invalidatedByRevision: structureRevision,
            })
          : { records, candidates, evidence };
        const analysisChanged = analysisStateSignature(records, candidates, evidence) !== analysisStateSignature(reconciled.records, reconciled.candidates, reconciled.evidence);
        const now = nextProjectUpdatedAt(current.updatedAt);
        await deleteProjectShotRecords(shotStore, projectId);
        const previousById = new Map(existingShots.map((shot) => [shot.id, shot]));
        shots.forEach((shot, order) => {
          const previous = previousById.get(shot.id);
          const changed = !previous || JSON.stringify([previous.order, previous.startFrame, previous.endFrame, previous.status, previous.detection, previous.lineage]) !== JSON.stringify([order, shot.startFrame, shot.endFrame, shot.status, shot.detection, shot.lineage]);
          shotStore.put({ ...shot, projectId, order, structureRevision, revision: previous ? previous.revision + (changed ? 1 : 0) : Math.max(1, shot.revision), updatedAt: now });
        });
        await deleteProjectRecordsAndWait(transaction.objectStore(ANALYSIS_RECORDS_STORE), projectId);
        reconciled.records.forEach((record) => transaction.objectStore(ANALYSIS_RECORDS_STORE).put(record));
        await deleteProjectRecordsAndWait(transaction.objectStore(ANALYSIS_CANDIDATES_STORE), projectId);
        reconciled.candidates.forEach((candidate) => transaction.objectStore(ANALYSIS_CANDIDATES_STORE).put(candidate));
        await deleteProjectRecordsAndWait(transaction.objectStore(ANALYSIS_EVIDENCE_STORE), projectId);
        reconciled.evidence.forEach((item) => transaction.objectStore(ANALYSIS_EVIDENCE_STORE).put(item));
        const updatedProject: ProjectRecord = {
          ...normalizeProject(current),
          shots: shots.length,
          structureRevision,
          analysisRevision: normalizeProject(current).analysisRevision + (analysisChanged ? 1 : 0),
          updatedAt: now,
        };
        projectStore.put(updatedProject);
        await completion;
        return updatedProject;
      } catch (error) {
        try { transaction.abort(); } catch { /* already completed or aborted */ }
        await completion.catch(() => undefined);
        throw error;
      }
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
      const storedSnapshots = await requestResult(transaction.objectStore(RECOVERY_SNAPSHOTS_STORE).index("projectId").getAll(IDBKeyRange.only(projectId))) as import("../types").ProjectRecoverySnapshot[];
      const snapshots = storedSnapshots.map((snapshot) => ({ ...snapshot, markers: snapshot.markers.map(normalizeStoredAnnotationMarker) }));
      return snapshots.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    },

    async saveProjectRecoverySnapshot(snapshot: import("../types").ProjectRecoverySnapshot) {
      const database = await openDatabase();
      const transaction = database.transaction(RECOVERY_SNAPSHOTS_STORE, "readwrite");
      const store = transaction.objectStore(RECOVERY_SNAPSHOTS_STORE);
      const existing = await requestResult(store.index("projectId").getAll(IDBKeyRange.only(snapshot.projectId))) as import("../types").ProjectRecoverySnapshot[];
      store.put({ ...snapshot, markers: snapshot.markers.map((marker) => toStoredAnnotationMarker(marker)) });
      [...existing, snapshot]
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .slice(3)
        .forEach((item) => store.delete(item.id));
      await transactionResult(transaction);
    },

    async restoreProjectRecoverySnapshot(snapshot: ProjectRecoverySnapshot) {
      const database = await openDatabase();
      const transaction = database.transaction([PROJECTS_STORE, SHOTS_STORE, SHOT_GROUPS_STORE, ANNOTATION_MARKERS_STORE, PROJECT_TEMPLATES_STORE, RESEARCH_RANGES_STORE, RESEARCH_CONTEXTS_STORE, ANALYSIS_RECORDS_STORE, ANALYSIS_CANDIDATES_STORE, ANALYSIS_EVIDENCE_STORE, ANALYSIS_CONTEXT_MANIFESTS_STORE], "readwrite");
      const projectId = snapshot.projectId;
      transaction.objectStore(PROJECTS_STORE).put({ ...snapshot.project, id: projectId });
      await deleteProjectShotRecords(transaction.objectStore(SHOTS_STORE), projectId);
      await deleteProjectRecordsAndWait(transaction.objectStore(SHOT_GROUPS_STORE), projectId);
      await deleteProjectRecordsAndWait(transaction.objectStore(ANNOTATION_MARKERS_STORE), projectId);
      const templateStore = transaction.objectStore(PROJECT_TEMPLATES_STORE);
      const existingTemplate = await requestResult(templateStore.index("projectId").get(projectId)) as ProjectTemplateSnapshotRecord | undefined;
      if (existingTemplate) templateStore.delete(existingTemplate.id);
      if (snapshot.template) templateStore.put({ ...snapshot.template, projectId });
      snapshot.shots.forEach((shot) => transaction.objectStore(SHOTS_STORE).put({ ...shot, projectId }));
      snapshot.groups.forEach((group) => transaction.objectStore(SHOT_GROUPS_STORE).put({ ...group, projectId }));
      snapshot.markers.forEach((marker) => transaction.objectStore(ANNOTATION_MARKERS_STORE).put(toStoredAnnotationMarker(marker, projectId)));
      if (snapshot.researchRanges !== undefined) {
        await deleteProjectRecordsAndWait(transaction.objectStore(RESEARCH_RANGES_STORE), projectId);
        snapshot.researchRanges.forEach((range) => transaction.objectStore(RESEARCH_RANGES_STORE).put({ ...range, projectId }));
      }
      if (snapshot.researchContexts !== undefined) {
        await deleteProjectRecordsAndWait(transaction.objectStore(RESEARCH_CONTEXTS_STORE), projectId);
        snapshot.researchContexts.forEach((context) => transaction.objectStore(RESEARCH_CONTEXTS_STORE).put({ ...context, projectId }));
      }
      await deleteProjectRecordsAndWait(transaction.objectStore(ANALYSIS_RECORDS_STORE), projectId);
      (snapshot.analysisRecords ?? []).forEach((record) => transaction.objectStore(ANALYSIS_RECORDS_STORE).put({ ...record, projectId }));
      await deleteProjectRecordsAndWait(transaction.objectStore(ANALYSIS_CANDIDATES_STORE), projectId);
      (snapshot.analysisCandidates ?? []).forEach((candidate) => transaction.objectStore(ANALYSIS_CANDIDATES_STORE).put({ ...candidate, projectId }));
      await deleteProjectRecordsAndWait(transaction.objectStore(ANALYSIS_EVIDENCE_STORE), projectId);
      (snapshot.analysisEvidence ?? []).forEach((evidence) => transaction.objectStore(ANALYSIS_EVIDENCE_STORE).put({ ...evidence, projectId }));
      await deleteProjectRecordsAndWait(transaction.objectStore(ANALYSIS_CONTEXT_MANIFESTS_STORE), projectId);
      (snapshot.analysisContextManifests ?? []).forEach((manifest) => transaction.objectStore(ANALYSIS_CONTEXT_MANIFESTS_STORE).put({ ...manifest, projectId }));
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
