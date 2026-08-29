import { useEffect, useMemo } from "react";
import { resolveAutoShotConfig } from "../config/resolveAutoShotConfig";
import type { AutoShotControlSettings, AutoShotPresetCatalog } from "../config/types";
import { autoShotSettingsKey, useAutoShotSettingsStore } from "../stores/useAutoShotSettingsStore";

export interface UseAutoShotControlInput {
  projectId: string | null;
  mediaIdentityDigest: string | null;
  catalog?: AutoShotPresetCatalog;
}

export default function useAutoShotControl({ projectId, mediaIdentityDigest, catalog = "research" }: UseAutoShotControlInput) {
  const key = projectId && mediaIdentityDigest ? autoShotSettingsKey(projectId, mediaIdentityDigest) : null;
  const draft = useAutoShotSettingsStore((state) => key ? state.drafts[key] ?? null : null);
  const initialize = useAutoShotSettingsStore((state) => state.initialize);
  const update = useAutoShotSettingsStore((state) => state.update);
  const reset = useAutoShotSettingsStore((state) => state.reset);

  useEffect(() => {
    if (key) initialize(key);
  }, [initialize, key]);

  const settings = draft?.settings ?? null;
  const resolved = useMemo(() => {
    if (!settings) return null;
    try {
      return { value: resolveAutoShotConfig(settings, catalog), error: null };
    } catch (error) {
      return { value: null, error: error instanceof Error ? error : new Error("自动分镜配置无效。") };
    }
  }, [catalog, settings]);

  const updateSettings = (patch: Partial<AutoShotControlSettings>) => {
    if (key) update(key, patch);
  };

  return {
    settings,
    dirty: draft?.dirty ?? false,
    resolved: resolved?.value ?? null,
    error: resolved?.error ?? null,
    updateSettings,
    resetSettings: () => { if (key) reset(key); },
  };
}
