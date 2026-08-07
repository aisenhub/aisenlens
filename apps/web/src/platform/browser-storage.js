export function readJsonStorage(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
}

export function writeJsonStorage(key, value, onError = () => {}) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    onError(error);
    return false;
  }
}

export function removeStorageKeys(keys) {
  if (!Array.isArray(keys)) return;
  keys.forEach(key => {
    try { localStorage.removeItem(key); } catch (_) {}
  });
}
