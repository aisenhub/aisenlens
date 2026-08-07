import { createStateMachine } from '../app/state-machine.js';
import { messages } from '../app/messages.js';
import { formatUserError } from '../app/diagnostics.js';
import { normalizeStorageError } from '../app/storage-diagnostics.js';
import { pickProjectDirectory } from '../platform/filesystem.js';

export function createProjectSaveController({
  saveService,
  elements = {},
  getProjectContext,
  getSaveDirectory,
  setSaveDirectory,
  setCurrentProject,
  updateProjectRecord,
  sanitizeFolderName,
  saveProjectDirectoryHandle,
  hydrateScreenshots,
  releaseScreenshots,
  showProgress,
  updateProgressMessage,
  hideProgress,
  updateCurrentProjectButton,
  updateSaveStatus,
  showToast,
  invokeAction = null,
  windowTarget = globalThis,
  setDirty = () => {},
  flushPendingSaves = async () => {},
  requestAnimationFrameFn = () => new Promise(resolve => requestAnimationFrame(resolve))
} = {}) {
  const saveMachine = createStateMachine({
    initial: 'idle',
    transitions: {
      idle: { start: 'saving' },
      saving: { complete: 'idle', fail: 'failed', cancel: 'cancelled' },
      failed: { reset: 'idle' },
      cancelled: { reset: 'idle' }
    }
  });

  const persistDatabase = async () => saveService.saveToDatabase();

  const saveToFolder = async () => {
    const context = getProjectContext?.() || {};
    if (!context.id) {
      showToast?.('请先创建或打开一个项目', 'error');
      return;
    }
    if (!saveMachine.transition('start')) return;
    let title = context.title || '未命名项目';
    showProgress?.(0, '正在保存到文件夹', { blocking: true, indeterminate: true });
    try {
      await requestAnimationFrameFn();
      await flushPendingSaves();
      await updateProjectRecord?.(context.id, { folderSaveStatus: 'saving' });
      updateProgressMessage?.('正在保存项目数据…');
      await persistDatabase();
      let directory = getSaveDirectory?.();
      if (directory) {
        try { await directory.requestPermission({ mode: 'readwrite' }); }
        catch (_) { directory = null; }
      }
      if (!directory) {
        updateProgressMessage?.('请选择项目文件夹…');
        directory = await pickProjectDirectory({ windowTarget });
        const folderName = sanitizeFolderName(directory.name) || '未命名项目';
        setCurrentProject?.(context.id, folderName);
        updateProjectRecord?.(context.id, { title: folderName }).catch(() => {});
        updateCurrentProjectButton?.();
        title = folderName;
      }
      setSaveDirectory?.(directory);
      updateProgressMessage?.('正在写入项目文件…');
      const hydrated = await hydrateScreenshots?.(context.id);
      try { await saveService.writeToDirectory(directory, title); }
      finally { releaseScreenshots?.(hydrated); }
      await saveProjectDirectoryHandle?.(directory, context.id);
      await updateProjectRecord?.(context.id, { folderSaveStatus: 'completed' });
      saveMachine.transition('complete');
      setDirty(false);
      updateSaveStatus?.();
      showToast?.(`项目已保存到文件夹：${directory.name}`, 'success');
    } catch (error) {
      if (error?.name !== 'AbortError') {
        const diagnostic = normalizeStorageError(error, {
          operation: '项目文件夹保存',
          fallback: {
          code: 'PROJECT_FOLDER_SAVE_FAILED',
          title: messages.projectSaveFailed,
          action: '请确认项目文件夹可写，然后重试保存。'
          }
        });
        console.error('项目文件夹保存失败:', diagnostic);
        showToast?.(formatUserError(diagnostic), 'error');
      }
      saveMachine.transition('fail');
      saveMachine.reset('idle');
      setDirty(true, Date.now());
      try { await updateProjectRecord?.(context.id, { folderSaveStatus: 'failed' }); } catch (_) {}
    } finally {
      hideProgress?.();
    }
  };

  const bind = () => {
    elements.saveButton?.addEventListener('click', () => {
      if (invokeAction) invokeAction('project.save');
      else saveToFolder();
    });
  };

  return { bind, saveToFolder, getState: () => saveMachine.state };
}
