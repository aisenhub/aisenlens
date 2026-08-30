import type { SceneDetectionConfig } from "@aisenlens/scene-engine";
import type { AutoShotPresetRegistry } from "./types";

const weights = { hue: 3333, saturation: 3333, luma: 3334 };

function adaptive(
  adaptiveThreshold: number,
  windowWidth: number,
  minimumContentScore: number,
): SceneDetectionConfig {
  return {
    hardCut: { kind: "adaptive", adaptiveThreshold, windowWidth, minimumContentScore, weights },
    fade: null,
    minimumSceneDurationUs: 600_000,
    analysis: { maxWidth: 96, temporalSampling: { kind: "every-frame" } },
    diagnostics: "off",
  };
}

function content(threshold: number): SceneDetectionConfig {
  return {
    hardCut: { kind: "content", threshold, weights },
    fade: null,
    minimumSceneDurationUs: 600_000,
    analysis: { maxWidth: 96, temporalSampling: { kind: "every-frame" } },
    diagnostics: "off",
  };
}

const researchNote = "PySceneDetect Content/Adaptive/Fade 语义适配的 AisenLens 研究种子；数值待标定。";

export const researchPresetRegistry: AutoShotPresetRegistry = Object.freeze({
  general: {
    id: "general",
    version: 1,
    name: "通用/影视",
    description: "通用与影视叙事内容的研究起点，适合多数连续镜头视频。",
    catalog: "research",
    status: "uncalibrated",
    sourceNote: researchNote,
    baseConfig: adaptive(3300, 3, 1400),
    detailAdjustments: {
      conservative: { thresholdDelta: 700, minimumContentScoreDelta: 350 },
      balanced: { thresholdDelta: 0, minimumContentScoreDelta: 0 },
      detailed: { thresholdDelta: -550, minimumContentScoreDelta: -250 },
    },
    defaultMinimumSceneDurationSeconds: 0.8,
    defaultTransitions: "hard-cuts",
  },
  "short-form": {
    id: "short-form",
    version: 1,
    name: "短视频",
    description: "快节奏剪辑的研究种子，优先观察召回率变化。",
    catalog: "research",
    status: "uncalibrated",
    sourceNote: researchNote,
    baseConfig: adaptive(3000, 2, 1250),
    detailAdjustments: {
      conservative: { thresholdDelta: 500, minimumContentScoreDelta: 250 },
      balanced: { thresholdDelta: 0, minimumContentScoreDelta: 0 },
      detailed: { thresholdDelta: -450, minimumContentScoreDelta: -200 },
    },
    defaultMinimumSceneDurationSeconds: 0.4,
    defaultTransitions: "hard-cuts",
  },
  "talking-head": {
    id: "talking-head",
    version: 1,
    name: "访谈 / Vlog",
    description: "更保守地处理人物动作和曝光变化。",
    catalog: "research",
    status: "uncalibrated",
    sourceNote: researchNote,
    baseConfig: adaptive(4100, 3, 1800),
    detailAdjustments: {
      conservative: { thresholdDelta: 700, minimumContentScoreDelta: 350 },
      balanced: { thresholdDelta: 0, minimumContentScoreDelta: 0 },
      detailed: { thresholdDelta: -450, minimumContentScoreDelta: -250 },
    },
    defaultMinimumSceneDurationSeconds: 1,
    defaultTransitions: "hard-cuts",
  },
  "animation-gameplay": {
    id: "animation-gameplay",
    version: 1,
    name: "动画 / 游戏",
    description: "大幅色彩变化内容的 Content/Adaptive 对照研究种子。",
    catalog: "research",
    status: "uncalibrated",
    sourceNote: researchNote,
    baseConfig: content(3200),
    detailAdjustments: {
      conservative: { thresholdDelta: 600, minimumContentScoreDelta: 0 },
      balanced: { thresholdDelta: 0, minimumContentScoreDelta: 0 },
      detailed: { thresholdDelta: -500, minimumContentScoreDelta: 0 },
    },
    defaultMinimumSceneDurationSeconds: 0.5,
    defaultTransitions: "hard-cuts",
  },
});
