export function createShotAutoCorrectController({
  video = null,
  waitForVideoSeek = async () => true,
  scheduleRowSync = () => {},
  formatTime = value => Number(value).toFixed(2),
  showToast = () => {},
  windowTarget = window,
  documentTarget = document
} = {}) {
  let debounceTimer = null;
  let pendingButton = null;
  let task = null;
  let requestId = 0;

  const resetButton = button => {
    if (!button) return;
    button.disabled = false;
    button.textContent = button.dataset.extended === 'true' ? '⚡+' : '⚡';
  };

  const cancel = () => {
    requestId += 1;
    if (debounceTimer) {
      windowTarget.clearTimeout(debounceTimer);
      debounceTimer = null;
      resetButton(pendingButton);
      pendingButton = null;
    }
    if (task) {
      task.controller.abort();
      resetButton(task.button);
      task = null;
    }
  };

  const correct = async (entry, searchRange, signal) => {
    if (!video || !video.duration) return null;
    if (signal?.aborted) return null;
    const centerTime = entry.time;
    const start = centerTime;
    const end = Math.min(video.duration, centerTime + searchRange);
    const canvas = documentTarget.createElement('canvas');
    canvas.width = 320;
    canvas.height = 180;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const frameCache = new Map();
    const getFrameData = async time => {
      const key = time.toFixed(2);
      if (frameCache.has(key)) return frameCache.get(key);
      if (!await waitForVideoSeek(video, time, signal)) return null;
      if (signal?.aborted) return null;
      try {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
        frameCache.set(key, data);
        return data;
      } catch (_) {
        return null;
      }
    };
    const diff = (first, second) => {
      if (!first || !second) return 0;
      let total = 0;
      for (let index = 0; index < first.length; index += 16) total += Math.abs(first[index] - second[index]) + Math.abs(first[index + 1] - second[index + 1]) + Math.abs(first[index + 2] - second[index + 2]);
      return total / (first.length / 16 * 3);
    };
    const wasPaused = video.paused;
    if (!wasPaused) video.pause();
    try {
      const candidates = [];
      for (let time = start; time < end; time += 0.5) {
        if (signal?.aborted) return null;
        const endTime = Math.min(time + 0.5, end);
        if (endTime <= time + 0.05) break;
        const firstFrame = await getFrameData(time);
        const secondFrame = await getFrameData(endTime);
        if (diff(firstFrame, secondFrame) <= 25) continue;
        let previousFrame = firstFrame;
        for (let fineTime = time + 0.05; fineTime <= endTime; fineTime += 0.05) {
          if (signal?.aborted) return null;
          const currentFrame = await getFrameData(fineTime);
          if (diff(previousFrame, currentFrame) > 25) candidates.push(fineTime);
          previousFrame = currentFrame;
        }
      }
      if (!candidates.length) return null;
      const bestTime = Number(candidates.sort((first, second) => first - second)[0].toFixed(2));
      video.currentTime = bestTime;
      return bestTime;
    } finally {
      frameCache.clear();
    }
  };

  const schedule = (entry, item, timeInput, button) => {
    const searchRange = button.dataset.extended === 'true' ? 5 : 1.5;
    cancel();
    const currentRequestId = ++requestId;
    button.disabled = true;
    button.textContent = '...';
    pendingButton = button;
    debounceTimer = windowTarget.setTimeout(async () => {
      debounceTimer = null;
      pendingButton = null;
      const controller = new AbortController();
      task = { controller, button };
      try {
        const newTime = await correct(entry, searchRange, controller.signal);
        if (currentRequestId !== requestId) return;
        if (newTime !== null) {
          entry.time = newTime;
          entry.timecode = formatTime(newTime);
          timeInput.value = entry.timecode;
          scheduleRowSync(entry);
          showToast(`已优化切点: ${entry.timecode}`, 'success');
        } else if (searchRange < 5) {
          button.dataset.extended = 'true';
          showToast('未找到更优切点，再次点击将扩大搜索范围', 'info');
        } else {
          button.dataset.extended = 'false';
          showToast('扩大范围后仍未找到更优切点', 'info');
        }
      } catch (error) {
        if (error?.name !== 'AbortError') console.error('自动校正失败:', error);
      } finally {
        if (currentRequestId === requestId) {
          task = null;
          resetButton(button);
        }
      }
    }, 180);
  };

  return { correct, schedule, cancel };
}
