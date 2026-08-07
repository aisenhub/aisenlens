export function formatTime(t) {
  if (!Number.isFinite(t)) return '00:00:00.000';
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  const ms = Math.floor((t % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

export function formatShortTime(sec) {
  const value = Math.max(0, sec || 0);
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
}

export function parseTimecode(timecode) {
  if (!timecode) return 0;
  const [main, msPart] = String(timecode).split('.');
  const ms = msPart ? parseInt(msPart.padEnd(3, '0').slice(0, 3)) : 0;
  const parts = main.split(':');
  if (parts.length === 3) {
    return (parseInt(parts[0]) || 0) * 3600 + (parseInt(parts[1]) || 0) * 60 + (parseInt(parts[2]) || 0) + ms / 1000;
  }
  if (parts.length === 4) {
    return (parseInt(parts[0]) || 0) * 3600 + (parseInt(parts[1]) || 0) * 60 + (parseInt(parts[2]) || 0) + (parseInt(parts[3]) || 0) / 25;
  }
  return 0;
}
