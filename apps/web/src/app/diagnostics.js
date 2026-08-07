const DEFAULT_ACTION = '请重试；如果问题持续，请记录错误码并反馈。';

function safeText(value, fallback = '') {
  return String(value ?? fallback)
    .replace(/[\r\n]+/g, ' ')
    .replace(/[A-Za-z]:\\[^\s]+/g, '[路径]')
    .replace(/(?:^|\s)\/[^\s]+/g, ' [路径]')
    .trim();
}

export function createAppError(code, message, { title = '操作失败', action = DEFAULT_ACTION, cause = null, details = '' } = {}) {
  const error = new Error(safeText(message, '发生未知错误'));
  error.name = 'AppError';
  error.code = safeText(code, 'APP_UNKNOWN');
  error.title = safeText(title, '操作失败');
  error.action = safeText(action, DEFAULT_ACTION);
  error.details = safeText(details);
  if (cause) error.cause = cause;
  return error;
}

export function normalizeAppError(error, fallback = {}) {
  if (error?.name === 'AppError' && error.code) return error;
  const causeMessage = safeText(error?.message, fallback.message || '发生未知错误');
  return createAppError(
    fallback.code || 'APP_UNKNOWN',
    causeMessage,
    {
      title: fallback.title || '操作失败',
      action: fallback.action || DEFAULT_ACTION,
      cause: error,
      details: fallback.details
    }
  );
}

export function formatUserError(error, fallback = {}) {
  const normalized = normalizeAppError(error, fallback);
  const action = normalized.action ? `建议：${normalized.action}` : '';
  const code = normalized.code ? `（错误码：${normalized.code}）` : '';
  return `${normalized.title}：${normalized.message}${code}${action ? `。${action}` : ''}`;
}

export function getDiagnosticSummary(error, fallback = {}) {
  const normalized = normalizeAppError(error, fallback);
  return [
    `错误码：${normalized.code}`,
    `标题：${normalized.title}`,
    `说明：${normalized.message}`,
    `建议：${normalized.action}`
  ].join('\n');
}
