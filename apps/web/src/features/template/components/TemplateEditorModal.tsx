import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import ModalShell from "../../../components/ui/modal-shell"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Textarea } from "../../../components/ui/textarea"
import { SYSTEM_ANALYSIS_PROFILES, createProfileDraftFromSystemProfile, createProjectFieldDefinition } from "../services/fieldRegistry"
import type { FieldDefinitionSnapshot, ProjectTemplateSnapshot, TemplateFieldKind } from "../types"

const fieldKinds: Array<{ value: TemplateFieldKind; label: string }> = [
  { value: "single-select", label: "单选" },
  { value: "multi-select", label: "多选" },
  { value: "text", label: "文本" },
  { value: "number", label: "数字" },
  { value: "boolean", label: "是 / 否" },
]

interface TemplateEditorModalProps {
  template: ProjectTemplateSnapshot
  onClose: () => void
  onApplyTemplate: (template: ProjectTemplateSnapshot, baseVersion: number) => boolean
}

function usageDefaults(fieldId: string, order: number): ProjectTemplateSnapshot["fieldUsages"][number] {
  return { fieldId, sectionId: "observations", order, required: false, core: false, presentation: {}, interaction: { allowQuickEntry: true, allowCopyPrevious: true, allowBatchEdit: true, evidencePolicy: "optional" } }
}

export default function TemplateEditorModal({ template, onClose, onApplyTemplate }: TemplateEditorModalProps) {
  const [draft, setDraft] = useState(() => structuredClone(template))
  const [selectedFieldId, setSelectedFieldId] = useState(template.fieldUsages[0]?.fieldId ?? "shot_description")
  const [draftOnlyFieldIds, setDraftOnlyFieldIds] = useState<Set<string>>(new Set())
  const isDirty = JSON.stringify(draft) !== JSON.stringify(template)
  const usageById = useMemo(() => new Map(draft.fieldUsages.map((usage) => [usage.fieldId, usage])), [draft.fieldUsages])
  const definitionById = useMemo(() => new Map(draft.fieldDefinitions.map((field) => [field.fieldId, field])), [draft.fieldDefinitions])
  const activeDefinitions = useMemo(() => draft.fieldUsages.slice().sort((left, right) => left.order - right.order).map((usage) => definitionById.get(usage.fieldId)).filter((field): field is FieldDefinitionSnapshot => Boolean(field)), [definitionById, draft.fieldUsages])
  const selectedField = definitionById.get(selectedFieldId) ?? activeDefinitions[0]
  const selectedUsage = selectedField ? usageById.get(selectedField.fieldId) : undefined
  const updateDraft = (updater: (current: ProjectTemplateSnapshot) => ProjectTemplateSnapshot) => setDraft((current) => updater(current))
  const updateDefinition = (fieldId: string, updates: Partial<FieldDefinitionSnapshot>) => updateDraft((current) => ({ ...current, fieldDefinitions: current.fieldDefinitions.map((field) => field.fieldId === fieldId ? { ...field, ...updates, definitionVersion: field.definitionVersion + 1 } : field) }))
  const updateUsage = (fieldId: string, updates: Partial<ProjectTemplateSnapshot["fieldUsages"][number]>) => updateDraft((current) => ({ ...current, fieldUsages: current.fieldUsages.map((usage) => usage.fieldId === fieldId ? { ...usage, ...updates } : usage) }))
  const selectProfile = (profileId: string) => {
    try {
      const next = createProfileDraftFromSystemProfile(draft, profileId)
      updateDraft(() => next)
      setSelectedFieldId(next.fieldUsages[0]?.fieldId ?? "shot_description")
    } catch {
      // The parent validator remains the final authority for applying a draft.
    }
  }
  const addField = () => {
    const fieldId = `field_${crypto.randomUUID()}`
    const definition = createProjectFieldDefinition(draft.projectId, fieldId, { label: "新字段", description: "记录当前镜头的观察结果。", kind: "single-select", options: [], referenceTerms: [], allowsNotApplicable: true })
    setDraftOnlyFieldIds((current) => new Set(current).add(fieldId))
    updateDraft((current) => ({ ...current, fieldDefinitions: [...current.fieldDefinitions, definition], fieldUsages: [...current.fieldUsages, usageDefaults(fieldId, current.fieldUsages.length)] }))
    setSelectedFieldId(fieldId)
  }
  const moveField = (fieldId: string, direction: -1 | 1) => updateDraft((current) => {
    const usages = current.fieldUsages.slice().sort((left, right) => left.order - right.order)
    const index = usages.findIndex((usage) => usage.fieldId === fieldId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= usages.length) return current
    ;[usages[index], usages[target]] = [usages[target], usages[index]]
    return { ...current, fieldUsages: usages.map((usage, order) => ({ ...usage, order })) }
  })
  const removeField = (fieldId: string) => {
    if (fieldId === "shot_description") return
    updateDraft((current) => ({ ...current, fieldUsages: current.fieldUsages.filter((usage) => usage.fieldId !== fieldId).map((usage, order) => ({ ...usage, order })) }))
    if (selectedFieldId === fieldId) setSelectedFieldId(activeDefinitions.find((field) => field.fieldId !== fieldId)?.fieldId ?? "shot_description")
  }
  const close = () => {
    if (isDirty && !window.confirm("当前模板草稿尚未应用，关闭后将丢弃草稿。确定关闭吗？")) return
    onClose()
  }
  const apply = () => { if (onApplyTemplate(draft, template.version)) onClose() }

  return <ModalShell title="分析任务与字段" description="先选择实际记录目标，再预览字段与填写规则；只有点击“应用”后才会进入编辑器与自动保存。" onClose={close} className="max-w-6xl" density="compact">
    <div className="mb-3 flex flex-wrap items-center gap-2"><label className="flex items-center gap-2 text-xs text-text-muted">分析任务<select value={draft.sourceProfile?.id ?? "custom"} onChange={(event) => event.target.value !== "custom" && selectProfile(event.target.value)} className="h-8 rounded-md border border-border bg-bg-input px-2 text-xs text-text-base"><option value="custom">当前自定义配置</option>{SYSTEM_ANALYSIS_PROFILES.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label><Input value={draft.name} onChange={(event) => updateDraft((current) => ({ ...current, name: event.target.value }))} aria-label="分析任务名称" className="h-8 max-w-sm border-border bg-bg-input text-sm" /><span className="text-[11px] text-text-muted">已应用版本 {template.version} · 草稿不计入保存</span></div>
    <div className="grid max-h-[68vh] gap-3 overflow-y-auto lg:grid-cols-[13rem_minmax(0,1fr)_19rem]">
      <section className="rounded-lg border border-border bg-bg-card/40 p-3"><h3 className="text-xs font-medium text-text-base">字段库</h3><p className="mt-1 text-[11px] leading-4 text-text-muted">移出只移除当前任务使用关系，定义与已有镜头值都会保留。</p><div className="mt-3 space-y-1.5">{draft.fieldDefinitions.map((field) => { const active = usageById.has(field.fieldId); return <button key={field.fieldId} type="button" onClick={() => { setSelectedFieldId(field.fieldId); if (!active) updateDraft((current) => ({ ...current, fieldUsages: [...current.fieldUsages, usageDefaults(field.fieldId, current.fieldUsages.length)] })) }} className={`w-full rounded-md px-2 py-2 text-left text-xs ${selectedFieldId === field.fieldId ? "bg-accent/15 text-accent" : active ? "bg-white/4 text-text-base" : "text-text-muted hover:bg-bg-hover hover:text-text-base"}`}><span className="block truncate">{field.label}</span><span className="mt-0.5 block text-[10px] text-text-muted">{active ? field.origin === "system" ? "系统定义 · 当前任务" : "项目定义 · 当前任务" : "未启用 · 点击加入"}</span></button> })}<Button type="button" variant="outline" size="sm" onClick={addField} className="mt-2 w-full gap-1 border-dashed text-xs"><Plus className="size-3" />新建字段</Button></div></section>
      <section className="rounded-lg border border-border bg-bg-card/40 p-3"><h3 className="text-xs font-medium text-text-base">当前任务结构</h3><p className="mt-1 text-[11px] leading-4 text-text-muted">优先展示不等于更高价值；必填只影响完成度，不阻止保存。</p><div className="mt-3 space-y-2">{activeDefinitions.map((field, index) => { const usage = usageById.get(field.fieldId)!; return <article key={field.fieldId} onClick={() => setSelectedFieldId(field.fieldId)} className={`rounded-lg border p-2.5 ${selectedFieldId === field.fieldId ? "border-accent/50 bg-accent/5" : "border-border bg-bg-input/40"}`}><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="truncate text-sm text-text-base">{field.label}</p><p className="mt-0.5 line-clamp-2 text-[10px] text-text-muted">{field.description}</p><div className="mt-2 flex flex-wrap gap-2"><label className="flex items-center gap-1 text-[11px] text-text-muted"><input type="checkbox" checked={usage.core} onChange={(event) => updateUsage(field.fieldId, { core: event.target.checked })} />优先展示</label><label className="flex items-center gap-1 text-[11px] text-text-muted"><input type="checkbox" checked={usage.required} onChange={(event) => updateUsage(field.fieldId, { required: event.target.checked })} />完成分析时需填写</label></div></div><div className="flex shrink-0 gap-0.5"><Button type="button" variant="ghost" size="icon-xs" disabled={index === 0} onClick={(event) => { event.stopPropagation(); moveField(field.fieldId, -1) }} aria-label="上移字段"><ChevronUp /></Button><Button type="button" variant="ghost" size="icon-xs" disabled={index === activeDefinitions.length - 1} onClick={(event) => { event.stopPropagation(); moveField(field.fieldId, 1) }} aria-label="下移字段"><ChevronDown /></Button>{field.fieldId !== "shot_description" && <Button type="button" variant="ghost" size="icon-xs" onClick={(event) => { event.stopPropagation(); removeField(field.fieldId) }} aria-label="移出当前模板" className="text-text-muted hover:text-red-300"><Trash2 /></Button>}</div></div></article> })}</div></section>
      <section className="rounded-lg border border-border bg-bg-card/40 p-3"><h3 className="text-xs font-medium text-text-base">字段设置</h3><p className="mt-1 text-[11px] leading-4 text-text-muted">optionId 隐藏且稳定；停用选项仍可读取旧值。已应用字段的类型不可原地改变。</p>{selectedField ? <FieldSettings field={selectedField} isDraftOnly={draftOnlyFieldIds.has(selectedField.fieldId)} usage={selectedUsage} onUpdate={updateDefinition} onUpdateUsage={updateUsage} /> : <p className="mt-4 text-xs text-text-muted">从左侧选择字段。</p>}</section>
    </div>
    <div className="mt-3 flex items-center justify-between border-t border-border pt-3"><p className="text-[11px] text-text-muted">{isDirty ? "有未应用修改" : "当前草稿与已应用配置一致"}</p><div className="flex gap-2"><Button type="button" variant="ghost" size="sm" onClick={close}>取消</Button><Button type="button" size="sm" onClick={apply} disabled={!isDirty}>应用配置</Button></div></div>
  </ModalShell>
}

function FieldSettings({ field, isDraftOnly, usage, onUpdate, onUpdateUsage }: { field: FieldDefinitionSnapshot; isDraftOnly: boolean; usage?: ProjectTemplateSnapshot["fieldUsages"][number]; onUpdate: (fieldId: string, updates: Partial<FieldDefinitionSnapshot>) => void; onUpdateUsage: (fieldId: string, updates: Partial<ProjectTemplateSnapshot["fieldUsages"][number]>) => void }) {
  const isSystem = field.origin === "system"
  const kindLocked = !isDraftOnly
  return <div className="mt-3 space-y-3"><div><p className="text-[10px] text-text-muted">字段名称</p><Input value={field.label} disabled={isSystem || field.fieldId === "shot_description"} onChange={(event) => onUpdate(field.fieldId, { label: event.target.value })} aria-label="字段名称" className="mt-1 h-8 border-border bg-bg-input text-xs" /></div><div><p className="text-[10px] text-text-muted">说明</p><Textarea value={field.description} disabled={isSystem} onChange={(event) => onUpdate(field.fieldId, { description: event.target.value })} rows={4} aria-label="字段说明" className="mt-1 resize-none border-border bg-bg-input text-xs" /></div><div><p className="text-[10px] text-text-muted">类型</p><select value={field.kind} disabled={isSystem || field.fieldId === "shot_description" || kindLocked} onChange={(event) => onUpdate(field.fieldId, { kind: event.target.value as TemplateFieldKind })} aria-label="字段类型" className="mt-1 h-8 w-full rounded-md border border-border bg-bg-input px-2 text-xs text-text-base">{fieldKinds.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}</select></div>{usage && <label className="flex items-center justify-between gap-2 text-[11px] text-text-muted"><span>详细面板显示</span><input type="checkbox" checked={usage.presentation.detail_panel?.visible !== false} onChange={(event) => onUpdateUsage(field.fieldId, { presentation: { ...usage.presentation, detail_panel: { ...(usage.presentation.detail_panel ?? { widget: "text", density: "normal", showDescription: true, showReferenceTerms: true }), visible: event.target.checked } } })} /></label>}{(field.kind === "single-select" || field.kind === "multi-select") && <div className="space-y-1.5"><p className="text-[11px] text-text-muted">选项标签</p>{field.options.map((option) => <div key={option.id} className="flex items-center gap-1.5"><Input value={option.label} disabled={isSystem} onChange={(event) => onUpdate(field.fieldId, { options: field.options.map((item) => item.id === option.id ? { ...item, label: event.target.value } : item) })} className="h-7 border-border bg-bg-input text-xs" /><Button type="button" variant="ghost" size="xs" disabled={isSystem} onClick={() => onUpdate(field.fieldId, { options: field.options.map((item) => item.id === option.id ? { ...item, retired: !item.retired } : item) })} className="shrink-0 text-[10px] text-text-muted">{option.retired ? "启用" : "停用"}</Button></div>)}{!isSystem && <Button type="button" variant="outline" size="xs" onClick={() => onUpdate(field.fieldId, { options: [...field.options, { id: `${field.fieldId}.option.${crypto.randomUUID()}`, label: "新选项", retired: false }] })} className="gap-1"><Plus className="size-3" />新增选项</Button>}</div>}</div>
}
