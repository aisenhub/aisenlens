import type { ContentOverlayViewModel } from "../services/contentOverlayResolver";
import type { ContentOverlayLayout } from "../types";

interface ContentOverlayProps {
  layout: ContentOverlayLayout;
  model: ContentOverlayViewModel;
  showBackground: boolean;
  backgroundOpacity: number;
}

export default function ContentOverlay({ layout, model, showBackground, backgroundOpacity }: ContentOverlayProps) {
  const hasContent = model.shotNumber || model.timecode || model.duration || model.description || model.analysis || model.items.length;
  if (!hasContent) return null;

  const isCompact = layout === "compact";
  const isLowerThird = layout === "lower-third";
  const position = isCompact ? "left-3 top-3 max-w-[min(75%,19rem)]" : isLowerThird ? "bottom-3 left-3 max-w-[min(82%,24rem)]" : "left-3 top-3 bottom-3 w-[min(42%,15rem)]";
  return <section aria-label="当前分镜分析信息" className={`pointer-events-none absolute z-[2] ${position} rounded-lg px-2.5 py-2 text-white ${showBackground ? "border border-white/15 shadow-lg backdrop-blur-sm" : ""}`} style={showBackground ? { backgroundColor: `rgba(0, 0, 0, ${backgroundOpacity})` } : undefined}>
    <div className={`flex gap-x-2 gap-y-1 ${isCompact ? "flex-wrap items-baseline" : "flex-col"}`}>
      {model.shotNumber && <span className="font-mono editor-heading tracking-wide text-accent">{model.shotNumber}</span>}
      {model.timecode && <span className="font-mono editor-meta text-white/80">{model.timecode}</span>}
      {model.duration && <span className="font-mono editor-meta text-white/65">{model.duration}</span>}
    </div>
    {model.items.length > 0 && <div className={`mt-1.5 ${isCompact ? "flex flex-wrap gap-1" : "flex flex-col gap-1"}`}>
      {model.items.map((item) => <div key={item.id} className={isCompact ? "rounded bg-white/8 px-1.5 py-0.5" : "flex gap-2 border-t border-white/10 pt-1"}>
        <span className="editor-micro text-white/52">{item.label}</span>
        <span className="ml-1 editor-body text-white/92">{item.value}</span>
      </div>)}
    </div>}
    {model.description && <p className="mt-1.5 line-clamp-2 editor-body leading-relaxed text-white/82">{model.description}</p>}
    {model.analysis && <p className="mt-1.5 line-clamp-2 border-t border-white/10 pt-1.5 editor-body leading-relaxed text-white/72">{model.analysis}</p>}
  </section>;
}
