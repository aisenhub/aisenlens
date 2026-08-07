export function getProjectSessionState(projectId, title = '') {
  if (projectId) {
    return {
      local: {
        lastProjectId: String(projectId),
        lastProjectTitle: title || ''
      },
      session: { sessionActive: '1' },
      settingValue: projectId
    };
  }
  return {
    local: {},
    session: {},
    removeLocal: ['lastProjectId', 'lastProjectTitle'],
    removeSession: ['sessionActive'],
    settingValue: null
  };
}
