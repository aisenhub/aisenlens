import type { AutoShotPresetDefinition, AutoShotControlSettings, ResolvedAutoShotConfiguration } from "../config/types";
import type { AutoShotTaskRecord } from "../types";
import { Checkbox } from "../../../components/ui/checkbox";
import BasicSettings from "./BasicSettings";
import AdvancedSettings from "./AdvancedSettings";
import PresetSelector from "./PresetSelector";
import RunStatus from "./RunStatus";

interface AutoShotControlPanelProps {
  settings: AutoShotControlSettings | null;
  resolved: ResolvedAutoShotConfiguration | null;
  presets: AutoShotPresetDefinition[];
  record: AutoShotTaskRecord | null;
  isActive: boolean;
  error: string | null;
  showRunStatus?: boolean;
  resetSettingsDisabled?: boolean;
  onResetSettings?: () => void;
  advancedDetectionEnabled?: boolean;
  onAdvancedDetectionChange?: (enabled: boolean) => void;
  onChange: (patch: Partial<AutoShotControlSettings>) => void;
  onStart: () => void;
  onPause: () => void;
  onRestart: () => void;
}

export default function AutoShotControlPanel({ settings, resolved, presets, record, isActive, error, showRunStatus = true, resetSettingsDisabled = false, onResetSettings, advancedDetectionEnabled = false, onAdvancedDetectionChange, onChange, onStart, onPause, onRestart }: AutoShotControlPanelProps) {
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
          <BasicSettings settings={settings} presetDefaultMinimumSceneDurationSeconds={selectedPreset?.defaultMinimumSceneDurationSeconds} disabled={disabled} resetSettingsDisabled={resetSettingsDisabled} onResetSettings={onResetSettings} onChange={onChange} />
          {onAdvancedDetectionChange && (
            <div className="space-y-2">
              <label className="flex items-start justify-between gap-3 rounded-xl border border-border bg-bg-deep px-3 py-2.5">
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-text-base">启用高级检测参数</span>
                  <span className="mt-0.5 block text-[10px] leading-4 text-text-dim">调整检测器、阈值、窗口和淡入淡出参数。</span>
                </span>
                <Checkbox checked={advancedDetectionEnabled} disabled={disabled} onCheckedChange={(checked) => onAdvancedDetectionChange(checked === true)} aria-label="启用高级检测参数" className="mt-0.5" />
              </label>
              {advancedDetectionEnabled && <AdvancedSettings settings={settings} baseHardCut={resolved?.engineConfig.hardCut} disabled={disabled} onChange={onChange} />}
            </div>
          )}
          {showRunStatus && <RunStatus record={record} isActive={isActive} error={error} disabled={!resolved} onStart={onStart} onPause={onPause} onRestart={onRestart} />}
        </>
      )}
    </div>
  );
}
