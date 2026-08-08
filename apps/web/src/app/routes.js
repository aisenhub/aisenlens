const editorRoutePattern = /^\/editor\/(\d+)\/?$/;

export function getAppRoute(locationTarget = globalThis.location) {
  const pathname = locationTarget?.pathname || '/';
  if (pathname === '/' || pathname === '/index.html') return { name: 'library' };
  const match = pathname.match(editorRoutePattern);
  if (match) return { name: 'editor', projectId: Number(match[1]) };
  return { name: 'library' };
}

export const getEditorPath = projectId => `/editor/${Number(projectId)}`;

export function navigateTo(path, windowTarget = globalThis.window) {
  windowTarget.location.assign(path);
}
