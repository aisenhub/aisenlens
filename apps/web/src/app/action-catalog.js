export const ACTION_DEFINITIONS = Object.freeze([
  { id: 'playback.toggle', label: '播放 / 暂停', category: '播放', shortcut: 'Space', description: '切换视频播放状态' },
  { id: 'playback.stepBack', label: '上一帧', category: '播放', shortcut: ',', description: '后退一帧' },
  { id: 'playback.stepForward', label: '下一帧', category: '播放', shortcut: '.', description: '前进一帧' },
  { id: 'playback.jumpBack', label: '后退 1 秒', category: '播放', shortcut: '←', description: '后退一秒' },
  { id: 'playback.jumpForward', label: '前进 1 秒', category: '播放', shortcut: '→', description: '前进一秒' },
  { id: 'shot.capture', label: '分镜截图', category: '分镜', shortcut: 'Enter', description: '在当前时间添加分镜' },
  { id: 'shot.updateScreenshot', label: '更新截图', category: '分镜', shortcut: '', description: '更新当前分镜截图' },
  { id: 'shot.autoDetect', label: '自动分镜', category: '分镜', shortcut: '', description: '打开自动检测镜头切点' },
  { id: 'shot.clearAll', label: '清除分镜', category: '分镜', shortcut: '', description: '清除当前项目的全部分镜' },
  { id: 'shot.delete', label: '删除分镜', category: '分镜', shortcut: 'Delete', description: '删除当前分镜' },
  { id: 'shot.split', label: '拆分分镜', category: '分镜', shortcut: '', description: '在详细编辑器中拆分当前分镜' },
  { id: 'group.create', label: '创建镜头组', category: '分镜', shortcut: '', description: '将连续选中的分镜建立为镜头组' },
  { id: 'group.dissolve', label: '解散镜头组', category: '分镜', shortcut: '', description: '解散当前镜头组并保留分镜' },
  { id: 'group.edit', label: '编辑镜头组', category: '分镜', shortcut: '', description: '编辑当前镜头组名称或概括' },
  { id: 'template.select', label: '切换模板', category: '项目', shortcut: '', description: '切换当前分镜表格模板' },
  { id: 'history.undo', label: '撤销', category: '编辑', shortcut: 'Ctrl/Cmd + Z', description: '撤销上一次编辑' },
  { id: 'history.redo', label: '重做', category: '编辑', shortcut: 'Ctrl/Cmd + Shift + Z', description: '重做已撤销编辑' },
  { id: 'project.save', label: '保存项目', category: '项目', shortcut: 'Ctrl/Cmd + S', description: '保存当前项目' }
]);

export function getActionDefinition(id) {
  return ACTION_DEFINITIONS.find(action => action.id === id) || null;
}

export function getActionDefinitionsByCategory(category) {
  return ACTION_DEFINITIONS.filter(action => action.category === category);
}

export function getPlatformShortcut(shortcut, platform = '') {
  if (!shortcut) return '';
  const isMac = /mac/i.test(platform || (typeof navigator !== 'undefined' ? navigator.platform : ''));
  return isMac
    ? shortcut.replaceAll('Ctrl/Cmd', '⌘').replaceAll('Ctrl', '⌘').replaceAll('Cmd', '⌘')
    : shortcut.replaceAll('Ctrl/Cmd', 'Ctrl').replaceAll('Cmd', 'Ctrl');
}

export function getActionCatalog() {
  return ACTION_DEFINITIONS.map(action => ({ ...action }));
}
