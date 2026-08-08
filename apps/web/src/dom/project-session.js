import { messages } from '../app/messages.js';
import { formatUserError } from '../app/diagnostics.js';
import { normalizeStorageError } from '../app/storage-diagnostics.js';
import { getAppRoute } from '../app/routes.js';

export function createProjectSessionController({
  projectController,
  updateProjectRecord,
  getProjectRecord,
  getProjectContext,
  setCurrentProject,
  clearCurrentVideo,
  restoreVideoFromProjectStorage,
  restoreAutoShotSegmentState,
  resetProjectState,
  syncShotGroupsWithEntries,
  renderShots,
  updateCurrentProjectButton,
  updateCustomFieldNames,
  applyTemplate,
  ensureLoadedProjectScreenshots,
  releaseLoadedProjectScreenshots = () => {},
  pruneImportedScreenshotAssets = async () => {},
  openDatabase = null,
  consumePendingSave = async () => null,
  locationTarget = globalThis.location || { search: '' },
  windowTarget = globalThis,
  onDatabaseError = () => {},
  getTemplateName,
  setTemplateName,
  showToast,
  pauseAutosave = () => {},
  resumeAutosave = () => {},
  flushAutosave = async () => {}
} = {}) {
  const navigateToLibrary = () => {
    if (windowTarget.location?.assign) windowTarget.location.assign('/');
  };

  const runWithAutosavePaused = async operation => {
    pauseAutosave?.();
    try {
      await flushAutosave?.();
      return await operation();
    } finally {
      resumeAutosave?.();
    }
  };

  const loadLocalProjectInternal = async id => {
    try {
      releaseLoadedProjectScreenshots();
      const loaded = await projectController.loadLocalProject(id);
      if (!loaded.project) {
        showToast?.(messages.projectNotFound, 'error');
        navigateToLibrary();
        return false;
      }
      const { project, entries, shotGroups, projectUuid } = loaded;
      resetProjectState?.({ entries, shotGroups });
      syncShotGroupsWithEntries?.();
      clearCurrentVideo?.();
      setCurrentProject?.(project.id, project.title, {
        videoFileName: project.videoFileName || '',
        projectUuid,
        timelineViewState: project.timelineViewState
      });
      if (loaded.needsUuidUpdate) updateProjectRecord?.(project.id, { projectUuid }).catch(() => {});
      const restored = await restoreVideoFromProjectStorage?.({ ...project, projectUuid });
      if (restored) restoreAutoShotSegmentState?.(project.autoShotState, project.duration);
      updateCurrentProjectButton?.();
      updateCustomFieldNames?.();
      renderShots?.();
      if (project.templateType) {
        setTemplateName?.(project.templateType);
        applyTemplate?.(project.templateType);
      }
      await pruneImportedScreenshotAssets?.(project.id, entries.map(entry => entry.shotId));
      await ensureLoadedProjectScreenshots?.();
      return true;
    } catch (error) {
      const diagnostic = normalizeStorageError(error, {
        operation: '加载项目',
        fallback: {
          code: 'PROJECT_LOAD_FAILED',
          title: messages.projectLoadFailed,
          action: '请返回工程库后重新打开项目。'
        }
      });
      console.error('项目加载失败:', diagnostic);
      showToast?.(formatUserError(diagnostic), 'error');
      return false;
    }
  };

  const renameCurrentProject = async nextTitle => {
    const context = getProjectContext?.() || {};
    if (!context.id) return false;
    const title = String(nextTitle || '').trim();
    if (!title || title === context.title) return false;
    try {
      await updateProjectRecord?.(context.id, { title });
      setCurrentProject?.(context.id, title, {
        videoFileName: context.videoFileName || '',
        projectUuid: context.uuid || null,
        timelineViewState: context.timelineViewState || null
      });
      updateCurrentProjectButton?.();
      showToast?.(`项目已重命名为：${title}`, 'success');
      return true;
    } catch (error) {
      const diagnostic = normalizeStorageError(error, {
        operation: '项目重命名',
        fallback: {
          code: 'PROJECT_RENAME_FAILED',
          title: '项目重命名失败',
          action: '请检查浏览器存储权限后重试。'
        }
      });
      console.error('项目重命名失败:', diagnostic);
      showToast?.(formatUserError(diagnostic), 'error');
      return false;
    }
  };

  const restoreSession = async () => {
    try {
      await openDatabase?.();
      const pendingSave = await consumePendingSave?.();
      if (pendingSave?.projectId) {
        showToast?.('检测到上次保存未完成，已恢复最近一次成功保存的项目版本。', 'warning', 6000);
      }
      const route = getAppRoute(locationTarget);
      if (!route.projectId) {
        navigateToLibrary();
        return;
      }
      const project = await getProjectRecord(route.projectId);
      if (!project) {
        showToast?.(messages.projectNotFound, 'error');
        navigateToLibrary();
        return;
      }
      await loadLocalProject(route.projectId);
    } catch (error) {
      console.error('IndexedDB init failed:', error);
      onDatabaseError(error);
    }
  };

  const loadLocalProject = id => runWithAutosavePaused(() => loadLocalProjectInternal(id));

  return {
    loadLocalProject,
    renameCurrentProject,
    restoreSession,
    getTemplateName
  };
}
