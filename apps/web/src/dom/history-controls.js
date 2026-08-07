export function createHistoryControls({
  undoButton,
  redoButton,
  history,
  invokeAction,
  windowTarget = globalThis
} = {}) {
  const update = ({ canUndo = history?.canUndo?.(), canRedo = history?.canRedo?.() } = {}) => {
    if (undoButton) {
      undoButton.disabled = !canUndo;
      undoButton.title = canUndo ? '撤销（Ctrl/Cmd + Z）' : '没有可撤销的编辑';
      undoButton.setAttribute('aria-label', undoButton.title);
    }
    if (redoButton) {
      redoButton.disabled = !canRedo;
      redoButton.title = canRedo ? '重做（Ctrl/Cmd + Shift + Z）' : '没有可重做的编辑';
      redoButton.setAttribute('aria-label', redoButton.title);
    }
  };
  const bind = () => {
    undoButton?.addEventListener('click', () => invokeAction?.('history.undo'));
    redoButton?.addEventListener('click', () => invokeAction?.('history.redo'));
    windowTarget.addEventListener?.('app:historychange', event => update(event.detail));
    update();
  };
  return { bind, update };
}
