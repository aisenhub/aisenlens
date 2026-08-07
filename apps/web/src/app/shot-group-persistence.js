export function createShotGroupPersistenceController({
  getProjectId = () => null,
  syncGroups = () => {},
  getGroups = () => [],
  serializeGroups = groups => groups,
  saveGroups = async () => {}
} = {}) {
  const flush = async requestedProjectId => {
    const projectId = requestedProjectId || getProjectId();
    if (!projectId) return;
    syncGroups();
    await saveGroups(projectId, serializeGroups(getGroups()));
  };

  return { flush };
}
