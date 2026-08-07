import { normalizeTimelineViewState } from './project-view-state.js';

export function createProjectController({
  getProjectRecord,
  getProjectBundle,
  normalizeShots,
  normalizeGroups,
  createProjectUuid
} = {}) {
  return {
    async loadLocalProject(projectId) {
      const project = await getProjectRecord(projectId);
      if (!project) return { project: null, entries: [], shotGroups: [] };
      const projectUuid = project.projectUuid || createProjectUuid();
      const bundle = await getProjectBundle(projectId);
      const normalizedProject = {
          ...project,
          projectUuid
      };
      if (Object.prototype.hasOwnProperty.call(project, 'timelineViewState')) {
        normalizedProject.timelineViewState = normalizeTimelineViewState(project.timelineViewState);
      }
      return {
        project: normalizedProject,
        entries: normalizeShots(bundle.shots),
        shotGroups: normalizeGroups(bundle.groups),
        projectUuid,
        needsUuidUpdate: !project.projectUuid
      };
    }
  };
}
