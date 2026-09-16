import type { AnnotationMarker } from "../../annotation/types";
import type { ShotGroupRecord } from "../../group/types";
import type { ShotRecord } from "../../shot/types";
import projectRepository from "./projectRepository";
import type { ProjectRecord, ProjectTemplateSnapshotRecord, ScreenshotRecord, StoredShotRecord } from "../types";
import type { ResearchContext, ResearchRange } from "../../analysis/types";

const FORMAT = "aisenlens-project-backup";
const VERSION = 3;
const MAX_BACKUP_BYTES = 512 * 1024 * 1024;
const MAX_MANIFEST_BYTES = 16 * 1024 * 1024;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

interface BackupProgress { phase: "preparing" | "packing" | "saving"; completed: number; total: number; }
interface BackupScreenshot { screenshot: ScreenshotRecord; path: string; }
interface ProjectBackup { format: typeof FORMAT; version: typeof VERSION; exportedAt: string; project: ProjectRecord; shots: ShotRecord[]; groups: ShotGroupRecord[]; markers: AnnotationMarker[]; template: ProjectTemplateSnapshotRecord | null; researchRanges: ResearchRange[]; researchContexts: ResearchContext[]; screenshots: BackupScreenshot[]; }

function crc32(input: Uint8Array) { let crc = 0xffffffff; for (const value of input) { crc ^= value; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; }
function join(parts: Uint8Array[]) { const output = new Uint8Array(parts.reduce((total, part) => total + part.length, 0)); let offset = 0; for (const part of parts) { output.set(part, offset); offset += part.length; } return output; }
function u16(value: number) { const output = new Uint8Array(2); new DataView(output.buffer).setUint16(0, value, true); return output; }
function u32(value: number) { const output = new Uint8Array(4); new DataView(output.buffer).setUint32(0, value, true); return output; }

function createZip(files: Array<{ path: string; data: Uint8Array }>) {
  let offset = 0;
  const localEntries: Uint8Array[] = [];
  const centralEntries: Uint8Array[] = [];
  for (const file of files) {
    const path = encoder.encode(file.path);
    const checksum = crc32(file.data);
    const local = join([u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(checksum), u32(file.data.length), u32(file.data.length), u16(path.length), u16(0), path, file.data]);
    localEntries.push(local);
    centralEntries.push(join([u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(checksum), u32(file.data.length), u32(file.data.length), u16(path.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), path]));
    offset += local.length;
  }
  const directory = join(centralEntries);
  return join([...localEntries, directory, u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(directory.length), u32(offset), u16(0)]);
}

function parseZip(input: Uint8Array) {
  if (input.byteLength > MAX_BACKUP_BYTES) throw new Error("备份文件超过 512 MB 安全上限。");
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  let end = -1;
  for (let index = input.length - 22; index >= Math.max(0, input.length - 65_557); index--) if (view.getUint32(index, true) === 0x06054b50) { end = index; break; }
  if (end < 0) throw new Error("备份文件不是有效的 ZIP 包。");
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  const entries = new Map<string, Uint8Array>();
  for (let index = 0; index < count; index++) {
    if (offset < 0 || offset + 46 > input.length) throw new Error("备份目录越界。");
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("备份目录损坏。");
    const method = view.getUint16(offset + 10, true);
    const checksum = view.getUint32(offset + 16, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const size = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    if (offset + 46 + nameLength + extraLength + commentLength > input.length || localOffset + 30 > input.length) throw new Error("备份目录条目越界。");
    const name = decoder.decode(input.slice(offset + 46, offset + 46 + nameLength));
    if (!name || name.startsWith("/") || name.includes("..") || method !== 0 || view.getUint32(localOffset, true) !== 0x04034b50) throw new Error("备份包含不安全或不受支持的资源。");
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    if (compressedSize !== size || dataStart + size > input.length || entries.has(name)) throw new Error("备份资源大小或名称校验失败。");
    const data = input.slice(dataStart, dataStart + size);
    if (crc32(data) !== checksum) throw new Error(`备份资源校验失败：${name}`);
    entries.set(name, data);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function validate(value: unknown): asserts value is ProjectBackup {
  if (!value || typeof value !== "object") throw new Error("备份清单无效。");
  const backup = value as Partial<ProjectBackup>;
  if (backup.format !== FORMAT || backup.version !== VERSION) throw new Error("不支持的 AisenLens 备份版本。");
  if (!backup.project || typeof backup.project.title !== "string" || !Array.isArray(backup.project.mediaAssets) || !Array.isArray(backup.project.audioTracks) || !Array.isArray(backup.shots) || !Array.isArray(backup.groups) || !Array.isArray(backup.markers) || !Array.isArray(backup.researchRanges) || !Array.isArray(backup.researchContexts) || !Array.isArray(backup.screenshots)) throw new Error("备份缺少必要的项目数据。");
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
}

function filename(title: string) { return `${title.trim().replace(/[\\/:*?"<>|]/g, "-") || "AisenLens-项目备份"}.aisenlens-backup.zip`; }
function download(blob: Blob, name: string) { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = name; link.style.display = "none"; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1_000); }

export async function downloadProjectBackup(projectId: string, onProgress?: (progress: BackupProgress) => void) {
  onProgress?.({ phase: "preparing", completed: 0, total: 1 });
  const project = await projectRepository.getProject(projectId);
  if (!project) throw new Error("项目不存在或已删除。");
  const [shots, groups, markers, template, screenshots, researchRanges, researchContexts] = await Promise.all([projectRepository.listProjectShots(projectId), projectRepository.listProjectShotGroups(projectId), projectRepository.listProjectAnnotationMarkers(projectId), projectRepository.getProjectTemplate(projectId), projectRepository.listProjectScreenshots(projectId), projectRepository.listProjectResearchRanges(projectId), projectRepository.listProjectResearchContexts(projectId)]);
  const total = screenshots.length || 1;
  const imageFiles: Array<{ path: string; data: Uint8Array }> = [];
  const screenshotEntries: BackupScreenshot[] = [];
  for (const [index, { screenshot, blob }] of screenshots.entries()) {
    const path = `resources/screenshots/${screenshot.id}.jpg`;
    imageFiles.push({ path, data: new Uint8Array(await blob.arrayBuffer()) });
    screenshotEntries.push({ screenshot, path });
    onProgress?.({ phase: "packing", completed: index + 1, total });
  }
  const backup: ProjectBackup = { format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), project, shots, groups, markers, template, researchRanges, researchContexts, screenshots: screenshotEntries };
  onProgress?.({ phase: "saving", completed: total, total });
  download(new Blob([createZip([{ path: "manifest.json", data: encoder.encode(JSON.stringify(backup)) }, ...imageFiles])], { type: "application/zip" }), filename(project.title));
}

export async function importProjectBackup(file: File) {
  const entries = parseZip(new Uint8Array(await file.arrayBuffer()));
  const manifest = entries.get("manifest.json");
  if (!manifest) throw new Error("备份缺少 manifest.json。");
  if (manifest.byteLength > MAX_MANIFEST_BYTES) throw new Error("备份清单超过安全上限。");
  let value: unknown;
  try { value = JSON.parse(decoder.decode(manifest)); } catch { throw new Error("备份清单无法读取。"); }
  validate(value);
  const backup = value;
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
    await projectRepository.saveProjectEditorState({ project, shots, groups, markers, template, researchRanges, researchContexts });
    return project;
  } catch (error) { await projectRepository.deleteProject(created.id).catch(() => undefined); throw error; }
}
