import type { WorkflowStageDefinition } from "../types.ts"

export const WORKFLOW_STAGE_DEFINITIONS: readonly WorkflowStageDefinition[] = [
  {
    id: "prepare",
    label: "准备",
    description: "素材、模板与镜头地图",
    defaultView: "media",
    views: ["media"],
  },
  {
    id: "calibrate",
    label: "校准",
    description: "复核候选切点与应用预览",
    defaultView: "candidates",
    views: ["candidates"],
  },
  {
    id: "overview",
    label: "总览",
    description: "Film Map 与结构事实",
    defaultView: "film",
    views: ["film", "structure"],
  },
  {
    id: "analyze",
    label: "深拆",
    description: "Scenes、Shots 与 Sound",
    defaultView: "scenes",
    views: ["scenes", "shots", "sound"],
  },
  {
    id: "learn",
    label: "学习",
    description: "回看自己的笔记与来源",
    defaultView: "notes",
    views: ["notes"],
  },
  {
    id: "create",
    label: "创作",
    description: "未来创作工具入口",
    defaultView: "coming-soon",
    views: ["coming-soon"],
  },
] as const

export const getStageDefinition = (stage: string | null | undefined) =>
  WORKFLOW_STAGE_DEFINITIONS.find((definition) => definition.id === stage) ??
  WORKFLOW_STAGE_DEFINITIONS.find((definition) => definition.id === "analyze")!
