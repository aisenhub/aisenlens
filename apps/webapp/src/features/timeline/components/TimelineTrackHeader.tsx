import { useEffect, useRef, useState } from "react";

interface TimelineTrackHeaderProps {
  label: string;
  visible: boolean;
  height: number;
  onHeightChange: (height: number) => void;
}

export default function TimelineTrackHeader({ label, visible, height, onHeightChange }: TimelineTrackHeaderProps) {
  const [isResizing, setIsResizing] = useState(false);
  const startRef = useRef<{ clientY: number; height: number } | null>(null);

  useEffect(() => {
    if (!isResizing) return;
    const handleMove = (event: MouseEvent) => {
      const start = startRef.current;
      if (start) onHeightChange(start.height + event.clientY - start.clientY);
    };
    const finish = () => {
      startRef.current = null;
      setIsResizing(false);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", finish);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", finish);
    };
  }, [isResizing, onHeightChange]);

  return <div className="relative flex shrink-0 items-center border-b border-border bg-bg-panel px-1" style={{ height }}>
    <span className={`min-w-0 flex-1 truncate px-1 font-mono editor-micro ${visible ? "text-text-muted" : "text-text-muted/55"}`}>{label}</span>
    <span role="separator" aria-label={`调整${label}轨道高度`} onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); startRef.current = { clientY: event.clientY, height }; setIsResizing(true); }} className="absolute inset-x-0 -bottom-1 z-30 h-2 cursor-row-resize" />
  </div>;
}
