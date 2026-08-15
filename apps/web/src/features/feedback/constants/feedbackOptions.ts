import type { FeedbackKind, FeedbackStatus } from "../types";

export const FEEDBACK_KINDS: Record<FeedbackKind, { label: string; description: string; placeholder: string }> = {
  bug: { label: "问题反馈", description: "告诉我们哪里没有按预期工作。", placeholder: "请写清复现步骤、预期表现和实际表现。" },
  feature: { label: "功能建议", description: "让 AisenLens 更适合你的工作流。", placeholder: "描述希望增加的能力，以及你会在什么场景使用它。" },
  experience: { label: "使用体验", description: "分享使用中的感受或改进方向。", placeholder: "哪一处体验让你印象深刻，或还可以更好？" },
  other: { label: "其他", description: "任何想对开发者说的话。", placeholder: "写下你想告诉我们的内容。" },
};

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  submitted: "已提交",
  in_review: "处理中",
  planned: "已规划",
  resolved: "已完成",
  closed: "已关闭",
};
