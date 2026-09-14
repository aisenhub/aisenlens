const WEBHOME_URL = import.meta.env.VITE_WEBHOME_URL || "http://localhost:8442"

export function webHomeUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return new URL(normalizedPath, `${WEBHOME_URL.replace(/\/+$/, "")}/`).toString()
}
