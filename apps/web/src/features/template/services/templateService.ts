import projectRepository from "../../project/services/projectRepository";
import { createDefaultProjectTemplate } from "./defaultTemplate";
import { normalizeProjectTemplate } from "./templateValidation";
import type { ProjectTemplateSnapshot } from "../types";

export async function loadOrCreateProjectTemplate(projectId: string): Promise<ProjectTemplateSnapshot> {
  const existing = await projectRepository.getProjectTemplate(projectId);
  if (existing) return normalizeProjectTemplate(existing);
  const template = createDefaultProjectTemplate(projectId);
  try {
    await projectRepository.saveProjectTemplate(template);
    return template;
  } catch (error) {
    // React StrictMode and multiple tabs can initialize the same project at
    // the same time. If another initializer won the unique projectId index,
    // use its template instead of surfacing a transient write error.
    try {
      const concurrentlyCreated = await projectRepository.getProjectTemplate(projectId);
      if (concurrentlyCreated) return normalizeProjectTemplate(concurrentlyCreated);
    } catch {
      // Preserve the original write error when the follow-up read also fails.
    }
    throw error;
  }
}
