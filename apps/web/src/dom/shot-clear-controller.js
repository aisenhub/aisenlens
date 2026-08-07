export function createShotClearController({
  button,
  disabledElement = null,
  getEntries = () => [],
  isBusy = () => false,
  confirm = null,
  clear = () => {},
  setDisabled = () => {},
  showToast = () => {},
  invokeAction = null,
  windowTarget = globalThis
} = {}) {
  const handleClear = () => {
    if (!getEntries().length) {
      showToast('当前没有分镜可清除', 'info');
      return;
    }
    if (isBusy()) {
      showToast('当前正在生成分镜，请稍后再清除', 'warning');
      return;
    }
    const confirmAction = confirm || (message => windowTarget.confirm(message));
    if (!confirmAction('确认清除全部分镜吗？此操作会删除当前项目中的所有分镜数据。')) return;
    if (invokeAction) {
      invokeAction('shot.clearAll');
      return;
    }
    executeClear();
  };

  const executeClear = () => {
    if (disabledElement) disabledElement.disabled = true;
    setDisabled(true);
    return clear();
  };

  const bind = () => button?.addEventListener('click', handleClear);
  return { bind, clear: handleClear, executeClear };
}
