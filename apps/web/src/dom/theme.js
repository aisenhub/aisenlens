function updateThemeButton(theme) {
  const button = document.getElementById('themeToggle');
  if (!button) return;
  const icon = theme === 'light'
    ? '<svg class="header-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.7 6.7 0 0 0 21 12.8Z"/></svg>'
    : '<svg class="header-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const label = theme === 'light' ? '关灯' : '开灯';
  button.innerHTML = icon;
  button.title = label;
  button.setAttribute('aria-label', label);
}

export function initTheme(onChange) {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeButton(saved);

  const button = document.getElementById('themeToggle');
  if (!button) return;
  button.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeButton(next);
    if (typeof onChange === 'function') onChange(next);
  });
}
