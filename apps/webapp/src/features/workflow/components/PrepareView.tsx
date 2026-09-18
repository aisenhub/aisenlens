import { ArrowRight, CircleCheck, Map, RefreshCw, Settings2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "../../../components/ui/button"
import AutoShotControlPanel from "../../auto-shot/components/AutoShotControlPanel"
import type { AutoShotControlSettings, AutoShotPresetDefinition, ResolvedAutoShotConfiguration } from "../../auto-shot/config/types"
import type { AutoShotTaskRecord } from "../../auto-shot/types"
import MediaStatusPanel from "../../project/components/MediaStatusPanel"
import type { MediaAsset, ProjectRecord } from "../../project/types"

interface PrepareViewProps {
  project: ProjectRecord
  media: MediaAsset
  videoUrl: string | null
  isSelectingVideo: boolean
  onImportVideo: () => void
  onGoToAnalyze: () => void
  onGoToBoundaryReview: () => Promise<void>
  onOpenDetectionSettings: () => void
  settings: AutoShotControlSettings | null
  resolved: ResolvedAutoShotConfiguration | null
  presets: AutoShotPresetDefinition[]
  record: AutoShotTaskRecord | null
  isActive: boolean
  error: string | null
  onChange: (patch: Partial<AutoShotControlSettings>) => void
  onStart: () => void
  onPause: () => void
  onRestart: () => void
  onResetSettings: () => void
  settingsDirty: boolean
  advancedDetectionEnabled: boolean
  onAdvancedDetectionChange: (enabled: boolean) => void
}

export default function PrepareView({ project, media, videoUrl, isSelectingVideo, onImportVideo, onGoToAnalyze, onGoToBoundaryReview, onOpenDetectionSettings, settings, resolved, presets, record, isActive, error, onChange, onStart, onPause, onRestart, onResetSettings, settingsDirty, advancedDetectionEnabled, onAdvancedDetectionChange }: PrepareViewProps) {
  const [isApplying, setIsApplying] = useState(false)
  const applyDetection = async () => {
    if (isApplying) return
    setIsApplying(true)
    try {
      await onGoToBoundaryReview()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "无法准备校准草稿，请重试。")
    } finally {
      setIsApplying(false)
    }
  }
  const isRunning = isActive || record?.status === "running"
  const canRestart = Boolean(record && record.status !== "paused" && record.status !== "running")
  const scanActionLabel = record?.status === "completed" ? "进入切点复核" : isRunning ? "识别进行中" : record?.status === "paused" ? "继续识别" : "开始智能切分"

  const handlePrimaryAction = () => {
    if (record?.status === "completed") { void applyDetection(); return }
    if (isRunning) return
    if (canRestart) onRestart()
    else onStart()
  }

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-bg px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">Prepare</p><h1 className="mt-1 text-xl font-semibold text-text-base">准备素材与镜头地图</h1><p className="mt-2 text-sm text-text-muted">{project.title} · 导入 → 智能切分 → 切点复核 → 完成</p></div>
          <Button type="button" variant="outline" size="sm" onClick={onOpenDetectionSettings} className="gap-2"><Settings2 className="size-3.5" />切分设置</Button>
        </div>
        <div className="space-y-4">
          <MediaStatusPanel media={media} videoUrl={videoUrl} isSelectingVideo={isSelectingVideo} onImportVideo={onImportVideo} />
          <section className="grid grid-cols-4 border border-border bg-bg-panel text-xs">
            {["导入", "智能切分", "切点复核", "完成"].map((label, index) => {
              const active = !videoUrl ? index === 0 : record?.status !== "completed" ? index === 1 : index === 2
              const done = Boolean(videoUrl) && (index === 0 || (record?.status === "completed" && index === 1))
              return <div key={label} className={`flex items-center gap-2 border-r border-border px-3 py-2.5 last:border-r-0 ${active ? "bg-accent/10 text-accent" : done ? "text-text-base" : "text-text-muted"}`}><span className="font-mono text-[10px]">{String(index + 1).padStart(2, "0")}</span><span>{label}</span></div>
            })}
          </section>
          <section className="border border-border bg-bg-panel p-4"><div className="mb-4 flex items-start gap-3"><Map className="mt-0.5 size-4 text-accent" /><div><h2 className="text-sm font-medium text-text-base">建立镜头地图</h2><p className="mt-1 text-xs leading-5 text-text-muted">检测器只提出候选切点；显式复核并应用后才会写入正式 Shot。</p></div></div><AutoShotControlPanel settings={settings} resolved={resolved} presets={presets} record={record} isActive={isActive} error={error} showRunStatus={false} resetSettingsDisabled={!settingsDirty} onResetSettings={onResetSettings} advancedDetectionEnabled={advancedDetectionEnabled} onAdvancedDetectionChange={onAdvancedDetectionChange} onChange={onChange} onStart={onStart} onPause={onPause} onRestart={onRestart} /><Button type="button" size="sm" disabled={!resolved} onClick={handlePrimaryAction} className="mt-3 h-9 w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90"><RefreshCw className="size-3.5" />{scanActionLabel}</Button></section>
        </div>
      </div>
    </main>
  )
}
