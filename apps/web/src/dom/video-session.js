import { pickVideoFile as selectVideoFile } from '../platform/filesystem.js';

export function createVideoSessionController({
  video,
  emptyElement,
  fileInput,
  loadButton = null,
  getProjectContext,
  setProjectVideoName,
  setCurrentVideoFile,
  getCurrentVideoFile,
  getSaveDirectory,
  setSaveDirectory,
  stopRecording,
  clearAutoShotCache,
  resetAutoShot,
  resetWaveform,
  prepareWaveform,
  updateVideoInfo,
  disableVideoButtons,
  enableVideoButtons,
  setDecodeFailed,
  updateProjectRecord,
  restoreProjectVideoFile,
  copyVideoToProjectFolder,
  saveProjectDirectoryHandle,
  showToast,
  pickVideoFile = null,
  documentTarget = document,
  windowTarget = window
} = {}) {
  let currentVideoFile = getCurrentVideoFile?.() || null;
  let currentObjectUrl = '';
  let decodeFailed = false;

  const getCurrentVideoFileName = () => {
    const file = currentVideoFile || getCurrentVideoFile?.();
    if (file?.name) return file.name;
    return getProjectContext?.().videoFileName || '';
  };

  const revokeCurrentVideoUrl = () => {
    if (!currentObjectUrl) return;
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = '';
  };

  const renderEmptyState = (message, actionLabel = '') => {
    if (!emptyElement) return;
    emptyElement.replaceChildren();
    const text = documentTarget?.createElement?.('span');
    if (text) {
      text.textContent = message;
      emptyElement.appendChild(text);
    } else emptyElement.textContent = message;
    if (actionLabel) {
      const button = documentTarget?.createElement?.('button');
      if (button) {
        button.type = 'button';
        button.className = 'video-empty-action';
        button.textContent = actionLabel;
        button.addEventListener('click', () => {
          if (loadButton?.click) loadButton.click();
          else fileInput?.click?.();
        });
        emptyElement.appendChild(button);
      }
    }
  };

  const showDefaultVideoEmptyState = () => {
    if (!emptyElement) return;
    renderEmptyState('暂无视频，选择本地文件开始', '加载视频');
    emptyElement.classList.remove('video-error');
    emptyElement.style.display = 'flex';
    emptyElement.style.alignItems = 'center';
    emptyElement.style.justifyContent = 'center';
    emptyElement.style.pointerEvents = 'auto';
  };

  const showVideoDecodeError = () => {
    if (!video?.src || !currentVideoFile) return;
    decodeFailed = true;
    setDecodeFailed?.(true);
    if (emptyElement) {
      renderEmptyState('视频解码失败，当前浏览器可能不支持此编码。请转换为 MP4（H.264/AAC）后重新导入。', '重新选择视频');
      emptyElement.classList.add('video-error');
      emptyElement.style.display = 'flex';
      emptyElement.style.alignItems = 'center';
      emptyElement.style.justifyContent = 'center';
    }
    disableVideoButtons?.();
    updateVideoInfo?.();
  };

  const clearCurrentVideo = () => {
    stopRecording?.();
    clearAutoShotCache?.();
    resetAutoShot?.();
    if (video) {
      try { video.pause(); } catch (_) {}
      video.removeAttribute('src');
      video.load();
    }
    revokeCurrentVideoUrl();
    currentVideoFile = null;
    setCurrentVideoFile?.(null);
    decodeFailed = false;
    setDecodeFailed?.(false);
    resetWaveform?.();
    showDefaultVideoEmptyState();
    disableVideoButtons?.();
    updateVideoInfo?.();
  };

  const loadVideoFile = file => {
    if (!file) {
      clearCurrentVideo();
      return;
    }
    clearAutoShotCache?.();
    resetAutoShot?.();
    stopRecording?.();
    if (video) {
      try { video.pause(); } catch (_) {}
      video.removeAttribute('src');
      video.load();
    }
    revokeCurrentVideoUrl();
    currentVideoFile = file;
    setCurrentVideoFile?.(file);
    resetWaveform?.();
    prepareWaveform?.(file);
    decodeFailed = false;
    setDecodeFailed?.(false);
    currentObjectUrl = URL.createObjectURL(file);
    if (video) {
      video.src = currentObjectUrl;
      video.load();
    }
    const project = getProjectContext?.() || {};
    if (project.id) setProjectVideoName?.(file.name);
    else setProjectVideoName?.(file.name);
    if (emptyElement) {
      emptyElement.replaceChildren();
      emptyElement.classList.remove('video-error');
      emptyElement.style.display = 'none';
    }
    enableVideoButtons?.();
    updateVideoInfo?.();
  };

  const pickVideo = pickVideoFile || (async input => {
    if (windowTarget.showOpenFilePicker) return selectVideoFile({ windowTarget, documentTarget });
    if (!input) return null;
    input.value = '';
    return new Promise(resolve => {
      input.addEventListener('change', () => resolve(input.files?.[0] || null), { once: true });
      input.click();
    });
  });

  const chooseVideoForPlayer = async () => {
    try {
      const selectedFile = await pickVideo(fileInput);
      if (!selectedFile) return;
      loadVideoFile(selectedFile);
      const directory = getSaveDirectory?.();
      if (directory) {
        const copied = await copyVideoToProjectFolder?.(selectedFile, directory);
        if (!copied) showToast?.('视频已加载，但复制到项目文件夹失败', 'warning');
      }
      showToast?.(`已加载视频：${selectedFile.name}`, 'success');
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error(error);
        showToast?.('加载视频失败', 'error');
      }
    }
  };

  const restoreVideoFromProjectFolder = async project => {
    if (!project?.id) return false;
    try {
      const restored = await restoreProjectVideoFile?.(project);
      if (!restored) return false;
      const { dirHandle, file, fileName } = restored;
      setSaveDirectory?.(dirHandle);
      loadVideoFile(file);
      if (fileName && fileName !== project.videoFileName) {
        setProjectVideoName?.(fileName, project);
        updateProjectRecord?.(project.id, { videoFileName: fileName }).catch(() => {});
      }
      return true;
    } catch (error) {
      console.warn('自动恢复视频失败:', error);
      return false;
    }
  };

  if (video) video.addEventListener('error', showVideoDecodeError);

  const bind = () => {
    loadButton?.addEventListener('click', chooseVideoForPlayer);
    showDefaultVideoEmptyState();
  };

  return {
    bind,
    getCurrentVideoFileName,
    getCurrentVideoFile: () => currentVideoFile,
    isDecodeFailed: () => decodeFailed,
    revokeCurrentVideoUrl,
    showDefaultVideoEmptyState,
    showVideoDecodeError,
    clearCurrentVideo,
    loadVideoFile,
    chooseVideoForPlayer,
    restoreVideoFromProjectFolder
  };
}
