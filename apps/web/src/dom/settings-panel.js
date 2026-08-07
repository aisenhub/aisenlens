function formatCacheSize(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getStorageBytes(keys = null, storage = globalThis.localStorage) {
  const cacheKeys = Array.isArray(keys)
    ? keys
    : Array.from({ length: storage.length }, (_, index) => storage.key(index) || '');
  return cacheKeys.reduce((total, key) => (
    total + key.length * 2 + String(storage.getItem(key) || '').length * 2
  ), 0);
}

function estimateStructuredBytes(value, seen = new WeakSet()) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'string') return value.length * 2;
  if (typeof value === 'number' || typeof value === 'boolean') return 8;
  if (typeof value !== 'object') return 0;
  if (typeof Blob !== 'undefined' && value instanceof Blob) return value.size;
  if (seen.has(value)) return 0;
  seen.add(value);
  if (Array.isArray(value)) return value.reduce((total, item) => total + estimateStructuredBytes(item, seen), 16);
  return Object.entries(value).reduce((total, [key, item]) => total + key.length * 2 + estimateStructuredBytes(item, seen), 32);
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
  getStorageEstimate = async () => null,
  clearProjectStores,
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
    cacheManagerConfigStatus,
    cacheManagerProjectStatus,
    clearConfigCacheBtn,
    clearProjectCacheBtn,
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
      const stats = await getProjectStats?.();
      const estimate = await getStorageEstimate?.();
      const quotaText = Number.isFinite(estimate?.available) ? ` · 可用 ${formatCacheSize(estimate.available)}` : '';
      if (cacheManagerProjectStatus) cacheManagerProjectStatus.textContent = `${stats.projects} 个项目 · ${stats.shots} 个分镜 · ${stats.groups} 个镜头组 · 截图 ${stats.screenshotAssets || 0} 个 · 占用 ${formatCacheSize(stats.bytes)}${quotaText}`;
    } catch (_) {
      if (cacheManagerProjectStatus) cacheManagerProjectStatus.textContent = '暂时无法读取';
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
    if (!window.confirm('确定清除本机配置缓存吗？项目文件夹和项目缓存不会删除。')) return;
    removeStorageKeys?.([settingsKey, templateDefinitionsKey, fieldPoolKey, 'theme', 'playbackRate']);
    close();
    showToast?.('配置缓存已清除，页面即将刷新', 'success');
    setTimeout(() => window.location.reload(), 350);
  };

  const clearProjects = async () => {
    if (!window.confirm('确定清除浏览器中的全部项目缓存吗？项目文件夹中的文件不会删除。')) return;
    if (clearProjectCacheBtn) clearProjectCacheBtn.disabled = true;
    try {
      await clearProjectStores?.();
      localStorage.removeItem('lastProjectId');
      localStorage.removeItem('lastProjectTitle');
      sessionStorage.removeItem('sessionActive');
      close();
      showToast?.('项目缓存已清除，页面即将刷新', 'success');
      setTimeout(() => window.location.reload(), 350);
    } catch (error) {
      console.error(error);
      showToast?.('清除项目缓存失败', 'error');
      if (clearProjectCacheBtn) clearProjectCacheBtn.disabled = false;
    }
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
    clearConfigCacheBtn?.addEventListener('click', clearConfig);
    clearProjectCacheBtn?.addEventListener('click', clearProjects);
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
    importConfig,
    clearConfig,
    clearProjects
  };
}
