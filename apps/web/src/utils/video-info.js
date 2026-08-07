export function formatVideoInfoDuration(seconds) {
  if (!Number.isFinite(Number(seconds)) || Number(seconds) <= 0) return '--';
  const total = Math.round(Number(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours ? `${hours}时${minutes}分${secs}秒` : `${minutes}分${secs}秒`;
}

export function formatVideoInfoFileSize(bytes) {
  if (!Number.isFinite(Number(bytes)) || Number(bytes) <= 0) return '--';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = Number(bytes);
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index++;
  }
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

export function splitVideoInfoFileName(fileName) {
  const value = String(fileName || '');
  const lastDot = value.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === value.length - 1) return { base: value, extension: '' };
  return { base: value.slice(0, lastDot), extension: value.slice(lastDot) };
}

export function formatVideoInfoFileName(fileName) {
  const { base, extension } = splitVideoInfoFileName(fileName);
  const baseCharacters = Array.from(base);
  return {
    base: baseCharacters.length > 8 ? `${baseCharacters.slice(0, 8).join('')}...` : base,
    extension
  };
}
