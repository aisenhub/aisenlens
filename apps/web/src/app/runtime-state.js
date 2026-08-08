export function createRuntimeState({ playbackRate = 1 } = {}) {
  return {
    entries: [],
    shotGroups: [],
    activeShotGroupId: null,
    editingShotGroupTitleId: null,
    editingShotGroupSummaryId: null,
    selectedShotIds: new Set(),
    shotGroupSelectionAnchorId: null,
    customFieldNames: [],
    shotGroupSelectionMode: false,
    currentVideoFile: null,
    videoDecodeFailed: false,
    fieldOptionsDraft: null,
    templateEditorDraft: null,
    customTemplateDraft: null,
    activeShotNumber: null,
    expandedShotNumber: null,
    generatingScreenshots: false,
    screenshotAbort: null,
    screenshotPaused: false,
    autoDetecting: false,
    activeSceneDetector: null,
    playbackRate
  };
}
