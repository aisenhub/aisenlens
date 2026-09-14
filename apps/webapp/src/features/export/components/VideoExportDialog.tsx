import { AlertTriangle, CheckCircle2, Clapperboard, LoaderCircle, Music2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Checkbox } from "../../../components/ui/checkbox";
import ModalShell from "../../../components/ui/modal-shell";
import { supportsVideoExportFileStreaming } from "../services/videoExportFileSaveService";
import { getVideoExportCapabilities, type VideoExportFormatCapability, type VideoExportProgress } from "../services/videoExportService";
import type { VideoExportFormat, VideoExportSettings } from "../services/videoExportProtocol";

interface ResolutionOption {
  label: string;
  width: number;
  height: number;
}

interface VideoExportDialogProps {
  sourceWidth: number;
  sourceHeight: number;
  frameRate: number;
  durationSeconds: number;
  isExporting: boolean;
  progress: VideoExportProgress | null;
  error: string | null;
  onClose: () => void;
  onStart: (settings: Partial<VideoExportSettings>) => void;
  onCancel: () => void;
}

function even(value: number): number {
  const rounded = Math.max(2, Math.round(value));
  return rounded - rounded % 2;
}

function resolutionOptions(sourceWidth: number, sourceHeight: number): ResolutionOption[] {
  const largestSide = Math.max(sourceWidth, sourceHeight);
  const scaled = (target: number) => {
    const scale = Math.min(1, target / largestSide);
    return { width: even(sourceWidth * scale), height: even(sourceHeight * scale) };
  };
  return [
    { label: "原始", width: even(sourceWidth), height: even(sourceHeight) },
    { label: "1080", ...scaled(1080) },
    { label: "720", ...scaled(720) },
  ].filter((option, index, all) => all.findIndex((candidate) => candidate.width === option.width && candidate.height === option.height) === index);
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}分${String(total % 60).padStart(2, "0")}秒`;
}

function phaseLabel(progress: VideoExportProgress | null): string {
  if (!progress) return "正在准备导出…";
  if (progress.phase === "mixing-audio") return "正在混合项目音频…";
  if (progress.phase === "encoding-audio") return "正在写入音频…";
  if (progress.phase === "encoding-video") return `正在编码画面 · ${progress.completedFrames}/${progress.totalFrames} 帧`;
  if (progress.phase === "finalizing") return "正在封装视频文件…";
  return "正在准备导出…";
}

export default function VideoExportDialog({ sourceWidth, sourceHeight, frameRate, durationSeconds, isExporting, progress, error, onClose, onStart, onCancel }: VideoExportDialogProps) {
  const [capabilities, setCapabilities] = useState<VideoExportFormatCapability[]>([]);
  const [isCheckingCapabilities, setIsCheckingCapabilities] = useState(true);
  const [format, setFormat] = useState<VideoExportFormat>("mp4");
  const [resolution, setResolution] = useState<ResolutionOption>(() => resolutionOptions(sourceWidth, sourceHeight)[0]!);
  const [bitrate, setBitrate] = useState(8_000_000);
  const [includeAudio, setIncludeAudio] = useState(true);
  const [includeOriginalAudio, setIncludeOriginalAudio] = useState(true);
  const [includeContentOverlay, setIncludeContentOverlay] = useState(true);
  const [includeCompositionOverlay, setIncludeCompositionOverlay] = useState(true);
  const options = useMemo(() => resolutionOptions(sourceWidth, sourceHeight), [sourceHeight, sourceWidth]);
  const selectedCapability = capabilities.find((item) => item.format === format);
  const progressPercent = progress && progress.totalFrames > 0 ? Math.round((progress.completedFrames / progress.totalFrames) * 100) : 0;
  const supportsFileStreaming = supportsVideoExportFileStreaming();

  useEffect(() => {
    setResolution(resolutionOptions(sourceWidth, sourceHeight)[0]!);
    setIsCheckingCapabilities(true);
    void getVideoExportCapabilities(sourceWidth, sourceHeight).then((nextCapabilities) => {
      setCapabilities(nextCapabilities);
      const nextFormat = nextCapabilities.find((item) => item.format === "mp4" && item.supported) ?? nextCapabilities.find((item) => item.supported);
      if (nextFormat) setFormat(nextFormat.format);
    }).catch(() => setCapabilities([])).finally(() => setIsCheckingCapabilities(false));
  }, [sourceHeight, sourceWidth]);

  return <ModalShell title="导出分析视频" description="在当前浏览器本地生成，不会上传视频或分析数据。" onClose={onClose} closeDisabled={isExporting} className="max-w-xl" density="compact">
    <div className="space-y-4">
      <div className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-bg-deep text-center"><div className="px-2 py-2.5"><p className="font-mono editor-body text-white">{sourceWidth} × {sourceHeight}</p><p className="editor-meta text-text-muted">源尺寸</p></div><div className="px-2 py-2.5"><p className="font-mono editor-body text-white">{frameRate.toFixed(2)} fps</p><p className="editor-meta text-text-muted">帧率</p></div><div className="px-2 py-2.5"><p className="font-mono editor-body text-white">{formatDuration(durationSeconds)}</p><p className="editor-meta text-text-muted">时长</p></div></div>
      {isExporting ? <div className="space-y-3 rounded-lg border border-accent/30 bg-accent/8 p-3"><div className="flex items-center gap-2 text-accent"><LoaderCircle className="size-4 animate-spin" /><span className="editor-body">{phaseLabel(progress)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-bg-input"><div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${progressPercent}%` }} /></div><Button type="button" variant="outline" size="sm" onClick={onCancel} className="h-7 w-full border-border text-text-dim hover:text-white"><X />取消导出</Button></div> : <>
        <section><p className="mb-2 font-mono editor-meta tracking-wider text-text-muted">输出格式</p><div className="grid grid-cols-2 gap-2">{(["mp4", "webm"] as const).map((candidate) => { const capability = capabilities.find((item) => item.format === candidate); const supported = Boolean(capability?.supported); return <Button key={candidate} type="button" variant="outline" size="sm" disabled={isCheckingCapabilities || !supported} onClick={() => { setFormat(candidate); if (!capability?.audioSupported) setIncludeAudio(false); }} className={`h-auto min-h-14 justify-start border-border p-3 text-left ${format === candidate ? "border-accent/60 bg-accent/10 text-accent hover:bg-accent/15" : "text-text-dim hover:text-white"}`}><Clapperboard className="size-4" /><span><span className="block editor-body">{candidate.toUpperCase()}</span><span className="mt-0.5 block editor-meta font-normal text-text-muted">{isCheckingCapabilities ? "正在检测…" : supported ? `${capability?.videoCodec ?? "视频"}${capability?.audioCodec ? ` · ${capability.audioCodec}` : " · 不支持音频"}` : "当前浏览器不可用"}</span></span></Button>; })}</div></section>
        <section><p className="mb-2 font-mono editor-meta tracking-wider text-text-muted">输出尺寸</p><div className="flex gap-1.5">{options.map((option) => <Button key={`${option.width}x${option.height}`} type="button" variant="outline" size="sm" onClick={() => setResolution(option)} className={`h-7 flex-1 px-2 ${resolution.width === option.width && resolution.height === option.height ? "border-accent/60 bg-accent/10 text-accent hover:bg-accent/15" : "border-border text-text-dim hover:text-white"}`}>{option.label}<span className="editor-micro font-normal">{option.width}×{option.height}</span></Button>)}</div></section>
        <section><p className="mb-2 font-mono editor-meta tracking-wider text-text-muted">编码质量</p><div className="grid grid-cols-2 gap-1.5"><Button type="button" variant="outline" size="sm" onClick={() => setBitrate(8_000_000)} className={`h-8 ${bitrate === 8_000_000 ? "border-accent/60 bg-accent/10 text-accent hover:bg-accent/15" : "border-border text-text-dim hover:text-white"}`}>标准 <span className="editor-meta font-normal">8 Mbps</span></Button><Button type="button" variant="outline" size="sm" onClick={() => setBitrate(16_000_000)} className={`h-8 ${bitrate === 16_000_000 ? "border-accent/60 bg-accent/10 text-accent hover:bg-accent/15" : "border-border text-text-dim hover:text-white"}`}>高质量 <span className="editor-meta font-normal">16 Mbps</span></Button></div></section>
        <section className="space-y-2 rounded-lg border border-border bg-bg-deep p-3"><p className="font-mono editor-meta tracking-wider text-text-muted">合成内容</p><label className="flex cursor-pointer items-center gap-2 editor-body text-text-dim"><Checkbox checked={includeContentOverlay} onCheckedChange={setIncludeContentOverlay} />画面分析信息</label><label className="flex cursor-pointer items-center gap-2 editor-body text-text-dim"><Checkbox checked={includeCompositionOverlay} onCheckedChange={setIncludeCompositionOverlay} />构图蒙版</label><label className={`flex items-center gap-2 editor-body ${selectedCapability?.audioSupported ? "cursor-pointer text-text-dim" : "text-text-faint"}`}><Checkbox checked={includeAudio} disabled={!selectedCapability?.audioSupported} onCheckedChange={setIncludeAudio} /><Music2 className="size-3.5 text-text-muted" />导出音频</label><label className={`flex items-center gap-2 pl-6 editor-meta ${includeAudio && selectedCapability?.audioSupported ? "cursor-pointer text-text-muted" : "text-text-faint"}`}><Checkbox checked={includeOriginalAudio} disabled={!includeAudio || !selectedCapability?.audioSupported} onCheckedChange={setIncludeOriginalAudio} />保留原视频声音并混合项目音轨</label></section>
        {error && <div className="flex gap-2 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-red-200"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><p className="editor-meta leading-relaxed">{error}</p></div>}
        {!isCheckingCapabilities && !selectedCapability?.supported && <div className="flex gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-amber-100"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><p className="editor-meta leading-relaxed">当前浏览器没有可用的视频编码器，请使用最新版 Chrome 或 Edge。</p></div>}
        {supportsFileStreaming && <p className="editor-meta text-text-muted">开始后选择保存位置，视频会在编码时持续写入磁盘。</p>}
        <Button type="button" variant="outline" size="sm" disabled={isCheckingCapabilities || !selectedCapability?.supported || (includeAudio && !selectedCapability.audioSupported)} onClick={() => onStart({ format, width: resolution.width, height: resolution.height, bitrate, includeAudio, includeOriginalAudio, includeContentOverlay, includeCompositionOverlay })} className="h-9 w-full border-accent/40 bg-accent/10 text-accent hover:bg-accent/20"><CheckCircle2 />{supportsFileStreaming ? "选择保存位置并开始导出" : "开始导出分析视频"}</Button>
      </>}
    </div>
  </ModalShell>;
}
