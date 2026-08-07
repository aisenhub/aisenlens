export function createObjectUrlRegistry({ urlApi = globalThis.URL } = {}) {
  const urls = new Map();

  const create = (key, blob) => {
    if (!key || !blob || typeof urlApi?.createObjectURL !== 'function') return '';
    revoke(key);
    const url = urlApi.createObjectURL(blob);
    urls.set(String(key), url);
    return url;
  };

  const revoke = key => {
    const normalizedKey = String(key || '');
    const url = urls.get(normalizedKey);
    if (!url) return false;
    try { urlApi.revokeObjectURL?.(url); } catch (_) {}
    urls.delete(normalizedKey);
    return true;
  };

  const revokeUrl = url => {
    for (const [key, current] of urls) {
      if (current === url) return revoke(key);
    }
    return false;
  };

  const clear = () => {
    [...urls.keys()].forEach(revoke);
  };

  const revokePrefix = prefix => {
    const normalizedPrefix = String(prefix || '');
    let count = 0;
    [...urls.keys()].forEach(key => {
      if (key.startsWith(normalizedPrefix) && revoke(key)) count += 1;
    });
    return count;
  };

  return { create, revoke, revokeUrl, revokePrefix, clear, size: () => urls.size, keys: () => [...urls.keys()], get: key => urls.get(String(key || '')) || '' };
}

export const screenshotObjectUrls = createObjectUrlRegistry();
