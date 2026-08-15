import projectRepository from "../../project/services/projectRepository";
import { createDefaultProjectTemplate } from "./defaultTemplate";
import { normalizeProjectTemplate } from "./templateValidation";
import type { ProjectTemplateSnapshot } from "../types";

export async function loadOrCreateProjectTemplate(projectId: string): Promise<ProjectTemplateSnapshot> {
  const existing = await projectRepository.getProjectTemplate(projectId);
  if (existing) return normalizeProjectTemplate(existing);
  const template = createDefaultProjectTemplate(projectId);
  await projectRepository.saveProjectTemplate(template);
  return template;
}
