export interface SeoSection {
  heading: string;
  paragraphs: string[];
  items?: string[];
}

export interface SeoContentPageDefinition {
  path: string;
  eyebrow: string;
  title: string;
  description: string;
  sections: SeoSection[];
}

export const SEO_CONTENT_PAGES: SeoContentPageDefinition[] = [
  {
    path: "/features/auto-shot",
    eyebrow: "FEATURE · AUTO SHOT",
    title: "自动分镜：快速得到可编辑的镜头结构",
    description: "先让工具整理镜头切换，再把时间留给真正重要的观察、判断和批注。",
    sections: [
      {
        heading: "从视频导入到镜头结构",
        paragraphs: ["自动分镜用于识别视频中的镜头切换，并将结果整理为连续、可编辑的镜头区间。它不是替代拉片判断，而是减少重复定位和手工整理的时间。"],
        items: ["导入本地视频并建立拉片项目", "生成初始镜头边界", "在时间线上检查并手动修正", "为关键镜头补充结构化批注"],
      },
      {
        heading: "为什么仍然需要人工校验",
        paragraphs: ["镜头切换有时包含渐变、闪白、快速运动或叙事性跳切。自动结果提供高效起点，创作者仍应结合画面和声音确认每一个真正服务于分析目的的镜头边界。"],
      },
    ],
  },
  {
    path: "/features/frame-analysis",
    eyebrow: "FEATURE · FRAME ANALYSIS",
    title: "逐帧观看，读懂每一个镜头细节",
    description: "将时间、画面和观察记录放在同一工作区，建立可回看、可复用的镜头分析。",
    sections: [
      {
        heading: "从可观察的维度开始",
        paragraphs: ["镜头分析不需要一开始就写出结论。先描述你实际看到的景别、机位、运镜、构图、色彩、声音和剪辑节奏，再判断这些选择如何服务情绪和叙事。"],
        items: ["逐帧播放与关键帧定位", "时间线标记和镜头批注", "构图辅助线与画面观察", "可自定义的分析模板"],
      },
      {
        heading: "把观察沉淀为分析框架",
        paragraphs: ["可复用的模板能让不同作品使用一致的观察维度，同时保留每一部作品独有的分析重点。这样，拉片不再是一组零散笔记。"],
      },
    ],
  },
  {
    path: "/features/reports",
    eyebrow: "FEATURE · REPORTS",
    title: "将拉片笔记整理为可分享的分析报告",
    description: "把镜头批注、时间线记录和分析字段汇总为适合复盘、协作和归档的结果。",
    sections: [
      {
        heading: "让分析结果可以被使用",
        paragraphs: ["完成拉片后，重点不只是保存镜头清单，更是让团队或未来的自己能够快速理解分析依据。AisenLens 将项目中的结构化内容整理为清晰的报告。"],
        items: ["导出适合阅读的 HTML 或 PDF", "导出便于整理的 Excel", "保留镜头时间、批注和分析字段", "按项目归档并定期备份"],
      },
    ],
  },
  {
    path: "/tutorials/what-is-video-pian",
    eyebrow: "TUTORIAL · GETTING STARTED",
    title: "什么是拉片？从观看到镜头分析的完整方法",
    description: "拉片不是重复观看影片，而是把镜头、声音、节奏和叙事拆解为可以讨论的创作证据。",
    sections: [
      {
        heading: "第一步：明确这次观看要回答什么",
        paragraphs: ["一次拉片最好围绕一个明确问题开始，例如一场戏如何建立紧张感，或一支广告如何在十秒内传达产品情绪。问题越清楚，记录越有价值。"],
      },
      {
        heading: "第二步：建立镜头清单",
        paragraphs: ["按镜头记录起止时间、景别和画面变化。先得到可靠的结构，再进入细节分析，避免在一开始就写出过多难以验证的结论。"],
      },
      {
        heading: "第三步：描述，再解释",
        paragraphs: ["先描述看见了什么，再解释它为什么有效。将观察与判断分开，能让你的拉片报告更清晰，也更容易与他人讨论。"],
      },
    ],
  },
  {
    path: "/tutorials/shot-language-analysis",
    eyebrow: "TUTORIAL · SHOT LANGUAGE",
    title: "如何分析镜头语言",
    description: "从景别、运镜、构图和剪辑节奏四个可观察维度开始，建立清晰的镜头语言分析方法。",
    sections: [
      {
        heading: "景别：人物与环境的关系",
        paragraphs: ["远景、全景、中景、近景和特写并不是孤立标签。观察景别变化如何改变观众与人物、空间和情绪之间的距离。"],
      },
      {
        heading: "运镜与构图：注意力如何被引导",
        paragraphs: ["推、拉、摇、移和跟拍会改变观看节奏；画面中的线条、留白、前景和主体位置则决定观众首先看到什么。"],
      },
      {
        heading: "剪辑节奏：镜头如何形成呼吸",
        paragraphs: ["比较镜头时长、切换密度和声音进入的时机。节奏不是单纯快慢，而是画面、声音和叙事信息共同形成的观看感受。"],
      },
    ],
  },
  {
    path: "/tutorials/auto-shot-workflow",
    eyebrow: "TUTORIAL · AUTO SHOT",
    title: "用自动分镜开始一次高效拉片",
    description: "自动分镜负责初步整理镜头边界，真正的拉片价值来自创作者对结果的观察、验证和批注。",
    sections: [
      {
        heading: "把自动结果当作起点",
        paragraphs: ["先生成镜头边界，再快速浏览时间线，标记需要复查的位置。渐变、闪白和快速运动常常需要人工确认。"],
      },
      {
        heading: "优先标记叙事转折",
        paragraphs: ["不要平均地批注每一个镜头。优先处理情绪转折、空间转换、声音变化和角色关系发生变化的位置。"],
      },
    ],
  },
  {
    path: "/glossary",
    eyebrow: "GLOSSARY · FILM ANALYSIS",
    title: "影视拉片与镜头分析术语表",
    description: "用清晰、可观察的语言记录镜头，让分析可以被复盘和讨论。",
    sections: [
      {
        heading: "景别",
        paragraphs: ["景别描述画面中主体与环境的相对关系。常见观察词包括远景、全景、中景、近景、特写和大特写。分析时更重要的是景别为何在此刻变化。"],
      },
      {
        heading: "运镜",
        paragraphs: ["运镜描述摄影机的运动方式，例如推、拉、摇、移、跟拍和升降。记录运动方向、速度和开始结束时机，比单独写出术语更有分析价值。"],
      },
      {
        heading: "转场与剪辑节奏",
        paragraphs: ["转场连接两个画面或段落，常见方式包括直接切换、叠化、淡入淡出和匹配剪辑。剪辑节奏则来自镜头时长、切换密度和声画关系的共同作用。"],
      },
    ],
  },
];

export const getSeoContentPage = (pathname: string) => SEO_CONTENT_PAGES.find((page) => page.path === pathname);
