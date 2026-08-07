export function createShotModalController({
  elements = {},
  video = null,
  getSettings = () => ({}),
  saveSettings = () => {},
  formatTime = value => String(value),
  parseTimecode = value => Number(value),
  onStartAutoShot = () => {},
  showToast = () => {},
  documentTarget = document
} = {}) {
  const {
    imageModal,
    modalImage,
    infoTime,
    infoShot,
    imageModalClose,
    rangeModal,
    rangeAutoShotDiff,
    rangeAutoShotDiffValue,
    rangeAutoShotMinGap,
    rangeClose
  } = elements;

  const closeImage = () => {
    modalImage?.removeAttribute('src');
    imageModal?.classList.remove('show');
    documentTarget.body.style.overflow = '';
  };

  const openImage = (imageSrc, timecode, shotNumber) => {
    if (modalImage) modalImage.src = imageSrc;
    if (infoTime) infoTime.textContent = `时间: ${timecode}`;
    if (infoShot) infoShot.textContent = `镜号: ${shotNumber}`;
    imageModal?.classList.add('show');
    documentTarget.body.style.overflow = 'hidden';
  };

  const closeRange = () => {
    rangeModal?.classList.remove('show');
    documentTarget.body.style.overflow = '';
  };

  const openRange = () => {
    if (!rangeModal) return;
    const duration = video?.duration || 0;
    const startInput = rangeModal.querySelector('.range-start');
    const endInput = rangeModal.querySelector('.range-end');
    if (startInput) startInput.value = formatTime(0);
    if (endInput) endInput.value = formatTime(duration);
    rangeModal.querySelectorAll('input[name="rangeMode"]').forEach(input => {
      input.checked = input.value === 'full';
      if (input.value === 'full') input.dispatchEvent(new Event('change'));
    });
    if (startInput) startInput.disabled = true;
    if (endInput) endInput.disabled = true;
    const settings = getSettings();
    if (rangeAutoShotDiff) rangeAutoShotDiff.value = settings.autoShotDiff;
    if (rangeAutoShotDiffValue) rangeAutoShotDiffValue.textContent = settings.autoShotDiff;
    if (rangeAutoShotMinGap) rangeAutoShotMinGap.value = settings.autoShotMinGap;
    rangeModal.classList.add('show');
    documentTarget.body.style.overflow = 'hidden';
  };

  const bind = () => {
    imageModalClose?.addEventListener('click', closeImage);
    imageModal?.addEventListener('click', event => { if (event.target === imageModal) closeImage(); });
    rangeClose?.addEventListener('click', closeRange);
    const cancelButton = rangeModal?.querySelector('.btn-cancel');
    const confirmButton = rangeModal?.querySelector('.btn-confirm');
    const radios = [...(rangeModal?.querySelectorAll('input[name="rangeMode"]') || [])];
    const startInput = rangeModal?.querySelector('.range-start');
    const endInput = rangeModal?.querySelector('.range-end');
    cancelButton?.addEventListener('click', closeRange);
    rangeAutoShotDiff?.addEventListener('input', () => {
      if (rangeAutoShotDiffValue) rangeAutoShotDiffValue.textContent = rangeAutoShotDiff.value;
      saveSettings({ ...getSettings(), autoShotDiff: rangeAutoShotDiff.value });
    });
    rangeAutoShotMinGap?.addEventListener('input', () => saveSettings({ ...getSettings(), autoShotMinGap: rangeAutoShotMinGap.value }));
    radios.forEach(radio => radio.addEventListener('change', () => {
      const isPart = radios.some(item => item.checked && item.value === 'part');
      if (startInput) startInput.disabled = !isPart;
      if (endInput) endInput.disabled = !isPart;
    }));
    confirmButton?.addEventListener('click', () => {
      const isPart = radios.some(item => item.checked && item.value === 'part');
      if (!isPart) {
        closeRange();
        onStartAutoShot(0, video?.duration || 0, { reset: true });
        return;
      }
      const start = Number(parseTimecode(startInput?.value));
      const end = Number(parseTimecode(endInput?.value));
      const max = video?.duration || 0;
      const safeStart = Math.max(0, Math.min(max, start));
      const safeEnd = Math.max(0, Math.min(max, end));
      if (!(Number.isFinite(safeStart) && Number.isFinite(safeEnd) && safeEnd > safeStart)) {
        showToast('请输入有效的时间段，且结束时间大于开始时间', 'error');
        return;
      }
      closeRange();
      onStartAutoShot(safeStart, safeEnd, { reset: true });
    });
    rangeModal?.addEventListener('click', event => { if (event.target === rangeModal) closeRange(); });
    documentTarget.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (imageModal?.classList.contains('show')) closeImage();
      if (rangeModal?.classList.contains('show')) closeRange();
    });
  };

  return { bind, openImage, closeImage, openRange, closeRange };
}
