import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import type { HardCutConfig } from "@aisenlens/scene-engine";
import type { AutoShotAdvancedOverrides, AutoShotControlSettings } from "../config/types";

interface AdvancedSettingsProps {
  settings: AutoShotControlSettings;
  baseHardCut?: HardCutConfig;
  disabled?: boolean;
  onChange: (patch: Partial<AutoShotControlSettings>) => void;
}

export default function AdvancedSettings({ settings, baseHardCut, disabled = false, onChange }: AdvancedSettingsProps) {
  const [open, setOpen] = useState(true);
  const hardCut = settings.overrides.hardCut;
  const updateOverrides = (overrides: AutoShotAdvancedOverrides) => onChange({ overrides });
  const detectorValue = hardCut?.kind ?? "auto";
  const weights = hardCut?.weights ?? baseHardCut?.weights;
  const updateHardCut = (patch: Partial<HardCutConfig>) => {
    if (!hardCut) return;
    updateOverrides({ ...settings.overrides, hardCut: { ...hardCut, ...patch } as HardCutConfig });
  };
  const selectDetector = (kind: "auto" | HardCutConfig["kind"]) => {
    if (kind === "auto") {
      updateOverrides({ ...settings.overrides, hardCut: undefined });
      return;
    }
    if (kind === hardCut?.kind) return;
    const source = baseHardCut?.kind === kind ? baseHardCut : null;
    const next: HardCutConfig = source ?? (kind === "content"
      ? { kind: "content", threshold: 3000, weights: { hue: 3333, saturation: 3333, luma: 3334 } }
      : { kind: "adaptive", adaptiveThreshold: 3000, windowWidth: 3, minimumContentScore: 1200, weights: { hue: 3333, saturation: 3333, luma: 3334 } });
    updateOverrides({ ...settings.overrides, hardCut: structuredClone(next) });
  };
  return (
    <div className="rounded-xl border border-border bg-bg-deep">
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen((current) => !current)} className="h-8 w-full justify-between px-3 text-text-muted hover:text-text">
        <span>高级检测参数</span>
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
      </Button>
      {open && (
        <div className="space-y-2 border-t border-border px-3 pb-3 pt-2">
          <p className="text-[10px] leading-4 text-text-dim">覆盖引擎阈值用于实验对照；运行任务后参数会冻结在任务快照中。</p>
          <label className="block">
            <span className="editor-meta text-text-dim">硬切检测器</span>
            <select
              value={detectorValue}
              disabled={disabled}
              onChange={(event) => selectDetector(event.target.value as "auto" | HardCutConfig["kind"])}
              className="mt-1 h-7 w-full rounded-md border border-border bg-bg-input px-2 text-xs text-text outline-none focus:border-accent"
            >
              <option value="auto">跟随预设</option>
              <option value="content">Content</option>
              <option value="adaptive">Adaptive</option>
            </select>
          </label>
          {hardCut && (
            <Button type="button" variant="ghost" size="xs" disabled={disabled} onClick={() => selectDetector("auto")} className="h-6 w-full justify-start px-1 text-[10px] text-text-dim hover:text-accent">
              恢复跟随预设（清除硬切覆盖）
            </Button>
          )}
          {hardCut?.kind === "content" && (
            <>
              <label className="block">
                <span className="editor-meta text-text-dim">Content 阈值（0–10000）</span>
                <Input type="number" min={0} max={10000} step={50} disabled={disabled} value={hardCut.threshold} onChange={(event) => {
                  const threshold = Number(event.target.value);
                  if (Number.isFinite(threshold)) updateHardCut({ threshold });
                }} className="mt-1 h-7 font-mono text-xs" />
              </label>
              <WeightInputs weights={weights} disabled={disabled} onChange={(next) => updateHardCut({ weights: next })} />
            </>
          )}
          {hardCut?.kind === "adaptive" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <label>
                  <span className="editor-meta text-text-dim">Adaptive 阈值</span>
                  <Input type="number" min={1} max={12000} step={50} disabled={disabled} value={hardCut.adaptiveThreshold} onChange={(event) => {
                    const adaptiveThreshold = Number(event.target.value);
                    if (Number.isFinite(adaptiveThreshold)) updateHardCut({ adaptiveThreshold });
                  }} className="mt-1 h-7 font-mono text-xs" />
                </label>
                <label>
                  <span className="editor-meta text-text-dim">窗口宽度</span>
                  <Input type="number" min={1} max={120} step={1} disabled={disabled} value={hardCut.windowWidth} onChange={(event) => {
                    const windowWidth = Number(event.target.value);
                    if (Number.isFinite(windowWidth)) updateHardCut({ windowWidth });
                  }} className="mt-1 h-7 font-mono text-xs" />
                </label>
              </div>
              <label className="block">
                <span className="editor-meta text-text-dim">最低内容差异（0–10000）</span>
                <Input type="number" min={0} max={10000} step={50} disabled={disabled} value={hardCut.minimumContentScore} onChange={(event) => {
                  const minimumContentScore = Number(event.target.value);
                  if (Number.isFinite(minimumContentScore)) updateHardCut({ minimumContentScore });
                }} className="mt-1 h-7 font-mono text-xs" />
              </label>
              <WeightInputs weights={weights} disabled={disabled} onChange={(next) => updateHardCut({ weights: next })} />
            </>
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

function WeightInputs({ weights, disabled, onChange }: { weights?: { hue: number; saturation: number; luma: number }; disabled: boolean; onChange: (weights: { hue: number; saturation: number; luma: number }) => void }) {
  if (!weights) return null;
  return (
    <div>
      <span className="editor-meta text-text-dim">分量权重（总和应为 10000）</span>
      <div className="mt-1 grid grid-cols-3 gap-1.5">
        {(["hue", "saturation", "luma"] as const).map((key) => (
          <label key={key}>
            <span className="sr-only">{key}</span>
            <Input type="number" min={0} max={10000} step={50} disabled={disabled} value={weights[key]} aria-label={`${key} 权重`} onChange={(event) => {
              const value = Number(event.target.value);
              if (Number.isFinite(value)) onChange({ ...weights, [key]: value });
            }} className="h-7 px-1.5 text-center font-mono text-[10px]" />
          </label>
        ))}
      </div>
    </div>
  );
}
