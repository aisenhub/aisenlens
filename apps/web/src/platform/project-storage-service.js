import {
  dbCreateProject,
  dbDeleteProject,
  dbGetAllProjects,
  dbGetProject,
  dbGetShotGroups,
  dbGetShots,
  dbUpdateProject
} from './indexeddb.js';

export function createProjectStorageService({
  createProject = dbCreateProject,
  deleteProject = dbDeleteProject,
  getAllProjects = dbGetAllProjects,
  getProject = dbGetProject,
  getShotGroups = dbGetShotGroups,
  getShots = dbGetShots,
  updateProject = dbUpdateProject
} = {}) {
  const getProjectBundle = async projectId => {
    const [shots, groups] = await Promise.all([
      getShots(projectId),
      getShotGroups(projectId)
    ]);
    return { shots, groups };
  };

  const findProjectByUuid = async projectUuid => {
    if (!projectUuid) return null;
    const projects = await getAllProjects();
    return projects.find(project => project.projectUuid === projectUuid) || null;
  };

  return {
    createProject,
    deleteProject,
    getProject,
    updateProject,
    getProjectBundle,
    findProjectByUuid
  };
}

export const projectStorageService = createProjectStorageService();
