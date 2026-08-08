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
    const storeNames = ['projects', 'shots', 'shotGroups', 'settings', 'screenshotAssets', 'mediaAssets'];
    const transaction = database.transaction(storeNames, 'readonly');
    const records = {};
    let pending = storeNames.length;
    storeNames.forEach(storeName => {
      const request = transaction.objectStore(storeName).getAll();
      request.onsuccess = () => {
        records[storeName] = request.result || [];
        pending -= 1;
        if (pending === 0) {
          const screenshotBytes = records.screenshotAssets.reduce((total, asset) => total + (Number(asset.size) || 0), 0);
          const mediaBytes = records.mediaAssets.reduce((total, asset) => total + (Number(asset.size) || 0), 0);
          resolve({
            projects: records.projects.length,
            shots: records.shots.length,
            groups: records.shotGroups.length,
            screenshotAssets: records.screenshotAssets.length,
            mediaAssets: records.mediaAssets.length,
            settings: records.settings.length,
            resourceBytes: screenshotBytes + mediaBytes,
            bytes: estimateBytes(records)
          });
        }
      };
      request.onerror = event => reject(event.target.error || new Error('Failed to read project storage'));
    });
    transaction.onerror = event => reject(event.target.error || new Error('Failed to read project storage'));
  }));

  const getRecoverySummary = () => openDatabase().then(database => new Promise((resolve, reject) => {
    const transaction = database.transaction(['projects', 'settings'], 'readonly');
    const projectsRequest = transaction.objectStore('projects').getAll();
    const pendingSaveRequest = transaction.objectStore('settings').get('pendingProjectSave');
    let projects = [];
    let pendingSave = null;

    projectsRequest.onsuccess = () => { projects = projectsRequest.result || []; };
    projectsRequest.onerror = event => reject(event.target.error || new Error('Failed to read project recovery status'));
    pendingSaveRequest.onsuccess = () => { pendingSave = pendingSaveRequest.result?.value || null; };
    pendingSaveRequest.onerror = event => reject(event.target.error || new Error('Failed to read project recovery status'));
    transaction.oncomplete = () => resolve({
      pendingSave,
      projects: projects
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 5)
        .map(({ id, title, updatedAt }) => ({ id, title, updatedAt }))
    });
    transaction.onerror = event => reject(event.target.error || new Error('Failed to read project recovery status'));
  }));

  return { getStats, getRecoverySummary };
}
