import type { AnnotationMarker } from "../../annotation/types";
import type { ShotGroupRecord } from "../../group/types";
import type { ShotRecord } from "../../shot/types";
import projectRepository from "./projectRepository";
import type { ProjectRecord, ProjectTemplateSnapshotRecord, ScreenshotRecord, StoredShotRecord } from "../types";
import type { AnalysisCandidate, AnalysisContextManifest, AnalysisEvidenceRecord, AnalysisRecord, ResearchContext, ResearchRange } from "../../analysis/types";
import { remapAnalysisBackupData } from "./projectBackupRemap.ts";
import { decodeBackupArchive, encodeBackupArchive } from "./projectBackupArchiveCodec.ts";
import { validateExternalInput } from "../../../types/runtime";

const FORMAT = "aisenlens-project-backup";
const VERSION = 4;
const MAX_BACKUP_BYTES = 512 * 1024 * 1024;
const MAX_MANIFEST_BYTES = 16 * 1024 * 1024;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

interface BackupProgress { phase: "preparing" | "packing" | "saving"; completed: number; total: number; }
interface BackupScreenshot { screenshot: ScreenshotRecord; path: string; }
export interface ProjectBackupManifest { format: typeof FORMAT; version: typeof VERSION; exportedAt: string; project: ProjectRecord; shots: ShotRecord[]; groups: ShotGroupRecord[]; markers: AnnotationMarker[]; template: ProjectTemplateSnapshotRecord | null; researchRanges: ResearchRange[]; researchContexts: ResearchContext[]; analysisRecords: AnalysisRecord[]; analysisCandidates: AnalysisCandidate[]; analysisEvidence: AnalysisEvidenceRecord[]; analysisContextManifests: AnalysisContextManifest[]; screenshots: BackupScreenshot[]; }

function validate(value: unknown): asserts value is ProjectBackupManifest {
  if (!value || typeof value !== "object") throw new Error("备份清单无效。");
  const backup = value as Partial<ProjectBackupManifest>;
  if (backup.format !== FORMAT || backup.version !== VERSION) throw new Error("不支持的 AisenLens 备份版本。");
  if (!backup.project || typeof backup.project.title !== "string" || !Array.isArray(backup.project.mediaAssets) || !Array.isArray(backup.project.audioTracks) || !Array.isArray(backup.shots) || !Array.isArray(backup.groups) || !Array.isArray(backup.markers) || !Array.isArray(backup.researchRanges) || !Array.isArray(backup.researchContexts) || !Array.isArray(backup.analysisRecords) || !Array.isArray(backup.analysisCandidates) || !Array.isArray(backup.analysisEvidence) || !Array.isArray(backup.analysisContextManifests) || !Array.isArray(backup.screenshots)) throw new Error("备份缺少必要的项目数据。");
  const screenshotIds = new Set(backup.screenshots.map(({ screenshot }) => screenshot?.id).filter((id): id is string => typeof id === "string"));
  if (screenshotIds.size !== backup.screenshots.length) throw new Error("备份包含重复或无效的截图引用。");
  const assetIds = new Set(backup.project.mediaAssets.map((asset) => asset?.id).filter((id): id is string => typeof id === "string"));
  if (assetIds.size !== backup.project.mediaAssets.length || (backup.project.primaryVideoAssetId !== null && !assetIds.has(backup.project.primaryVideoAssetId)) || (backup.project.coverScreenshotId !== null && !screenshotIds.has(backup.project.coverScreenshotId))) throw new Error("备份包含失效的项目素材或封面引用。");
  if (backup.project.audioTracks.some((track) => !track || !Array.isArray(track.clips) || track.clips.some((clip) => !assetIds.has(clip.assetId)))) throw new Error("备份包含失效的音轨素材引用。");
  const shotIds = new Set<string>();
  for (const shot of backup.shots) {
    if (!shot || typeof shot.id !== "string" || !Number.isInteger(shot.startFrame) || !Number.isInteger(shot.endFrame) || shot.endFrame <= shot.startFrame || !Array.isArray(shot.screenshotIds)) throw new Error("备份包含无效的分镜范围。");
    if (shotIds.has(shot.id)) throw new Error("备份包含重复的分镜 ID。");
    shotIds.add(shot.id);
    if ([shot.primaryScreenshotId, shot.firstFrameScreenshotId, shot.lastFrameScreenshotId].some((id) => id !== null && !screenshotIds.has(id)) || shot.screenshotIds.some((id) => !screenshotIds.has(id))) throw new Error("备份包含失效的分镜截图引用。");
  }
  for (const group of backup.groups) if (!group || !Array.isArray(group.shotIds) || group.shotIds.some((id) => !shotIds.has(id))) throw new Error("备份包含失效的分组引用。");
  for (const marker of backup.markers) if (!marker || (marker.shotId !== null && !shotIds.has(marker.shotId))) throw new Error("备份包含失效的标记引用。");
  const rangeIds = new Set(backup.researchRanges.map((range) => range?.id).filter((id): id is string => typeof id === "string"));
  if (rangeIds.size !== backup.researchRanges.length || backup.researchRanges.some((range) => !Number.isSafeInteger(range.startUs) || !Number.isSafeInteger(range.endUs) || range.endUs <= range.startUs)) throw new Error("备份包含无效的研究范围。");
  if (backup.researchContexts.some((context) => !context || !context.target || (context.target.kind === "range" && !rangeIds.has(context.target.id)))) throw new Error("备份包含失效的研究目标引用。");
  const backupProjectId = backup.project.id;
  const analysisRecordIds = new Set(backup.analysisRecords.map((record) => record?.id).filter((id): id is string => typeof id === "string"));
  if (analysisRecordIds.size !== backup.analysisRecords.length || backup.analysisRecords.some((record) => !record || record.projectId !== backupProjectId || (record.subject.kind === "shot" && !shotIds.has(record.subject.id)))) throw new Error("备份包含无效的正式分析记录。");
  const candidateIds = new Set(backup.analysisCandidates.map((candidate) => candidate?.id).filter((id): id is string => typeof id === "string"));
  if (candidateIds.size !== backup.analysisCandidates.length || backup.analysisCandidates.some((candidate) => !candidate || candidate.projectId !== backupProjectId || (candidate.subject.kind === "shot" && !shotIds.has(candidate.subject.id)))) throw new Error("备份包含无效的分析候选。");
  const evidenceIds = new Set(backup.analysisEvidence.map((item) => item?.id).filter((id): id is string => typeof id === "string"));
  if (evidenceIds.size !== backup.analysisEvidence.length || backup.analysisEvidence.some((item) => !item || item.projectId !== backupProjectId || (item.recordId !== null && !analysisRecordIds.has(item.recordId)) || (item.candidateId !== null && !candidateIds.has(item.candidateId)))) throw new Error("备份包含无效的分析证据。");
  const manifestIds = new Set(backup.analysisContextManifests.map((item) => item?.id).filter((id): id is string => typeof id === "string"));
  if (manifestIds.size !== backup.analysisContextManifests.length || backup.analysisContextManifests.some((item) => !item || item.projectId !== backupProjectId || (item.subject.kind === "shot" && !shotIds.has(item.subject.id)) || item.evidenceRefs.some((id) => !evidenceIds.has(id)))) throw new Error("备份包含无效的 AI Context Manifest。");
  if (backup.analysisRecords.some((record) => record.evidenceRefs.some((id) => !evidenceIds.has(id))) || backup.analysisCandidates.some((candidate) => candidate.evidenceRefs.some((id) => !evidenceIds.has(id)) || (candidate.contextManifestId !== null && !manifestIds.has(candidate.contextManifestId)))) throw new Error("备份包含失效的分析引用。");
}

function filename(title: string) { return `${title.trim().replace(/[\\/:*?"<>|]/g, "-") || "AisenLens-项目备份"}.aisenlens-backup.zip`; }
function download(blob: Blob, name: string) { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = name; link.style.display = "none"; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1_000); }

export async function downloadProjectBackup(projectId: string, onProgress?: (progress: BackupProgress) => void) {
  onProgress?.({ phase: "preparing", completed: 0, total: 1 });
  const project = await projectRepository.getProject(projectId);
  if (!project) throw new Error("项目不存在或已删除。");
  const [shots, groups, markers, template, screenshots, researchRanges, researchContexts, analysisRecords, analysisCandidates, analysisEvidence, analysisContextManifests] = await Promise.all([projectRepository.listProjectShots(projectId), projectRepository.listProjectShotGroups(projectId), projectRepository.listProjectAnnotationMarkers(projectId), projectRepository.getProjectTemplate(projectId), projectRepository.listProjectScreenshots(projectId), projectRepository.listProjectResearchRanges(projectId), projectRepository.listProjectResearchContexts(projectId), projectRepository.listProjectAnalysisRecords(projectId), projectRepository.listProjectAnalysisCandidates(projectId), projectRepository.listProjectAnalysisEvidence(projectId), projectRepository.listProjectAnalysisContextManifests(projectId)]);
  const total = screenshots.length || 1;
  const imageFiles: Array<{ path: string; data: Uint8Array }> = [];
  const screenshotEntries: BackupScreenshot[] = [];
  for (const [index, { screenshot, blob }] of screenshots.entries()) {
    const path = `resources/screenshots/${screenshot.id}.jpg`;
    imageFiles.push({ path, data: new Uint8Array(await blob.arrayBuffer()) });
    screenshotEntries.push({ screenshot, path });
    onProgress?.({ phase: "packing", completed: index + 1, total });
  }
  const backup: ProjectBackupManifest = { format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), project, shots, groups, markers, template, researchRanges, researchContexts, analysisRecords, analysisCandidates, analysisEvidence, analysisContextManifests, screenshots: screenshotEntries };
  onProgress?.({ phase: "saving", completed: total, total });
  validate(backup);
  const archive = new Uint8Array(encodeBackupArchive(backup, imageFiles));
  download(new Blob([archive.buffer], { type: "application/zip" }), filename(project.title));
}

export async function importProjectBackup(file: File) {
  validateExternalInput({ byteLength: file.size }, { maxBytes: MAX_BACKUP_BYTES }, "import-project-backup");
  const decoded = decodeBackupArchive(new Uint8Array(await file.arrayBuffer()), MAX_BACKUP_BYTES);
  const manifestVersion = decoded.manifest && typeof decoded.manifest === "object" && "version" in decoded.manifest && typeof decoded.manifest.version === "number" ? decoded.manifest.version : null;
  validateExternalInput({ byteLength: decoded.manifestBytes.byteLength, schemaVersion: manifestVersion }, { maxBytes: MAX_MANIFEST_BYTES, allowedSchemaVersions: [VERSION] }, "import-project-backup:manifest");
  validate(decoded.manifest);
  const backup = decoded.manifest;
  const entries = decoded.entries;
  const expectedResourcePaths = new Set(backup.screenshots.map(({ path }) => path));
  if (expectedResourcePaths.size !== backup.screenshots.length || backup.screenshots.some(({ path }) => !/^resources\/screenshots\/[^/]+\.jpg$/.test(path) || !entries.has(path))) throw new Error("备份截图资源缺失或路径无效。");
  const now = new Date().toISOString();
  const screenshotIdMap = new Map<string, string>(backup.screenshots.map(({ screenshot }) => [screenshot.id, crypto.randomUUID()]));
  const shotIdMap = new Map<string, string>(backup.shots.map((shot) => [shot.id, crypto.randomUUID()]));
  const groupIdMap = new Map<string, string>(backup.groups.map((group) => [group.id, crypto.randomUUID()]));
  const rangeIdMap = new Map<string, string>(backup.researchRanges.map((range) => [range.id, crypto.randomUUID()]));
  const contextIdMap = new Map<string, string>(backup.researchContexts.map((context) => [context.id, crypto.randomUUID()]));
  const assetIdMap = new Map<string, string>(backup.project.mediaAssets.map((asset) => [asset.id, crypto.randomUUID()]));
  const markerIdMap = new Map<string, string>(backup.markers.map((marker) => [marker.id, crypto.randomUUID()]));
  const created = await projectRepository.createProject({ title: `${backup.project.title}（已恢复）` });
  const project: ProjectRecord = {
    ...backup.project,
    id: created.id,
    title: created.title,
    folderId: null,
    shots: backup.shots.length,
    mediaAssets: backup.project.mediaAssets.map((asset) => ({ ...asset, id: assetIdMap.get(asset.id)!, projectId: created.id, status: "missing", linkedAt: null, relinkedAt: null, createdAt: now, updatedAt: now })),
    primaryVideoAssetId: backup.project.primaryVideoAssetId ? assetIdMap.get(backup.project.primaryVideoAssetId) ?? null : null,
    audioTracks: backup.project.audioTracks.map((track, order) => ({ ...track, id: crypto.randomUUID(), projectId: created.id, order, clips: track.clips.map((clip) => ({ ...clip, id: crypto.randomUUID(), assetId: assetIdMap.get(clip.assetId) ?? clip.assetId })) })),
    createdAt: now,
    updatedAt: now,
    coverScreenshotId: backup.project.coverScreenshotId ? screenshotIdMap.get(backup.project.coverScreenshotId) ?? null : null,
  };
  try {
    for (const { screenshot, path } of backup.screenshots) { const bytes = entries.get(path); if (!bytes) throw new Error("备份截图资源缺失。"); await projectRepository.saveScreenshot({ ...screenshot, id: screenshotIdMap.get(screenshot.id)!, projectId: created.id, capturedAt: now }, new Blob([new Uint8Array(bytes)], { type: screenshot.mimeType })); }
    const shots: StoredShotRecord[] = backup.shots.map((shot, order) => ({ ...shot, id: shotIdMap.get(shot.id)!, projectId: created.id, order, primaryScreenshotId: shot.primaryScreenshotId ? screenshotIdMap.get(shot.primaryScreenshotId) ?? null : null, screenshotIds: shot.screenshotIds.map((id) => screenshotIdMap.get(id)).filter((id): id is string => Boolean(id)), firstFrameScreenshotId: shot.firstFrameScreenshotId ? screenshotIdMap.get(shot.firstFrameScreenshotId) ?? null : null, lastFrameScreenshotId: shot.lastFrameScreenshotId ? screenshotIdMap.get(shot.lastFrameScreenshotId) ?? null : null, createdAt: now, updatedAt: now }));
    const groups = backup.groups.map((group) => ({ ...group, id: groupIdMap.get(group.id)!, projectId: created.id, shotIds: group.shotIds.map((id) => shotIdMap.get(id)!), createdAt: now, updatedAt: now }));
    const markers = backup.markers.map((marker) => ({ ...marker, id: markerIdMap.get(marker.id)!, projectId: created.id, shotId: marker.shotId ? shotIdMap.get(marker.shotId) ?? null : null, createdAt: now, updatedAt: now }));
    const template = backup.template ? { ...backup.template, id: crypto.randomUUID(), projectId: created.id, createdAt: now, updatedAt: now } : null;
    const researchRanges = backup.researchRanges.map((range) => ({ ...range, id: rangeIdMap.get(range.id)!, projectId: created.id, createdAt: now, updatedAt: now, revision: 1 }));
    const {
      records: analysisRecords,
      candidates: analysisCandidates,
      evidence: analysisEvidence,
      contextManifests: analysisContextManifests,
    } = remapAnalysisBackupData({
      newProjectId: created.id,
      now,
      records: backup.analysisRecords,
      candidates: backup.analysisCandidates,
      evidence: backup.analysisEvidence,
      contextManifests: backup.analysisContextManifests,
      shotIdMap,
      groupIdMap,
      screenshotIdMap,
      markerIdMap,
      assetIdMap,
    })
    const researchContexts = backup.researchContexts.map((context) => ({
      ...context,
      id: contextIdMap.get(context.id)!,
      projectId: created.id,
      target: context.target.kind === "shot" ? { kind: "shot" as const, id: shotIdMap.get(context.target.id) ?? context.target.id } : context.target.kind === "group" ? { kind: "group" as const, id: groupIdMap.get(context.target.id) ?? context.target.id } : { kind: "range" as const, id: rangeIdMap.get(context.target.id) ?? context.target.id },
      evidence: context.evidence.map((evidence) => evidence.kind === "screenshot" ? { ...evidence, projectId: created.id, screenshotId: screenshotIdMap.get(evidence.screenshotId) ?? evidence.screenshotId } : evidence.kind === "shot" ? { ...evidence, projectId: created.id, shotId: shotIdMap.get(evidence.shotId) ?? evidence.shotId } : evidence.kind === "marker" ? { ...evidence, projectId: created.id, markerId: markerIdMap.get(evidence.markerId) ?? evidence.markerId } : evidence.kind === "audio-range" ? { ...evidence, projectId: created.id, assetId: assetIdMap.get(evidence.assetId) ?? evidence.assetId } : evidence),
      createdAt: now,
      updatedAt: now,
      revision: 1,
    }));
    await projectRepository.saveProjectEditorState({ project, shots, groups, markers, template, researchRanges, researchContexts, analysisRecords, analysisCandidates, analysisEvidence, analysisContextManifests });
    return project;
  } catch (error) { await projectRepository.deleteProject(created.id).catch(() => undefined); throw error; }
}
