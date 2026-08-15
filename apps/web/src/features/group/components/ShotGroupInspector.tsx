import { ArrowLeftFromLine, ArrowLeftToLine, ArrowRightFromLine, ArrowRightToLine, ChevronDown } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "../../../components/ui/dropdown-menu";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import type { ShotGroupKind, ShotGroupRecord } from "../types";

interface ShotGroupInspectorProps {
  group: ShotGroupRecord | null;
  indexes: { first: number; last: number } | null;
  durationSeconds: number;
  onUpdate: (groupId: string, patch: Pick<ShotGroupRecord, "title" | "summary" | "kind">) => void;
  onAdjustRange: (groupId: string, edge: "start" | "end", operation: "extend" | "shrink") => void;
}

const groupKindOptions: Array<{ value: ShotGroupKind; label: string }> = [
  { value: "scene", label: "场景" },
  { value: "section", label: "段落" },
  { value: "sequence", label: "序列" },
];

export default function ShotGroupInspector({ group, indexes, durationSeconds, onUpdate, onAdjustRange }: ShotGroupInspectorProps) {
  if (!group || !indexes) return <div className="flex flex-1 items-center justify-center p-6 text-center editor-meta text-text-muted">从分镜列表点击分组标题，即可查看和编辑分组信息。</div>;

  return <div className="flex-1 overflow-y-auto p-4"><div className="space-y-4">
    <div><p className="mb-2 font-mono editor-heading tracking-wider text-text-muted">分组名称</p><Input value={group.title} onChange={(event) => onUpdate(group.id, { title: event.target.value, kind: group.kind, summary: group.summary })} className="h-7 border-border bg-bg-input px-2 editor-body" /></div>
    <div><p className="mb-2 font-mono editor-heading tracking-wider text-text-muted">分组类别</p><DropdownMenu><DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" className="h-7 w-full justify-between border-border bg-bg-input px-2 editor-body font-normal text-text-dim hover:bg-white/4 hover:text-white" />}><span>{groupKindOptions.find((option) => option.value === group.kind)?.label}</span><ChevronDown className="size-3 text-text-muted" /></DropdownMenuTrigger><DropdownMenuContent className="w-32 border border-border bg-bg-panel text-text-dim"><DropdownMenuRadioGroup value={group.kind} onValueChange={(kind) => onUpdate(group.id, { title: group.title, kind: kind as ShotGroupKind, summary: group.summary })}>{groupKindOptions.map((option) => <DropdownMenuRadioItem key={option.value} value={option.value} className="h-7 editor-body hover:bg-white/6 hover:text-white focus:bg-white/6 focus:text-white data-[checked]:bg-transparent data-[checked]:text-accent data-[checked]:hover:bg-white/6 data-[checked]:hover:text-accent data-[checked]:focus:bg-white/6 data-[checked]:focus:text-accent">{option.label}</DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu></div>
    <div className="rounded-xl border border-border bg-bg-deep p-3"><div className="flex items-center justify-between"><p className="font-mono editor-heading tracking-wider text-text-muted">分组范围</p><span className="editor-meta text-text-dim">#{String(indexes.first + 1).padStart(2, "0")} – #{String(indexes.last + 1).padStart(2, "0")}</span></div><p className="mt-1 editor-meta text-text-muted">连续 {group.shotIds.length} 镜 · {durationSeconds.toFixed(2)} 秒</p><div className="mt-3 grid grid-cols-2 gap-1.5"><Button type="button" variant="outline" size="sm" onClick={() => onAdjustRange(group.id, "start", "extend")} className="h-7 px-1 editor-body font-normal"><ArrowLeftFromLine className="size-3" />起点向前</Button><Button type="button" variant="outline" size="sm" onClick={() => onAdjustRange(group.id, "end", "extend")} className="h-7 px-1 editor-body font-normal"><ArrowRightFromLine className="size-3" />终点向后</Button><Button type="button" variant="outline" size="sm" onClick={() => onAdjustRange(group.id, "start", "shrink")} className="h-7 px-1 editor-body font-normal"><ArrowRightToLine className="size-3" />起点向后</Button><Button type="button" variant="outline" size="sm" onClick={() => onAdjustRange(group.id, "end", "shrink")} className="h-7 px-1 editor-body font-normal"><ArrowLeftToLine className="size-3" />终点向前</Button></div></div>
    <div><p className="mb-2 font-mono editor-heading tracking-wider text-text-muted">分组分析</p><Textarea value={group.summary} onChange={(event) => onUpdate(group.id, { title: group.title, kind: group.kind, summary: group.summary })} rows={7} placeholder="记录该段落的叙事功能、情绪和剪辑特点…" className="min-h-0 resize-none border-border bg-bg-input p-3 editor-body text-text-dim placeholder:text-text-muted" /></div>
  </div></div>;
}
