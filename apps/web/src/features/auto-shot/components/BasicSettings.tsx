import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import type { AutoShotControlSettings, DetectionDetail, TransitionSelection } from "../config/types";

interface BasicSettingsProps {
  settings: AutoShotControlSettings;
  presetDefaultMinimumSceneDurationSeconds?: number;
  disabled?: boolean;
  onChange: (patch: Partial<AutoShotControlSettings>) => void;
}

const details: Array<{ value: DetectionDetail; label: string; hint: string }> = [
  { value: "conservative", label: "保守", hint: "减少误切" },
  { value: "balanced", label: "均衡", hint: "推荐起点" },
  { value: "detailed", label: "细致", hint: "提高召回" },
];

export default function BasicSettings({ settings, presetDefaultMinimumSceneDurationSeconds, disabled = false, onChange }: BasicSettingsProps) {
  const customDuration = settings.minimumSceneDuration.mode === "custom"
    ? settings.minimumSceneDuration.seconds
    : undefined;
  const presetDuration = Number.isFinite(presetDefaultMinimumSceneDurationSeconds)
    ? presetDefaultMinimumSceneDurationSeconds
    : undefined;
  const displayedDuration = customDuration ?? presetDuration;
  return (
    <div className="space-y-3 rounded-xl border border-border bg-bg-deep p-3">
      <div>
        <span className="editor-meta text-text-dim">检出程度</span>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          {details.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => onChange({ detail: item.value })}
              className={`h-auto flex-col gap-0 px-1 py-1.5 ${settings.detail === item.value ? "border-accent/70 bg-accent/10 text-accent" : "text-text-muted"}`}
            >
              <span className="text-xs">{item.label}</span>
              <span className="text-[10px] text-text-dim">{item.hint}</span>
            </Button>
          ))}
        </div>
      </div>
      <div>
        <span className="editor-meta text-text-dim">转场类型</span>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          {(["hard-cuts", "hard-cuts-and-fades"] as TransitionSelection[]).map((value) => (
            <Button
              key={value}
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => onChange({ transitions: value })}
              className={`h-8 min-w-0 whitespace-nowrap px-1.5 py-1 text-center text-[11px] leading-none tracking-tight ${settings.transitions === value ? "border-accent/70 bg-accent/10 text-accent" : "text-text-muted"}`}
            >
              <span className="whitespace-nowrap">{value === "hard-cuts" ? "硬切" : "硬切 + 淡入淡出"}</span>
            </Button>
          ))}
        </div>
      </div>
      <div>
        <span className="editor-meta text-text-dim">最短镜头</span>
        <div className="mt-1.5 flex items-center gap-2">
          <Input
            type="number"
            min={0.1}
            max={30}
            step={0.1}
            disabled={disabled}
            value={displayedDuration ?? ""}
            aria-label="最短镜头秒数"
            placeholder={presetDuration === undefined ? "自定义秒数" : `${presetDuration.toFixed(1)} 秒`}
            onChange={(event) => {
              const seconds = Number(event.target.value);
              if (Number.isFinite(seconds)) onChange({ minimumSceneDuration: { mode: "custom", seconds } });
            }}
            className="h-7 w-16 flex-none text-center font-mono text-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onChange({ minimumSceneDuration: { mode: "preset" } })}
            title="恢复当前内容预设的最短镜头"
            className={`h-7 shrink-0 px-2 ${customDuration === undefined ? "border-accent/70 bg-accent/10 text-accent" : "text-text-muted"}`}
          >
            预设
          </Button>
        </div>
      </div>
    </div>
  );
}
