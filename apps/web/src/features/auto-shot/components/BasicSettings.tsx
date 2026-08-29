import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import type { AutoShotControlSettings, DetectionDetail, TransitionSelection } from "../config/types";

interface BasicSettingsProps {
  settings: AutoShotControlSettings;
  disabled?: boolean;
  onChange: (patch: Partial<AutoShotControlSettings>) => void;
}

const details: Array<{ value: DetectionDetail; label: string; hint: string }> = [
  { value: "conservative", label: "保守", hint: "减少误切" },
  { value: "balanced", label: "均衡", hint: "推荐起点" },
  { value: "detailed", label: "细致", hint: "提高召回" },
];

export default function BasicSettings({ settings, disabled = false, onChange }: BasicSettingsProps) {
  const customDuration = settings.minimumSceneDuration.mode === "custom"
    ? settings.minimumSceneDuration.seconds
    : undefined;
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
              className={`${settings.transitions === value ? "border-accent/70 bg-accent/10 text-accent" : "text-text-muted"}`}
            >
              {value === "hard-cuts" ? "硬切" : "硬切 + 淡入淡出"}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <span className="editor-meta text-text-dim">最短镜头</span>
          <span className="editor-meta text-accent">{customDuration === undefined ? "按预设" : `${customDuration.toFixed(1)} s`}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <Button
            type="button"
            variant={customDuration === undefined ? "default" : "outline"}
            size="sm"
            disabled={disabled}
            onClick={() => onChange({ minimumSceneDuration: { mode: "preset" } })}
          >
            预设
          </Button>
          <Input
            type="number"
            min={0.1}
            max={30}
            step={0.1}
            disabled={disabled}
            value={customDuration ?? ""}
            placeholder="自定义秒数"
            onChange={(event) => {
              const seconds = Number(event.target.value);
              if (Number.isFinite(seconds)) onChange({ minimumSceneDuration: { mode: "custom", seconds } });
            }}
            className="h-7 flex-1 text-right font-mono text-xs"
          />
        </div>
      </div>
    </div>
  );
}
