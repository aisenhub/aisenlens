import { AudioLines, LockKeyhole } from "lucide-react"
import AudioTrackPanel from "./AudioTrackPanel"
import type { ProjectRecord } from "../../project/types"

interface SoundWorkspaceProps { project: ProjectRecord; frameRate: number; currentFrame: number; onProjectUpdated: (project: ProjectRecord) => void }

export default function SoundWorkspace({ project, frameRate, currentFrame, onProjectUpdated }: SoundWorkspaceProps) {
  return <main className="min-h-0 flex-1 overflow-y-auto bg-bg px-4 py-5 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl"><div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">Sound</p><h2 className="mt-1 text-xl font-semibold text-text-base">手工音轨</h2><p className="mt-2 text-sm text-text-muted">导入、排序、分割和调整已有音轨。Dialogue / SFX / Ambience 语义识别尚未开放。</p></div><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]"><section className="border border-border bg-bg-panel p-4"><AudioTrackPanel project={project} frameRate={frameRate} currentFrame={currentFrame} onProjectUpdated={onProjectUpdated} /></section><aside className="border border-border bg-bg-panel p-4"><div className="flex items-center gap-2 text-sm text-text-base"><AudioLines className="size-4 text-accent" />语义轨</div><div className="mt-4 space-y-3 text-xs text-text-muted"><p className="flex items-start gap-2"><LockKeyhole className="mt-0.5 size-3.5 shrink-0" />Dialogue</p><p className="flex items-start gap-2"><LockKeyhole className="mt-0.5 size-3.5 shrink-0" />SFX</p><p className="flex items-start gap-2"><LockKeyhole className="mt-0.5 size-3.5 shrink-0" />Ambience</p><p className="border-t border-border pt-3 leading-5">当前不会生成空片段或示例波形；已有音轨保存为 Manual。</p></div></aside></div></div></main>
}
