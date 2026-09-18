import type { WorkflowWorkspaceDefinition } from "../types.ts"

export const WORKFLOW_WORKSPACE_DEFINITIONS: readonly WorkflowWorkspaceDefinition[] = [
  {
    id: "preparation",
    label: "准备",
    description: "素材、检测与边界复核",
    defaultView: "media",
    views: ["media", "boundary-review"],
  },
  {
    id: "analysis",
    label: "分析",
    description: "全片结构、逐镜分析与研究",
    defaultView: "timeline",
    views: ["timeline", "structure", "scenes", "shots", "sound", "notes"],
  },
  {
    id: "results",
    label: "成果",
    description: "数据、导出与创作转化",
    defaultView: "data",
    views: ["data", "export", "creative"],
  },
] as const

export const getWorkspaceDefinition = (workspace: string | null | undefined) =>
  WORKFLOW_WORKSPACE_DEFINITIONS.find((definition) => definition.id === workspace) ??
  WORKFLOW_WORKSPACE_DEFINITIONS[0]
