import { getPlatformShortcut } from '../app/action-catalog.js';

export function createShortcutHelpController({
  container,
  definitions = [],
  platform = ''
} = {}) {
  const render = () => {
    if (!container) return;
    container.replaceChildren();
    definitions.forEach(definition => {
      if (!definition.shortcut) return;
      const row = document.createElement('div');
      row.className = 'sc-row';
      const shortcut = document.createElement('kbd');
      shortcut.textContent = getPlatformShortcut(definition.shortcut, platform);
      const label = document.createElement('span');
      label.textContent = definition.label;
      label.title = definition.description || '';
      row.append(shortcut, label);
      container.appendChild(row);
    });
  };
  return { render };
}
