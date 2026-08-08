import test from 'node:test';
import assert from 'node:assert/strict';
import { migrateProjectDocument } from '../src/features/project/project-migrations.js';

test('migrates v1 project documents to the current version', () => {
  const migrated = migrateProjectDocument({ formatVersion: 1, title: 'Demo' });

  assert.equal(migrated.formatVersion, 2);
  assert.equal(migrated.autoShotState, null);
});

test('rejects project documents newer than the supported format', () => {
  assert.throws(() => migrateProjectDocument({ formatVersion: 3 }), { code: 'PROJECT_FORMAT_UNSUPPORTED' });
});

test('rejects invalid project format versions', () => {
  assert.throws(() => migrateProjectDocument({ formatVersion: 'unknown' }), { code: 'PROJECT_FORMAT_UNSUPPORTED' });
});
