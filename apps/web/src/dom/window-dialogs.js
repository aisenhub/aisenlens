export function createWindowDialogAdapter(windowTarget = window) {
  return {
    prompt: (message, defaultValue) => windowTarget.prompt(message, defaultValue),
    confirm: message => windowTarget.confirm(message)
  };
}
