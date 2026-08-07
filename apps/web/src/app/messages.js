export const messages = Object.freeze({
  projectUntitled: '未命名项目',
  projectImportFailed: '项目导入失败',
  projectNotFound: '未找到项目',
  projectLoadFailed: '项目加载失败',
  projectSaveFailed: '项目保存失败',
  exportCancelled: '已取消导出',
  exportFailed: '导出失败',
  recordingFailed: '录制失败',
  recordingCancelled: '录制已取消',
  videoPlaybackFailed: '视频未能正常推进',
  retrySuggestion: '请检查文件权限和视频状态后重试。'
});

export function formatMessage(template, values = {}) {
  return String(template ?? '').replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''));
}
