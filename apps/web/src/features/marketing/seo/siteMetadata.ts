export const SITE_URL = "https://lens.aisenhub.com";

export interface SeoPageMetadata {
  title: string;
  description: string;
  indexable: boolean;
}

export const DEFAULT_PAGE_METADATA: SeoPageMetadata = {
  title: "AisenLens｜视频拉片、自动分镜与镜头分析工具",
  description: "AisenLens 是面向影视创作者、编导和拉片学习者的视频拉片工具，支持自动分镜、逐帧观看、镜头批注与拉片报告导出。项目数据本地保存，保护素材隐私。",
  indexable: true,
};

export const PAGE_METADATA: Record<string, SeoPageMetadata> = {
  "/": DEFAULT_PAGE_METADATA,
  "/features/auto-shot": {
    title: "自动分镜工具：快速拆解视频镜头｜AisenLens",
    description: "使用 AisenLens 自动识别镜头切换并生成可编辑的镜头结构，再按分析需要手动调整边界，高效开始一次视频拉片。",
    indexable: true,
  },
  "/features/frame-analysis": {
    title: "逐帧视频分析与镜头批注工具｜AisenLens",
    description: "通过逐帧观看、时间线标记与结构化批注，分析景别、运镜、构图、色彩、声音和叙事节奏。",
    indexable: true,
  },
  "/features/reports": {
    title: "拉片报告导出：整理镜头分析结果｜AisenLens",
    description: "将镜头批注、分析模板和时间线标记整理为可分享、复盘和归档的视频拉片报告。",
    indexable: true,
  },
  "/tutorials": {
    title: "视频拉片教程：从入门到镜头分析｜AisenLens",
    description: "学习视频拉片方法、镜头语言分析、自动分镜工作流和拉片报告写作，建立可复用的影视分析框架。",
    indexable: true,
  },
  "/tutorials/what-is-video-pian": {
    title: "什么是拉片？影视拉片的 5 个实用步骤｜AisenLens",
    description: "从观看目标、镜头拆分到结构化记录，了解影视拉片是什么，以及如何完成第一次有效的视频拉片。",
    indexable: true,
  },
  "/tutorials/shot-language-analysis": {
    title: "镜头语言怎么分析：景别、运镜、构图与节奏｜AisenLens",
    description: "用景别、运镜、构图和剪辑节奏四个观察维度，建立清晰、可复用的镜头语言分析方法。",
    indexable: true,
  },
  "/tutorials/auto-shot-workflow": {
    title: "自动分镜怎么用？视频拉片效率提升指南｜AisenLens",
    description: "了解自动分镜在视频拉片中的正确用法：先生成可编辑镜头结构，再由创作者完成观察、验证和批注。",
    indexable: true,
  },
  "/glossary": {
    title: "影视拉片术语表：景别、运镜、转场与构图｜AisenLens",
    description: "收录影视拉片和镜头分析常用术语，帮助创作者理解景别、运镜、构图、转场与剪辑节奏。",
    indexable: true,
  },
  "/changelog": {
    title: "AisenLens 更新日志",
    description: "查看 AisenLens 视频拉片与镜头分析工具的功能更新、体验优化和问题修复记录。",
    indexable: true,
  },
  "/privacy": {
    title: "隐私政策｜AisenLens",
    description: "了解 AisenLens 如何处理本地项目数据、账户信息与反馈内容。",
    indexable: true,
  },
  "/terms": {
    title: "用户协议｜AisenLens",
    description: "AisenLens 视频拉片与镜头分析工具的用户协议。",
    indexable: true,
  },
  "/app": { ...DEFAULT_PAGE_METADATA, indexable: false },
  "/projects": { ...DEFAULT_PAGE_METADATA, indexable: false },
  "/feedback": { ...DEFAULT_PAGE_METADATA, indexable: false },
  "/support": { ...DEFAULT_PAGE_METADATA, indexable: false },
  "/reset-password": { ...DEFAULT_PAGE_METADATA, indexable: false },
};

export const getPageMetadata = (pathname: string) => PAGE_METADATA[pathname] ?? DEFAULT_PAGE_METADATA;
