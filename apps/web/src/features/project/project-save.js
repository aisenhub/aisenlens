import { createProjectDocumentInput } from './project-workflow.js';
import { createProjectManifest, getProjectAssetFileName, writeProjectManifest } from './project-writer.js';

export function createProjectSaveService({
  getProjectContext,
  requestProjectTitle,
  setCurrentProject,
  createProjectRecord,
  getProjectRecord,
  updateProjectRecord,
  createProjectUuid,
  getEntries,
  getShotGroups,
  updateDurations,
  serializeShots,
  serializeGroups,
  saveShots,
  pruneScreenshotAssets,
  saveShotGroups,
  serializeAutoShotState,
  getCurrentVideoFileName,
  getCurrentVideoFile,
  getTemplateName,
  getVideoDuration,
  buildProjectDocument,
  writeProjectDataFiles,
  writeProjectManifest: writeManifest = writeProjectManifest,
  writeProjectBinaryFile,
  writeProjectScreenshotAsset,
  loadScreenshotAssets,
  updateProgressMessage,
  getExportSettings,
  buildHtmlExport,
  buildPdfExport,
  buildXlsx,
  getTableColumns,
  getTableTitle,
  getGroupRows,
  getCellValue,
  getVisibleFields,
  ensureJsZipLoaded,
  getExportFileName
} = {}) {
  const getContext = () => getProjectContext?.() || {};

  const serializeProjectShots = () => {
    const entries = getEntries?.() || [];
    const shots = serializeShots(entries);
    shots.forEach((shot, index) => {
      if (entries[index] && !entries[index].shotId) entries[index].shotId = shot.shotId;
    });
    return shots;
  };

  const flushShotsToDatabase = async () => {
    const context = getContext();
    if (!context.id) return;
    updateDurations?.();
    const shots = serializeProjectShots();
    const groups = serializeGroups(getShotGroups?.() || []);
    const metadata = {
      videoFileName: getCurrentVideoFileName?.() || '',
      duration: Math.round(getVideoDuration?.() || 0),
      templateType: getTemplateName?.() || 'Default',
      autoShotState: serializeAutoShotState?.() || null,
      timelineViewState: context.timelineViewState || null
    };
    await saveShots(context.id, shots);
    await pruneScreenshotAssets(context.id, shots.map(shot => shot.shotId));
    await saveShotGroups(context.id, groups);
    await updateProjectRecord?.(context.id, metadata);
  };

  const saveToDatabase = async () => {
    let context = getContext();
    if (!context.id) {
      const title = requestProjectTitle?.();
      if (!title) return false;
      const videoFileName = getCurrentVideoFileName?.() || '';
      const duration = Math.round(getVideoDuration?.() || 0);
      const projectId = await createProjectRecord({ title, videoFileName, duration, templateType: getTemplateName?.() || 'Default' });
      const project = await getProjectRecord(projectId);
      setCurrentProject?.(projectId, title, {
        videoFileName,
        projectUuid: project?.projectUuid || null,
        timelineViewState: project?.timelineViewState || null
      });
      context = getContext();
    }
    await flushShotsToDatabase();
    const projectUuid = context.uuid || createProjectUuid?.();
    setCurrentProject?.(context.id, context.title, {
      videoFileName: getCurrentVideoFileName?.() || '',
      projectUuid,
      timelineViewState: context.timelineViewState || null
    });
    await updateProjectRecord(context.id, {
      videoFileName: getCurrentVideoFileName?.() || '',
      duration: Math.round(getVideoDuration?.() || 0),
      templateType: getTemplateName?.() || 'Default',
      projectUuid,
      autoShotState: serializeAutoShotState?.(),
      timelineViewState: context.timelineViewState || null
    });
    return true;
  };

  const writeToDirectory = async (directory, title, options = {}) => {
    const { includeVideo = false, includeTableExport = false } = options;
    updateDurations?.();
    const context = getContext();
    const projectUuid = context.uuid || createProjectUuid?.();
    if (!context.uuid) {
      setCurrentProject?.(context.id, context.title, { projectUuid });
      if (context.id) updateProjectRecord?.(context.id, { projectUuid }).catch(() => {});
    }
    const projectData = buildProjectDocument(createProjectDocumentInput({
      title,
      projectUuid,
      videoFileName: getCurrentVideoFileName?.(),
      duration: getVideoDuration?.(),
      templateType: getTemplateName?.() || 'Default',
      autoShotState: serializeAutoShotState?.(),
      timelineViewState: context.timelineViewState || null
    }));
    const shots = serializeProjectShots();
    const groups = serializeGroups(getShotGroups?.() || []);
    const files = ['project.json', 'shots.json', 'groups.json'];
    const screenshotAssets = await loadScreenshotAssets?.(context.id) || [];
    const assetIndex = screenshotAssets
      .filter(asset => asset?.key && asset?.blob)
      .map(asset => ({
        key: String(asset.key),
        shotId: String(asset.shotId || ''),
        type: String(asset.type || ''),
        width: Number(asset.width) || 0,
        height: Number(asset.height) || 0,
        size: Number(asset.size) || Number(asset.blob?.size) || 0
      }));
    if (assetIndex.length) files.push('resource-index.json', ...assetIndex.map(asset => `screenshots/${getProjectAssetFileName(asset.key)}`));
    const videoFile = getCurrentVideoFile?.();
    if (includeVideo && videoFile) files.push(videoFile.name);
    const settings = getExportSettings?.() || {};
    if (includeTableExport && (getEntries?.() || []).length) files.push(getExportFileName(settings.exportFormat));
    await writeManifest(directory, createProjectManifest({ status: 'saving', projectUuid, projectFormatVersion: projectData.formatVersion, files }));
    try {
      await writeProjectDataFiles(directory, { project: projectData, shots, groups });
      if (assetIndex.length) {
        await writeProjectBinaryFile(directory, 'resource-index.json', JSON.stringify(assetIndex, null, 2));
        for (const asset of screenshotAssets) {
          if (assetIndex.some(item => item.key === String(asset.key))) await writeProjectScreenshotAsset(directory, asset);
        }
      }
      if (includeVideo && videoFile) {
        updateProgressMessage?.('正在复制视频文件…');
        await writeProjectBinaryFile(directory, videoFile.name, videoFile);
      }
      if (!includeTableExport || !(getEntries?.() || []).length) {
        await writeManifest(directory, createProjectManifest({ status: 'completed', projectUuid, projectFormatVersion: projectData.formatVersion, files }));
        return;
      }
      updateProgressMessage?.('正在生成导出文件…');
      let blob;
      if (settings.exportFormat === 'html') {
        blob = buildHtmlExport(getEntries(), {
          columns: getTableColumns?.(),
          title: getTableTitle?.(),
          groupRows: getGroupRows?.(),
          getCellValue
        });
      } else if (settings.exportFormat === 'pdf') {
        blob = await buildPdfExport(getEntries());
      } else {
        await ensureJsZipLoaded?.();
        blob = await buildXlsx(getEntries(), getVisibleFields?.());
      }
      if (blob) {
        const buffer = await blob.arrayBuffer();
        await writeProjectBinaryFile(directory, getExportFileName(settings.exportFormat), new Uint8Array(buffer));
      }
      await writeManifest(directory, createProjectManifest({ status: 'completed', projectUuid, projectFormatVersion: projectData.formatVersion, files }));
    } catch (error) {
      try { await writeManifest(directory, createProjectManifest({ status: 'failed', projectUuid, projectFormatVersion: projectData.formatVersion, files })); } catch (_) {}
      throw error;
    }
  };

  return {
    serializeProjectShots,
    flushShotsToDatabase,
    saveToDatabase,
    writeToDirectory
  };
}
