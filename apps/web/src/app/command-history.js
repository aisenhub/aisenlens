function cloneValue(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function createCommandHistory({ limit = 100, onChange = () => {} } = {}) {
  const undoStack = [];
  const redoStack = [];
  let running = false;

  const notify = () => onChange({ canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 });
  const normalize = command => {
    if (!command || typeof command.execute !== 'function' || typeof command.undo !== 'function') {
      throw new TypeError('Command requires execute and undo functions');
    }
    return command;
  };

  const execute = async command => {
    if (running) throw new Error('A command is already running');
    const next = normalize(command);
    running = true;
    try {
      const value = await next.execute();
      undoStack.push(next);
      if (undoStack.length > limit) undoStack.shift();
      redoStack.length = 0;
      notify();
      return value;
    } finally {
      running = false;
    }
  };

  const record = command => {
    const next = normalize(command);
    undoStack.push(next);
    if (undoStack.length > limit) undoStack.shift();
    redoStack.length = 0;
    notify();
    return next;
  };

  const undo = async () => {
    if (running || !undoStack.length) return false;
    const command = undoStack.pop();
    running = true;
    try {
      await command.undo();
      redoStack.push(command);
      notify();
      return true;
    } finally {
      running = false;
    }
  };

  const redo = async () => {
    if (running || !redoStack.length) return false;
    const command = redoStack.pop();
    running = true;
    try {
      await command.execute();
      undoStack.push(command);
      notify();
      return true;
    } finally {
      running = false;
    }
  };

  const clear = () => {
    undoStack.length = 0;
    redoStack.length = 0;
    notify();
  };

  const createSnapshotCommand = ({ before, after, apply, label = '' }) => ({
    label,
    execute: () => apply(cloneValue(after)),
    undo: () => apply(cloneValue(before))
  });

  return {
    execute,
    record,
    undo,
    redo,
    clear,
    createSnapshotCommand,
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
    size: () => ({ undo: undoStack.length, redo: redoStack.length })
  };
}
