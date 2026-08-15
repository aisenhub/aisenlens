import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import type { AnalysisFieldValue, TemplateField } from "../../template/types";

interface AnalysisFieldInputProps {
  field: TemplateField;
  value: AnalysisFieldValue | undefined;
  onChange: (value: AnalysisFieldValue) => void;
}

export default function AnalysisFieldInput({ field, value, onChange }: AnalysisFieldInputProps) {
  if (field.kind === "multi-select") {
    const selected = Array.isArray(value) ? value : [];
    return <section className="rounded-xl border border-border bg-bg-card p-3">
      <p className="font-mono editor-heading tracking-wider text-text-muted">{field.label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {field.options.map((option) => <Button key={option} type="button" variant="outline" size="sm" onClick={() => onChange(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option])} className={selected.includes(option) ? "h-7 px-2 editor-body font-normal border-accent/50 bg-accent/15 text-accent" : "h-7 px-2 editor-body font-normal border-border text-text-dim"}>{option}</Button>)}
      </div>
    </section>;
  }

  if (field.kind === "text") return <section className="rounded-xl border border-border bg-bg-card p-3"><label className="font-mono editor-heading tracking-wider text-text-muted">{field.label}</label><Textarea value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} rows={3} className="mt-2 min-h-0 resize-none border-border bg-bg-input editor-body text-white" /></section>;

  if (field.kind === "number") return <section className="rounded-xl border border-border bg-bg-card p-3"><label className="font-mono editor-heading tracking-wider text-text-muted">{field.label}</label><Input type="number" value={typeof value === "number" ? value : ""} onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))} className="mt-2 h-7 border-border bg-bg-input px-2 editor-body text-white" /></section>;

  if (field.kind === "boolean") return <section className="rounded-xl border border-border bg-bg-card p-3"><p className="font-mono editor-heading tracking-wider text-text-muted">{field.label}</p><div className="mt-2 flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => onChange(true)} className={value === true ? "h-7 px-2 editor-body font-normal border-accent/50 bg-accent/15 text-accent" : "h-7 px-2 editor-body font-normal border-border text-text-dim"}>是</Button><Button type="button" variant="outline" size="sm" onClick={() => onChange(false)} className={value === false ? "h-7 px-2 editor-body font-normal border-accent/50 bg-accent/15 text-accent" : "h-7 px-2 editor-body font-normal border-border text-text-dim"}>否</Button><Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)} className={value === null || value === undefined ? "h-7 px-2 editor-body font-normal text-accent" : "h-7 px-2 editor-body font-normal text-text-muted"}>清除</Button></div></section>;

  return null;
}
