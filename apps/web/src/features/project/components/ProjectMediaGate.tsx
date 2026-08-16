import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { FileVideo, FolderOpen, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { createLinkedVideoAsset, inspectLocalVideo, isMatchingVideo, needsMediaMetadataRefresh, requestMediaPermission, selectLocalVideo, verifyLinkedMedia } from "../services/mediaService";
import projectRepository from "../services/projectRepository";
import type { MediaAsset, ProjectRecord } from "../types";

interface ProjectMediaGateProps {
  projectId: string | null;
  onNavigate: (page: number) => void;
  onProjectLoaded: (project: ProjectRecord) => void;
  children: (project: ProjectRecord, videoUrl: string, primaryVideoAsset: MediaAsset, onRenameProject: (title: string) => void) => ReactNode;
}

type LoadState = "loading" | "ready" | "not-found" | "unlinked" | "missing" | "needs-permission" | "error";

export default function ProjectMediaGate({ projectId, onNavigate, onProjectLoaded, children }: ProjectMediaGateProps) {
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSelectingVideo, setIsSelectingVideo] = useState(false);
  const loadRequestRef = useRef(0);

  const setPreviewUrl = useCallback((nextUrl: string | null) => {
    setVideoUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return nextUrl;
    });
  }, []);

  const loadProject = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    const isCurrentRequest = () => requestId === loadRequestRef.current;
    if (!projectId) {
      setLoadState("not-found");
      return;
    }

    setLoadState("loading");
    setLoadError(null);
    try {
    const nextProject = await projectRepository.getProject(projectId);
    if (!isCurrentRequest()) return;
    if (!nextProject) {
      setProject(null);
      setLoadState("not-found");
      return;
    }

    setProject(nextProject);
    onProjectLoaded(nextProject);
    const primaryVideoAsset = nextProject.mediaAssets.find((asset) => asset.id === nextProject.primaryVideoAssetId && asset.kind === "video") ?? null;
    if (!primaryVideoAsset || primaryVideoAsset.status === "unlinked" || !primaryVideoAsset.source) {
      setPreviewUrl(null);
      setLoadState("unlinked");
      return;
    }

    const handle = await projectRepository.getMediaAssetHandle(primaryVideoAsset.id);
    if (!isCurrentRequest()) return;
    if (!handle) {
      const missingProject = await projectRepository.updateProject({ ...nextProject, mediaAssets: nextProject.mediaAssets.map((asset) => asset.id === primaryVideoAsset.id ? { ...asset, status: "missing", updatedAt: new Date().toISOString() } : asset) });
      if (!isCurrentRequest()) return;
      setProject(missingProject);
      onProjectLoaded(missingProject);
      setPreviewUrl(null);
      setLoadState("missing");
      return;
    }

    const state = await verifyLinkedMedia(handle, primaryVideoAsset.source);
    if (!isCurrentRequest()) return;
    if (state === "needs-permission") {
      setPreviewUrl(null);
      setLoadState("needs-permission");
      return;
    }
    if (state === "missing") {
      const missingProject = await projectRepository.updateProject({ ...nextProject, mediaAssets: nextProject.mediaAssets.map((asset) => asset.id === primaryVideoAsset.id ? { ...asset, status: "missing", updatedAt: new Date().toISOString() } : asset) });
      if (!isCurrentRequest()) return;
      setProject(missingProject);
      onProjectLoaded(missingProject);
      setPreviewUrl(null);
      setLoadState("missing");
      return;
    }

    const file = await handle.getFile();
    if (!isCurrentRequest()) return;
    setPreviewUrl(URL.createObjectURL(file));
    setLoadState("ready");
    if (needsMediaMetadataRefresh(primaryVideoAsset.metadata)) {
      void inspectLocalVideo({ file, handle }).then(async (inspectedVideo) => {
        const latestProject = await projectRepository.getProject(nextProject.id);
        if (!latestProject || !isCurrentRequest()) return;
        const updatedProject = await projectRepository.updateProject({
          ...latestProject,
          mediaAssets: latestProject.mediaAssets.map((asset) => asset.id === primaryVideoAsset.id ? { ...asset, source: inspectedVideo.source, metadata: inspectedVideo.metadata, updatedAt: new Date().toISOString() } : asset),
        });
        if (!isCurrentRequest()) return;
        setProject(updatedProject);
        onProjectLoaded(updatedProject);
      }).catch(() => undefined);
    }
    } catch (error) {
      if (!isCurrentRequest()) return;
      setProject(null);
      setPreviewUrl(null);
      setLoadError(error instanceof Error ? error.message : "本地项目数据读取失败，请返回项目库后重试。");
      setLoadState("error");
    }
  }, [onProjectLoaded, projectId, setPreviewUrl]);

  const restoreVideoAccess = async () => {
    if (!project) return;
    const primaryVideoAsset = project.mediaAssets.find((asset) => asset.id === project.primaryVideoAssetId && asset.kind === "video") ?? null;
    const handle = primaryVideoAsset ? await projectRepository.getMediaAssetHandle(primaryVideoAsset.id) : null;
    if (!handle || !(await requestMediaPermission(handle))) {
      toast.error("未获得本地视频读取授权，请重新选择视频。");
      return;
    }
    await loadProject();
  };

  useEffect(() => {
    void loadProject();
    return () => {
      loadRequestRef.current += 1;
      setPreviewUrl(null);
    };
  }, [loadProject, setPreviewUrl]);

  const connectVideo = async () => {
    if (!project) return;
    setIsSelectingVideo(true);
    try {
      const selectedVideo = await selectLocalVideo();
      if (!selectedVideo.handle) throw new Error("当前浏览器无法保存视频引用，请使用 Chrome 或 Edge 重新选择视频。");
      const inspectedVideo = await inspectLocalVideo(selectedVideo);
      const existingAsset = project.mediaAssets.find((asset) => asset.id === project.primaryVideoAssetId && asset.kind === "video") ?? null;
      if (existingAsset?.source && !isMatchingVideo(selectedVideo.file, existingAsset.source)) {
        toast.error("所选视频与原项目指纹不一致。请以该视频新建项目，原项目不会被替换。");
        return;
      }
      const linkedVideoAsset = createLinkedVideoAsset(project.id, inspectedVideo.source!, inspectedVideo.metadata!, existingAsset?.status === "missing", existingAsset?.id);
      await projectRepository.saveMediaAssetHandle(linkedVideoAsset.id, selectedVideo.handle);
      const updatedProject = await projectRepository.updateProject({
        ...project,
        primaryVideoAssetId: linkedVideoAsset.id,
        mediaAssets: existingAsset ? project.mediaAssets.map((asset) => asset.id === existingAsset.id ? linkedVideoAsset : asset) : [...project.mediaAssets, linkedVideoAsset],
      });
      setProject(updatedProject);
      onProjectLoaded(updatedProject);
      setPreviewUrl(URL.createObjectURL(selectedVideo.file));
      setLoadState("ready");
      toast.success(existingAsset?.status === "missing" ? "视频已重新关联。" : "本地视频已关联。");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(error instanceof Error ? error.message : "无法关联视频，请重试。");
    } finally {
      setIsSelectingVideo(false);
    }
  };

  const renameProject = (title: string) => {
    if (!project) return;
    const nextTitle = title.trim() || "未命名拉片项目";
    const updatedProject = { ...project, title: nextTitle };
    setProject(updatedProject);
    onProjectLoaded(updatedProject);
  };

  const primaryVideoAsset = project?.mediaAssets.find((asset) => asset.id === project.primaryVideoAssetId && asset.kind === "video") ?? null;
  if (loadState === "ready" && project && videoUrl && primaryVideoAsset) return <>{children(project, videoUrl, primaryVideoAsset, renameProject)}</>;

  const isMissing = loadState === "missing";
  const needsPermission = loadState === "needs-permission";
  const title = loadState === "error" ? "项目打开失败" : loadState === "not-found" ? "项目不存在或已删除" : isMissing ? "视频待重新关联" : "添加本地视频";
  const description = loadState === "error"
    ? loadError ?? "本地项目数据读取失败，请返回项目库后重试。"
    : loadState === "not-found"
    ? "请返回项目库，选择一个可用项目。"
    : needsPermission
      ? "浏览器需要你再次确认读取此本地视频；项目与分镜数据仍在本机保存。"
      : isMissing
      ? "原视频暂时无法访问。项目笔记和后续数据会被保留，选择完全相同的文件即可恢复。"
      : "项目可以先保持为空。选择视频后，AisenLens 只关联文件，不复制、不上传。";

  return <div className="min-h-screen bg-bg px-6 py-12 text-text-base"><div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-xl items-center justify-center"><div className="w-full rounded-2xl border border-border bg-bg-panel p-8 text-center shadow-2xl"><div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-accent/10 text-accent"><FileVideo className="size-7" /></div><h1 className="font-display text-2xl font-black text-white">{loadState === "loading" ? "正在打开项目" : needsPermission ? "需要读取视频授权" : title}</h1><p className="mt-3 text-sm leading-6 text-text-muted">{loadState === "loading" ? "正在校验项目和本地媒体引用…" : description}</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Button type="button" variant="outline" onClick={() => onNavigate(2)} className="h-11 border-border text-text-dim hover:text-white"><FolderOpen />返回项目库</Button>{needsPermission && <Button type="button" onClick={() => void restoreVideoAccess()} className="h-11 bg-accent text-white hover:bg-accent/90"><RefreshCw />授权读取视频</Button>}{loadState !== "not-found" && loadState !== "loading" && !needsPermission && <Button type="button" onClick={() => void connectVideo()} disabled={isSelectingVideo} className="h-11 bg-accent text-white hover:bg-accent/90">{isMissing ? <RefreshCw /> : <FileVideo />}{isSelectingVideo ? "正在读取视频…" : isMissing ? "重新关联视频" : "选择本地视频"}</Button>}</div></div></div></div>;
}
