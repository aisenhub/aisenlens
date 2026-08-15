interface TimelinePlayheadHandleProps {
  left: number;
  isDragging: boolean;
  onMouseDown: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export default function TimelinePlayheadHandle({ left, isDragging, onMouseDown }: TimelinePlayheadHandleProps) {
  return <button
    type="button"
    aria-label="拖动播放头"
    aria-pressed={isDragging}
    onMouseDown={onMouseDown}
    className={`absolute top-0 z-30 flex h-4 w-[17px] -translate-x-1/2 cursor-col-resize items-start justify-center ${isDragging ? "cursor-grabbing" : "cursor-col-resize"}`}
    style={{ left }}
  >
    <span
      className={`mt-px h-3 w-[15px] ${isDragging ? "bg-accent" : "bg-accent/80"}`}
      style={{ clipPath: "polygon(0 0, 100% 0, 100% 65%, 50% 100%, 0 65%)" }}
    />
  </button>;
}
