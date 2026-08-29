import type { AutoShotPresetCatalog, AutoShotPresetDefinition, AutoShotPresetRegistry } from "./types";

export function listPresetDefinitions(
  registry: AutoShotPresetRegistry,
  catalog: AutoShotPresetCatalog,
): AutoShotPresetDefinition[] {
  return Object.values(registry)
    .filter((preset) => preset.catalog === catalog)
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function getPresetDefinition(
  registry: AutoShotPresetRegistry,
  catalog: AutoShotPresetCatalog,
  id: string,
): AutoShotPresetDefinition | null {
  const preset = registry[id as keyof AutoShotPresetRegistry];
  return preset?.catalog === catalog ? preset : null;
}
