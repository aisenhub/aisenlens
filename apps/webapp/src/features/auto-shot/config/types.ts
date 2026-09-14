import type { SceneDetectionConfig } from "@aisenlens/scene-engine";

export type AutoShotPresetId =
  | "general"
  | "short-form"
  | "talking-head"
  | "animation-gameplay";

export type AutoShotPresetCatalog = "research" | "production";
export type DetectionDetail = "conservative" | "balanced" | "detailed";
export type TransitionSelection = "hard-cuts" | "hard-cuts-and-fades";

export interface AutoShotAdvancedOverrides {
  hardCut?: SceneDetectionConfig["hardCut"];
  fade?: NonNullable<SceneDetectionConfig["fade"]> | null;
}

export interface AutoShotControlSettings {
  schemaVersion: 1;
  presetId: AutoShotPresetId;
  detail: DetectionDetail;
  transitions: TransitionSelection;
  minimumSceneDuration: { mode: "preset" } | { mode: "custom"; seconds: number };
  overrides: AutoShotAdvancedOverrides;
}

export interface AutoShotTaskControlSnapshot
  extends Omit<AutoShotControlSettings, "presetId"> {
  preset: {
    id: AutoShotPresetId;
    version: number;
    catalog: AutoShotPresetCatalog;
  };
}

export interface AutoShotConfigurationSummary {
  presetId: AutoShotPresetId;
  presetName: string;
  catalog: AutoShotPresetCatalog;
  catalogStatus: "uncalibrated" | "promoted";
  detail: DetectionDetail;
  transitions: TransitionSelection;
  minimumSceneDurationSeconds: number;
  detector: "content" | "adaptive";
  analysisLabel: "逐帧 / 96 宽";
  calibrationLabel: "待标定" | "已晋升";
}

export interface AutoShotPresetDefinition {
  id: AutoShotPresetId;
  version: number;
  name: string;
  description: string;
  catalog: AutoShotPresetCatalog;
  status: "uncalibrated" | "promoted";
  sourceNote: string;
  baseConfig: SceneDetectionConfig;
  detailAdjustments: Record<DetectionDetail, { thresholdDelta: number; minimumContentScoreDelta: number }>;
  defaultMinimumSceneDurationSeconds: number;
  defaultTransitions: TransitionSelection;
}

export type AutoShotPresetRegistry = Readonly<Record<AutoShotPresetId, AutoShotPresetDefinition>>;

export interface ResolvedAutoShotConfiguration {
  schemaVersion: 1;
  settings: AutoShotTaskControlSnapshot;
  engineConfig: SceneDetectionConfig;
  canonicalConfig: string;
  configHash: string;
  summary: AutoShotConfigurationSummary;
}

export interface AutoShotConfigIssue {
  code: "UNKNOWN_PRESET" | "INVALID_SETTINGS" | "INVALID_OVERRIDE" | "CATALOG_EMPTY";
  path: string;
  message: string;
  value?: unknown;
}

export function defaultAutoShotControlSettings(presetId: AutoShotControlSettings["presetId"] = "general"): AutoShotControlSettings {
  return {
    schemaVersion: 1,
    presetId,
    detail: "balanced",
    transitions: "hard-cuts",
    minimumSceneDuration: { mode: "preset" },
    overrides: {},
  };
}

export class AutoShotConfigError extends Error {
  readonly issue: AutoShotConfigIssue;

  constructor(issue: AutoShotConfigIssue) {
    super(issue.message);
    this.name = "AutoShotConfigError";
    this.issue = issue;
  }
}
