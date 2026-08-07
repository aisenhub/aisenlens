export function createShotAutoSaveState(serializedShots = []) {
  const state = new Map();
  (Array.isArray(serializedShots) ? serializedShots : []).forEach(shot => {
    state.set(String(shot.shotId), {
      shot,
      signature: JSON.stringify(shot)
    });
  });
  return state;
}

export function createShotSnapshot(state = new Map()) {
  return new Map([...state].map(([shotId, value]) => [shotId, value.signature]));
}

export function getShotAutoSaveChanges(currentState, previousSnapshot = new Map()) {
  const upserts = [];
  for (const [shotId, value] of currentState) {
    if (previousSnapshot.get(shotId) !== value.signature) upserts.push(value.shot);
  }
  const deletedShotIds = [...previousSnapshot.keys()].filter(shotId => !currentState.has(shotId));
  return { upserts, deletedShotIds };
}

export function mergeShotSnapshot(snapshot, savedState, deletedShotIds, latestState) {
  const nextSnapshot = new Map(snapshot);
  for (const [shotId, value] of savedState) {
    if (latestState.get(shotId)?.signature === value.signature) {
      nextSnapshot.set(shotId, value.signature);
    }
  }
  for (const shotId of deletedShotIds) {
    if (!latestState.has(shotId)) nextSnapshot.delete(shotId);
  }
  return nextSnapshot;
}
