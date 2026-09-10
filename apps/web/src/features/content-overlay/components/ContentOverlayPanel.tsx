import { Check } from "lucide-react";
import type { CSSProperties } from "react";
import { Button } from "../../../components/ui/button";
import type { ResolvedAnalysisField } from "../../template/types";
import type { ContentOverlaySettings } from "../types";

interface ContentOverlayPanelProps {
  settings: ContentOverlaySettings;
  fields: ResolvedAnalysisField[];
  suggestedFieldIds: string[];
  onChange: (settings: ContentOverlaySettings) => void;
}

const layouts = [
  { id: "compact", label: "紧凑" },
  { id: "sidebar", label: "侧栏" },
  { id: "lower-third", label: "下三分之一" },
] as const;

function Switch({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return <div className="flex items-center justify-between gap-3 py-1">
    <span className="editor-body text-text-dim">{label}</span>
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange} className={`relative h-[18px] w-8 shrink-0 overflow-hidden rounded-full transition-colors ${checked ? "bg-accent" : "bg-white/15"}`}><span className={`absolute left-0.5 top-0.5 size-3.5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-3.5" : "translate-x-0"}`} /></button>
  </div>;
}

export default function ContentOverlayPanel({ settings, fields, suggestedFieldIds, onChange }: ContentOverlayPanelProps) {
  const update = (patch: Partial<ContentOverlaySettings>) => onChange({ ...settings, ...patch });
  const availableFields = fields.filter((field) => field.definition.fieldId !== "shot_description" && field.surface.visible).sort((left, right) => left.usage.order - right.usage.order);
  const toggleField = (fieldId: string) => {
    const selected = settings.fieldIds.includes(fieldId);
    if (!selected && settings.fieldIds.length >= 6) return;
    update({ fieldIds: selected ? settings.fieldIds.filter((id) => id !== fieldId) : [...settings.fieldIds, fieldId] });
  };

  return <section className="flex flex-col gap-3 border-t border-border pt-3">
    <div className="flex items-center justify-between gap-3">
      <div><p className="font-mono editor-heading tracking-wider text-text-muted">分析信息</p><p className="mt-0.5 editor-meta text-text-muted">仅在预览中显示，不写入截图</p></div>
      <button type="button" role="switch" aria-checked={settings.enabled} aria-label="显示分析信息" onClick={() => update({ enabled: !settings.enabled, ...(!settings.enabled && settings.fieldIds.length === 0 ? { fieldIds: suggestedFieldIds } : {}) })} className={`relative h-[18px] w-8 shrink-0 overflow-hidden rounded-full transition-colors ${settings.enabled ? "bg-accent" : "bg-white/15"}`}><span className={`absolute left-0.5 top-0.5 size-3.5 rounded-full bg-white shadow-sm transition-transform ${settings.enabled ? "translate-x-3.5" : "translate-x-0"}`} /></button>
    </div>
    {settings.enabled && <>
      <div className="grid grid-cols-3 gap-1">
        {layouts.map((layout) => <Button key={layout.id} type="button" variant="outline" size="xs" aria-pressed={settings.layout === layout.id} onClick={() => update({ layout: layout.id })} className={settings.layout === layout.id ? "h-7 border-accent/50 bg-accent/15 px-1 editor-meta font-normal text-accent hover:bg-accent/20 hover:text-accent" : "h-7 border-border px-1 editor-meta font-normal text-text-muted hover:text-white"}>{layout.label}</Button>)}
      </div>
      <div className="border-t border-border pt-2">
        <Switch checked={settings.showShotNumber} label="镜号" onChange={() => update({ showShotNumber: !settings.showShotNumber })} />
        <Switch checked={settings.showTimecode} label="时间码" onChange={() => update({ showTimecode: !settings.showTimecode })} />
        <Switch checked={settings.showDuration} label="时长" onChange={() => update({ showDuration: !settings.showDuration })} />
        <Switch checked={settings.showDescription} label="画面内容" onChange={() => update({ showDescription: !settings.showDescription })} />
        <Switch checked={settings.showAnalysis} label="镜头分析" onChange={() => update({ showAnalysis: !settings.showAnalysis })} />
        <Switch checked={settings.showBackground} label="显示背景" onChange={() => update({ showBackground: !settings.showBackground })} />
        {settings.showBackground && <label className="mt-1 block editor-meta text-text-muted">背景透明度 <span className="font-mono text-text-dim">{Math.round(settings.backgroundOpacity * 100)}%</span><input type="range" min="0.05" max="0.75" step="0.05" value={settings.backgroundOpacity} onChange={(event) => update({ backgroundOpacity: Number(event.target.value) })} className="editor-range mt-1" style={{ "--editor-range-progress": `${((settings.backgroundOpacity - 0.05) / 0.7) * 100}%` } as CSSProperties} /></label>}
      </div>
      <div className="border-t border-border pt-2">
        <div className="mb-1.5 flex items-center justify-between"><p className="font-mono editor-heading tracking-wider text-text-muted">分析字段</p><span className="font-mono editor-meta text-text-muted">{settings.fieldIds.length}/6</span></div>
        <div className="flex flex-wrap gap-1">
          {availableFields.map((field) => {
            const selected = settings.fieldIds.includes(field.definition.fieldId);
            const disabled = !selected && settings.fieldIds.length >= 6;
            return <Button key={field.definition.fieldId} type="button" variant="outline" size="xs" aria-pressed={selected} disabled={disabled} onClick={() => toggleField(field.definition.fieldId)} className={selected ? "h-6 border-accent/50 bg-accent/15 px-1.5 editor-meta font-normal text-accent hover:bg-accent/20 hover:text-accent" : "h-6 border-border px-1.5 editor-meta font-normal text-text-muted hover:text-white"}>{selected && <Check className="size-2.5" />}{field.definition.label}</Button>;
          })}
        </div>
      </div>
    </>}
  </section>;
}
