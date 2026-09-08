export const SHOT_TYPES = ["大远景", "远景", "全景", "中景", "近景", "特写", "大特写"];
export const MOTIONS = ["固定", "推镜", "拉镜", "摇镜", "移镜", "跟镜", "升降"];
export const COLORS = ["冷蓝调", "暖黄调", "中性", "高饱和", "脱色", "绿调", "红调"];
export const SOUNDS = ["同期声", "旁白", "音乐主导", "静默", "混合"];
export const RHYTHMS = ["急促", "中速", "舒缓", "呼吸"];

export const DIMS = [
  { key: "shot", label: "景别", options: SHOT_TYPES },
  { key: "motion", label: "运动方式", options: MOTIONS },
  { key: "color", label: "色调", options: COLORS },
  { key: "sound", label: "声音设计", options: SOUNDS },
  { key: "rhythm", label: "剪辑节奏", options: RHYTHMS },
];

export const TOTAL = 160;

export interface ShotData {
  id: string;
  start: number;
  duration: number;
  type: string;
  motion: string;
  color: string;
}

export const INIT_SHOTS: ShotData[] = Array.from({ length: 22 }, (_, index) => ({
  id: String(index + 1),
  start: index * (TOTAL / 22),
  duration: +(TOTAL / 22 * (0.6 + Math.abs(Math.sin(index * 1.3)) * 0.8)).toFixed(1),
  type: SHOT_TYPES[index % SHOT_TYPES.length],
  motion: MOTIONS[index % MOTIONS.length],
  color: COLORS[index % COLORS.length],
}));

export const WAVE = Array.from({ length: 200 }, (_, index) => 0.08 + Math.abs(Math.sin(index * 0.23) * Math.cos(index * 0.07) * 0.85));
export const RULER_MARKS = Array.from({ length: 17 }, (_, index) => ({ sec: Math.round((index / 16) * TOTAL), pct: (index / 16) * 100 }));
export const TEMPLATES = [
  { id: 1, name: "剧情片分析", fields: ["景别", "运镜", "色调", "声音", "叙事"] }, { id: 2, name: "纪录片分析", fields: ["场景", "采访", "旁白", "音效"] }, { id: 3, name: "广告拆解", fields: ["节奏", "产品", "情绪", "文字"] }, { id: 4, name: "MV 分析", fields: ["BPM", "切点", "运镜", "色彩"] },
];
export const VIDEO_INFO = [
  { label: "文件名", val: "2001_space.mp4" }, { label: "分辨率", val: "1920 × 1080" }, { label: "帧率", val: "24 fps" }, { label: "时长", val: "02:22:23" }, { label: "格式", val: "MPEG-4" }, { label: "视频编码", val: "H.264" }, { label: "音频编码", val: "AAC" }, { label: "文件大小", val: "8.4 GB" },
];
export type PanelToolId = "material" | "shot" | "settings" | "mask" | "markers" | "shortcuts" | "developer" | null;
export type Panel = "frame" | "dims" | "notes" | "group";
export const SPEEDS = [0.25, 0.5, 1, 1.5, 2, 3] as const;
