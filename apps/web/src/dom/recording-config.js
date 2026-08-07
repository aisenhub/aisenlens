export function createRecordingConfigController({
  elements = {},
  getSettings = () => ({}),
  getConfig = () => ({}),
  getQualityPreset = () => ({}),
  getVideoBitrate = () => 0,
  getSupportedMimeType = () => '',
  showToast = () => {},
  documentTarget = document
} = {}) {
  const {
    modal,
    closeButton,
    stats,
    warning,
    cancelButton,
    confirmButton
  } = elements;
  let pendingResolve = null;

  const getSelected = (name, fallback) => documentTarget.querySelector(`input[name="${name}"]:checked`)?.value || fallback;
  const getView = () => {
    const settings = getSettings();
    const format = getSelected('recordingFormat', settings.recordingFormat);
    const quality = getSelected('recordingQuality', settings.recordingQuality);
    const frameRate = Number(getSelected('recordingFrameRate', settings.recordingFrameRate));
    const mp4Supported = !!getSupportedMimeType('mp4');
    const config = getConfig({ format, quality, frameRate, mp4Supported });
    return { ...config, format, quality, frameRate, mp4Supported };
  };

  const render = () => {
    const view = getView();
    const preset = getQualityPreset(view.quality);
    const bitrate = getVideoBitrate(preset, view.frameRate);
    if (stats) {
      const rows = [['MP4 原生录制', view.mp4Supported ? '浏览器支持' : '浏览器不支持']];
      stats.innerHTML = rows.filter(([, value]) => String(value).includes('浏览器')).map(([label, value]) => `<div class="recording-config-stat"><span class="recording-config-stat-label">${label}</span><strong class="recording-config-stat-value">${value}</strong></div>`).join('');
    }
    if (warning) {
      warning.classList.toggle('show', view.blocked);
      warning.textContent = view.blocked ? '当前浏览器不支持原生 MP4 录制。请选择 WebM 直接下载，或使用桌面视频转码软件转换为 MP4。' : '';
    }
    if (confirmButton) confirmButton.disabled = !!view.blocked;
    return { ...view, qualityPreset: preset, videoBitsPerSecond: bitrate };
  };

  const syncInputs = () => {
    const settings = getSettings();
    documentTarget.querySelectorAll('input[name="recordingFormat"]').forEach(input => { input.checked = input.value === settings.recordingFormat; });
    documentTarget.querySelectorAll('input[name="recordingQuality"]').forEach(input => { input.checked = input.value === settings.recordingQuality; });
    documentTarget.querySelectorAll('input[name="recordingFrameRate"]').forEach(input => { input.checked = Number(input.value) === settings.recordingFrameRate; });
    render();
  };

  const close = result => {
    modal?.classList.remove('show');
    const resolve = pendingResolve;
    pendingResolve = null;
    resolve?.(result);
  };

  const confirm = () => {
    const view = render();
    if (view.blocked) {
      showToast('当前浏览器不支持所选录制格式', 'warning');
      return;
    }
    close(view);
  };

  const bind = () => {
    documentTarget.querySelectorAll('input[name="recordingFormat"], input[name="recordingQuality"], input[name="recordingFrameRate"]')
      .forEach(input => input.addEventListener('change', render));
    cancelButton?.addEventListener('click', () => close(null));
    closeButton?.addEventListener('click', () => close(null));
    confirmButton?.addEventListener('click', confirm);
    modal?.addEventListener('click', event => {
      if (event.target === modal) close(null);
    });
    documentTarget.addEventListener('keydown', event => {
      if (event.key === 'Escape' && modal?.classList.contains('show')) close(null);
    });
  };

  const openForRecording = () => {
    if (pendingResolve) return Promise.resolve(null);
    syncInputs();
    modal?.classList.add('show');
    return new Promise(resolve => { pendingResolve = resolve; });
  };

  return { bind, render, syncInputs, openForRecording, getView };
}
