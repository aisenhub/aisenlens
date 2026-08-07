export function createProjectContextAdapter({ target = globalThis } = {}) {
  const getId = () => target.currentProjectId;
  const getTitle = () => target.currentProjectTitle;
  const getUuid = () => target.currentProjectUuid;
  const getTimelineViewState = () => target.currentProjectTimelineViewState || null;
  const getVideoFileName = () => target.currentProjectVideoFileName || '';
  const getVideoContext = () => {
    const context = {
      id: getId(),
      title: getTitle(),
      uuid: getUuid(),
      videoFileName: getVideoFileName()
    };
    const timelineViewState = getTimelineViewState();
    if (timelineViewState) context.timelineViewState = timelineViewState;
    return context;
  };
  const setVideoFileName = value => {
    target.currentProjectVideoFileName = value || '';
  };

  return {
    getId,
    getTitle,
    getUuid,
    getTimelineViewState,
    getVideoFileName,
    getVideoContext,
    setVideoFileName
  };
}
