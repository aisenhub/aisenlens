import { ArrowRight, FileCog, Map, Settings2 } from "lucide-react"
import { Button } from "../../../components/ui/button"
import AutoShotControlPanel from "../../auto-shot/components/AutoShotControlPanel"
import type { AutoShotControlSettings, AutoShotPresetDefinition, ResolvedAutoShotConfiguration } from "../../auto-shot/config/types"
import type { AutoShotCandidate, AutoShotTaskRecord } from "../../auto-shot/types"
import MediaStatusPanel from "../../project/components/MediaStatusPanel"
import type { MediaAsset, ProjectRecord } from "../../project/types"

interface PrepareViewProps {
  project: ProjectRecord
  media: MediaAsset
  videoUrl: string | null
  isSelectingVideo: boolean
  onImportVideo: () => void
  onGoToAnalyze: () => void
  onOpenSettings: () => void
  settings: AutoShotControlSettings | null
  resolved: ResolvedAutoShotConfiguration | null
  presets: AutoShotPresetDefinition[]
  record: AutoShotTaskRecord | null
  isActive: boolean
  error: string | null
  excludedCandidateIds: string[]
  onChange: (patch: Partial<AutoShotControlSettings>) => void
  onStart: () => void
  onPause: () => void
  onRestart: () => void
  onPreview: () => void
  onToggleCandidate: (candidateId: string, included: boolean) => void
}

export default function PrepareView({ project, media, videoUrl, isSelectingVideo, onImportVideo, onGoToAnalyze, onOpenSettings, settings, resolved, presets, record, isActive, error, excludedCandidateIds, onChange, onStart, onPause, onRestart, onPreview, onToggleCandidate }: PrepareViewProps) {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-bg px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">Prepare</p><h1 className="mt-1 text-xl font-semibold text-text-base">准备素材与镜头地图</h1><p className="mt-2 text-sm text-text-muted">{project.title} · 先确认真实素材，再运行检测。</p></div>
          <Button type="button" size="sm" onClick={onGoToAnalyze} className="gap-2 bg-accent text-white hover:bg-accent/90">进入深拆<ArrowRight className="size-4" /></Button>
        </div>
        <div className="space-y-4">
          <MediaStatusPanel media={media} videoUrl={videoUrl} isSelectingVideo={isSelectingVideo} onImportVideo={onImportVideo} />
          <section className="border border-border bg-bg-panel p-4">
            <div className="mb-4 flex items-start justify-between gap-4"><div><h2 className="text-sm font-medium text-text-base">研究模板</h2><p className="mt-1 text-xs leading-5 text-text-muted">沿用当前项目模板与自定义字段，不新增未保存的研究意图。</p></div><Button type="button" variant="outline" size="sm" onClick={onOpenSettings} className="gap-2 border-border text-text-dim"><Settings2 className="size-3.5" />模板设置</Button></div>
            <div className="flex items-center gap-3 border-t border-border pt-3 text-xs text-text-dim"><FileCog className="size-4 text-text-muted" /><span>{settings ? `当前预设：${settings.presetId}` : "正在读取当前视频配置…"}</span><span className="ml-auto font-mono text-text-muted">{record?.status === "completed" ? `${record.candidates.length} 个候选` : "尚未扫描"}</span></div>
          </section>
          <section className="border border-border bg-bg-panel p-4"><div className="mb-4 flex items-start gap-3"><Map className="mt-0.5 size-4 text-accent" /><div><h2 className="text-sm font-medium text-text-base">建立镜头地图</h2><p className="mt-1 text-xs leading-5 text-text-muted">自动分镜只提出候选区间；应用前会在校准阶段复核并创建恢复快照。</p></div></div><AutoShotControlPanel settings={settings} resolved={resolved} presets={presets} record={record} isActive={isActive} error={error} excludedCandidateIds={excludedCandidateIds} onChange={onChange} onStart={onStart} onPause={onPause} onRestart={onRestart} onPreview={onPreview} onToggleCandidate={onToggleCandidate} /></section>
        </div>
      </div>
    </main>
  )
}
