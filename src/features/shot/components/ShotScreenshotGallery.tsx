import { ImagePlus } from "lucide-react";
import { Button } from "../../../components/ui/button";

export interface ShotScreenshotPreview {
  id: string;
  url: string | null;
  frame: number;
}

interface ShotScreenshotGalleryProps {
  exportScreenshot: ShotScreenshotPreview | null;
  usesFirstFrame: boolean;
  isCapturing: boolean;
  onCapture: () => void;
}

export default function ShotScreenshotGallery({ exportScreenshot, usesFirstFrame, isCapturing, onCapture }: ShotScreenshotGalleryProps) {
  return <section className="rounded-xl border border-border bg-bg-deep/55 p-3">
    <div className="flex items-center justify-between gap-2"><p className="font-mono editor-heading tracking-wider text-text-muted">分镜截图</p><span className="editor-meta text-text-muted">导出代表图</span></div>
    <div className="mt-3 overflow-hidden rounded-lg border border-accent/25 bg-bg-input">
      {exportScreenshot?.url ? <img src={exportScreenshot.url} alt="当前分镜导出截图" className="aspect-video w-full object-cover" /> : <div className="flex aspect-video items-center justify-center editor-meta text-text-muted">正在采集首帧…</div>}
      <div className="flex items-center justify-between gap-2 px-2 py-1.5"><span className="editor-micro text-accent">{usesFirstFrame ? "默认首帧" : "当前分镜截图"}</span><span className="font-mono editor-micro text-text-muted">{exportScreenshot ? `#${exportScreenshot.frame}` : "—"}</span></div>
    </div>
    <Button type="button" variant="outline" size="sm" onClick={onCapture} disabled={isCapturing} className="mt-3 h-7 w-full editor-body font-normal border-accent/30 bg-accent/8 text-accent hover:bg-accent/15"><ImagePlus className="size-3" />{isCapturing ? "正在更新…" : "将当前帧设为分镜截图"}</Button>
    <p className="mt-2 text-center editor-meta text-text-muted">该图片将用于后续表格导出。</p>
  </section>;
}
