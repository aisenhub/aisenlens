import { ChevronDown, ChevronRight, Filter, Play, Scissors, Search, Trash2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "../../../components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../../../components/ui/dropdown-menu";
import { Input } from "../../../components/ui/input";
import type { AnnotationMarker } from "../../annotation/types";
import type { ShotGroupRecord } from "../../group/types";
import type { ShotData } from "../constants/editorData";
import type { AnalysisFieldValue } from "../../template/types";
import { findMatchingShotIds, type ShotSearchFilters, type ShotSearchStatus } from "../../shot/services/shotSearchService";

interface ShotListProps {
  shots: ShotData[];
  groups: ShotGroupRecord[];
  collapsedGroupIds: string[];
  activeShotIndex: number;
  filters: ShotSearchFilters;
  onFiltersChange: (filters: ShotSearchFilters) => void;
  completionByShotId: Record<string, { filled: number; total: number; missingRequired: number }>;
  selectedShotIds: string[];
  isSelectingShots: boolean;
  shotNotes: Record<string, { content: string; analysis: string }>;
  shotFields: Record<string, Record<string, AnalysisFieldValue>>;
  screenshotIdsByShotId: Record<string, string[]>;
  primaryScreenshotIdsByShotId: Record<string, string | null>;
  markers: AnnotationMarker[];
  onLocateShot: (index: number) => void;
  onSelectionChange: (shotId: string, selected: boolean) => void;
  onToggleGroup: (groupId: string) => void;
  onSelectGroup: (groupId: string, firstShotIndex: number) => void;
  onPlayGroup: (groupId: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onPlayShot: (index: number) => void;
  onDeleteShot: (index: number) => void;
  manualSplitDisabledReason: string | null;
  onSplitAtPlayhead: () => void;
}

const groupKindFilters = [{ id: "all", label: "全部" }, { id: "scene", label: "场景" }, { id: "section", label: "段落" }, { id: "sequence", label: "序列" }] as const;
const statusFilters = [{ id: "all", label: "全部状态" }, { id: "with-notes", label: "有批注" }, { id: "with-screenshot", label: "有截图" }, { id: "marked", label: "已标记" }] as const;

export default function ShotList({ shots, groups, collapsedGroupIds, activeShotIndex, filters, onFiltersChange, completionByShotId, selectedShotIds, isSelectingShots, shotNotes, shotFields, screenshotIdsByShotId, primaryScreenshotIdsByShotId, markers, onLocateShot, onSelectionChange, onToggleGroup, onSelectGroup, onPlayGroup, onDeleteGroup, onPlayShot, onDeleteShot, manualSplitDisabledReason, onSplitAtPlayhead }: ShotListProps) {
  const setFilters = (updater: ShotSearchFilters | ((current: ShotSearchFilters) => ShotSearchFilters)) => onFiltersChange(typeof updater === "function" ? updater(filters) : updater);
  const shotRowRefs = useRef(new Map<string, HTMLDivElement>());
  const groupByFirstShotId = new Map(groups.map((group) => [group.shotIds[0], group]));
  const groupByShotId = new Map(groups.flatMap((group) => group.shotIds.map((shotId) => [shotId, group] as const)));
  const matchingShotIds = findMatchingShotIds({ shots, groups, notesByShotId: shotNotes, fieldsByShotId: shotFields, screenshotIdsByShotId, primaryScreenshotIdsByShotId, markers }, filters);
  const isFiltering = Boolean(filters.query.trim() || filters.groupKind !== "all" || filters.status !== "all");
  const clearFilters = () => onFiltersChange({ query: "", groupKind: "all", status: "all" });
  const activeShot = shots[activeShotIndex];
  const activeShotGroup = activeShot ? groupByShotId.get(activeShot.id) : undefined;
  const activeShotMatches = Boolean(activeShot && matchingShotIds.has(activeShot.id));
  const activeShotGroupIsCollapsed = Boolean(activeShotGroup && collapsedGroupIds.includes(activeShotGroup.id));

  useEffect(() => {
    if (!activeShot || !activeShotMatches) return;
    if (activeShotGroup && activeShotGroupIsCollapsed && !isFiltering) {
      onToggleGroup(activeShotGroup.id);
      return;
    }
    shotRowRefs.current.get(activeShot.id)?.scrollIntoView({ block: "nearest" });
  }, [activeShot?.id, activeShotGroup?.id, activeShotGroupIsCollapsed, activeShotMatches, isFiltering]);

  return <aside className="flex w-40 shrink-0 flex-col overflow-hidden border-l border-border bg-bg-panel">
    <div className="shrink-0 border-b border-border px-2 py-2">
      <div className="flex items-center justify-between px-1 font-mono editor-heading text-text-muted"><span>分镜列表</span><div className="flex items-center gap-1"><span className="editor-meta">{isFiltering ? `${matchingShotIds.size}/${shots.length}` : shots.length}</span><DropdownMenu><DropdownMenuTrigger aria-label="筛选分镜" title="筛选分镜" className={`flex size-5 items-center justify-center rounded-sm transition-colors ${isFiltering ? "bg-accent/15 text-accent" : "text-text-muted hover:bg-white/6 hover:text-white"}`}><Filter className="size-3.5" /></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-40 border border-border bg-bg-panel text-text-dim"><DropdownMenuLabel className="font-mono editor-micro text-text-muted">分组</DropdownMenuLabel><DropdownMenuRadioGroup value={filters.groupKind} onValueChange={(groupKind) => setFilters((current) => ({ ...current, groupKind: groupKind as ShotSearchFilters["groupKind"] }))}>{groupKindFilters.map((filter) => <DropdownMenuRadioItem key={filter.id} value={filter.id} className="h-7 editor-body">{filter.label}</DropdownMenuRadioItem>)}</DropdownMenuRadioGroup><DropdownMenuSeparator className="my-1 h-px bg-border" /><DropdownMenuLabel className="font-mono editor-micro text-text-muted">状态</DropdownMenuLabel><DropdownMenuRadioGroup value={filters.status} onValueChange={(status) => setFilters((current) => ({ ...current, status: status as ShotSearchFilters["status"] }))}>{statusFilters.map((filter) => <DropdownMenuRadioItem key={filter.id} value={filter.id} className="h-7 editor-body">{filter.label}</DropdownMenuRadioItem>)}</DropdownMenuRadioGroup>{isFiltering && <><DropdownMenuSeparator className="my-1 h-px bg-border" /><Button type="button" variant="ghost" size="xs" onClick={clearFilters} className="h-7 w-full justify-start px-1.5 editor-body font-normal text-text-muted hover:text-white">清除筛选</Button></>}</DropdownMenuContent></DropdownMenu></div></div>
      <div className="relative mt-2"><Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-text-muted" /><Input value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} placeholder="镜号、批注或分析" aria-label="检索分镜" className="h-7 border-border bg-bg-input py-1 pl-7 pr-6 editor-body text-white placeholder:text-text-muted" />{filters.query && <Button type="button" variant="ghost" size="icon-xs" aria-label="清除检索" onClick={() => setFilters((current) => ({ ...current, query: "" }))} className="absolute right-0.5 top-0.5 text-text-muted hover:text-white"><X /></Button>}</div>
      <Button type="button" variant="outline" size="sm" onClick={onSplitAtPlayhead} disabled={Boolean(manualSplitDisabledReason)} title={manualSplitDisabledReason ?? "在播放头位置分割当前分镜"} className="mt-2 h-7 w-full gap-1 border-border-mid px-2 editor-body text-text-dim hover:border-accent hover:bg-accent/10 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"><Scissors className="size-3.5" />在此处分割</Button>
      <p className={`mt-1 px-0.5 editor-micro ${manualSplitDisabledReason ? "text-text-muted" : "text-emerald-400"}`}>{manualSplitDisabledReason ?? "播放头位于当前分镜内，可分割"}</p>
    </div>
    <div className="flex-1 overflow-y-auto">
      {shots.map((shot, index) => {
        const group = groupByShotId.get(shot.id);
        const isCollapsed = group ? collapsedGroupIds.includes(group.id) : false;
        const isGroupStart = groupByFirstShotId.has(shot.id);
        const isMatched = matchingShotIds.has(shot.id);
        const isActive = activeShotIndex === index;
        const isSelected = selectedShotIds.includes(shot.id);
        const completion = completionByShotId[shot.id] ?? { filled: 0, total: 0, missingRequired: 0 };
        const isComplete = completion.missingRequired === 0;
        const groupHasMatch = group?.shotIds.some((shotId) => matchingShotIds.has(shotId)) ?? false;
        if (!isMatched) return null;
        return <div key={shot.id}>
          {isGroupStart && group && groupHasMatch && <div className="group flex items-center gap-0.5 border-b border-accent/15 bg-accent/6 px-1.5 py-1.5"><Button type="button" variant="ghost" size="icon-xs" aria-label={isCollapsed ? "展开分组" : "折叠分组"} onClick={() => onToggleGroup(group.id)} className="text-accent hover:bg-accent/10">{isCollapsed ? <ChevronRight /> : <ChevronDown />}</Button><Button type="button" variant="ghost" size="sm" onClick={() => onSelectGroup(group.id, index)} className="h-6 min-w-0 flex-1 justify-start truncate px-0 editor-body text-accent hover:bg-transparent">{group.title}</Button><Button type="button" variant="ghost" size="icon-xs" aria-label="播放整个分组" onClick={() => onPlayGroup(group.id)} className="text-accent hover:bg-accent/10"><Play /></Button><Button type="button" variant="ghost" size="icon-xs" aria-label="删除分组" onClick={() => onDeleteGroup(group.id)} className="text-text-muted hover:bg-red-500/10 hover:text-red-400"><Trash2 /></Button></div>}
          {(!isCollapsed || isFiltering) && <div ref={(element) => { if (element) shotRowRefs.current.set(shot.id, element); else shotRowRefs.current.delete(shot.id); }} className={`group flex items-center border-b border-border/50 px-2 py-2 transition-colors ${isActive ? "border-l-2 border-l-accent bg-accent/15" : "hover:bg-white/4"}`}>
            {isSelectingShots && <input type="checkbox" checked={isSelected} onChange={(event) => onSelectionChange(shot.id, event.target.checked)} aria-label={`选择分镜 ${index + 1}`} className="editor-checkbox mr-1.5" />}
            <Button type="button" variant="ghost" size="sm" onClick={() => onLocateShot(index)} className="h-8 flex-1 justify-start gap-1.5 px-0 text-left hover:bg-transparent"><span className={`size-1.5 shrink-0 rounded-full ${isComplete ? "bg-emerald-400" : "bg-amber-400"}`} /><span className={`font-mono editor-body ${isActive ? "text-accent" : "text-text-muted"}`}>#{String(index + 1).padStart(2, "0")}</span><span className="editor-micro text-text-muted">{completion.filled}/{completion.total}</span></Button>
            <Button type="button" variant="ghost" size="icon-xs" aria-label="播放此分镜" onClick={() => onPlayShot(index)} className={`text-text-muted hover:bg-accent/10 hover:text-accent ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}><Play /></Button><Button type="button" variant="ghost" size="icon-xs" aria-label="删除此分镜" onClick={() => onDeleteShot(index)} className={`text-text-muted hover:bg-red-500/10 hover:text-red-400 ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}><Trash2 /></Button>
          </div>}
        </div>;
      })}{isFiltering && !matchingShotIds.size && <p className="px-3 py-6 text-center editor-meta text-text-muted">没有匹配的分镜</p>}
    </div>
  </aside>;
}
