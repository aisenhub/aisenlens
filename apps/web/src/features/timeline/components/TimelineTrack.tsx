import type { CSSProperties, MouseEvent, ReactNode } from "react";

interface TimelineTrackProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onSeek?: (event: MouseEvent<HTMLDivElement>) => void;
  playheadLeft?: number;
  playheadClassName?: string;
}

export default function TimelineTrack({ children, className = "", style, onSeek, playheadLeft, playheadClassName = "bg-accent/70" }: TimelineTrackProps) {
  return <div className={`relative overflow-hidden ${className}`} style={style} onClick={onSeek}>{children}{playheadLeft !== undefined && <div className={`pointer-events-none absolute bottom-0 top-0 z-20 w-px ${playheadClassName}`} style={{ left: playheadLeft }} />}</div>;
}
