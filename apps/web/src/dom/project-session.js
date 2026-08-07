import { messages } from '../app/messages.js';
import { formatUserError } from '../app/diagnostics.js';
import { normalizeStorageError } from '../app/storage-diagnostics.js';
import {
  pickProjectDirectory,
  pickVideoFile as selectVideoFile
} from '../platform/filesystem.js';

export function createProjectSessionController({
  elements = {},
  projectImportController,
  projectController,
  createProjectRecord,
  deleteProjectRecord,
  updateProjectRecord,
  getProjectRecord,
  sanitizeFolderName,
  createProjectUuid,
  getProjectContext,
  setCurrentProject,
  getSaveDirectory,
  setSaveDirectory,
  saveProjectDirectoryHandle,
  clearCurrentVideo,
  loadVideoFile,
  restoreVideoFromProjectFolder,
  copyVideoToProjectFolder,
  restoreAutoShotSegmentState,
  resetProjectState,
  syncShotGroupsWithEntries,
  renderShots,
  updateCurrentProjectButton,
  updateCustomFieldNames,
  resetAutoSaveShotSnapshot,
  flushShotGroupsToDB,
  applyTemplate,
  ensureLoadedProjectScreenshots,
  releaseLoadedProjectScreenshots = () => {},
  saveImportedScreenshotAssets = async () => {},
  pruneImportedScreenshotAssets = async () => {},
  generateScreenshotsForAllEntries,
  openDatabase = null,
  getDatabaseSetting = null,
  locationTarget = globalThis.location || { search: '' },
  sessionStorageTarget = globalThis.sessionStorage || {},
  localStorageTarget = globalThis.localStorage || {},
  windowTarget = globalThis,
  documentTarget = globalThis.document,
  onNewSession = () => {},
  onDatabaseError = () => {},
  getTemplateName,
  setTemplateName,
  showToast,
  escapeText = value => String(value ?? ''),
  pauseAutosave = () => {},
  resumeAutosave = () => {},
  flushAutosave = async () => {}
} = {}) {
  const {
    videoEmpty,
    guideModal,
    guideNewProjectBtn,
    guideImportBtn,
    videoPickModal,
    videoPickBtn,
    videoPickBtn2,
    videoPickSkipBtn,
    vpStep1,
    vpStep2,
    vpStep2Desc
  } = elements;

  const getProjectTitle = () => getProjectContext?.().title || '';

  const hideGuideModal = () => guideModal?.classList.remove('show');
  const showGuideModal = () => guideModal?.classList.add('show');
  const hideVideoPickModal = () => videoPickModal?.classList.remove('show');

  const showVideoPickModal = () => {
    if (vpStep1) vpStep1.style.display = '';
    if (vpStep2) vpStep2.style.display = 'none';
    videoPickModal?.classList.add('show');
  };

  const showVideoPickStep2 = folderName => {
    if (vpStep1) vpStep1.style.display = 'none';
    if (vpStep2) vpStep2.style.display = '';
    if (vpStep2Desc) vpStep2Desc.textContent = `已选择“${folderName}”，请选择一个视频文件开始分析`;
  };

  const updateCurrentProjectButtonFallback = () => {
    const button = elements.projectCurrentBtn;
    if (!button) return;
    const title = getProjectTitle() || '无项目';
    button.textContent = title;
  };

  const updateProjectButton = updateCurrentProjectButton || updateCurrentProjectButtonFallback;

  const showEmptyVideoHint = ({ title, count, videoFileName, mode }) => {
    if (!videoEmpty) return;
    const restore = mode === 'restore';
    videoEmpty.innerHTML = `<div style="text-align:center;padding:40px 20px">
      <div style="font-size:40px;margin-bottom:12px">${restore ? '🎬' : '📂'}</div>
      <div style="font-size:16px;font-weight:600;color:var(--text);margin-bottom:6px">${restore ? `项目“${escapeText(title)}”已加载` : '暂无视频'}</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:14px">${restore ? `共 ${count} 个镜头，视频文件：${escapeText(videoFileName || '需要重新选择')}` : '选择视频文件开始拉片分析'}</div>
      <button id="videoEmptyHintBtn" style="appearance:none;border:1px solid var(--accent);background:var(--btn-primary-bg);color:#fff;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:14px;box-shadow:none">${restore ? '📂 选择项目文件夹' : '📂 加载视频'}</button>
    </div>`;
    videoEmpty.style.display = 'flex';
    videoEmpty.style.alignItems = 'center';
    videoEmpty.style.justifyContent = 'center';
    videoEmpty.style.pointerEvents = 'auto';
    const button = videoEmpty.querySelector('#videoEmptyHintBtn');
    if (!button) return;
    button.addEventListener('click', async () => {
      try {
        if (restore) {
          const directory = await pickProjectDirectory({ windowTarget });
          if (!directory) return;
          let fileHandle = null;
          let foundName = '';
          if (videoFileName) {
            try {
              fileHandle = await directory.getFileHandle(videoFileName);
              foundName = videoFileName;
            } catch (_) {}
          }
          if (!fileHandle) {
            for await (const [name, handle] of directory.entries()) {
              if (handle.kind === 'file' && /\.(mp4|webm|ogg|mov|mkv|avi)$/i.test(name)) {
                fileHandle = handle;
                foundName = name;
                break;
              }
            }
          }
          if (!fileHandle) {
            showToast?.('所选文件夹中未找到视频文件', 'warning', 4000);
            return;
          }
          const file = await fileHandle.getFile();
          setSaveDirectory?.(directory);
          loadVideoFile?.(file);
          const project = getProjectContext?.();
          if (project?.id) {
            setCurrentProject?.(project.id, project.title, { videoFileName: foundName, projectUuid: project.uuid });
            saveProjectDirectoryHandle?.(directory, project.id, project.uuid).catch(() => {});
            updateProjectRecord?.(project.id, { videoFileName: foundName }).catch(() => {});
          }
          renderShots?.();
          generateScreenshotsForAllEntries?.();
          return;
        }
        const file = await pickVideoFile();
        if (!file) return;
        loadVideoFile?.(file);
        const project = getProjectContext?.();
        if (project?.id) {
          setCurrentProject?.(project.id, project.title, { videoFileName: file.name, projectUuid: project.uuid });
          updateProjectRecord?.(project.id, { videoFileName: file.name }).catch(() => {});
        }
        renderShots?.();
        generateScreenshotsForAllEntries?.();
      } catch (error) {
        if (error?.name !== 'AbortError') {
          const diagnostic = normalizeStorageError(error, {
            operation: '项目文件夹访问',
            fallback: {
              code: 'PROJECT_FOLDER_ACCESS_FAILED',
              title: '项目文件夹访问失败',
              action: '请检查浏览器文件夹权限后重试。'
            }
          });
          console.error('项目文件夹访问失败:', diagnostic);
          showToast?.(formatUserError(diagnostic), 'error');
        }
      }
    });
  };

  const importProjectFromFolderInternal = async () => {
    try {
      releaseLoadedProjectScreenshots();
      const directory = await pickProjectDirectory({ windowTarget });
      if (!directory) return;
      const loaded = await projectImportController.readFolder(directory);
      setSaveDirectory?.(directory);
      if (loaded.mode === 'new') {
        const { file, fileName } = loaded.video;
        const title = sanitizeFolderName(directory.name) || messages.projectUntitled;
        const id = await createProjectRecord({ title, videoFileName: fileName, templateType: getTemplateName?.() || 'Default' });
        setCurrentProject?.(id, title, { videoFileName: fileName, timelineViewState: null });
        await saveProjectDirectoryHandle?.(directory, id);
        resetProjectState?.();
        clearCurrentVideo?.();
        updateProjectButton();
        updateCustomFieldNames?.();
        hideGuideModal();
        if (file) loadVideoFile?.(file);
        else showEmptyVideoHint({ title, count: 0, videoFileName: '', mode: 'new' });
        renderShots?.();
        return;
      }
      const { project, entries, shotGroups, video, videoFileName, existing, screenshotAssets = [] } = loaded;
      resetProjectState?.({ entries, shotGroups });
      syncShotGroupsWithEntries?.();
      const projectUuid = project.projectUuid;
      const projectId = existing
        ? existing.id
        : await createProjectRecord({ title: project.title, videoFileName, duration: project.duration || 0, templateType: project.templateType || 'Default', projectUuid });
      if (existing) await updateProjectRecord(projectId, {
        title: project.title,
        videoFileName,
        duration: project.duration || 0,
        templateType: project.templateType || 'Default',
        projectUuid,
        timelineViewState: project.timelineViewState || null
      });
      await saveProjectDirectoryHandle?.(directory, projectId, projectUuid);
      setCurrentProject?.(projectId, project.title, {
        videoFileName,
        projectUuid,
        timelineViewState: project.timelineViewState
      });
      if (!existing && project.timelineViewState) {
        await updateProjectRecord?.(projectId, { timelineViewState: project.timelineViewState });
      }
      clearCurrentVideo?.();
      if (video.file) {
        loadVideoFile?.(video.file);
        restoreAutoShotSegmentState?.(project.autoShotState, project.duration);
      }
      updateProjectButton();
      updateCustomFieldNames?.();
      renderShots?.();
      await flushShotGroupsToDB?.();
      {
        const validShotIds = new Set(entries.map(entry => String(entry.shotId)));
        const assets = screenshotAssets.map(asset => ({
          ...asset,
          key: `${Number(projectId)}:${String(asset.shotId)}:${String(asset.type)}`
        })).filter(asset => validShotIds.has(String(asset.shotId)));
        if (assets.length) await saveImportedScreenshotAssets(projectId, assets);
        await pruneImportedScreenshotAssets(projectId, [...validShotIds]);
      }
      if (project.templateType) {
        setTemplateName?.(project.templateType);
        applyTemplate?.(project.templateType);
      }
      hideGuideModal();
      await ensureLoadedProjectScreenshots?.();
    } catch (error) {
      if (error?.name !== 'AbortError') {
        const diagnostic = normalizeStorageError(error, {
          operation: '项目文件夹导入',
          fallback: {
          code: 'PROJECT_IMPORT_FAILED',
          title: messages.projectImportFailed,
          action: '请确认项目文件夹包含有效的项目文件，然后重试。'
          }
        });
        console.error('项目导入失败:', diagnostic);
        showToast?.(formatUserError(diagnostic), 'error');
      }
    }
  };

  const loadLocalProjectInternal = async id => {
    try {
      releaseLoadedProjectScreenshots();
      const loaded = await projectController.loadLocalProject(id);
      if (!loaded.project) {
        showToast?.(messages.projectNotFound, 'error');
        return;
      }
      const { project, entries, shotGroups, projectUuid } = loaded;
      resetProjectState?.({ entries, shotGroups });
      syncShotGroupsWithEntries?.();
      clearCurrentVideo?.();
      setSaveDirectory?.(null);
      setCurrentProject?.(project.id, project.title, {
        videoFileName: project.videoFileName || '',
        projectUuid,
        timelineViewState: project.timelineViewState
      });
      if (loaded.needsUuidUpdate) updateProjectRecord?.(project.id, { projectUuid }).catch(() => {});
      const restored = await restoreVideoFromProjectFolder?.({ ...project, projectUuid });
      if (restored) restoreAutoShotSegmentState?.(project.autoShotState, project.duration);
      updateProjectButton();
      updateCustomFieldNames?.();
      renderShots?.();
      if (project.templateType) {
        setTemplateName?.(project.templateType);
        applyTemplate?.(project.templateType);
      }
      if (!restored) showEmptyVideoHint({ title: project.title, count: entries.length, videoFileName: project.videoFileName || '', mode: 'restore' });
      hideGuideModal();
      await pruneImportedScreenshotAssets?.(project.id, entries.map(entry => entry.shotId));
      await ensureLoadedProjectScreenshots?.();
    } catch (error) {
      const diagnostic = normalizeStorageError(error, {
        operation: '项目加载',
        fallback: {
        code: 'PROJECT_LOAD_FAILED',
        title: messages.projectLoadFailed,
        action: '请重新选择项目文件夹，或刷新后重试。'
        }
      });
      console.error('项目加载失败:', diagnostic);
      showToast?.(formatUserError(diagnostic), 'error');
    }
  };

  const createProjectFromVideoInternal = async file => {
    if (!file) return;
    const videoName = file.name;
    const directory = getSaveDirectory?.();
    if (!directory) {
      showToast?.('请先选择项目文件夹', 'warning');
      return;
    }
    const title = sanitizeFolderName(directory.name) || '未命名项目';
    clearCurrentVideo?.();
    const projectUuid = createProjectUuid?.();
    const id = await createProjectRecord({ title, videoFileName: videoName, templateType: getTemplateName?.() || 'Default', projectUuid });
    setCurrentProject?.(id, title, { videoFileName: videoName, projectUuid, timelineViewState: null });
    resetProjectState?.();
    updateProjectButton();
    loadVideoFile?.(file);
    renderShots?.();
    hideVideoPickModal();
    showToast?.(`已创建项目：${title}`, 'success');
    await saveProjectDirectoryHandle?.(directory, id, projectUuid);
    showToast?.('视频已加载，正在复制到项目文件夹', 'info', 3000);
    copyVideoToProjectFolder?.(file, directory).then(copied => {
      showToast?.(copied ? '视频已复制到项目文件夹' : '视频已加载，但复制到项目文件夹失败', copied ? 'success' : 'warning', copied ? 2200 : 5000);
    }).catch(() => showToast?.('视频已加载，但复制到项目文件夹失败', 'warning', 5000));
  };

  const deleteCurrentProjectInternal = async () => {
    const context = getProjectContext?.() || {};
    if (!context.id) return false;
    if (!windowTarget.confirm?.(`确定删除项目“${context.title || '未命名项目'}”吗？此操作会删除项目数据和截图资源。`)) return false;
    try {
      await deleteProjectRecord?.(context.id);
      clearCurrentVideo?.();
      setSaveDirectory?.(null);
      onNewSession();
      hideGuideModal();
      showToast?.('项目及其截图资源已删除', 'success');
      return true;
    } catch (error) {
      const diagnostic = normalizeStorageError(error, {
        operation: '项目删除',
        fallback: {
          code: 'PROJECT_DELETE_FAILED',
          title: '项目删除失败',
          action: '请稍后重试，并检查浏览器存储权限。'
        }
      });
      console.error('项目删除失败:', diagnostic);
      showToast?.(formatUserError(diagnostic), 'error');
      return false;
    }
  };

  const createNewProject = () => { hideGuideModal(); showVideoPickModal(); };
  const guideNewProject = createNewProject;
  const guideImportProject = async () => { hideGuideModal(); await importProjectFromFolder(); };

  const restoreSession = async () => {
    try {
      await openDatabase?.();
      if (locationTarget.search.includes('project_id')) return;
      let loaded = false;
      const isSameSession = !!sessionStorageTarget?.getItem('sessionActive');
      if (isSameSession) {
        let lastId = localStorageTarget?.getItem('lastProjectId');
        if (!lastId) {
          try { lastId = await getDatabaseSetting?.('lastProjectId'); } catch (_) {}
        }
        if (lastId) {
          try {
            const project = await getProjectRecord(lastId);
            if (project) {
              await loadLocalProject(project.id);
              loaded = true;
            }
          } catch (error) {
            console.error('恢复项目失败', error);
          }
        }
      } else {
        onNewSession();
      }
      if (!loaded) windowTarget.setTimeout(() => showGuideModal(), 500);
    } catch (error) {
      console.error('IndexedDB init failed:', error);
      onDatabaseError(error);
    }
  };

  const pickVideoFile = () => selectVideoFile({ windowTarget, documentTarget });

  const runWithAutosavePaused = async operation => {
    pauseAutosave?.();
    try {
      await flushAutosave?.();
      return await operation();
    }
    finally { resumeAutosave?.(); }
  };

  const importProjectFromFolder = () => runWithAutosavePaused(importProjectFromFolderInternal);
  const loadLocalProject = id => runWithAutosavePaused(() => loadLocalProjectInternal(id));
  const createProjectFromVideo = file => runWithAutosavePaused(() => createProjectFromVideoInternal(file));
  const deleteCurrentProject = () => runWithAutosavePaused(deleteCurrentProjectInternal);

  const bind = () => {
    guideNewProjectBtn?.addEventListener('click', guideNewProject);
    guideImportBtn?.addEventListener('click', guideImportProject);
    guideModal?.addEventListener('click', event => { if (event.target === guideModal) hideGuideModal(); });
    videoPickModal?.addEventListener('click', event => { if (event.target === videoPickModal) hideVideoPickModal(); });
    videoPickBtn?.addEventListener('click', async () => {
      const originalText = videoPickBtn.textContent;
      videoPickBtn.disabled = true;
      try {
        const directory = await pickProjectDirectory({ windowTarget });
        setSaveDirectory?.(directory);
        showVideoPickStep2(directory.name);
      } catch (error) {
        if (error?.name !== 'AbortError') {
          const diagnostic = normalizeStorageError(error, {
            operation: '选择项目文件夹',
            fallback: {
              code: 'PROJECT_FOLDER_PICKER_FAILED',
              title: '选择项目文件夹失败',
              action: '请检查浏览器文件夹权限后重试。'
            }
          });
          showToast?.(formatUserError(diagnostic), 'error');
        }
      } finally {
        videoPickBtn.disabled = false;
        videoPickBtn.textContent = originalText;
      }
    });
    videoPickBtn2?.addEventListener('click', async () => {
      const originalText = videoPickBtn2.textContent;
      videoPickBtn2.disabled = true;
      try { await createProjectFromVideo(await pickVideoFile()); }
      catch (error) { if (error?.name !== 'AbortError') showToast?.('选择视频失败', 'error'); }
      finally { videoPickBtn2.disabled = false; videoPickBtn2.textContent = originalText; }
    });
    const createProjectWithoutVideo = async () => {
      const directory = getSaveDirectory?.();
      if (!directory) {
        showToast?.('请先选择项目文件夹', 'warning');
        return;
      }
      const title = sanitizeFolderName(directory.name) || '未命名项目';
      const id = await createProjectRecord({ title, templateType: getTemplateName?.() || 'Default' });
      const project = await getProjectRecord(id);
      setCurrentProject?.(id, title, {
        videoFileName: '',
        projectUuid: project?.projectUuid || null,
        timelineViewState: project?.timelineViewState || null
      });
      await saveProjectDirectoryHandle?.(directory, id);
      resetProjectState?.();
      clearCurrentVideo?.();
      updateProjectButton();
      renderShots?.();
      hideVideoPickModal();
      showEmptyVideoHint({ title, count: 0, videoFileName: '', mode: 'new' });
      showToast?.(`已创建项目：${title}`, 'success');
    };
    videoPickSkipBtn?.addEventListener('click', () => runWithAutosavePaused(createProjectWithoutVideo));
  };

  return {
    bind,
    showGuideModal,
    hideGuideModal,
    showVideoPickModal,
    hideVideoPickModal,
    showEmptyVideoHint,
    importProjectFromFolder,
    loadLocalProject,
    createProjectFromVideo,
    createNewProject,
    deleteCurrentProject,
    guideImportProject,
    guideNewProject,
    restoreSession
  };
}
