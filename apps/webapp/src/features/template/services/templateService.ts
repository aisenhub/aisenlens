import projectRepository from "../../project/services/projectRepository";
import { createDefaultProjectTemplate } from "./defaultTemplate";
import { cloneAnalysisProfile, validateProjectAnalysisProfile } from "./templateValidation";
import type { ProjectTemplateSnapshot } from "../types";

export async function loadOrCreateProjectTemplate(projectId: string): Promise<ProjectTemplateSnapshot> {
  const existing = await projectRepository.getProjectTemplate(projectId);
  if (existing) {
    const profile = existing as ProjectTemplateSnapshot;
    const issues = validateProjectAnalysisProfile(profile);
    if (issues.length) throw new Error(`项目分析模板无法安全读取：${issues[0].message}`);
    return cloneAnalysisProfile(profile);
  }
  const template = createDefaultProjectTemplate(projectId);
  try {
    await projectRepository.saveProjectTemplate(template);
    return template;
  } catch (error) {
    // React StrictMode and multiple tabs can initialize the same project at
    // the same time. If another initializer won the unique projectId index,
    // use its template instead of surfacing a transient write error.
    let concurrentlyCreated: Awaited<ReturnType<typeof projectRepository.getProjectTemplate>> = null;
    try { concurrentlyCreated = await projectRepository.getProjectTemplate(projectId); } catch { /* Preserve the original write error. */ }
    if (concurrentlyCreated) {
      const profile = concurrentlyCreated as ProjectTemplateSnapshot;
      const issues = validateProjectAnalysisProfile(profile);
      if (issues.length) throw Object.assign(new Error(`项目分析模板无法安全读取：${issues[0].message}`), { cause: error });
      return cloneAnalysisProfile(profile);
    }
    throw Object.assign(new Error(error instanceof Error ? error.message : "项目分析模板初始化失败。"), { cause: error });
  }
}
