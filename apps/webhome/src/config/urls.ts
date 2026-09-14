export const WEBAPP_URL = import.meta.env.VITE_WEBAPP_URL || "http://localhost:8443";

export function webAppUrl(path = "/projects") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, `${WEBAPP_URL.replace(/\/+$/, "")}/`).toString();
}
