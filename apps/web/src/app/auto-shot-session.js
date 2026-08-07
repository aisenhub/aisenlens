import {
  createAutoShotVideoIdentity,
  getAutoShotSignatureCacheKey,
  pruneAutoShotSignatureCache,
  resetAutoShotSegmentState,
  restoreAutoShotSegmentState,
  serializeAutoShotSegmentState
} from '../features/auto-shot/state.js';

export function createAutoShotSessionController({
  getVideoFile = () => null,
  getVideoName = () => '',
  getVideoDuration = () => 0,
  getProjectId = () => null,
  updateProject = async () => {},
  getDefaults = () => ({}),
  updateCard = () => {}
} = {}) {
  const signatureCache = new Map();
  let segmentState = resetAutoShotSegmentState();

  const getVideoIdentity = () => createAutoShotVideoIdentity(getVideoFile(), getVideoName());
  const getSignatureCacheKey = time => getAutoShotSignatureCacheKey(getVideoIdentity(), time);
  const clearSignatureCache = () => signatureCache.clear();
  const pruneSignatureCache = minTime => pruneAutoShotSignatureCache(signatureCache, minTime);
  const serializeState = () => serializeAutoShotSegmentState(segmentState, getVideoIdentity(), getDefaults());
  const persistState = () => {
    const projectId = getProjectId();
    if (!projectId) return;
    updateProject(projectId, { autoShotState: serializeState() }).catch(() => {});
  };
  const restoreState = (storedState, fallbackEnd = 0) => {
    const restored = restoreAutoShotSegmentState(
      storedState,
      getVideoIdentity(),
      getVideoDuration(),
      fallbackEnd,
      getDefaults()
    );
    if (!restored) return false;
    segmentState = restored;
    updateCard();
    return true;
  };
  const resetState = () => {
    segmentState = resetAutoShotSegmentState();
    updateCard();
  };

  return {
    getState: () => segmentState,
    setState: value => { segmentState = value; },
    getSignatureCache: () => signatureCache,
    getVideoIdentity,
    getSignatureCacheKey,
    clearSignatureCache,
    pruneSignatureCache,
    serializeState,
    persistState,
    restoreState,
    resetState,
    updateCard
  };
}
