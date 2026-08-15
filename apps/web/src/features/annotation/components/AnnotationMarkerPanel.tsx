import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import type { AnnotationMarker, AnnotationMarkerCategory } from "../types";

const categoryMeta: Record<AnnotationMarkerCategory, { label: string; color: string }> = {
  important: { label: "重要镜头", color: "bg-amber-400" },
  composition: { label: "构图精妙", color: "bg-sky-400" },
  emotion: { label: "情绪高点", color: "bg-violet-400" },
  "turning-point": { label: "转折点", color: "bg-rose-400" },
};

interface AnnotationMarkerPanelProps {
  markers: AnnotationMarker[];
  selectedMarkerId: string | null;
  frameRate: number;
  onCreate: (category: AnnotationMarkerCategory) => void;
  onUpdate: (marker: AnnotationMarker) => void;
  onDelete: (markerId: string) => void;
  onSeek: (frame: number) => void;
  onSelect: (marker: AnnotationMarker) => void;
}

function formatFrameTime(frame: number, frameRate: number): string {
  const seconds = frame / Math.max(1, frameRate);
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}:${String(frame % Math.max(1, Math.round(frameRate))).padStart(2, "0")}`;
}

export default function AnnotationMarkerPanel({ markers, selectedMarkerId, frameRate, onCreate, onUpdate, onDelete, onSeek, onSelect }: AnnotationMarkerPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ label: string; note: string } | null>(null);
  const sortedMarkers = [...markers].sort((left, right) => left.frame - right.frame);

  const beginEdit = (marker: AnnotationMarker) => {
    setEditingId(marker.id);
    setDraft({ label: marker.label, note: marker.note });
  };

  const saveEdit = (marker: AnnotationMarker) => {
    if (!draft) return;
    onUpdate({ ...marker, label: draft.label.trim() || categoryMeta[marker.category].label, note: draft.note });
    setEditingId(null);
    setDraft(null);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono editor-heading tracking-wider text-text-muted">时间线标记</p>
        <span className="font-mono editor-micro text-text-muted">{markers.length}</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {(Object.entries(categoryMeta) as Array<[AnnotationMarkerCategory, { label: string; color: string }]>).map(([category, meta]) => (
          <Button key={category} type="button" variant="outline" size="sm" onClick={() => onCreate(category)} className="h-7 justify-start gap-1.5 border-border px-2 text-left editor-body font-normal text-text-dim hover:border-border-mid hover:bg-white/4">
            <span className={`size-2 shrink-0 rounded-full ${meta.color}`} />
            <span className="truncate">{meta.label}</span>
          </Button>
        ))}
      </div>
      {sortedMarkers.length > 0 && <div className="mt-3 border-t border-border pt-3">
        <div className="max-h-64 space-y-1.5 overflow-y-auto pr-0.5">
          {sortedMarkers.map((marker) => {
            const meta = categoryMeta[marker.category];
            const isEditing = marker.id === editingId;
            return <div key={marker.id} className={`rounded-lg border p-2 ${selectedMarkerId === marker.id ? "border-accent/60 bg-accent/10" : "border-border bg-bg-input/35"}`}>
              {isEditing && draft ? <>
                <Input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} aria-label="标记名称" className="h-7 border-border bg-bg-input px-2 editor-body text-white" />
                <Textarea value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="补充说明（可选）" rows={2} className="mt-1.5 min-h-0 resize-none border-border bg-bg-input p-2 editor-body text-text-dim placeholder:text-text-muted" />
                <div className="mt-1.5 flex gap-1.5">
                  <Button type="button" size="xs" onClick={() => saveEdit(marker)} className="flex-1 editor-body font-normal">保存</Button>
                  <Button type="button" variant="ghost" size="xs" onClick={() => { setEditingId(null); setDraft(null); }} className="flex-1 editor-body font-normal text-text-muted">取消</Button>
                </div>
              </> : <>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => { onSelect(marker); onSeek(marker.frame); }} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <span className={`size-2 shrink-0 rounded-full ${meta.color}`} />
                    <span className="font-mono editor-micro text-text-muted">{formatFrameTime(marker.frame, frameRate)}</span>
                  </button>
                  <Button type="button" variant="ghost" size="icon-xs" onClick={() => beginEdit(marker)} aria-label={`编辑${marker.label}`} className="text-text-muted hover:text-white"><Pencil className="size-3" /></Button>
                  <Button type="button" variant="ghost" size="icon-xs" onClick={() => onDelete(marker.id)} aria-label={`删除${marker.label}`} className="text-text-muted hover:text-red-400"><Trash2 className="size-3" /></Button>
                </div>
              </>}
            </div>;
          })}
        </div>
      </div>}
      {markers.length === 0 && <p className="mt-3 text-center editor-meta text-text-muted">尚未创建标记。</p>}
    </div>
  );
}
