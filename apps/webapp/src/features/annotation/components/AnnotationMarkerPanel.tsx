import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import type { AnnotationMarker, AnnotationMarkerScope } from "../types";
import { annotationMarkerScopeLabels, annotationMarkerScopes } from "../types";

interface AnnotationMarkerDraft {
  id: string | null;
  frame: number;
  content: string;
  scope: AnnotationMarkerScope;
}

interface AnnotationMarkerPanelProps {
  markers: AnnotationMarker[];
  selectedMarkerId: string | null;
  frameRate: number;
  currentFrame: number;
  defaultScope: AnnotationMarkerScope;
  createRequest: number;
  onCreate: (draft: Omit<AnnotationMarkerDraft, "id">) => void;
  onUpdate: (marker: AnnotationMarker) => void;
  onDelete: (markerId: string) => void;
  onSeek: (frame: number) => void;
  onSelect: (marker: AnnotationMarker) => void;
}

function formatFrameTime(frame: number, frameRate: number): string {
  const safeFrameRate = Math.max(1, frameRate);
  const totalSeconds = Math.floor(frame / safeFrameRate);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const frames = frame % Math.round(safeFrameRate);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
}

export default function AnnotationMarkerPanel({ markers, selectedMarkerId, frameRate, currentFrame, defaultScope, createRequest, onCreate, onUpdate, onDelete, onSeek, onSelect }: AnnotationMarkerPanelProps) {
  const [draft, setDraft] = useState<AnnotationMarkerDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sortedMarkers = [...markers].sort((left, right) => left.frame - right.frame || left.createdAt.localeCompare(right.createdAt));

  const beginNew = () => {
    setDraft({ id: null, frame: currentFrame, content: "", scope: defaultScope });
    setError(null);
  };

  useEffect(() => {
    if (createRequest > 0) beginNew();
  }, [createRequest]);

  const beginEdit = (marker: AnnotationMarker) => {
    setDraft({ id: marker.id, frame: marker.frame, content: marker.content, scope: marker.scope });
    setError(null);
  };

  const cancelDraft = () => {
    setDraft(null);
    setError(null);
  };

  const saveDraft = () => {
    if (!draft) return;
    const content = draft.content.trim();
    if (!content) {
      setError("标记内容不能为空。");
      return;
    }
    if (draft.id) {
      const marker = markers.find((item) => item.id === draft.id);
      if (marker) onUpdate({ ...marker, content, scope: draft.scope });
    } else {
      onCreate({ frame: draft.frame, content, scope: draft.scope });
    }
    cancelDraft();
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono editor-heading tracking-wider text-text-muted">时间线标记</p>
        <span className="font-mono editor-micro text-text-muted">{markers.length}</span>
      </div>
      {!draft && <Button type="button" variant="outline" size="sm" onClick={beginNew} className="h-8 w-full justify-start gap-1.5 border-accent/35 px-2 text-left editor-body font-normal text-accent hover:bg-accent/10">
        <Plus className="size-3.5" />添加标记
      </Button>}
      {draft && <div className="rounded-lg border border-accent/40 bg-accent/5 p-2">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="font-mono editor-micro text-accent">{draft.id ? "编辑标记" : "新标记"} · {formatFrameTime(draft.frame, frameRate)}</span>
          <select value={draft.scope} onChange={(event) => setDraft({ ...draft, scope: event.target.value as AnnotationMarkerScope })} aria-label="标记观察尺度" className="h-6 rounded border border-border bg-bg-input px-1 text-[10px] text-text-dim">
            {annotationMarkerScopes.map((scope) => <option key={scope} value={scope}>{annotationMarkerScopeLabels[scope]}</option>)}
          </select>
        </div>
        <Textarea autoFocus value={draft.content} onChange={(event) => { setDraft({ ...draft, content: event.target.value }); setError(null); }} onKeyDown={(event) => { event.stopPropagation(); if (event.key === "Escape") cancelDraft(); }} placeholder="记录你注意到的画面、声音或叙事变化…" rows={3} className="min-h-0 resize-none border-border bg-bg-input p-2 editor-body text-text-dim placeholder:text-text-muted" />
        {error && <p role="alert" className="mt-1 text-[10px] text-red-300">{error}</p>}
        <div className="mt-1.5 flex gap-1.5">
          <Button type="button" size="xs" onClick={saveDraft} className="flex-1 editor-body font-normal">保存</Button>
          <Button type="button" variant="ghost" size="xs" onClick={cancelDraft} className="flex-1 editor-body font-normal text-text-muted">取消</Button>
        </div>
      </div>}
      {sortedMarkers.length > 0 && <div className="mt-3 border-t border-border pt-3">
        <div className="max-h-64 space-y-1.5 overflow-y-auto pr-0.5">
          {sortedMarkers.map((marker) => {
            const isEditing = marker.id === draft?.id;
            if (isEditing) return null;
            const summary = marker.content.replace(/\s+/g, " ").trim();
            return <div key={marker.id} className={`rounded-lg border p-2 ${selectedMarkerId === marker.id ? "border-accent/60 bg-accent/10" : "border-border bg-bg-input/35"}`}>
              <div className="flex items-start gap-2">
                <button type="button" onClick={() => { onSelect(marker); onSeek(marker.frame); }} className="min-w-0 flex-1 text-left" title={marker.content}>
                  <span className="flex items-center gap-1.5 font-mono editor-micro text-text-muted"><span className="size-1.5 shrink-0 rounded-full bg-accent" />{formatFrameTime(marker.frame, frameRate)}<span className="text-text-muted/70">· {annotationMarkerScopeLabels[marker.scope]}</span></span>
                  <span className="mt-1 block truncate text-xs text-text-dim">{summary}</span>
                </button>
                <div className="flex shrink-0 gap-0.5">
                  <Button type="button" variant="ghost" size="icon-xs" onClick={() => beginEdit(marker)} aria-label="编辑标记" className="text-text-muted hover:text-white"><Pencil className="size-3" /></Button>
                  <Button type="button" variant="ghost" size="icon-xs" onClick={() => onDelete(marker.id)} aria-label="删除标记" className="text-text-muted hover:text-red-400"><Trash2 className="size-3" /></Button>
                </div>
              </div>
            </div>;
          })}
        </div>
      </div>}
      {markers.length === 0 && !draft && <p className="mt-3 text-center editor-meta text-text-muted">尚未创建标记。</p>}
    </div>
  );
}
