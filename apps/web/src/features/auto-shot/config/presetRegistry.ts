import type { AutoShotPresetCatalog, AutoShotPresetDefinition, AutoShotPresetRegistry, AutoShotPresetId } from "./types";

/**
 * Research presets that are currently exposed by the Web editor.
 *
 * The remaining research seeds stay in the registry for calibration and
 * evaluation, but are intentionally not presented as production-like choices
 * until their annotation sets have been validated.
 */
export const FRONTEND_VISIBLE_RESEARCH_PRESET_IDS = ["general", "short-form"] as const satisfies readonly AutoShotPresetId[];

export function listPresetDefinitions(
  registry: AutoShotPresetRegistry,
  catalog: AutoShotPresetCatalog,
): AutoShotPresetDefinition[] {
  return Object.values(registry)
    .filter((preset) => preset.catalog === catalog)
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function listFrontendPresetDefinitions(
  registry: AutoShotPresetRegistry,
  catalog: AutoShotPresetCatalog,
): AutoShotPresetDefinition[] {
  const presets = listPresetDefinitions(registry, catalog);
  if (catalog !== "research") return presets;

  const visibleIds = new Set<string>(FRONTEND_VISIBLE_RESEARCH_PRESET_IDS);
  return presets.filter((preset) => visibleIds.has(preset.id));
}

export function getPresetDefinition(
  registry: AutoShotPresetRegistry,
  catalog: AutoShotPresetCatalog,
  id: string,
): AutoShotPresetDefinition | null {
  const preset = registry[id as keyof AutoShotPresetRegistry];
  return preset?.catalog === catalog ? preset : null;
}
