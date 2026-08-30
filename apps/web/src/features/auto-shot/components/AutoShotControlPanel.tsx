import type { AutoShotPresetDefinition, AutoShotControlSettings, ResolvedAutoShotConfiguration } from "../config/types";
import type { AutoShotTaskRecord } from "../types";
import BasicSettings from "./BasicSettings";
import PresetSelector from "./PresetSelector";
import RunStatus from "./RunStatus";

interface AutoShotControlPanelProps {
  settings: AutoShotControlSettings | null;
  resolved: ResolvedAutoShotConfiguration | null;
  presets: AutoShotPresetDefinition[];
  record: AutoShotTaskRecord | null;
  isActive: boolean;
  error: string | null;
  excludedCandidateIds: string[];
  onChange: (patch: Partial<AutoShotControlSettings>) => void;
  onStart: () => void;
  onPause: () => void;
  onRestart: () => void;
  onPreview: () => void;
  onToggleCandidate: (candidateId: string, included: boolean) => void;
}

export default function AutoShotControlPanel({ settings, resolved, presets, record, isActive, error, excludedCandidateIds, onChange, onStart, onPause, onRestart, onPreview, onToggleCandidate }: AutoShotControlPanelProps) {
  const disabled = isActive || record?.status === "running";
  const selectedPreset = settings ? presets.find((preset) => preset.id === settings.presetId) : undefined;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="editor-heading text-text-muted font-mono tracking-wider">自动分镜 · Scene Engine</p>
      </div>
      {!settings ? (
        <div className="rounded-xl border border-border bg-bg-deep px-3 py-4 text-center text-xs text-text-dim">正在建立当前视频的媒体身份…</div>
      ) : (
        <>
          <PresetSelector presets={presets} value={settings.presetId} disabled={disabled} onChange={(presetId) => onChange({ presetId })} />
          <BasicSettings settings={settings} presetDefaultMinimumSceneDurationSeconds={selectedPreset?.defaultMinimumSceneDurationSeconds} disabled={disabled} onChange={onChange} />
          <RunStatus record={record} isActive={isActive} error={error} excludedCandidateIds={excludedCandidateIds} disabled={!resolved} onStart={onStart} onPause={onPause} onRestart={onRestart} onPreview={onPreview} onToggleCandidate={onToggleCandidate} />
        </>
      )}
    </div>
  );
}
