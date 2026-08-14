import { useCallback, useEffect, useState } from "react";
import projectRepository from "../services/projectRepository";
import type { CreateProjectInput, ProjectRecord } from "../types";

export default function useProjects() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProjects = useCallback(async () => {
    const nextProjects = await projectRepository.listProjects();
    setProjects(nextProjects);
  }, []);

  useEffect(() => {
    void refreshProjects().finally(() => setIsLoading(false));
  }, [refreshProjects]);

  const createProject = useCallback(async (input?: CreateProjectInput) => {
    const project = await projectRepository.createProject(input);
    setProjects((currentProjects) => [project, ...currentProjects]);
    return project;
  }, []);

  const updateProject = useCallback(async (project: ProjectRecord) => {
    const updatedProject = await projectRepository.updateProject(project);
    setProjects((currentProjects) => currentProjects
      .map((currentProject) => currentProject.id === updatedProject.id ? updatedProject : currentProject)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)));
    return updatedProject;
  }, []);

  const deleteProject = useCallback(async (projectId: string) => {
    await projectRepository.deleteProject(projectId);
    setProjects((currentProjects) => currentProjects.filter((project) => project.id !== projectId));
  }, []);

  const moveProjectsOutOfFolder = useCallback(async (folderId: string) => {
    const affectedProjects = projects.filter((project) => project.folderId === folderId);
    await Promise.all(affectedProjects.map((project) => projectRepository.updateProject({ ...project, folderId: null })));
    await refreshProjects();
  }, [projects, refreshProjects]);

  return { projects, isLoading, createProject, updateProject, deleteProject, moveProjectsOutOfFolder, refreshProjects };
}
