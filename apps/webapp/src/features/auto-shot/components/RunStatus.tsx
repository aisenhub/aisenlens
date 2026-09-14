import { Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "../../../components/ui/button";
import type { AutoShotTaskRecord } from "../types";

interface RunStatusProps {
  record: AutoShotTaskRecord | null;
  isActive: boolean;
  error: string | null;
  disabled?: boolean;
  onStart: () => void;
  onPause: () => void;
  onRestart: () => void;
}

export default function RunStatus({ record, isActive, error, disabled = false, onStart, onPause, onRestart }: RunStatusProps) {
  const progress = record ? Math.round((record.progress.processedUs / Math.max(1, record.progress.durationUs)) * 100) : 0;
  const completed = record?.status === "completed";
  const paused = record?.status === "paused";
  const running = isActive || record?.status === "running";
  const canRestart = Boolean(record && !paused && record.status !== "running");
  return (
    <div className="space-y-2">
      {record?.status === "running" && (
        <div className="rounded-lg border border-accent/25 bg-accent/8 px-2.5 py-2 editor-meta text-text-dim">
          <div className="flex justify-between"><span>正在扫描真实画面</span><span className="font-mono text-accent">{progress}%</span></div>
          <div className="mt-2 h-1 overflow-hidden rounded bg-bg-input"><div className="h-full bg-accent" style={{ width: `${progress}%` }} /></div>
        </div>
      )}
      {completed && (
        <div className="rounded-lg border border-green-400/20 bg-green-400/5 px-2.5 py-2 text-center editor-meta text-text-dim">
          检测到 <span className="font-mono text-green-300">{record.candidates.filter((candidate) => candidate.kind !== "tail").length}</span> 个边界，生成 <span className="font-mono text-green-300">{record.candidates.length}</span> 段候选。
        </div>
      )}
      {(error || record?.status === "failed") && <p className="editor-meta text-red-300">{error ?? record?.error?.message ?? "自动分镜失败。"}</p>}
      {!running && <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={canRestart ? onRestart : onStart} className="h-8 w-full border-accent/30 bg-accent/8 text-accent hover:bg-accent/15">
        {paused ? <><Play className="size-3" /> 继续扫描</> : canRestart ? <><RotateCcw className="size-3" /> 重新扫描</> : <><Play className="size-3" /> 开始自动分镜</>}
      </Button>}
      {running && <Button type="button" variant="ghost" size="sm" onClick={onPause} className="h-7 w-full text-text-muted hover:text-white"><Pause className="size-3" /> 暂停扫描</Button>}
    </div>
  );
}
