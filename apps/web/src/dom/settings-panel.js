function formatCacheSize(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatSavedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '未记录保存时间';
  return date.toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' });
}

function getStorageBytes(keys = null, storage = globalThis.localStorage) {
  const cacheKeys = Array.isArray(keys)
    ? keys
    : Array.from({ length: storage.length }, (_, index) => storage.key(index) || '');
  return cacheKeys.reduce((total, key) => (
    total + key.length * 2 + String(storage.getItem(key) || '').length * 2
  ), 0);
}

export function createSettingsPanelController({
  elements = {},
  settingsKey,
  templateDefinitionsKey,
  fieldPoolKey,
  fieldPoolVersion,
  fieldPoolOrder,
  fixedFields = [],
  getSettings,
  saveSettings,
  getTemplates,
  getFieldPool,
  getFieldReferenceOptions,
  normalizeTemplateFields,
  normalizeFieldPool,
  normalizeReferenceOptions,
  writeStorage,
  removeStorageKeys,
  getProjectStats,
  getRecoverySummary,
  getStoragePersistence = async () => ({ status: 'checking' }),
  getStorageEstimate = async () => null,
  getCurrentProjectId = () => null,
  getCurrentProjectTitle = () => '',
  exportProjectBackup = async () => null,
  closeProjectDropdown = () => {},
  closeTemplateMenu = () => {},
  download,
  showToast,
  onStorageError = () => {},
  onOpenPanel = () => {}
} = {}) {
  const {
    settingsExportFileName,
    settingsExportTitle,
    feedbackEmail,
    copyFeedbackEmailBtn,
    copyFeedbackEmailLabel,
    feedbackXhs,
    copyFeedbackXhsBtn,
    copyFeedbackXhsLabel,
    importUserConfigBtn,
    exportUserConfigBtn,
    importUserConfigInput,
    projectBackupMode,
    exportProjectBackupBtn,
    cacheManagerConfigStatus,
    cacheManagerProjectStatus,
    storagePersistenceStatus,
    recoveryStatus,
    recoveryProjectList,
    clearConfigCacheBtn,
    settingsBtn,
    settingsModal,
    settingsModalClose,
    settingsModalCancelBtn
  } = elements;

  const setPanel = name => {
    if (!settingsModal) return;
    const navItems = settingsModal.querySelectorAll('.settings-nav-item');
    const panels = settingsModal.querySelectorAll('.settings-panel');
    if (!navItems.length || !panels.length) return;
    const target = [...navItems].some(item => item.dataset.settingsPanel === name)
      ? name
      : navItems[0].dataset.settingsPanel;
    navItems.forEach(item => {
      const active = item.dataset.settingsPanel === target;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', String(active));
    });
    panels.forEach(panel => {
      const active = panel.dataset.settingsPanel === target;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
    if (target === 'cache') renderCacheStatus();
    onOpenPanel(target);
  };

  const open = panelName => {
    if (!settingsModal) return;
    closeProjectDropdown();
    closeTemplateMenu();
    settingsModal.classList.add('show');
    settingsBtn?.setAttribute('aria-expanded', 'true');
    setPanel(panelName || 'account');
  };

  const close = () => {
    settingsModal?.classList.remove('show');
    settingsBtn?.setAttribute('aria-expanded', 'false');
  };

  const isOpen = () => !!settingsModal?.classList.contains('show');

  const renderCacheStatus = async () => {
    const configKeys = [settingsKey, templateDefinitionsKey, fieldPoolKey, 'theme', 'playbackRate'];
    const cachedKeys = configKeys.filter(key => localStorage.getItem(key) !== null);
    const configSummary = `${cachedKeys.length}/${configKeys.length} 项 · ${formatCacheSize(getStorageBytes(configKeys))}`;
    const templates = getTemplates?.() || {};
    const fields = getFieldPool?.() || [];
    if (cacheManagerConfigStatus) cacheManagerConfigStatus.textContent = `${configSummary}；${Object.keys(templates).length} 个模板 · ${fields.length} 个字段`;
    try {
      const [stats, estimate, recovery, persistence] = await Promise.all([
        getProjectStats?.(),
        getStorageEstimate?.(),
        getRecoverySummary?.(),
        getStoragePersistence?.()
      ]);
      const quotaText = Number.isFinite(estimate?.available) ? ` · 可用 ${formatCacheSize(estimate.available)}` : '';
      const totalBytes = (Number(stats?.bytes) || 0) + (Number(stats?.resourceBytes) || 0);
      if (cacheManagerProjectStatus) cacheManagerProjectStatus.textContent = `${stats.projects} 个项目 · ${stats.shots} 个分镜 · ${stats.groups} 个镜头组 · 视频和截图 ${stats.mediaAssets || 0}/${stats.screenshotAssets || 0} 个 · 占用 ${formatCacheSize(totalBytes)}${quotaText}`;
      if (recoveryStatus) recoveryStatus.textContent = recovery?.pendingSave
        ? '检测到上次写入中断，已保留最近一次成功保存的项目版本。'
        : '未检测到中断写入，项目数据已保存在浏览器本地。';
      if (storagePersistenceStatus) {
        const messages = {
          protected: '浏览器存储保护已开启。清除站点数据仍会删除项目，请定期导出备份。',
          unprotected: '浏览器未授予存储保护。项目仍可使用，但应定期导出备份。',
          unsupported: '当前浏览器无法报告存储保护状态，建议使用 Chromium 浏览器并定期导出备份。',
          unavailable: '暂时无法读取存储保护状态，项目仍可正常使用。'
        };
        storagePersistenceStatus.textContent = messages[persistence?.status] || '正在检查浏览器存储保护状态。';
      }
      if (recoveryProjectList) {
        const recentProjects = recovery?.projects || [];
        recoveryProjectList.textContent = recentProjects.length
          ? `最近保存：${recentProjects.map(project => `${project.title || '未命名项目'}（${formatSavedAt(project.updatedAt)}）`).join('；')}`
          : '暂未创建项目。';
      }
    } catch (_) {
      if (cacheManagerProjectStatus) cacheManagerProjectStatus.textContent = '暂时无法读取';
      if (storagePersistenceStatus) storagePersistenceStatus.textContent = '暂时无法读取存储保护状态';
      if (recoveryStatus) recoveryStatus.textContent = '暂时无法读取恢复状态';
      if (recoveryProjectList) recoveryProjectList.textContent = '暂时无法读取最近项目';
    }
  };

  const buildUserConfigExport = () => {
    const templates = {};
    Object.entries(getTemplates?.() || {}).forEach(([name, template]) => {
      templates[name] = { fields: normalizeTemplateFields(template.fields), custom: !!template.custom };
    });
    return {
      app: 'AisenLens',
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: getSettings(),
      autoShot: { diff: getSettings().autoShotDiff, minGap: getSettings().autoShotMinGap },
      theme: localStorage.getItem('theme') || 'light',
      playbackRate: Number(localStorage.getItem('playbackRate')) || 1,
      templates,
      fieldPool: [...(getFieldPool?.() || [])],
      fieldProperties: Object.fromEntries((getFieldPool?.() || []).map(field => [field, getFieldReferenceOptions(field)]))
    };
  };

  const exportProject = async () => {
    const projectId = getCurrentProjectId?.();
    if (!projectId) {
      showToast?.('请先打开一个项目，再导出项目备份', 'warning');
      return;
    }
    const mode = projectBackupMode?.value || 'full';
    if (exportProjectBackupBtn) exportProjectBackupBtn.disabled = true;
    try {
      const blob = await exportProjectBackup(projectId, { mode });
      const stamp = new Date().toISOString().replace(/[T:]/g, '-').replace(/\.\d{3}Z$/, '');
      const title = String(getCurrentProjectTitle?.() || 'AisenLens').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'AisenLens';
      download?.(`${title}-${stamp}.aisenlens.zip`, blob);
      showToast?.('项目备份已导出', 'success');
    } catch (error) {
      console.error('项目备份导出失败:', error);
      showToast?.('项目备份导出失败，请稍后重试', 'error');
    } finally {
      if (exportProjectBackupBtn) exportProjectBackupBtn.disabled = false;
    }
  };

  const bindProjectBackup = () => {
    exportProjectBackupBtn?.addEventListener('click', exportProject);
  };

  const exportConfig = () => {
    try {
      const stamp = new Date().toISOString().replace(/[T:]/g, '-').replace(/\.\d{3}Z$/, '');
      download?.(`AisenLens-用户配置-${stamp}.json`, new Blob([JSON.stringify(buildUserConfigExport(), null, 2)], { type: 'application/json;charset=utf-8' }));
      showToast?.('用户配置已导出', 'success');
    } catch (error) {
      console.error(error);
      showToast?.('用户配置导出失败', 'error');
    }
  };

  const importConfig = file => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result || ''));
        if (!payload || typeof payload !== 'object' || !payload.templates || typeof payload.templates !== 'object') throw new Error('invalid config');
        const templates = {};
        Object.entries(payload.templates).forEach(([name, template]) => {
          const cleanName = String(name || '').trim();
          if (cleanName && template && Array.isArray(template.fields)) templates[cleanName] = normalizeTemplateFields(template.fields);
        });
        if (!Object.keys(templates).length) throw new Error('empty templates');
        const importedFields = Array.isArray(payload.fieldPool) ? payload.fieldPool : [];
        const fields = normalizeFieldPool([...importedFields, ...Object.values(templates).flat()]);
        const properties = {};
        fields.forEach(field => {
          const options = normalizeReferenceOptions(payload.fieldProperties?.[field]);
          if (options.length) properties[field] = options;
        });
        const userFields = fields.filter(field => !fieldPoolOrder.includes(field) && !fixedFields.includes(field));
        const settings = { ...(payload.settings && typeof payload.settings === 'object' ? payload.settings : {}) };
        if (payload.autoShot && typeof payload.autoShot === 'object') Object.assign(settings, {
          autoShotDiff: payload.autoShot.diff ?? settings.autoShotDiff,
          autoShotMinGap: payload.autoShot.minGap ?? settings.autoShotMinGap
        });
        saveSettings(settings);
        let storageError = null;
        const templatesSaved = writeStorage(templateDefinitionsKey, templates, error => { storageError = error; });
        const fieldsSaved = writeStorage(fieldPoolKey, { version: fieldPoolVersion, userFields, properties }, error => { storageError = error; });
        if (templatesSaved === false || fieldsSaved === false) {
          onStorageError(storageError || new Error('Browser storage write failed'));
          return;
        }
        if (payload.theme === 'dark' || payload.theme === 'light') localStorage.setItem('theme', payload.theme);
        if ([0.5, 0.75, 1, 1.25, 1.5, 2].includes(Number(payload.playbackRate))) localStorage.setItem('playbackRate', String(payload.playbackRate));
        close();
        showToast?.('用户配置已导入，页面即将刷新', 'success');
        setTimeout(() => window.location.reload(), 350);
      } catch (error) {
        console.error(error);
        showToast?.('配置文件无效或格式不正确', 'error');
      }
    };
    reader.onerror = () => showToast?.('读取配置文件失败', 'error');
    reader.readAsText(file, 'utf-8');
  };

  const clearConfig = () => {
    if (!window.confirm('确定恢复默认配置吗？浏览器中的项目和媒体资源不会删除。')) return;
    removeStorageKeys?.([settingsKey, templateDefinitionsKey, fieldPoolKey, 'theme', 'playbackRate']);
    close();
    showToast?.('配置缓存已清除，页面即将刷新', 'success');
    setTimeout(() => window.location.reload(), 350);
  };

  const bindFeedback = (button, input, label, copiedText, resetText, message) => {
    button?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(input.value);
        button.classList.add('copied');
        if (label) label.textContent = copiedText;
        showToast?.(message, 'success');
        setTimeout(() => { button.classList.remove('copied'); if (label) label.textContent = resetText; }, 1600);
      } catch (_) {
        input.focus();
        input.select();
        showToast?.('无法自动复制，已选中内容', 'warning');
      }
    });
  };

  const bind = () => {
    settingsModalClose?.addEventListener('click', close);
    settingsModalCancelBtn?.addEventListener('click', close);
    settingsModal?.addEventListener('click', event => { if (event.target === settingsModal) close(); });
    settingsBtn?.addEventListener('click', () => open());
    exportUserConfigBtn?.addEventListener('click', exportConfig);
    importUserConfigBtn?.addEventListener('click', () => importUserConfigInput?.click());
    importUserConfigInput?.addEventListener('change', event => importConfig(event.target.files?.[0]));
    bindProjectBackup();
    clearConfigCacheBtn?.addEventListener('click', clearConfig);
    bindFeedback(copyFeedbackEmailBtn, feedbackEmail, copyFeedbackEmailLabel, '已复制', '复制邮箱', '反馈邮箱已复制');
    bindFeedback(copyFeedbackXhsBtn, feedbackXhs, copyFeedbackXhsLabel, '已复制', '复制小红书账号', '小红书账号已复制');
  };

  return {
    bind,
    open,
    close,
    isOpen,
    setPanel,
    renderCacheStatus,
    exportConfig,
    exportProject,
    bindProjectBackup,
    importConfig,
    clearConfig
  };
}
