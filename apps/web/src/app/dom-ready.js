const callbacks = [];
let listenerRegistered = false;

function flushCallbacks() {
  const pending = callbacks.splice(0);
  pending.forEach(callback => callback());
}

export function onDomReady(callback) {
  if (typeof callback !== 'function') return;
  if (document.readyState !== 'loading') {
    callback();
    return;
  }
  callbacks.push(callback);
  if (!listenerRegistered) {
    listenerRegistered = true;
    document.addEventListener('DOMContentLoaded', flushCallbacks, { once: true });
  }
}
