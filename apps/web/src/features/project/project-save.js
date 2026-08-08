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
  getTemplateName,
  getVideoDuration
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

  return {
    serializeProjectShots,
    flushShotsToDatabase,
    saveToDatabase
  };
}
