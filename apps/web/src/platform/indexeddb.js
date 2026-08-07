import { createProjectUuid } from '../utils/ids.js';
import { createTimelineViewState } from '../features/project/project-view-state.js';

/* ===================================================================
 *  IndexedDB Layer
 * =================================================================== */
const DB_NAME = 'AshenVideoLocalDB';
const DB_VERSION = 4;
let db = null;

export function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = function(e) {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('projects')) {
        const ps = d.createObjectStore('projects', { keyPath: 'id', autoIncrement: true });
        ps.createIndex('title', 'title', { unique: false });
      }
      if (!d.objectStoreNames.contains('shots')) {
        const ss = d.createObjectStore('shots', { keyPath: 'id', autoIncrement: true });
        ss.createIndex('projectId', 'projectId', { unique: false });
        ss.createIndex('projectShotId', ['projectId', 'shotId'], { unique: true });
      } else {
        const ss = e.target.transaction.objectStore('shots');
        if (!ss.indexNames.contains('projectShotId')) {
          ss.createIndex('projectShotId', ['projectId', 'shotId'], { unique: true });
        }
      }
      if (!d.objectStoreNames.contains('shotGroups')) {
        const gs = d.createObjectStore('shotGroups', { keyPath: 'id' });
        gs.createIndex('projectId', 'projectId', { unique: false });
      }
      if (!d.objectStoreNames.contains('settings')) {
        d.createObjectStore('settings', { keyPath: 'key' });
      }
      if (!d.objectStoreNames.contains('screenshotAssets')) {
        const as = d.createObjectStore('screenshotAssets', { keyPath: 'key' });
        as.createIndex('projectId', 'projectId', { unique: false });
        as.createIndex('shotId', 'shotId', { unique: false });
      }
    };
    req.onsuccess = function(e) { db = e.target.result; resolve(db); };
    req.onerror = function(e) { reject(e.target.error); };
  });
}

export function dbOp(storeName, mode, fn) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const result = fn(store);
      if (result && typeof result.then === 'function') {
        result.then(resolve).catch(reject);
      }
      tx.oncomplete = function() { if (!(result && typeof result.then === 'function')) resolve(result); };
      tx.onerror = function(e) { reject(e.target.error); };
    });
  });
}

export function dbCreateProject(title, videoFileName, duration, templateType, projectUuid) {
  const p = {
    title,
    videoFileName: videoFileName || '',
    duration: duration || 0,
    templateType: templateType || '默认模板',
    projectUuid: projectUuid || createProjectUuid(),
    timelineViewState: createTimelineViewState(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  return dbOp('projects', 'readwrite', store => {
    return new Promise((resolve, reject) => {
      const req = store.add(p);
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function(e) { reject(e.target.error); };
    });
  });
}

export function dbGetProject(id) {
  return dbOp('projects', 'readonly', store => {
    return new Promise((resolve, reject) => {
      const req = store.get(Number(id));
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function(e) { reject(e.target.error); };
    });
  });
}

export function dbGetAllProjects() {
  return dbOp('projects', 'readonly', store => {
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = function() {
        const list = req.result || [];
        list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        resolve(list);
      };
      req.onerror = function(e) { reject(e.target.error); };
    });
  });
}

export function dbUpdateProject(id, updates) {
  return dbOp('projects', 'readwrite', store => {
    return new Promise((resolve, reject) => {
      const getReq = store.get(Number(id));
      getReq.onsuccess = function() {
        const p = getReq.result;
        if (!p) return reject(new Error('Project not found'));
        Object.assign(p, updates, { updatedAt: new Date().toISOString() });
        const putReq = store.put(p);
        putReq.onsuccess = function() { resolve(putReq.result); };
        putReq.onerror = function(e) { reject(e.target.error); };
      };
      getReq.onerror = function(e) { reject(e.target.error); };
    });
  });
}

export function dbDeleteProject(id) {
  return dbOp('projects', 'readwrite', store => {
    return new Promise((resolve, reject) => {
      const req = store.delete(Number(id));
      req.onsuccess = function() { resolve(true); };
      req.onerror = function(e) { reject(e.target.error); };
    });
  }).then(() => {
    // Also delete all shots for this project
    return dbOp('shots', 'readwrite', store => {
      const index = store.index('projectId');
      const range = IDBKeyRange.only(Number(id));
      return new Promise((resolve, reject) => {
        const req = index.openCursor(range);
        req.onsuccess = function(e) {
          const cursor = e.target.result;
          if (cursor) { cursor.delete(); cursor.continue(); }
          else { resolve(true); }
        };
        req.onerror = function(e) { reject(e.target.error); };
      });
    });
  }).then(() => {
    return dbOp('shotGroups', 'readwrite', store => {
      const index = store.index('projectId');
      const range = IDBKeyRange.only(Number(id));
      return new Promise((resolve, reject) => {
        const req = index.openCursor(range);
        req.onsuccess = function(e) {
          const cursor = e.target.result;
          if (cursor) { cursor.delete(); cursor.continue(); }
          else { resolve(true); }
        };
        req.onerror = function(e) { reject(e.target.error); };
      });
    });
  }).then(() => {
    return dbOp('screenshotAssets', 'readwrite', store => {
      const index = store.index('projectId');
      const range = IDBKeyRange.only(Number(id));
      return new Promise((resolve, reject) => {
        const req = index.openCursor(range);
        req.onsuccess = function(e) {
          const cursor = e.target.result;
          if (cursor) { cursor.delete(); cursor.continue(); }
          else resolve(true);
        };
        req.onerror = function(e) { reject(e.target.error); };
      });
    });
  });
}

export function dbGetShots(projectId) {
  return dbOp('shots', 'readonly', store => {
    const index = store.index('projectId');
    const range = IDBKeyRange.only(Number(projectId));
    return new Promise((resolve, reject) => {
      const req = index.getAll(range);
      req.onsuccess = function() { resolve(req.result || []); };
      req.onerror = function(e) { reject(e.target.error); };
    });
  });
}

export function dbGetShotGroups(projectId) {
  return dbOp('shotGroups', 'readonly', store => {
    const index = store.index('projectId');
    const range = IDBKeyRange.only(Number(projectId));
    return new Promise((resolve, reject) => {
      const req = index.getAll(range);
      req.onsuccess = function() { resolve(req.result || []); };
      req.onerror = function(e) { reject(e.target.error); };
    });
  });
}

export function dbSaveShotGroups(projectId, groups) {
  return dbOp('shotGroups', 'readwrite', store => {
    return new Promise((resolve, reject) => {
      const index = store.index('projectId');
      const range = IDBKeyRange.only(Number(projectId));
      const cursorReq = index.openCursor(range);
      cursorReq.onsuccess = function(e) {
        const cursor = e.target.result;
        if (cursor) { cursor.delete(); cursor.continue(); return; }
        const list = Array.isArray(groups) ? groups : [];
        if (!list.length) { resolve(0); return; }
        let completed = 0;
        list.forEach(group => {
          const request = store.add({ projectId: Number(projectId), ...group });
          request.onsuccess = () => { completed += 1; if (completed === list.length) resolve(completed); };
          request.onerror = event => reject(event.target.error);
        });
      };
      cursorReq.onerror = function(e) { reject(e.target.error); };
    });
  });
}

export function dbSaveShots(projectId, shotsArray) {
  return dbOp('shots', 'readwrite', store => {
    return new Promise((resolve, reject) => {
      // Delete existing shots for this project
      const index = store.index('projectId');
      const range = IDBKeyRange.only(Number(projectId));
      const cursorReq = index.openCursor(range);
      cursorReq.onsuccess = function(e) {
        const cursor = e.target.result;
        if (cursor) { cursor.delete(); cursor.continue(); }
        else {
          // Add new shots
          let count = 0;
          const total = shotsArray.length;
          if (total === 0) return resolve(0);
          for (const s of shotsArray) {
            const addReq = store.add({ projectId: Number(projectId), ...s });
            addReq.onsuccess = function() {
              count++;
              if (count >= total) resolve(count);
            };
            addReq.onerror = function(e) { reject(e.target.error); };
          }
        }
      };
      cursorReq.onerror = function(e) { reject(e.target.error); };
    });
  });
}

export function dbSaveShotsIncremental(projectId, shotsArray = [], deletedShotIds = []) {
  const upserts = Array.isArray(shotsArray) ? shotsArray.filter(shot => shot && shot.shotId) : [];
  const deletes = [...new Set((Array.isArray(deletedShotIds) ? deletedShotIds : []).filter(Boolean).map(String))];
  if (!projectId || (!upserts.length && !deletes.length)) return Promise.resolve({ upserted: 0, deleted: 0 });
  return dbOp('shots', 'readwrite', store => {
    return new Promise((resolve, reject) => {
      const index = store.index('projectShotId');
      const projectKey = Number(projectId);
      let upsertIndex = 0;
      let deleteIndex = 0;
      let deleted = 0;
      let upserted = 0;

      const upsertNext = () => {
        if (upsertIndex >= upserts.length) {
          resolve({ upserted, deleted });
          return;
        }
        const shot = upserts[upsertIndex++];
        const range = IDBKeyRange.only([projectKey, String(shot.shotId)]);
        const keyRequest = index.getKey(range);
        keyRequest.onsuccess = () => {
          const record = { ...shot, projectId: projectKey };
          const request = keyRequest.result === undefined
            ? store.add(record)
            : store.put({ ...record, id: keyRequest.result });
          request.onsuccess = () => { upserted += 1; upsertNext(); };
          request.onerror = event => reject(event.target.error);
        };
        keyRequest.onerror = event => reject(event.target.error);
      };

      const deleteNext = () => {
        if (deleteIndex >= deletes.length) {
          upsertNext();
          return;
        }
        const shotId = deletes[deleteIndex++];
        const range = IDBKeyRange.only([projectKey, shotId]);
        const cursorRequest = index.openCursor(range);
        cursorRequest.onsuccess = event => {
          const cursor = event.target.result;
          if (!cursor) {
            deleteNext();
            return;
          }
          cursor.delete();
          deleted += 1;
          cursor.continue();
        };
        cursorRequest.onerror = event => reject(event.target.error);
      };

      deleteNext();
    });
  });
}

export function dbGetScreenshotAssets(projectId) {
  if (!projectId) return Promise.resolve([]);
  return dbOp('screenshotAssets', 'readonly', store => {
    return new Promise((resolve, reject) => {
      const request = store.index('projectId').getAll(IDBKeyRange.only(Number(projectId)));
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = event => reject(event.target.error);
    });
  });
}

export function dbSaveScreenshotAssets(projectId, assets) {
  if (!projectId || !Array.isArray(assets) || !assets.length) return Promise.resolve(0);
  return dbOp('screenshotAssets', 'readwrite', store => {
    return new Promise((resolve, reject) => {
      let pending = assets.length;
      assets.forEach(asset => {
        const record = {
          key: asset.key,
          projectId: Number(projectId),
          shotId: String(asset.shotId),
          type: asset.type,
          storage: asset.storage || 'indexeddb',
          resourceName: asset.resourceName || '',
          size: Number(asset.size) || Number(asset.blob?.size) || 0,
          width: Number(asset.width) || 0,
          height: Number(asset.height) || 0,
          updatedAt: new Date().toISOString()
        };
        if (record.storage === 'indexeddb') record.blob = asset.blob;
        const request = store.put(record);
        request.onsuccess = () => { pending -= 1; if (!pending) resolve(assets.length); };
        request.onerror = event => reject(event.target.error);
      });
    });
  });
}

export function dbDeleteScreenshotAssets(projectId, shotIds) {
  const ids = new Set((shotIds || []).map(String));
  if (!projectId || !ids.size) return Promise.resolve(0);
  return dbOp('screenshotAssets', 'readwrite', store => {
    return new Promise((resolve, reject) => {
      let deleted = 0;
      const request = store.index('projectId').openCursor(IDBKeyRange.only(Number(projectId)));
      request.onsuccess = event => {
        const cursor = event.target.result;
        if (!cursor) { resolve(deleted); return; }
        if (ids.has(String(cursor.value.shotId))) {
          cursor.delete();
          deleted += 1;
        }
        cursor.continue();
      };
      request.onerror = event => reject(event.target.error);
    });
  });
}

export function dbPruneScreenshotAssets(projectId, validShotIds) {
  if (!projectId) return Promise.resolve(0);
  const ids = new Set((validShotIds || []).map(String));
  return dbOp('screenshotAssets', 'readwrite', store => {
    return new Promise((resolve, reject) => {
      let deleted = 0;
      const request = store.index('projectId').openCursor(IDBKeyRange.only(Number(projectId)));
      request.onsuccess = event => {
        const cursor = event.target.result;
        if (!cursor) { resolve(deleted); return; }
        if (!ids.has(String(cursor.value.shotId))) {
          cursor.delete();
          deleted += 1;
        }
        cursor.continue();
      };
      request.onerror = event => reject(event.target.error);
    });
  });
}

export function dbGetSetting(key) {
  return dbOp('settings', 'readonly', store => {
    return new Promise((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = function() { resolve(req.result ? req.result.value : null); };
      req.onerror = function(e) { reject(e.target.error); };
    });
  });
}

export function dbSetSetting(key, value) {
  return dbOp('settings', 'readwrite', store => {
    return new Promise((resolve, reject) => {
      const req = store.put({ key, value });
      req.onsuccess = function() { resolve(true); };
      req.onerror = function(e) { reject(e.target.error); };
    });
  });
}

export function dbDeleteSetting(key) {
  return dbOp('settings', 'readwrite', store => {
    return new Promise((resolve, reject) => {
      const req = store.delete(key);
      req.onsuccess = function() { resolve(true); };
      req.onerror = function(e) { reject(e.target.error); };
    });
  });
}
