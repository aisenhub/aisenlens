export const APP_STATUS_DEFINITIONS = Object.freeze({
  empty: { title: '暂无内容', message: '选择视频或打开项目开始', live: true, blocking: false },
  noProject: { title: '暂无项目', message: '新建项目或打开已有项目开始', live: true, blocking: false },
  noVideo: { title: '暂无视频', message: '选择本地视频后开始拉片', live: true, blocking: false },
  noShots: { title: '暂无分镜', message: '播放视频并按 Enter 添加分镜', live: true, blocking: false },
  noSelection: { title: '未选择分镜', message: '选择一个分镜后可编辑属性', live: true, blocking: false },
  videoLoading: { title: '正在加载视频', message: '请稍候，视频加载完成后即可操作', live: true, blocking: false },
  waveformLoading: { title: '正在生成波形', message: '可以继续浏览分镜，波形完成后会自动显示', live: true, blocking: false },
  noAudio: { title: '无音频轨道', message: '仍可使用刻度、播放头和定位功能', live: true, blocking: false },
  autoShot: { title: '正在自动分镜', message: '可以查看阶段性结果，也可以停止当前任务', live: true, blocking: true },
  screenshotBatch: { title: '正在生成截图', message: '截图任务完成后会自动恢复播放器状态', live: true, blocking: true },
  saving: { title: '正在保存', message: '正在保存当前项目修改', live: true, blocking: false },
  savingPaused: { title: '保存已暂停', message: '当前操作完成后将继续保存修改', live: true, blocking: false },
  saveFailed: { title: '保存失败', message: '修改仍保留在当前页面，请重试保存', live: true, blocking: false },
  unsupported: { title: '浏览器能力不足', message: '当前功能将使用兼容模式运行', live: true, blocking: false },
  error: { title: '操作失败', message: '请重试当前操作或检查浏览器权限', live: true, blocking: false }
});

export function getAppStatusDefinition(status) {
  return APP_STATUS_DEFINITIONS[status] || APP_STATUS_DEFINITIONS.empty;
}

export function createStatusController({ target = null, regionTargets = {}, windowTarget = globalThis, onChange = () => {} } = {}) {
  let current = 'empty';
  const set = input => {
    const status = typeof input === 'object' ? input?.status : input;
    const region = typeof input === 'object' ? input?.region : '';
    current = APP_STATUS_DEFINITIONS[status] ? status : 'empty';
    const definition = getAppStatusDefinition(current);
    if (target) {
      target.dataset.status = current;
      target.textContent = definition.message;
      if (definition.live) target.setAttribute('aria-live', 'polite');
    }
    const regionTarget = regionTargets[region];
    if (regionTarget && regionTarget !== target) {
      regionTarget.dataset.status = current;
      regionTarget.textContent = definition.message;
      if (definition.live) regionTarget.setAttribute('aria-live', 'polite');
    }
    onChange(current, definition);
    return definition;
  };
  const bind = () => {
    windowTarget.addEventListener?.('app:status', event => set(event.detail));
  };
  return { set, get: () => current, bind };
}
