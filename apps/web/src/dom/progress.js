export function createProgressOverlay({
  getAutoDetecting = () => false,
  getPaused = () => false,
  setPaused = () => {},
  getAbortState = () => null,
  requestStop = () => {},
  getActiveDetector = () => null,
  formatTime = value => String(value),
  windowTarget = globalThis,
  documentTarget = globalThis.document
} = {}) {
  const showProgress = (total, title = '正在生成截图', options = {}) => {
    const overlay = documentTarget?.getElementById('progressOverlay');
    if (!overlay) return;
    const blocking = false;
    const indeterminate = options.indeterminate === undefined ? total <= 0 : !!options.indeterminate;
    overlay.classList.add('show');
    overlay.classList.toggle('is-blocking', blocking);
    const titleElement = documentTarget?.getElementById('progressTitle');
    if (titleElement) titleElement.textContent = title;
    const note = documentTarget?.getElementById('progressNote');
    if (note) note.hidden = !(options.autoShot || getAutoDetecting());
    const desc = documentTarget?.getElementById('progressDesc');
    if (desc) desc.textContent = options.message || (total > 0 ? `0 / ${total}` : '准备中…');
    const progressBar = overlay.querySelector('.progress-bar');
    if (progressBar) progressBar.classList.toggle('is-indeterminate', indeterminate);
    const bar = overlay.querySelector('.progress-bar-inner');
    if (bar) bar.style.width = '0%';
    const pauseButton = documentTarget?.getElementById('progressPauseBtn');
    if (pauseButton) pauseButton.textContent = '暂停';
    if (pauseButton) pauseButton.disabled = false;
    if (pauseButton) pauseButton.hidden = options.allowPause === false;
    const stopButton = documentTarget?.getElementById('progressStopBtn');
    if (stopButton) stopButton.textContent = options.stopLabel || '停止';
    setPaused(false);
    const abortState = getAbortState();
    if (abortState) abortState.stop = false;
    const inferredStatus = options.status
      || (String(title).includes('妫€娴') ? 'autoShot' : String(title).includes('鎴浘') ? 'screenshotBatch' : 'saving');
    windowTarget.dispatchEvent?.(new CustomEvent('app:status', {
      detail: { status: inferredStatus, region: options.region || (inferredStatus === 'saving' ? 'video' : 'shots') }
    }));
  };

  const updateProgressMessage = message => {
    const desc = documentTarget?.getElementById('progressDesc');
    if (desc) desc.textContent = message;
  };

  const updateDetectionProgress = (current, total) => {
    const desc = documentTarget?.getElementById('progressDesc');
    if (desc) desc.textContent = `检测中 ${formatTime(current)} / ${formatTime(total)}`;
    const bar = documentTarget?.querySelector('#progressOverlay .progress-bar-inner');
    if (bar) bar.style.width = (total > 0 ? Math.round(current * 100 / total) : 0) + '%';
  };

  const updateProgress = (current, total) => {
    const desc = documentTarget?.getElementById('progressDesc');
    if (desc) desc.textContent = `${current} / ${total}`;
    const bar = documentTarget?.querySelector('#progressOverlay .progress-bar-inner');
    if (bar) bar.style.width = (total ? Math.round(current * 100 / total) : 0) + '%';
  };

  const hideProgress = () => {
    const overlay = documentTarget?.getElementById('progressOverlay');
    if (!overlay) return;
    overlay.classList.remove('show', 'is-blocking');
    const note = documentTarget?.getElementById('progressNote');
    if (note) note.hidden = true;
    const progressBar = overlay.querySelector('.progress-bar');
    if (progressBar) progressBar.classList.remove('is-indeterminate');
    const pauseButton = documentTarget?.getElementById('progressPauseBtn');
    if (pauseButton) pauseButton.hidden = false;
    const stopButton = documentTarget?.getElementById('progressStopBtn');
    if (stopButton) stopButton.textContent = '停止';
  };

  const pauseButton = documentTarget?.getElementById('progressPauseBtn');
  if (pauseButton) {
    pauseButton.addEventListener('click', () => {
      const paused = !getPaused();
      setPaused(paused);
      pauseButton.textContent = paused ? '继续' : '暂停';
    });
  }

  const stopButton = documentTarget?.getElementById('progressStopBtn');
  if (stopButton) {
    stopButton.addEventListener('click', () => {
      requestStop();
      const detector = getActiveDetector();
      if (detector && detector.abort) detector.abort.stop = true;
    });
  }

  return { showProgress, updateProgressMessage, updateDetectionProgress, updateProgress, hideProgress };
}
