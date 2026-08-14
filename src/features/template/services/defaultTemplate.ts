import type { ProjectTemplateSnapshot } from "../types";

const fields = [
  ["shot", "景别", ["大远景", "远景", "全景", "中景", "近景", "特写", "大特写"]],
  ["motion", "运动方式", ["固定", "推镜", "拉镜", "摇镜", "移镜", "跟镜", "升降"]],
  ["color", "色调", ["冷蓝调", "暖黄调", "中性", "高饱和", "脱色", "绿调", "红调"]],
  ["sound", "声音设计", ["同期声", "旁白", "音乐主导", "静默", "混合"]],
  ["rhythm", "剪辑节奏", ["急促", "中速", "舒缓", "呼吸"]],
] as const;

export function createDefaultProjectTemplate(projectId: string): ProjectTemplateSnapshot {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(), projectId, name: "影视拉片基础模板", version: 1, createdAt: now, updatedAt: now,
    fields: [
      { id: "shot_description", label: "画面内容", kind: "text", order: 0, options: [], referenceTerms: [], required: false, isFixed: true },
      ...fields.map(([id, label, options], index) => ({ id, label, kind: "single-select" as const, order: index + 1, options: [...options], referenceTerms: [], required: false, isFixed: false })),
    ],
  };
}
