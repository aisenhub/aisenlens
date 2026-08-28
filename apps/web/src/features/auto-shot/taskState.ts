import type { AutoShotTaskStatus } from "./types";

const transitions: Record<AutoShotTaskStatus, readonly AutoShotTaskStatus[]> = {
  running: ["paused", "completed", "failed", "cancelled"],
  paused: ["running", "cancelled"],
  completed: [],
  failed: [],
  cancelled: [],
};

export function canTransitionAutoShotTask(from: AutoShotTaskStatus, to: AutoShotTaskStatus): boolean {
  return from === to || transitions[from].includes(to);
}
