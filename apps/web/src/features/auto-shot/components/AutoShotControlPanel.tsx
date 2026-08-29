import { Info } from "lucide-react";
import { Button } from "../../../components/ui/button";
import type { AutoShotPresetDefinition, AutoShotControlSettings, ResolvedAutoShotConfiguration } from "../config/types";
import type { AutoShotTaskRecord } from "../types";
import AdvancedSettings from "./AdvancedSettings";
import BasicSettings from "./BasicSettings";
import PresetSelector from "./PresetSelector";
import RunStatus from "./RunStatus";

interface AutoShotControlPanelProps {
  settings: AutoShotControlSettings | null;
  resolved: ResolvedAutoShotConfiguration | null;
  presets: AutoShotPresetDefinition[];
  dirty: boolean;
  record: AutoShotTaskRecord | null;
  isActive: boolean;
  error: string | null;
  excludedCandidateIds: string[];
  onChange: (patch: Partial<AutoShotControlSettings>) => void;
  onReset: () => void;
  onStart: () => void;
  onPause: () => void;
  onRestart: () => void;
  onPreview: () => void;
  onToggleCandidate: (candidateId: string, included: boolean) => void;
}

export default function AutoShotControlPanel({ settings, resolved, presets, dirty, record, isActive, error, excludedCandidateIds, onChange, onReset, onStart, onPause, onRestart, onPreview, onToggleCandidate }: AutoShotControlPanelProps) {
  const disabled = isActive || record?.status === "running";
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="editor-heading text-text-muted font-mono tracking-wider">自动分镜 · Scene Engine</p>
        {dirty && <span className="text-[10px] text-amber-200">配置未运行</span>}
      </div>
      {!settings ? (
        <div className="rounded-xl border border-border bg-bg-deep px-3 py-4 text-center text-xs text-text-dim">正在建立当前视频的媒体身份…</div>
      ) : (
        <>
          <PresetSelector presets={presets} value={settings.presetId} disabled={disabled} onChange={(presetId) => onChange({ presetId })} />
          <BasicSettings settings={settings} disabled={disabled} onChange={onChange} />
          <AdvancedSettings settings={settings} disabled={disabled} onChange={onChange} />
          {resolved && (
            <div className="rounded-lg border border-border bg-bg-input/20 px-2.5 py-2 text-[10px] leading-4 text-text-dim">
              <div className="flex items-start gap-1.5"><Info className="mt-0.5 size-3 shrink-0 text-accent" /><span>{resolved.summary.presetName} · {resolved.summary.detector} · {resolved.summary.minimumSceneDurationSeconds.toFixed(1)}s · {resolved.summary.analysisLabel}</span></div>
              <p className="mt-1 pl-4 text-amber-200/80">研究配置仅用于实验和对照，尚未完成人工质量标注。</p>
            </div>
          )}
          <RunStatus record={record} isActive={isActive} error={error} excludedCandidateIds={excludedCandidateIds} disabled={!resolved} onStart={onStart} onPause={onPause} onRestart={onRestart} onPreview={onPreview} onToggleCandidate={onToggleCandidate} />
          <Button type="button" variant="ghost" size="sm" disabled={disabled || !dirty} onClick={onReset} className="h-7 w-full text-text-dim hover:text-text">恢复默认研究配置</Button>
        </>
      )}
    </div>
  );
}
