export function createPlaybackRateController({
  select,
  video,
  state,
  normalizeRate,
  setRate,
  savedRate,
  storage = null,
  storageKey = 'playbackRate'
} = {}) {
  const bind = () => {
    const playbackRate = normalizeRate(savedRate);
    if (video) video.playbackRate = playbackRate;
    if (select) {
      select.value = String(playbackRate);
      select.addEventListener('change', () => {
        const nextRate = Number(select.value);
        if (!Number.isFinite(nextRate)) return;
        const normalizedRate = setRate(state, nextRate);
        if (video) video.playbackRate = normalizedRate;
        try { storage?.setItem(storageKey, String(normalizedRate)); } catch (_) {}
      });
    }
  };

  return { bind };
}
