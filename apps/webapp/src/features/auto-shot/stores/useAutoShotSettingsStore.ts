import { create } from "zustand";
import { defaultAutoShotControlSettings, type AutoShotControlSettings } from "../config/types.ts";

export interface AutoShotSettingsDraft {
  settings: AutoShotControlSettings;
  dirty: boolean;
}

interface AutoShotSettingsStore {
  drafts: Record<string, AutoShotSettingsDraft>;
  initialize: (key: string, presetId?: AutoShotControlSettings["presetId"]) => void;
  update: (key: string, patch: Partial<AutoShotControlSettings>) => void;
  replace: (key: string, settings: AutoShotControlSettings) => void;
  reset: (key: string) => void;
  clear: (key: string) => void;
}

export function autoShotSettingsKey(projectId: string, mediaIdentityDigest: string): string {
  return `${projectId}:${mediaIdentityDigest}`;
}

export const useAutoShotSettingsStore = create<AutoShotSettingsStore>((set) => ({
  drafts: {},
  initialize: (key, presetId = "general") => set((state) => {
    if (state.drafts[key]) return state;
    return { drafts: { ...state.drafts, [key]: { settings: defaultAutoShotControlSettings(presetId), dirty: false } } };
  }),
  update: (key, patch) => set((state) => {
    const current = state.drafts[key] ?? { settings: defaultAutoShotControlSettings(), dirty: false };
    const settings = { ...current.settings, ...patch, overrides: patch.overrides ? structuredClone(patch.overrides) : current.settings.overrides };
    return { drafts: { ...state.drafts, [key]: { settings, dirty: true } } };
  }),
  replace: (key, settings) => set((state) => ({ drafts: { ...state.drafts, [key]: { settings: structuredClone(settings), dirty: true } } })),
  reset: (key) => set((state) => {
    const current = state.drafts[key];
    if (!current) return state;
    return { drafts: { ...state.drafts, [key]: { settings: defaultAutoShotControlSettings(current.settings.presetId), dirty: false } } };
  }),
  clear: (key) => set((state) => {
    if (!state.drafts[key]) return state;
    const drafts = { ...state.drafts };
    delete drafts[key];
    return { drafts };
  }),
}));
