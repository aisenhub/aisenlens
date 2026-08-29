import {
  canonicalizeSceneDetectionConfig,
  hashSceneDetectionConfig,
  resolveSceneDetectionConfig,
} from "@aisenlens/scene-engine";
import type { HardCutConfig } from "@aisenlens/scene-engine";
import { getPresetDefinition } from "./presetRegistry";
import { productionPresetRegistry } from "./productionPresetRegistry";
import { researchPresetRegistry } from "./researchPresetRegistry";
import type {
  AutoShotAdvancedOverrides,
  AutoShotControlSettings,
  AutoShotPresetCatalog,
  AutoShotPresetRegistry,
  AutoShotTaskControlSnapshot,
  DetectionDetail,
  ResolvedAutoShotConfiguration,
} from "./types";
import { AutoShotConfigError as ConfigError } from "./types";

const DETAIL_VALUES: readonly DetectionDetail[] = ["conservative", "balanced", "detailed"];
const TRANSITION_VALUES = ["hard-cuts", "hard-cuts-and-fades"] as const;

function issue(code: ConstructorParameters<typeof ConfigError>[0]["code"], path: string, message: string, value?: unknown): never {
  throw new ConfigError({ code, path, message, value });
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function cloneConfig(config: HardCutConfig): HardCutConfig {
  return structuredClone(config);
}

function resolveHardCut(
  base: HardCutConfig,
  detail: DetectionDetail,
  delta: { thresholdDelta: number; minimumContentScoreDelta: number },
): HardCutConfig {
  const next = cloneConfig(base);
  if (next.kind === "content") next.threshold = clamp(next.threshold + delta.thresholdDelta, 0, 10_000);
  else {
    next.adaptiveThreshold = clamp(next.adaptiveThreshold + delta.thresholdDelta, 1, 12_000);
    next.minimumContentScore = clamp(next.minimumContentScore + delta.minimumContentScoreDelta, 0, 10_000);
  }
  return next;
}

function resolveRegistry(catalog: AutoShotPresetCatalog): AutoShotPresetRegistry {
  return catalog === "research" ? researchPresetRegistry : productionPresetRegistry;
}

function validateSettings(settings: AutoShotControlSettings): void {
  if (settings.schemaVersion !== 1) issue("INVALID_SETTINGS", "schemaVersion", "自动分镜设置版本不受支持。", settings.schemaVersion);
  if (!DETAIL_VALUES.includes(settings.detail)) issue("INVALID_SETTINGS", "detail", "检出程度不受支持。", settings.detail);
  if (!TRANSITION_VALUES.includes(settings.transitions)) issue("INVALID_SETTINGS", "transitions", "转场选择不受支持。", settings.transitions);
  const durationMode = (settings.minimumSceneDuration as { mode: string }).mode;
  const customSeconds = (settings.minimumSceneDuration as { seconds?: unknown }).seconds;
  if (durationMode === "custom" && (typeof customSeconds !== "number" || !Number.isFinite(customSeconds) || customSeconds < 0.1 || customSeconds > 30)) {
    issue("INVALID_SETTINGS", "minimumSceneDuration.seconds", "自定义最短镜头必须在 0.1 至 30 秒之间。", customSeconds);
  }
  if (durationMode !== "preset" && durationMode !== "custom") issue("INVALID_SETTINGS", "minimumSceneDuration.mode", "最短镜头模式不受支持。", durationMode);
}

function resolveMinimumSeconds(settings: AutoShotControlSettings, presetSeconds: number): number {
  return settings.minimumSceneDuration.mode === "custom" ? settings.minimumSceneDuration.seconds : presetSeconds;
}

export function resolveAutoShotConfig(
  settings: AutoShotControlSettings,
  catalog: AutoShotPresetCatalog = "research",
): ResolvedAutoShotConfiguration {
  validateSettings(settings);
  const registry = resolveRegistry(catalog);
  const preset = getPresetDefinition(registry, catalog, settings.presetId);
  if (!preset) {
    if (catalog === "production" && Object.keys(registry).length === 0) issue("CATALOG_EMPTY", "catalog", "生产预设尚未通过标定晋升。", catalog);
    issue("UNKNOWN_PRESET", "presetId", "未找到所选自动分镜预设。", settings.presetId);
  }
  const adjustment = preset.detailAdjustments[settings.detail];
  const baseHardCut = resolveHardCut(preset.baseConfig.hardCut, settings.detail, adjustment);
  const hardCut = settings.overrides.hardCut ? structuredClone(settings.overrides.hardCut) : baseHardCut;
  if (settings.overrides.fade !== undefined && settings.transitions === "hard-cuts") issue("INVALID_OVERRIDE", "overrides.fade", "仅硬切模式不能同时提供淡入淡出覆盖。", settings.overrides.fade);
  const fade = settings.overrides.fade !== undefined
    ? structuredClone(settings.overrides.fade)
    : settings.transitions === "hard-cuts-and-fades"
      ? structuredClone(preset.baseConfig.fade)
      : null;
  const minimumSceneDurationSeconds = resolveMinimumSeconds(settings, preset.defaultMinimumSceneDurationSeconds);
  const engineConfig = resolveSceneDetectionConfig({
    ...preset.baseConfig,
    hardCut,
    fade,
    minimumSceneDurationUs: Math.round(minimumSceneDurationSeconds * 1_000_000),
  });
  const hash = hashSceneDetectionConfig(engineConfig);
  const snapshot: AutoShotTaskControlSnapshot = {
    schemaVersion: 1,
    detail: settings.detail,
    transitions: settings.transitions,
    minimumSceneDuration: structuredClone(settings.minimumSceneDuration),
    overrides: structuredClone(settings.overrides),
    preset: { id: preset.id, version: preset.version, catalog },
  };
  return {
    schemaVersion: 1,
    settings: snapshot,
    engineConfig,
    canonicalConfig: canonicalizeSceneDetectionConfig(engineConfig),
    configHash: hash.text,
    summary: {
      presetId: preset.id,
      presetName: preset.name,
      catalog,
      catalogStatus: preset.status,
      detail: settings.detail,
      transitions: settings.transitions,
      minimumSceneDurationSeconds,
      detector: engineConfig.hardCut.kind,
      analysisLabel: "逐帧 / 96 宽",
      calibrationLabel: preset.status === "promoted" ? "已晋升" : "待标定",
    },
  };
}

export function getResearchPresetRegistry(): AutoShotPresetRegistry {
  return researchPresetRegistry;
}

export function getProductionPresetRegistry(): AutoShotPresetRegistry {
  return productionPresetRegistry;
}
