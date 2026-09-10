import { useEffect } from "react";
import type { EditorShortcutAction } from "./definitions";

type ShortcutHandlers = Partial<Record<EditorShortcutAction, () => void>>;

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || Boolean(target.closest("input, textarea, select, button, a, [contenteditable='true']"));
}

function getShortcutAction(event: KeyboardEvent): EditorShortcutAction | null {
  const hasPrimaryModifier = event.ctrlKey || event.metaKey;
  if (hasPrimaryModifier) {
    if (event.key.toLowerCase() === "s" && !event.shiftKey) return "file.save";
    if (event.key.toLowerCase() === "z") return event.shiftKey ? "history.redo" : "history.undo";
    if (event.key.toLowerCase() === "y" && !event.shiftKey) return "history.redo";
    return null;
  }
  if (event.altKey) return null;
  if (event.key === " " && !event.shiftKey) return "playback.toggle";
  if (event.key === "j" || event.key === "J") return "playback.reverse";
  if (event.key === "k" || event.key === "K") return "playback.pause";
  if (event.key === "l" || event.key === "L") return "playback.forward";
  if (event.key === "ArrowLeft") return event.shiftKey ? "playback.jumpBack" : "playback.stepBack";
  if (event.key === "ArrowRight") return event.shiftKey ? "playback.jumpForward" : "playback.stepForward";
  if (event.key === "," && !event.shiftKey) return "playback.stepBack";
  if (event.key === "." && !event.shiftKey) return "playback.stepForward";
  if (event.key === "ArrowUp" && !event.shiftKey) return "playback.previousBoundary";
  if (event.key === "ArrowDown" && !event.shiftKey) return "playback.nextBoundary";
  if (event.key === "Home" && !event.shiftKey) return "playback.goToStart";
  if (event.key === "End" && !event.shiftKey) return "playback.goToEnd";
  if ((event.key === "i" || event.key === "I") && event.shiftKey) return "playback.goToInPoint";
  if ((event.key === "o" || event.key === "O") && event.shiftKey) return "playback.goToOutPoint";
  if (event.key === "[" && !event.shiftKey) return "shot.trimStartToPlayhead";
  if (event.key === "]" && !event.shiftKey) return "shot.trimEndToPlayhead";
  if (event.key === "Enter" && !event.shiftKey) return "shot.splitAtPlayhead";
  if ((event.key === "i" || event.key === "I") && !event.shiftKey) return "selection.setInPoint";
  if ((event.key === "o" || event.key === "O") && !event.shiftKey) return "selection.setOutPoint";
  if ((event.key === "m" || event.key === "M") && !event.shiftKey) return "marker.create";
  if ((event.key === "f" || event.key === "F") && !event.shiftKey) return "preview.toggleFullscreen";
  if (event.key === "0" && !event.shiftKey) return "preview.fitCanvas";
  if ((event.key === "=" || event.key === "+") && !event.shiftKey) return "timeline.zoomIn";
  if ((event.key === "-" || event.key === "_") && !event.shiftKey) return "timeline.zoomOut";
  if (event.key === "Escape") return "interaction.cancel";
  if (event.key === "?" && event.shiftKey) return "help.show";
  if ((event.key === "Delete" || event.key === "Backspace") && !event.shiftKey) return "editing.delete";
  return null;
}

export default function useEditorShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || event.repeat) return;
      const action = getShortcutAction(event);
      const hasInteractionOwner = document.querySelector('[role="dialog"], [role="menu"], [data-focus-analysis]')
      if ((isTypingTarget(event.target) || hasInteractionOwner) && action !== "file.save") return;
      const handler = action ? handlers[action] : undefined;
      if (!handler) return;
      event.preventDefault();
      event.stopPropagation();
      handler();
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [handlers]);
}
