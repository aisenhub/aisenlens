import { createAppError, normalizeAppError } from './diagnostics.js';

function getErrorName(error) {
  return String(error?.name || '').toLowerCase();
}

export function getStorageErrorKind(error) {
  const name = getErrorName(error);
  const code = Number(error?.code);
  if (name.includes('quota') || code === 22 || code === 1014) return 'quota';
  if (name.includes('notallowed') || name.includes('permission')) return 'permission';
  if (name.includes('security') || name.includes('invalidstate') || name.includes('notsupported')) return 'unavailable';
  return 'unknown';
}

export function normalizeStorageError(error, {
  operation = '本地数据操作',
  fallback = {}
} = {}) {
  const kind = getStorageErrorKind(error);
  const profiles = {
    quota: {
      code: 'STORAGE_QUOTA_EXCEEDED',
      title: '浏览器存储空间不足',
      action: '请清理项目截图或网站缓存后重试。'
    },
    permission: {
      code: 'STORAGE_PERMISSION_DENIED',
      title: '没有存储或文件夹权限',
      action: '请在浏览器权限设置中允许访问，或重新选择有权限的文件夹。'
    },
    unavailable: {
      code: 'STORAGE_UNAVAILABLE',
      title: '浏览器存储不可用',
      action: '请使用正常浏览器窗口，并通过 localhost 或 HTTPS 访问应用。'
    }
  };
  const profile = profiles[kind];
  if (!profile) return normalizeAppError(error, fallback);
  return createAppError(profile.code, `${operation}失败`, {
    title: profile.title,
    action: profile.action,
    cause: error
  });
}
