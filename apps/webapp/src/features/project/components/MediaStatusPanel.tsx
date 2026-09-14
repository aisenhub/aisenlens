import { AlertTriangle, CheckCircle2, FileVideo, RefreshCw } from "lucide-react"
import { Button } from "../../../components/ui/button"
import type { MediaAsset } from "../types"

interface MediaStatusPanelProps {
  media: MediaAsset
  videoUrl: string | null
  isSelectingVideo: boolean
  onImportVideo: () => void
}

export default function MediaStatusPanel({ media, videoUrl, isSelectingVideo, onImportVideo }: MediaStatusPanelProps) {
  const ready = Boolean(videoUrl && media.source && media.status === "linked")
  const status = ready ? "已关联，可用于播放与检测" : media.status === "missing" ? "原文件不可访问，项目数据仍已保留" : "尚未关联可用视频"
  return (
    <section className="border border-border bg-bg-panel p-4">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md ${ready ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>
          {ready ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-medium text-text-base">素材</h2>
          <p className="mt-1 text-xs leading-5 text-text-muted">{status}</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
            <div><dt className="text-text-muted">文件</dt><dd className="mt-0.5 truncate font-mono text-text-dim">{media.source?.name ?? "未选择"}</dd></div>
            <div><dt className="text-text-muted">分辨率</dt><dd className="mt-0.5 font-mono text-text-dim">{media.metadata?.width && media.metadata.height ? `${media.metadata.width}×${media.metadata.height}` : "—"}</dd></div>
            <div><dt className="text-text-muted">帧率</dt><dd className="mt-0.5 font-mono text-text-dim">{media.metadata?.frameRate ? `${media.metadata.frameRate} fps` : "未知"}</dd></div>
            <div><dt className="text-text-muted">时长</dt><dd className="mt-0.5 font-mono text-text-dim">{media.metadata?.durationSeconds ? `${media.metadata.durationSeconds.toFixed(2)} s` : "—"}</dd></div>
          </dl>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onImportVideo} disabled={isSelectingVideo} className="shrink-0 gap-2 border-border text-text-dim hover:border-accent/50 hover:text-text-base">
          {ready ? <RefreshCw className="size-3.5" /> : <FileVideo className="size-3.5" />}
          {isSelectingVideo ? "读取中…" : ready ? "重新关联" : "选择视频"}
        </Button>
      </div>
    </section>
  )
}
