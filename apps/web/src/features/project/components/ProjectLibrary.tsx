import { useEffect, useRef, useState } from "react";
import { Database, Download, FileVideo, FolderPlus, FolderOpen, Plus, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import ModalShell from "../../../components/ui/modal-shell";
import SurfaceCard from "../../../components/ui/surface-card";
import ProjectCover from "./ProjectCover";
import useLocalStorage from "../../../hooks/useLocalStorage";
import useProjects from "../hooks/useProjects";
import { createLinkedVideoAsset, inspectLocalVideo, selectLocalVideo } from "../services/mediaService";
import projectRepository from "../services/projectRepository";
import { downloadProjectBackup, importProjectBackup } from "../services/projectBackupService";
import { getStorageUsage, restoreProjectRecoverySnapshot } from "../services/projectRecoveryService";
import ProjectStorageDialog from "./ProjectStorageDialog";
import type { ProjectRecoverySnapshot } from "../types";
import type { MediaAsset, ProjectFolder, ProjectRecord } from "../types";

interface ProjectLibraryProps { onOpenProject: (project: ProjectRecord) => void; }
type SortKey = "recent" | "progress" | "shots";

interface PendingVideo {
  file: File;
  handle: FileSystemFileHandle | null;
  source: NonNullable<MediaAsset["source"]>;
  metadata: NonNullable<MediaAsset["metadata"]>;
}

function formatUpdatedAt(value: string): string {
  const updatedAt = new Date(value);
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - updatedAt.getTime()) / 60_000));
  if (elapsedMinutes < 1) return "刚刚";
  if (elapsedMinutes < 60) return `${elapsedMinutes}分钟前`;
  if (elapsedMinutes < 24 * 60) return `${Math.floor(elapsedMinutes / 60)}小时前`;
  if (elapsedMinutes < 48 * 60) return "昨天";
  return updatedAt.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

function mediaStatusText(status: MediaAsset["status"]): string | null {
  if (status === "unlinked") return "未关联视频";
  if (status === "missing") return "视频待重新关联";
  if (status === "unsupported") return "格式不支持";
  return null;
}

export default function ProjectLibrary({ onOpenProject }: ProjectLibraryProps) {
  const { projects, isLoading, createProject, updateProject, deleteProject, moveProjectsOutOfFolder, refreshProjects } = useProjects();
  const [folders, setFolders] = useLocalStorage<ProjectFolder[]>("aisenlens:project-folders", []);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectFolderId, setNewProjectFolderId] = useState<string | null>(null);
  const [pendingVideo, setPendingVideo] = useState<PendingVideo | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ kind: "project" | "folder"; id: string } | null>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [isImportingBackup, setIsImportingBackup] = useState(false);
  const [backupProgress, setBackupProgress] = useState<{ projectId: string; label: string } | null>(null);
  const [storageProjectId, setStorageProjectId] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<ProjectRecoverySnapshot[]>([]);
  const [storageUsage, setStorageUsage] = useState<{ usage: number; quota: number } | null>(null);
  const [isManagingStorage, setIsManagingStorage] = useState(false);

  const totalNotes = projects.reduce((total, project) => total + project.notes, 0);
  const matchesProject = (project: ProjectRecord) => !search || project.title.includes(search) || project.description.includes(search) || folders.some((folder) => folder.id === project.folderId && folder.name.includes(search));
  const sortProjects = (items: ProjectRecord[]) => [...items].sort((left, right) => sort === "shots" ? right.shots - left.shots : sort === "progress" ? right.notes - left.notes : right.updatedAt.localeCompare(left.updatedAt));
  const getFolderProjects = (folderId: string | null) => sortProjects(projects.filter((project) => (project.folderId ?? null) === folderId && matchesProject(project)));
  const unfiledProjects = getFolderProjects(null);

  useEffect(() => {
    if (!storageProjectId) return;
    void Promise.all([projectRepository.listProjectRecoverySnapshots(storageProjectId), getStorageUsage()]).then(([nextSnapshots, nextUsage]) => { setSnapshots(nextSnapshots); setStorageUsage(nextUsage); });
  }, [storageProjectId]);

  const openNewProject = (folderId: string | null = null) => { setNewProjectFolderId(folderId); setNewProjectTitle(""); setPendingVideo(null); setIsProjectModalOpen(true); };
  const chooseVideo = async () => {
    try {
      const selectedVideo = await selectLocalVideo();
      const inspectedVideo = await inspectLocalVideo(selectedVideo);
      setPendingVideo({ ...selectedVideo, source: inspectedVideo.source!, metadata: inspectedVideo.metadata! });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(error instanceof Error ? error.message : "无法选择视频文件。");
    }
  };
  const createAndOptionallyOpenProject = async (shouldOpen: boolean) => {
    setIsCreatingProject(true);
    let createdProjectId: string | null = null;
    try {
      let project = await createProject({ title: newProjectTitle, folderId: newProjectFolderId });
      createdProjectId = project.id;
      if (pendingVideo) {
        if (!pendingVideo.handle) throw new Error("当前浏览器无法保存视频引用，请使用 Chrome 或 Edge 重新选择视频。");
        const primaryVideoAsset = createLinkedVideoAsset(project.id, pendingVideo.source, pendingVideo.metadata, false);
        await projectRepository.saveMediaAssetHandle(primaryVideoAsset.id, pendingVideo.handle);
        project = await updateProject({ ...project, primaryVideoAssetId: primaryVideoAsset.id, mediaAssets: [primaryVideoAsset] });
      }
      setIsProjectModalOpen(false);
      toast.success("项目已创建。");
      if (shouldOpen) onOpenProject(project);
    } catch (error) {
      if (createdProjectId) {
        await projectRepository.deleteProject(createdProjectId).catch(() => undefined);
      }
      toast.error(error instanceof Error ? error.message : "项目创建失败，请重试。");
    } finally {
      setIsCreatingProject(false);
    }
  };
  const createFolder = () => { const name = newFolderName.trim(); if (!name) return; setFolders((currentFolders) => [...currentFolders, { id: crypto.randomUUID(), name, expanded: true }]); setNewFolderName(""); setIsFolderModalOpen(false); toast.success("文件夹已创建。"); };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.kind === "project") await deleteProject(deleteTarget.id);
      else {
        await moveProjectsOutOfFolder(deleteTarget.id);
        setFolders((current) => current.filter((folder) => folder.id !== deleteTarget.id));
      }
      setDeleteTarget(null);
      toast.success("已删除。");
    } catch {
      toast.error("删除失败，请重试。");
    }
  };
  const toggleFolder = (folderId: string) => setFolders((current) => current.map((folder) => folder.id === folderId ? { ...folder, expanded: !folder.expanded } : folder));
  const exportBackup = async (projectId: string) => {
    setBackupProgress({ projectId, label: "正在准备备份…" });
    try {
      await downloadProjectBackup(projectId, (progress) => setBackupProgress({ projectId, label: progress.phase === "preparing" ? "正在读取项目数据…" : progress.phase === "packing" ? `正在打包截图 ${progress.completed}/${progress.total}…` : "正在保存备份…" }));
      toast.success("项目备份已下载。");
    }
    catch (error) { toast.error(error instanceof Error ? error.message : "导出项目备份失败。"); }
    finally { setBackupProgress(null); }
  };
  const importBackup = async (file: File | undefined) => {
    if (!file) return;
    setIsImportingBackup(true);
    try {
      await importProjectBackup(file);
      await refreshProjects();
      toast.success("项目已恢复。请重新关联本地视频后继续编辑。");
    } catch (error) { toast.error(error instanceof Error ? error.message : "导入项目备份失败。"); }
    finally { setIsImportingBackup(false); if (backupInputRef.current) backupInputRef.current.value = ""; }
  };
  const restoreSnapshot = async (snapshotId: string) => {
    if (!storageProjectId) return;
    setIsManagingStorage(true);
    try { await restoreProjectRecoverySnapshot(snapshotId, storageProjectId); await refreshProjects(); setStorageProjectId(null); toast.success("已恢复自动快照。"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "恢复快照失败。"); }
    finally { setIsManagingStorage(false); }
  };
  const clearDerivedCaches = async () => {
    setIsManagingStorage(true);
    try { await projectRepository.clearDerivedCaches(); setStorageUsage(await getStorageUsage()); toast.success("已清理可再生成缓存。"); }
    catch { toast.error("清理缓存失败，请重试。"); }
    finally { setIsManagingStorage(false); }
  };

  const ProjectCard = ({ project: projectRecord }: { project: ProjectRecord }) => {
    const primaryVideoAsset = projectRecord.mediaAssets.find((asset) => asset.id === projectRecord.primaryVideoAssetId && asset.kind === "video");
    const project = {
      ...projectRecord,
      media: primaryVideoAsset ?? { status: "unlinked" as const, source: null },
    };

    return (
    <SurfaceCard className="group relative cursor-pointer overflow-hidden transition-colors hover:border-accent/35" onClick={() => onOpenProject(project)}>
      <div className="relative"><ProjectCover screenshotId={project.coverScreenshotId} title={project.title} />{backupProgress?.projectId === project.id && <div className="absolute inset-x-0 bottom-0 bg-black/75 px-2 py-1.5 text-center text-[11px] text-accent">{backupProgress.label}</div>}<div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"><Button type="button" variant="ghost" size="icon-xs" aria-label="恢复与存储" onClick={(event) => { event.stopPropagation(); setStorageProjectId(project.id); }} className="bg-black/60 text-white/60 hover:bg-black/80 hover:text-accent"><Database /></Button><Button type="button" variant="ghost" size="icon-xs" aria-label="导出项目备份" disabled={Boolean(backupProgress)} onClick={(event) => { event.stopPropagation(); void exportBackup(project.id); }} className="bg-black/60 text-white/60 hover:bg-black/80 hover:text-accent"><Download /></Button><Button type="button" variant="ghost" size="icon-xs" aria-label="删除项目" onClick={(event) => { event.stopPropagation(); setDeleteTarget({ kind: "project", id: project.id }); }} className="bg-black/60 text-white/60 hover:bg-black/80 hover:text-red-400"><Trash2 /></Button></div></div>
      <div className="p-4"><div className="mb-2 flex items-start justify-between gap-2"><Button type="button" variant="ghost" onClick={(event) => { event.stopPropagation(); onOpenProject(project); }} className="h-auto min-w-0 justify-start whitespace-normal px-0 text-left font-display text-sm font-bold leading-snug text-white hover:bg-transparent hover:text-accent focus-visible:ring-2 focus-visible:ring-accent"><span className="line-clamp-2">{project.title}</span></Button>{mediaStatusText(project.media.status) && <span className="shrink-0 rounded-full border border-amber-400/20 bg-amber-400/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-200">{mediaStatusText(project.media.status)}</span>}</div><p className="mb-3 truncate text-xs text-text-muted">{project.media.source?.name ?? "尚未添加本地视频"}</p><div className="flex items-center justify-between font-mono text-xs text-text-muted"><span>{project.shots ? `${project.shots} 镜头` : "未开始"}</span><span>{project.notes ? `${project.notes} 批注` : "—"}</span><span>{formatUpdatedAt(project.updatedAt)}</span></div></div>
    </SurfaceCard>
    );
  };

  const NewProjectCard = ({ folderId = null }: { folderId?: string | null }) => <Button type="button" variant="outline" onClick={() => openNewProject(folderId)} className="h-[184px] flex-col rounded-xl border-dashed border-border text-text-muted hover:border-accent/35 hover:bg-accent/5 hover:text-white"><Plus className="size-5" /><span className="text-xs">新建拉片项目</span></Button>;

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-6 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4"><div><div className="flex items-center gap-3"><h1 className="font-display text-4xl font-black text-white">项目库</h1><span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 font-mono text-xs text-accent">本地管理</span></div><p className="mt-1 font-mono text-sm text-text-muted">{projects.length} 个项目 · {folders.length} 个文件夹 · {totalNotes} 条批注</p></div><div className="flex gap-2"><input ref={backupInputRef} type="file" accept=".aisenlens-backup.zip,application/zip" onChange={(event) => void importBackup(event.target.files?.[0])} className="hidden" /><Button type="button" variant="outline" disabled={isImportingBackup || Boolean(backupProgress)} onClick={() => backupInputRef.current?.click()} className="h-10 rounded-xl border-border text-text-dim hover:border-border-mid hover:bg-white/4 hover:text-white"><Upload />{isImportingBackup ? "正在恢复…" : "恢复备份"}</Button><Button type="button" variant="outline" onClick={() => { setNewFolderName(""); setIsFolderModalOpen(true); }} className="h-10 rounded-xl border-border text-text-dim hover:border-border-mid hover:bg-white/4 hover:text-white"><FolderPlus />新建文件夹</Button><Button type="button" onClick={() => openNewProject()} className="h-10 rounded-xl bg-accent px-4 font-semibold text-white hover:bg-accent/90"><Plus />新建项目</Button></div></header>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索项目名称、导演或文件夹…" className="h-10 rounded-xl border-border bg-bg-input pl-9 text-text-base placeholder:text-text-muted" /></div><div className="flex gap-2">{(["recent", "progress", "shots"] as SortKey[]).map((sortKey) => <Button type="button" key={sortKey} variant="outline" size="sm" onClick={() => setSort(sortKey)} className={`rounded-xl ${sort === sortKey ? "border-accent bg-accent text-white hover:bg-accent/90 hover:text-white" : "border-border text-text-dim hover:border-border-mid hover:bg-white/4 hover:text-white"}`}>{({ recent: "最近", progress: "进度", shots: "镜头数" } as Record<SortKey, string>)[sortKey]}</Button>)}</div></div>
      <div className="space-y-7">{folders.filter((folder) => !search || folder.name.includes(search) || getFolderProjects(folder.id).length > 0).map((folder) => { const folderProjects = getFolderProjects(folder.id); return <section key={folder.id}><div className="group mb-3 flex items-center gap-2 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/4"><Button type="button" variant="ghost" size="icon-xs" aria-label={folder.expanded ? "收起文件夹" : "展开文件夹"} onClick={() => toggleFolder(folder.id)} className={`text-text-muted hover:text-white ${folder.expanded ? "" : "-rotate-90"}`}>⌄</Button><Button type="button" variant="ghost" size="sm" onClick={() => toggleFolder(folder.id)} className="px-1 text-white hover:bg-transparent hover:text-white"><FolderOpen />{folder.name}</Button><span className="font-mono text-xs text-text-muted">{folderProjects.length} 个项目</span><div className="ml-auto flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"><Button type="button" variant="ghost" size="sm" onClick={() => openNewProject(folder.id)} className="text-text-muted hover:bg-white/5 hover:text-white"><Plus />项目</Button><Button type="button" variant="ghost" size="icon-sm" aria-label="删除文件夹" onClick={() => setDeleteTarget({ kind: "folder", id: folder.id })} className="text-text-muted hover:bg-red-500/10 hover:text-red-400"><Trash2 /></Button></div></div>{folder.expanded && <div className="grid grid-cols-1 gap-4 pl-6 sm:grid-cols-2 xl:grid-cols-3">{folderProjects.map((project) => <ProjectCard key={project.id} project={project} />)}<NewProjectCard folderId={folder.id} /></div>}</section>; })}</div>
      {unfiledProjects.length > 0 && <section className="mt-7"><div className="mb-3 flex items-center gap-2 px-3"><span className="text-sm font-medium text-text-muted">未分类项目</span><span className="font-mono text-xs text-text-muted">{unfiledProjects.length} 个</span></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{unfiledProjects.map((project) => <ProjectCard key={project.id} project={project} />)}<NewProjectCard /></div></section>}
      {!isLoading && !projects.length && <div className="py-24 text-center"><FolderOpen className="mx-auto mb-6 size-10 text-text-muted" /><h2 className="mb-2 text-lg font-semibold text-white">还没有拉片项目</h2><p className="mb-6 text-sm text-text-muted">新建项目或文件夹，开始整理你的本地拉片工作。</p><Button type="button" onClick={() => openNewProject()} className="h-11 rounded-xl bg-accent px-6 text-white hover:bg-accent/90"><Plus />新建第一个项目</Button></div>}
      {isProjectModalOpen && <ModalShell title="新建拉片项目" description={newProjectFolderId ? `将保存到「${folders.find((folder) => folder.id === newProjectFolderId)?.name ?? ""}」` : "未分类，可在以后归入文件夹。"} onClose={() => setIsProjectModalOpen(false)}><label htmlFor="project-title" className="mb-1.5 block font-mono text-xs tracking-wider text-text-muted">项目名称（可选）</label><Input id="project-title" autoFocus value={newProjectTitle} onChange={(event) => setNewProjectTitle(event.target.value)} placeholder="未填写时使用“未命名拉片项目”" className="h-11 rounded-xl border-border bg-bg-input px-4 text-text-base placeholder:text-text-muted" /><div className="mt-5 rounded-xl border border-border bg-bg-input/60 p-3"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-sm font-medium text-white">本地视频（可选）</p><p className="mt-1 truncate font-mono text-xs text-text-muted">{pendingVideo ? `${pendingVideo.source.name} · ${(pendingVideo.source.size / 1024 / 1024).toFixed(1)} MB` : "默认仅关联文件，不复制、不上传。"}</p></div><Button type="button" variant="outline" size="sm" onClick={() => void chooseVideo()} className="shrink-0 border-border text-text-dim hover:text-white"><FileVideo />{pendingVideo ? "重新选择" : "选择视频"}</Button></div></div><label className="mb-2 mt-5 block font-mono text-xs tracking-wider text-text-muted">所属文件夹</label><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setNewProjectFolderId(null)} className={newProjectFolderId === null ? "border-accent/50 bg-accent/15 text-white" : "border-border text-text-muted"}>未分类</Button>{folders.map((folder) => <Button type="button" variant="outline" size="sm" key={folder.id} onClick={() => setNewProjectFolderId(folder.id)} className={newProjectFolderId === folder.id ? "border-accent/50 bg-accent/15 text-white" : "border-border text-text-muted"}>{folder.name}</Button>)}</div><div className="mt-8 flex gap-3"><Button type="button" variant="outline" disabled={isCreatingProject} onClick={() => void createAndOptionallyOpenProject(false)} className="h-11 flex-1 rounded-xl border-border text-text-dim hover:bg-white/4 hover:text-white">创建空项目</Button><Button type="button" disabled={isCreatingProject} onClick={() => void createAndOptionallyOpenProject(true)} className="h-11 flex-1 rounded-xl bg-accent text-white hover:bg-accent/90">{pendingVideo ? "创建并开始拉片" : "创建并进入编辑器"}</Button></div></ModalShell>}
      {isFolderModalOpen && <ModalShell title="新建文件夹" description="用文件夹整理同一作品或主题下的多个拉片项目。" onClose={() => setIsFolderModalOpen(false)}><label htmlFor="folder-name" className="mb-1.5 block font-mono text-xs tracking-wider text-text-muted">文件夹名称</label><Input id="folder-name" autoFocus value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} placeholder="例如：王家卫风格研究" className="h-11 rounded-xl border-border bg-bg-input px-4 text-text-base placeholder:text-text-muted" /><div className="mt-8 flex gap-3"><Button type="button" variant="outline" onClick={() => setIsFolderModalOpen(false)} className="h-11 flex-1 rounded-xl border-border text-text-dim hover:bg-white/4 hover:text-white">取消</Button><Button type="button" disabled={!newFolderName.trim()} onClick={createFolder} className="h-11 flex-1 rounded-xl bg-accent text-white hover:bg-accent/90">创建文件夹</Button></div></ModalShell>}
      {storageProjectId && <ProjectStorageDialog snapshots={snapshots} usage={storageUsage} isBusy={isManagingStorage} onClose={() => setStorageProjectId(null)} onRestore={(snapshotId) => void restoreSnapshot(snapshotId)} onClearCache={() => void clearDerivedCaches()} />}
      {deleteTarget && <ModalShell title={`删除${deleteTarget.kind === "folder" ? "文件夹" : "项目"}`} description={deleteTarget.kind === "folder" ? "文件夹内的项目不会被删除，它们会回到未分类项目。" : "项目及其本地数据将被永久删除，无法恢复。"} onClose={() => setDeleteTarget(null)} className="max-w-sm"><div className="mt-2 flex gap-3"><Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} className="h-11 flex-1 rounded-xl border-border text-text-dim hover:bg-white/4 hover:text-white">取消</Button><Button type="button" variant="destructive" onClick={() => void confirmDelete()} className="h-11 flex-1 rounded-xl">确认删除</Button></div></ModalShell>}
    </div>
  );
}
