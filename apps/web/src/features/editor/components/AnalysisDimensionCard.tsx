import { Button } from "../../../components/ui/button";

export interface DimensionReference {
  val: string;
  hint: string;
}

interface AnalysisDimensionCardProps {
  label: string;
  value: string | null;
  options: string[];
  references: DimensionReference[];
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
}

export default function AnalysisDimensionCard({ label, value, options, references, isOpen, onToggle, onSelect }: AnalysisDimensionCardProps) {
  const currentReference = references.find((reference) => reference.val === value);

  return <div className="overflow-hidden rounded-xl border border-border bg-bg-card">
    <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
      <span className="font-mono editor-heading tracking-wider text-text-muted">{label}</span>
      <Button type="button" variant="outline" size="xs" onClick={onToggle} className={`h-auto editor-body font-normal ${isOpen ? "border-accent/40 bg-accent/10 text-accent" : "border-border text-text-muted hover:border-border-mid hover:text-accent"}`}>参考 {isOpen ? "▴" : "▾"}</Button>
    </div>
    <div className="flex items-center gap-2 px-3 py-2">
      <span className={`editor-body font-medium ${value ? "text-white" : "text-text-muted"}`}>{value ?? "未填写"}</span>
      {currentReference && <span className="editor-meta text-text-muted">{currentReference.hint}</span>}
    </div>
    {isOpen && <div className="flex flex-col gap-0.5 border-t border-border/40 px-2 pb-2">
      {options.map((option) => {
        const reference = references.find((item) => item.val === option);
        return <Button type="button" variant="ghost" size="sm" key={option} onClick={() => onSelect(option)} className={`h-auto w-full justify-start whitespace-normal px-2 py-1.5 text-left editor-body font-normal ${value === option ? "bg-accent/15" : "hover:bg-white/4"}`}>
          <span className={`w-14 shrink-0 editor-body font-medium ${value === option ? "text-accent" : "text-white"}`}>{option}</span>
          {reference && <span className="flex-1 editor-meta text-text-muted">{reference.hint}</span>}
          {value === option && <span className="shrink-0 editor-body text-accent">✓</span>}
        </Button>;
      })}
    </div>}
  </div>;
}
