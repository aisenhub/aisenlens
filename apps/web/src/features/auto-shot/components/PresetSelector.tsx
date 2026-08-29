import { Check, FlaskConical } from "lucide-react";
import { Button } from "../../../components/ui/button";
import type { AutoShotPresetDefinition, AutoShotPresetId } from "../config/types";

interface PresetSelectorProps {
  presets: AutoShotPresetDefinition[];
  value: AutoShotPresetId;
  disabled?: boolean;
  onChange: (presetId: AutoShotPresetId) => void;
}

export default function PresetSelector({ presets, value, disabled = false, onChange }: PresetSelectorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="editor-meta text-text-dim">内容预设</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/20 bg-amber-300/5 px-2 py-0.5 text-[10px] text-amber-200">
          <FlaskConical className="size-3" /> 研究配置 · 待标定
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {presets.map((preset) => {
          const selected = preset.id === value;
          return (
            <Button
              key={preset.id}
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => onChange(preset.id)}
              className={`h-auto min-h-12 justify-start whitespace-normal px-2 py-1.5 text-left ${selected ? "border-accent/70 bg-accent/10 text-accent" : "border-border bg-bg-input/30 text-text-muted hover:border-accent/35 hover:text-text"}`}
              title={preset.description}
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-1 text-xs font-medium">
                  {selected && <Check className="size-3 shrink-0" />}
                  <span className="truncate">{preset.name}</span>
                </span>
                <span className="line-clamp-2 text-[10px] leading-4 text-text-dim">{preset.description}</span>
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
