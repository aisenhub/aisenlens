import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import type { AutoShotAdvancedOverrides, AutoShotControlSettings } from "../config/types";

interface AdvancedSettingsProps {
  settings: AutoShotControlSettings;
  disabled?: boolean;
  onChange: (patch: Partial<AutoShotControlSettings>) => void;
}

export default function AdvancedSettings({ settings, disabled = false, onChange }: AdvancedSettingsProps) {
  const [open, setOpen] = useState(false);
  const hardCut = settings.overrides.hardCut;
  const updateOverrides = (overrides: AutoShotAdvancedOverrides) => onChange({ overrides });
  return (
    <div className="rounded-xl border border-border bg-bg-deep">
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen((current) => !current)} className="h-8 w-full justify-between px-3 text-text-muted hover:text-text">
        <span>高级检测参数</span>
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
      </Button>
      {open && (
        <div className="space-y-2 border-t border-border px-3 pb-3 pt-2">
          <p className="text-[10px] leading-4 text-text-dim">覆盖引擎阈值用于实验对照；运行任务后参数会冻结在任务快照中。</p>
          {hardCut?.kind === "content" && (
            <label className="block">
              <span className="editor-meta text-text-dim">Content 阈值（0–10000）</span>
              <Input
                type="number"
                min={0}
                max={10000}
                step={50}
                disabled={disabled}
                value={hardCut.threshold}
                onChange={(event) => {
                  const threshold = Number(event.target.value);
                  if (Number.isFinite(threshold)) updateOverrides({ ...settings.overrides, hardCut: { ...hardCut, threshold } });
                }}
                className="mt-1 h-7 font-mono text-xs"
              />
            </label>
          )}
          {hardCut?.kind === "adaptive" && (
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className="editor-meta text-text-dim">Adaptive 阈值</span>
                <Input type="number" min={1} max={12000} step={50} disabled={disabled} value={hardCut.adaptiveThreshold} onChange={(event) => {
                  const adaptiveThreshold = Number(event.target.value);
                  if (Number.isFinite(adaptiveThreshold)) updateOverrides({ ...settings.overrides, hardCut: { ...hardCut, adaptiveThreshold } });
                }} className="mt-1 h-7 font-mono text-xs" />
              </label>
              <label>
                <span className="editor-meta text-text-dim">窗口宽度</span>
                <Input type="number" min={1} max={120} step={1} disabled={disabled} value={hardCut.windowWidth} onChange={(event) => {
                  const windowWidth = Number(event.target.value);
                  if (Number.isFinite(windowWidth)) updateOverrides({ ...settings.overrides, hardCut: { ...hardCut, windowWidth } });
                }} className="mt-1 h-7 font-mono text-xs" />
              </label>
            </div>
          )}
          {settings.overrides.fade && (
            <label className="block">
              <span className="editor-meta text-text-dim">Fade 阈值（0–255）</span>
              <Input type="number" min={0} max={255} step={1} disabled={disabled} value={settings.overrides.fade.threshold} onChange={(event) => {
                const threshold = Number(event.target.value);
                if (Number.isFinite(threshold)) updateOverrides({ ...settings.overrides, fade: { ...settings.overrides.fade!, threshold } });
              }} className="mt-1 h-7 font-mono text-xs" />
            </label>
          )}
          {!hardCut && !settings.overrides.fade && <p className="text-xs text-text-dim">当前使用预设检测参数。</p>}
        </div>
      )}
    </div>
  );
}
