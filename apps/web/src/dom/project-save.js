import { createStateMachine } from '../app/state-machine.js';
import { messages } from '../app/messages.js';
import { formatUserError } from '../app/diagnostics.js';
import { normalizeStorageError } from '../app/storage-diagnostics.js';

export function createProjectSaveController({
  saveService,
  elements = {},
  getProjectContext,
  showProgress,
  updateProgressMessage,
  hideProgress,
  updateSaveStatus,
  showToast,
  invokeAction = null,
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

  const saveToBrowser = async () => {
    const context = getProjectContext?.() || {};
    if (!context.id) {
      showToast?.('请先创建或打开一个项目', 'error');
      return;
    }
    if (!saveMachine.transition('start')) return;
    showProgress?.(0, '正在保存到浏览器本地存储', { blocking: true, indeterminate: true });
    try {
      await requestAnimationFrameFn();
      await flushPendingSaves();
      updateProgressMessage?.('正在保存项目数据');
      await saveService.saveToDatabase();
      saveMachine.transition('complete');
      setDirty(false);
      updateSaveStatus?.();
      showToast?.('项目已保存到浏览器本地存储', 'success');
    } catch (error) {
      if (error?.name !== 'AbortError') {
        const diagnostic = normalizeStorageError(error, {
          operation: '项目本地保存',
          fallback: {
            code: 'PROJECT_BROWSER_SAVE_FAILED',
            title: messages.projectSaveFailed,
            action: '请检查浏览器存储权限和可用空间后重试。'
          }
        });
        console.error('项目本地保存失败', diagnostic);
        showToast?.(formatUserError(diagnostic), 'error');
      }
      saveMachine.transition('fail');
      saveMachine.reset('idle');
      setDirty(true, Date.now());
    } finally {
      hideProgress?.();
    }
  };

  const bind = () => {
    elements.saveButton?.addEventListener('click', () => {
      if (invokeAction) invokeAction('project.save');
      else saveToBrowser();
    });
  };

  return { bind, saveToBrowser, getState: () => saveMachine.state };
}
