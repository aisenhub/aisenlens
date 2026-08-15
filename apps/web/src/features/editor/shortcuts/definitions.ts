export type EditorShortcutCategory = "播放与定位" | "分镜与标记" | "交互" | "构图蒙版";

export type EditorShortcutAction =
  | "file.save"
  | "playback.toggle"
  | "playback.reverse"
  | "playback.pause"
  | "playback.forward"
  | "playback.stepBack"
  | "playback.stepForward"
  | "playback.jumpBack"
  | "playback.jumpForward"
  | "playback.previousBoundary"
  | "playback.nextBoundary"
  | "playback.goToStart"
  | "playback.goToEnd"
  | "playback.goToInPoint"
  | "playback.goToOutPoint"
  | "shot.trimStartToPlayhead"
  | "shot.trimEndToPlayhead"
  | "shot.splitAtPlayhead"
  | "selection.setInPoint"
  | "selection.setOutPoint"
  | "marker.create"
  | "editing.delete"
  | "history.undo"
  | "history.redo"
  | "preview.toggleFullscreen"
  | "preview.fitCanvas"
  | "timeline.zoomIn"
  | "timeline.zoomOut"
  | "interaction.cancel"
  | "help.show"
  | "composition.undo"
  | "composition.redo"
  | "composition.delete";

export interface EditorShortcutDefinition {
  action: EditorShortcutAction;
  key: string;
  keys?: string[];
  description: string;
  category: EditorShortcutCategory;
}

export const EDITOR_SHORTCUT_DEFINITIONS: readonly EditorShortcutDefinition[] = [
  { action: "file.save", key: "Ctrl/Cmd + S", description: "保存项目", category: "交互" },
  { action: "playback.toggle", key: "Space", description: "播放 / 暂停", category: "播放与定位" },
  { action: "playback.reverse", key: "J", description: "倒放预览", category: "播放与定位" },
  { action: "playback.pause", key: "K", description: "暂停", category: "播放与定位" },
  { action: "playback.forward", key: "L", description: "正放预览", category: "播放与定位" },
  { action: "playback.stepBack", key: "← / ,", keys: ["ArrowLeft", ","], description: "后退一帧", category: "播放与定位" },
  { action: "playback.stepForward", key: "→ / .", keys: ["ArrowRight", "."], description: "前进一帧", category: "播放与定位" },
  { action: "playback.jumpBack", key: "Shift + ←", description: "后退 5 帧", category: "播放与定位" },
  { action: "playback.jumpForward", key: "Shift + →", description: "前进 5 帧", category: "播放与定位" },
  { action: "playback.previousBoundary", key: "↑", description: "上一个分镜边界", category: "播放与定位" },
  { action: "playback.nextBoundary", key: "↓", description: "下一个分镜边界", category: "播放与定位" },
  { action: "playback.goToStart", key: "Home", description: "跳到视频首帧", category: "播放与定位" },
  { action: "playback.goToEnd", key: "End", description: "跳到视频尾帧", category: "播放与定位" },
  { action: "playback.goToInPoint", key: "Shift + I", description: "跳到入点", category: "播放与定位" },
  { action: "playback.goToOutPoint", key: "Shift + O", description: "跳到出点", category: "播放与定位" },
  { action: "shot.trimStartToPlayhead", key: "[", description: "将当前分镜首帧对齐播放头", category: "分镜与标记" },
  { action: "shot.trimEndToPlayhead", key: "]", description: "将当前分镜尾帧对齐播放头", category: "分镜与标记" },
  { action: "shot.splitAtPlayhead", key: "Enter", description: "在播放头处分割当前分镜", category: "分镜与标记" },
  { action: "selection.setInPoint", key: "I", description: "设置观看选区入点", category: "分镜与标记" },
  { action: "selection.setOutPoint", key: "O", description: "设置观看选区出点", category: "分镜与标记" },
  { action: "marker.create", key: "M", description: "添加重要镜头标记", category: "分镜与标记" },
  { action: "preview.toggleFullscreen", key: "F", description: "切换预览全屏", category: "交互" },
  { action: "preview.fitCanvas", key: "0", description: "预览适应画布", category: "交互" },
  { action: "timeline.zoomIn", key: "=", description: "放大时间轴", category: "交互" },
  { action: "timeline.zoomOut", key: "-", description: "缩小时间轴", category: "交互" },
  { action: "interaction.cancel", key: "Esc", description: "取消当前交互", category: "交互" },
  { action: "help.show", key: "?", description: "显示快捷键", category: "交互" },
  { action: "history.undo", key: "Ctrl/Cmd + Z", description: "撤销", category: "交互" },
  { action: "history.redo", key: "Ctrl/Cmd + Shift + Z / Ctrl + Y", description: "重做", category: "交互" },
  { action: "editing.delete", key: "Delete / Backspace", description: "删除选中图形或当前分镜", category: "交互" },
];
