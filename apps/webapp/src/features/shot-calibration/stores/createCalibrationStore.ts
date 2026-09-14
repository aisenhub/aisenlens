import { createStore, type StoreApi } from "zustand/vanilla"
import type { CalibrationCommand, CalibrationDraft } from "../types.ts"
import { CALIBRATION_HISTORY_LIMIT } from "../types.ts"
import { applyCalibrationCommand } from "../services/calibrationCommandService.ts"

export interface CalibrationStoreState {
  draft: CalibrationDraft
  past: CalibrationDraft[]
  future: CalibrationDraft[]
  dispatch: (command: CalibrationCommand) => void
  replace: (draft: CalibrationDraft) => void
  undo: () => void
  redo: () => void
}

export type CalibrationStore = StoreApi<CalibrationStoreState>

export function createCalibrationStore(draft: CalibrationDraft): CalibrationStore {
  return createStore<CalibrationStoreState>((set) => ({
    draft,
    past: [],
    future: [],
    dispatch: (command) => set((state) => {
      const result = applyCalibrationCommand(state.draft, command)
      if (!result.changed) return state
      return { draft: result.draft, past: [...state.past, state.draft].slice(-CALIBRATION_HISTORY_LIMIT), future: [] }
    }),
    replace: (nextDraft) => set({ draft: nextDraft, past: [], future: [] }),
    undo: () => set((state) => {
      const previous = state.past.at(-1)
      if (!previous) return state
      return { draft: previous, past: state.past.slice(0, -1), future: [state.draft, ...state.future].slice(0, CALIBRATION_HISTORY_LIMIT) }
    }),
    redo: () => set((state) => {
      const next = state.future[0]
      if (!next) return state
      return { draft: next, past: [...state.past, state.draft].slice(-CALIBRATION_HISTORY_LIMIT), future: state.future.slice(1) }
    }),
  }))
}
