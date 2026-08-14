interface AudioWaveformProps {
  peaks: number[] | null;
  currentTime: number;
  durationSeconds: number;
  unavailable: boolean;
}

const MAX_RENDERED_BARS = 360;

function createRenderablePeaks(peaks: number[]): number[] {
  const barCount = Math.min(MAX_RENDERED_BARS, peaks.length);
  return Array.from({ length: barCount }, (_, index) => {
    const start = Math.floor((index / barCount) * peaks.length);
    const end = Math.max(start + 1, Math.floor(((index + 1) / barCount) * peaks.length));
    let peak = 0;
    for (let peakIndex = start; peakIndex < end; peakIndex += 1) peak = Math.max(peak, peaks[peakIndex] ?? 0);
    return peak;
  });
}

export default function AudioWaveform({ peaks, currentTime, durationSeconds, unavailable }: AudioWaveformProps) {
  if (!peaks?.length) {
  return <div className="absolute inset-0 flex items-center justify-center font-mono editor-micro text-text-muted">{unavailable ? "该视频没有可用音轨" : "正在分析真实音轨…"}</div>;
  }

  const playhead = Math.max(0, Math.min(1, currentTime / Math.max(durationSeconds, 0.001)));
  const renderablePeaks = createRenderablePeaks(peaks);
  const peakMax = Math.max(...renderablePeaks, 0.001);
  return <div className="absolute inset-0 grid grid-flow-col auto-cols-fr items-end gap-px overflow-hidden px-px pb-1 pt-1">
    {renderablePeaks.map((peak, index) => {
      const normalized = Math.max(0.035, peak / peakMax);
      const played = (index + 1) / renderablePeaks.length <= playhead;
      return <span key={index} className="min-w-0 rounded-t-sm" style={{ height: `${normalized * 92}%`, backgroundColor: played ? "rgba(59,130,246,0.95)" : "rgba(148,163,184,0.68)" }} />;
    })}
  </div>;
}
