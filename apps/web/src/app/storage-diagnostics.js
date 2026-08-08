import { createAppError, normalizeAppError } from './diagnostics.js';

function getErrorName(error) {
  return String(error?.name || '').toLowerCase();
}

export function getStorageErrorKind(error) {
  const name = getErrorName(error);
  const code = String(error?.code || '').toLowerCase();
  const numericCode = Number(error?.code);
  if (name.includes('quota') || code.includes('quota') || numericCode === 22 || numericCode === 1014) return 'quota';
  if (name.includes('version') || name.includes('constraint')) return 'database';
  if (name.includes('abort')) return 'interrupted';
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
      action: '请删除不再使用的项目或释放浏览器站点空间后重试。'
    },
    permission: {
      code: 'STORAGE_PERMISSION_DENIED',
      title: '浏览器未允许本地存储',
      action: '请检查站点存储权限，并通过 localhost 或 HTTPS 重新打开应用。'
    },
    interrupted: {
      code: 'STORAGE_WRITE_INTERRUPTED',
      title: '本地写入已中断',
      action: '请重新打开项目；系统会保留最近一次成功保存的版本。'
    },
    database: {
      code: 'STORAGE_DATABASE_UNAVAILABLE',
      title: '本地数据库无法使用',
      action: '请关闭其他打开此应用的标签页后重试；问题持续时请保留错误码反馈。'
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
