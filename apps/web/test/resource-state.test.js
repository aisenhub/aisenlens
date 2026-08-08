import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RESOURCE_STATUS,
  assertResourceTransition,
  withResourceStatus
} from '../src/platform/resource-state.js';

test('resource state machine only allows explicit lifecycle transitions', () => {
  assert.equal(assertResourceTransition(RESOURCE_STATUS.PENDING, RESOURCE_STATUS.READY), RESOURCE_STATUS.READY);
  assert.equal(withResourceStatus({ id: 'asset-1', status: RESOURCE_STATUS.READY }, RESOURCE_STATUS.DELETED).status, RESOURCE_STATUS.DELETED);
  assert.throws(
    () => assertResourceTransition(RESOURCE_STATUS.FAILED, RESOURCE_STATUS.READY),
    { code: 'RESOURCE_STATUS_TRANSITION_INVALID' }
  );
});
