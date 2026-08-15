import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import ModalShell from "../../../components/ui/modal-shell";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import type { ProjectTemplateSnapshot, TemplateField, TemplateFieldKind } from "../types";

const fieldKinds: Array<{ value: TemplateFieldKind; label: string }> = [
  { value: "single-select", label: "单选" },
  { value: "multi-select", label: "多选" },
  { value: "text", label: "文本" },
  { value: "number", label: "数字" },
  { value: "boolean", label: "是 / 否" },
];

interface TemplateEditorModalProps {
  template: ProjectTemplateSnapshot;
  onClose: () => void;
  onChangeTemplate: (template: ProjectTemplateSnapshot) => void;
  onUpdateField: (fieldId: string, updates: Partial<TemplateField>) => void;
  onAddField: () => void;
  onMoveField: (fieldId: string, direction: -1 | 1) => void;
  onDeleteField: (fieldId: string) => void;
}

export default function TemplateEditorModal({ template, onClose, onChangeTemplate, onUpdateField, onAddField, onMoveField, onDeleteField }: TemplateEditorModalProps) {
  const fields = [...template.fields].sort((left, right) => left.order - right.order);

  return <ModalShell title="编辑模板" description="字段顺序决定右侧分析面板的展示顺序；删除字段不会清除已保存分镜中的历史值。" onClose={onClose} className="max-w-2xl" density="compact">
    <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
      <div>
        <label htmlFor="template-name" className="mb-1.5 block font-mono editor-heading tracking-wider text-text-muted">模板名称</label>
        <Input id="template-name" value={template.name} onChange={(event) => onChangeTemplate({ ...template, name: event.target.value })} className="h-7 border-border bg-bg-input px-2 editor-body text-white" />
      </div>
      <div className="space-y-2">
        {fields.map((field, index) => {
          const supportsChoices = field.kind === "single-select" || field.kind === "multi-select";
          const previousField = fields[index - 1];
          const nextField = fields[index + 1];
          return <section key={field.id} className="rounded-lg border border-border bg-bg-input/45 p-2.5">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <Input value={field.label} disabled={field.isFixed} onChange={(event) => onUpdateField(field.id, { label: event.target.value })} className="h-7 border-border bg-bg-input px-2 editor-body text-white disabled:opacity-70" aria-label="字段名称" />
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <select value={field.kind} disabled={field.isFixed} onChange={(event) => onUpdateField(field.id, { kind: event.target.value as TemplateFieldKind })} aria-label="字段类型" className="editor-select h-7 rounded-md border border-border bg-bg-input px-2 editor-body text-text-dim disabled:opacity-70">
                  {fieldKinds.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}
                  </select>
                  {field.isFixed && <span className="rounded bg-accent/10 px-1.5 py-1 text-[10px] text-accent">固定</span>}
                  <label className="flex cursor-pointer items-center gap-1.5 editor-body text-text-muted"><input type="checkbox" checked={field.required} onChange={(event) => onUpdateField(field.id, { required: event.target.checked })} className="editor-checkbox" />必填</label>
                </div>
              </div>
              {!field.isFixed && <div className="flex shrink-0 gap-0.5">
                <Button type="button" variant="ghost" size="icon-xs" disabled={!previousField || previousField.isFixed} onClick={() => onMoveField(field.id, -1)} aria-label="上移字段" className="text-text-muted hover:bg-white/6 hover:text-white"><ChevronUp /></Button>
                <Button type="button" variant="ghost" size="icon-xs" disabled={!nextField || nextField.isFixed} onClick={() => onMoveField(field.id, 1)} aria-label="下移字段" className="text-text-muted hover:bg-white/6 hover:text-white"><ChevronDown /></Button>
                <Button type="button" variant="ghost" size="icon-xs" onClick={() => onDeleteField(field.id)} aria-label="删除字段" className="text-text-muted hover:bg-red-500/10 hover:text-red-400"><Trash2 /></Button>
              </div>}
            </div>
            {supportsChoices && <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
              <div>
                <label className="mb-1 block editor-meta text-text-muted">选项（用逗号或换行分隔）</label>
                <Input value={field.options.join("，")} onChange={(event) => onUpdateField(field.id, { options: event.target.value.split(/[，,\n]/).map((value) => value.trim()).filter(Boolean) })} className="h-7 border-border bg-bg-input px-2 editor-body text-text-dim" />
              </div>
              <div>
                <label className="mb-1 block editor-meta text-text-muted">参考词：提示（用分号分隔）</label>
                <Input value={field.referenceTerms.map((term) => `${term.label}:${term.hint}`).join("；")} onChange={(event) => onUpdateField(field.id, { referenceTerms: event.target.value.split(/[；;\n]/).map((value) => { const [label, ...hint] = value.split(":"); return { label: label?.trim() ?? "", hint: hint.join(":").trim() }; }).filter((term) => term.label) })} className="h-7 border-border bg-bg-input px-2 editor-body text-text-dim" />
              </div>
            </div>}
          </section>;
        })}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onAddField} className="h-7 w-full editor-body font-normal border-dashed border-border text-text-muted hover:border-accent/40 hover:text-accent">添加分析字段</Button>
    </div>
  </ModalShell>;
}
