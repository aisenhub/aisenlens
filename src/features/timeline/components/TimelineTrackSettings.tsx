import { ChevronDown, ChevronUp, Eye, EyeOff, Layers3, Minus, Plus } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "../../../components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../components/ui/tooltip";
import type { TimelineTrackId } from "../hooks/useTimelineTrackPreferences";

interface TimelineTrackSettingsProps {
  order: TimelineTrackId[];
  labels: Record<TimelineTrackId, string>;
  preferences: Record<TimelineTrackId, { visible: boolean; height: number }>;
  onVisibleChange: (trackId: TimelineTrackId, visible: boolean) => void;
  onHeightChange: (trackId: TimelineTrackId, height: number) => void;
  onMove: (trackId: TimelineTrackId, direction: -1 | 1) => void;
}

export default function TimelineTrackSettings({ order, labels, preferences, onVisibleChange, onHeightChange, onMove }: TimelineTrackSettingsProps) {
  return <DropdownMenu>
    <Tooltip>
      <TooltipTrigger render={<DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-xs" aria-label="轨道设置" className="size-6 text-text-muted hover:text-text-base"><Layers3 /></Button>} />} />
      <TooltipContent>轨道设置</TooltipContent>
    </Tooltip>
    <DropdownMenuContent align="start" side="bottom" className="w-64 rounded-md border border-border bg-bg-panel p-1.5 shadow-xl">
      <div className="px-1.5 py-1 font-mono text-[10px] text-text-muted">轨道设置</div>
      <div className="space-y-1">
        {order.map((trackId, index) => {
          const preference = preferences[trackId];
          return <div key={trackId} className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-1 rounded-sm px-1 py-1 hover:bg-white/5">
            <Button type="button" variant="ghost" size="icon-xs" aria-label={`${preference.visible ? "隐藏" : "显示"}${labels[trackId]}`} onClick={() => onVisibleChange(trackId, !preference.visible)} className="size-6 text-text-muted hover:text-text-base">{preference.visible ? <Eye /> : <EyeOff />}</Button>
            <span className={`truncate font-mono text-[11px] ${preference.visible ? "text-text-dim" : "text-text-muted/60"}`}>{labels[trackId]}</span>
            <div className="flex items-center">
              <Button type="button" variant="ghost" size="icon-xs" aria-label={`减小${labels[trackId]}高度`} onClick={() => onHeightChange(trackId, preference.height - 8)} className="size-6 text-text-muted hover:text-text-base"><Minus /></Button>
              <span className="w-8 text-center font-mono text-[10px] text-text-muted">{preference.height}</span>
              <Button type="button" variant="ghost" size="icon-xs" aria-label={`增大${labels[trackId]}高度`} onClick={() => onHeightChange(trackId, preference.height + 8)} className="size-6 text-text-muted hover:text-text-base"><Plus /></Button>
              <Button type="button" variant="ghost" size="icon-xs" aria-label={`上移${labels[trackId]}`} disabled={index === 0} onClick={() => onMove(trackId, -1)} className="size-6 text-text-muted hover:text-text-base"><ChevronUp /></Button>
              <Button type="button" variant="ghost" size="icon-xs" aria-label={`下移${labels[trackId]}`} disabled={index === order.length - 1} onClick={() => onMove(trackId, 1)} className="size-6 text-text-muted hover:text-text-base"><ChevronDown /></Button>
            </div>
          </div>;
        })}
      </div>
    </DropdownMenuContent>
  </DropdownMenu>;
}
