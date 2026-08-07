export function showToast(text, type, duration) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast' + (type ? ` toast-${type}` : '');
  toast.textContent = String(text || '');
  container.appendChild(toast);
  const timeout = typeof duration === 'number' ? duration : 3000;
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity .3s';
  }, Math.max(0, timeout - 500));
  setTimeout(() => {
    if (toast.parentNode === container) container.removeChild(toast);
  }, timeout);
}
