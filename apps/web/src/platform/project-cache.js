import { clearAllScreenshotAssets } from '../features/screenshots/screenshot-assets.js';

export function createProjectCacheAdapter({ openDatabase } = {}) {
  const estimateBytes = value => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'string') return value.length * 2;
    if (typeof value === 'number' || typeof value === 'boolean') return 8;
    if (typeof Blob !== 'undefined' && value instanceof Blob) return value.size;
    if (Array.isArray(value)) return value.reduce((total, item) => total + estimateBytes(item), 16);
    if (typeof value === 'object') return Object.entries(value).reduce((total, [key, item]) => total + key.length * 2 + estimateBytes(item), 32);
    return 0;
  };

  const getStats = () => openDatabase().then(database => new Promise((resolve, reject) => {
    const storeNames = ['projects', 'shots', 'shotGroups', 'settings', 'screenshotAssets'];
    const transaction = database.transaction(storeNames, 'readonly');
    const records = {};
    let pending = storeNames.length;
    storeNames.forEach(storeName => {
      const request = transaction.objectStore(storeName).getAll();
      request.onsuccess = () => {
        records[storeName] = request.result || [];
        pending -= 1;
        if (pending === 0) resolve({
          projects: records.projects.length,
          shots: records.shots.length,
          groups: records.shotGroups.length,
          screenshotAssets: records.screenshotAssets.length,
          settings: records.settings.length,
          bytes: estimateBytes(records)
        });
      };
      request.onerror = event => reject(event.target.error || new Error('读取项目缓存失败'));
    });
    transaction.onerror = event => reject(event.target.error || new Error('读取项目缓存失败'));
  }));

  const clearDatabase = () => openDatabase().then(database => new Promise((resolve, reject) => {
    const stores = ['projects', 'shots', 'shotGroups', 'settings', 'screenshotAssets'];
    const transaction = database.transaction(stores, 'readwrite');
    stores.forEach(name => transaction.objectStore(name).clear());
    transaction.oncomplete = resolve;
    transaction.onerror = event => reject(event.target.error || new Error('清除项目缓存失败'));
    transaction.onabort = event => reject(event.target.error || new Error('清除项目缓存失败'));
  }));

  const clear = async () => {
    await clearDatabase();
    await clearAllScreenshotAssets();
  };

  return { getStats, clear };
}
