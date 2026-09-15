import assert from "node:assert/strict"
import test from "node:test"
import { evaluate, launchBrowser, until, wait, browserPath } from "../shot-calibration/calibration-browser-harness.js"

const databaseName = "aisenlens-projects"

async function navigate(client, sessionId, url) {
  await client.send("Page.navigate", { url }, sessionId)
  await until(async () => (await evaluate(client, sessionId, `location.href === ${JSON.stringify(url)}`)), `页面未导航到 ${url}`)
}

async function seedV17(client, sessionId) {
  await evaluate(client, sessionId, `new Promise((resolve, reject) => {
    const remove = indexedDB.deleteDatabase(${JSON.stringify(databaseName)});
    remove.onerror = () => reject(remove.error ?? new Error('无法清理隔离测试数据库。'));
    remove.onblocked = () => reject(new Error('隔离测试数据库仍被旧页面连接。'));
    remove.onsuccess = () => {
      const request = indexedDB.open(${JSON.stringify(databaseName)}, 17);
      request.onerror = () => reject(request.error ?? new Error('无法创建 v17 fixture。'));
      request.onupgradeneeded = () => {
        const db = request.result;
        const project = {
          id: 'migration-project', title: 'Migration Fixture', description: '', shots: 0, notes: 0,
          folderId: null, coverScreenshotId: null, mediaAssets: [], primaryVideoAssetId: null,
          audioTracks: [], createdAt: '2026-09-15T00:00:00.000Z', updatedAt: '2026-09-15T00:00:00.000Z'
        };
        const marker = {
          id: 'legacy-marker', projectId: project.id, frame: 12, shotId: null,
          category: 'important', label: '迁移标记', note: 'v17 note',
          createdAt: '2026-09-15T00:00:00.000Z', updatedAt: '2026-09-15T00:00:00.000Z'
        };
        const projects = db.createObjectStore('projects', { keyPath: 'id' });
        projects.createIndex('updatedAt', 'updatedAt', { unique: false });
        projects.createIndex('folderId', 'folderId', { unique: false });
        const markerStore = db.createObjectStore('annotation-markers', { keyPath: 'id' });
        markerStore.createIndex('projectId', 'projectId', { unique: false });
        markerStore.createIndex('projectFrame', ['projectId', 'frame'], { unique: false });
        const snapshotStore = db.createObjectStore('recovery-snapshots', { keyPath: 'id' });
        snapshotStore.createIndex('projectId', 'projectId', { unique: false });
        snapshotStore.createIndex('projectCreatedAt', ['projectId', 'createdAt'], { unique: false });
        projects.put(project);
        markerStore.put(marker);
        snapshotStore.put({ id: 'legacy-snapshot', projectId: project.id, createdAt: project.createdAt, project, shots: [], groups: [], markers: [marker], template: null });
      };
      request.onsuccess = () => { request.result.close(); resolve(true); };
    };
  })`)
}

test("IndexedDB v17 migration, atomic save, recovery and backup v4 round-trip", { timeout: 120_000 }, async (context) => {
  if (!browserPath) { context.skip("未找到 Chrome/Edge；可设置 AISENLENS_CHROME_PATH 后重试。"); return }
  const { client, sessionId, serverPort } = await launchBrowser(context, "timeline-semantic-data")
  const baseUrl = `http://127.0.0.1:${serverPort}`
  await navigate(client, sessionId, `${baseUrl}/@vite/client`)
  await wait(300)
  await seedV17(client, sessionId)
  await navigate(client, sessionId, `${baseUrl}/projects`)
  await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('Migration Fixture')")), "迁移后的项目库未加载")

  const migration = await evaluate(client, sessionId, `new Promise((resolve, reject) => {
    const request = indexedDB.open(${JSON.stringify(databaseName)});
    request.onerror = () => reject(request.error ?? new Error('无法读取迁移数据库。'));
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['annotation-markers', 'recovery-snapshots'], 'readonly');
      Promise.all([
        new Promise((done, fail) => { const item = transaction.objectStore('annotation-markers').get('legacy-marker'); item.onsuccess = () => done(item.result); item.onerror = () => fail(item.error); }),
        new Promise((done, fail) => { const item = transaction.objectStore('recovery-snapshots').get('legacy-snapshot'); item.onsuccess = () => done(item.result); item.onerror = () => fail(item.error); })
      ]).then(([marker, snapshot]) => { resolve({ version: db.version, marker, snapshotMarker: snapshot?.markers?.[0], stores: [...db.objectStoreNames] }); db.close(); }, reject);
    };
  })`)
  assert.equal(migration.version, 18)
  assert.deepEqual(migration.marker, { id: "legacy-marker", projectId: "migration-project", frame: 12, content: "迁移标记\nv17 note", scope: "free", createdAt: "2026-09-15T00:00:00.000Z", updatedAt: "2026-09-15T00:00:00.000Z" })
  assert.deepEqual(migration.snapshotMarker, migration.marker)
  assert.ok(migration.stores.includes("research-contexts"))

  const result = await evaluate(client, sessionId, `(async () => {
    const [{ default: repository, setProjectRepositoryFaultInjector }, { createProjectRecoverySnapshot, restoreProjectRecoverySnapshot }, { exportProjectBackupBlob, importProjectBackup }] = await Promise.all([
      import('/src/features/project/services/projectRepository.ts'),
      import('/src/features/project/services/projectRecoveryService.ts'),
      import('/src/features/project/services/projectBackupService.ts')
    ]);
    const project = await repository.createProject({ title: '数据回归项目' });
    const now = '2026-09-15T00:00:00.000Z';
    const shotA = { id: 'shot-data-a', projectId: project.id, order: 0, startFrame: 0, endFrame: 50, status: 'confirmed', detection: { source: 'manual' }, primaryScreenshotId: null, screenshotIds: [], firstFrameScreenshotId: null, lastFrameScreenshotId: null, analysisFields: {}, description: 'A', notes: '', createdAt: now, updatedAt: now };
    const shotB = { ...shotA, id: 'shot-data-b', order: 1, startFrame: 50, endFrame: 100, description: 'B' };
    const group = { id: 'group-data-scene', projectId: project.id, kind: 'scene', title: '数据场景', summary: '恢复验证', shotIds: [shotA.id, shotB.id], createdAt: now, updatedAt: now };
    const marker = { id: 'marker-data-main', projectId: project.id, frame: 60, content: '主 Marker\\n多行', scope: 'scene', createdAt: now, updatedAt: now };
    const context = { id: 'context-data-scene', projectId: project.id, target: { kind: 'group', id: group.id }, question: '恢复后仍可复核吗？', status: 'completed', needsReview: false, needsReviewReasons: [], structureRevision: 1, evidence: [{ id: 'evidence-marker', kind: 'marker', projectId: project.id, mediaIdentityDigest: 'digest', markerId: marker.id }], createdAt: now, updatedAt: now, revision: 1 };
    const state = { project, shots: [shotA, shotB], groups: [group], markers: [marker], template: null, researchRanges: [], researchContexts: [context] };
    await repository.saveProjectEditorState(state);
    const snapshot = await createProjectRecoverySnapshot(project.id);
    if (!snapshot) throw new Error('恢复快照未创建。');
    await repository.saveProjectEditorState({ ...state, project: { ...state.project, description: '已破坏状态' }, groups: [], markers: [], researchContexts: [] });
    await restoreProjectRecoverySnapshot(snapshot.id, project.id);
    const restored = await repository.readProjectEditorState(project.id);
    if (!restored) throw new Error('恢复后项目不存在。');
    setProjectRepositoryFaultInjector((point) => { if (point === 'markers-write') throw new Error('injected-marker-write'); });
    let faultMessage = null;
    try { await repository.saveProjectEditorState({ ...restored, project: { ...restored.project, description: '不应保存' }, markers: [...restored.markers, { ...marker, id: 'marker-data-extra', content: '不应写入' }] }); } catch (error) { faultMessage = error instanceof Error ? error.message : String(error); }
    setProjectRepositoryFaultInjector(null);
    const afterFault = await repository.readProjectEditorState(project.id);
    if (!afterFault) throw new Error('故障注入后项目不存在。');
    let staleMessage = null;
    try { await repository.saveProjectEditorState({ ...afterFault, project: { ...afterFault.project, description: '过期写入' } }, '1970-01-01T00:00:00.000Z'); } catch (error) { staleMessage = error instanceof Error ? error.message : String(error); }
    const backup = await exportProjectBackupBlob(project.id);
    const importedProject = await importProjectBackup(new File([backup.blob], backup.name, { type: 'application/zip' }));
    const importedState = await repository.readProjectEditorState(importedProject.id);
    return {
      projectId: project.id,
      restored: { shots: restored.shots.length, groups: restored.groups.length, markers: restored.markers.map((item) => item.content), contexts: restored.researchContexts?.length ?? 0 },
      faultMessage, afterFault: { description: afterFault.project.description, markers: afterFault.markers.length, groups: afterFault.groups.length },
      staleMessage, backupName: backup.name,
      imported: importedState ? { title: importedState.project.title, shots: importedState.shots.length, groups: importedState.groups.length, markers: importedState.markers.map((item) => item.content), contexts: importedState.researchContexts?.length ?? 0 } : null
    };
  })()`)
  assert.equal(result.restored.shots, 2)
  assert.equal(result.restored.groups, 1)
  assert.deepEqual(result.restored.markers, ["主 Marker\n多行"])
  assert.equal(result.restored.contexts, 1)
  assert.equal(result.afterFault.description, "")
  assert.equal(result.afterFault.markers, 1)
  assert.equal(result.afterFault.groups, 1)
  assert.equal(result.faultMessage, "injected-marker-write")
  assert.match(result.staleMessage, /其他标签页更新/)
  assert.match(result.backupName, /数据回归项目.*aisenlens-backup\.zip/)
  assert.deepEqual(result.imported, { title: "数据回归项目（已恢复）", shots: 2, groups: 1, markers: ["主 Marker\n多行"], contexts: 1 })
})
