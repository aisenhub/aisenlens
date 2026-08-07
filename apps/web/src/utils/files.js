export function sanitizeFolderName(name) {
  return String(name || '').replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, ' ').trim() || '未命名项目';
}
