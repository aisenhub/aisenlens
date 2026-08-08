export const CURRENT_PROJECT_FORMAT_VERSION = 2;

function createUnsupportedProjectFormatError(version) {
  const error = new Error(`Unsupported project format version: ${version}`);
  error.code = 'PROJECT_FORMAT_UNSUPPORTED';
  return error;
}

const clone = value => {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

export function migrateProjectDocument(project = {}) {
  const next = { ...clone(project) };
  if (next.formatVersion === undefined || next.formatVersion === null || next.formatVersion === '') next.formatVersion = 1;
  const formatVersion = Number(next.formatVersion);
  if (!Number.isInteger(formatVersion) || formatVersion < 1 || formatVersion > CURRENT_PROJECT_FORMAT_VERSION) {
    throw createUnsupportedProjectFormatError(next.formatVersion);
  }
  next.formatVersion = formatVersion;
  if (next.formatVersion < 2) {
    next.formatVersion = 2;
    if (!Object.prototype.hasOwnProperty.call(next, 'autoShotState')) next.autoShotState = null;
  }
  return next;
}

export function migrateProjectShots(shots = []) {
  return (Array.isArray(shots) ? shots : []).map(shot => {
    const next = { ...clone(shot) };
    if (next.start_time === undefined) next.start_time = Number(next.time) || 0;
    if (next.end_time === undefined) next.end_time = next.segmentEnd ?? next.start_time;
    if (next.custom === undefined || typeof next.custom !== 'string') next.custom = JSON.stringify(next.custom || {});
    return next;
  });
}

export function migrateProjectBundle({ project, shots, groups } = {}) {
  return {
    project: migrateProjectDocument(project),
    shots: migrateProjectShots(shots),
    groups: Array.isArray(groups) ? groups.map(group => ({ ...group, shotIds: [...(group.shotIds || [])] })) : []
  };
}
