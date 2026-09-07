import { getCurrentSession } from "../auth/auth"

const platformApiUrl =
  import.meta.env.VITE_PLATFORM_API_URL ??
  "http://127.0.0.1:54321/functions/v1/platform-api"
const platformPublicApiUrl =
  import.meta.env.VITE_PLATFORM_PUBLIC_API_URL ??
  "http://127.0.0.1:54321/functions/v1/platform-public"

export interface PlatformResponse<T> {
  data: T
  requestId: string
}

export interface PlatformSession {
  authenticated: boolean
  identity: {
    userId: string
    displayName: string | null
    status: "active" | "disabled" | "deletion_pending" | "deleted"
  } | null
}

interface PlatformProfileResponse {
  profile: NonNullable<PlatformSession["identity"]>
}

interface AccessResponse {
  allowed: boolean
}

interface PlatformClient {
  getProfile: () => Promise<PlatformResponse<PlatformProfileResponse>>
  getEntitlements: () => Promise<PlatformResponse<unknown>>
  checkAccess: (featureCode: string) => Promise<PlatformResponse<AccessResponse>>
  redeem: (code: string, idempotencyKey: string) => Promise<PlatformResponse<unknown>>
  submitFeedback: (input: { kind: string; title: string; content: string }) => Promise<PlatformResponse<unknown>>
}

let accessToken: string | null = null

function getRequestId(response: Response, payload: unknown): string {
  if (typeof (payload as { requestId?: unknown })?.requestId === "string") return (payload as { requestId: string }).requestId
  return response.headers.get("x-request-id") ?? "unknown-request"
}

async function request<T>(baseUrl: string, path: string, init: RequestInit = {}, authenticated = true): Promise<PlatformResponse<T>> {
  const headers = new Headers(init.headers)
  headers.set("accept", "application/json")
  if (authenticated && accessToken) headers.set("authorization", `Bearer ${accessToken}`)
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, { ...init, credentials: "omit", headers })
  const payload = await response.json().catch(() => null) as { data?: T; error?: { message?: string }; requestId?: string } | null
  if (!response.ok) throw new Error(payload?.error?.message ?? "平台请求失败，请稍后重试。")
  return { data: (payload?.data ?? payload) as T, requestId: getRequestId(response, payload) }
}

export const aisenHubClient: PlatformClient = {
  getProfile: () => request<PlatformProfileResponse>(platformApiUrl, "/v1/account/me"),
  getEntitlements: () => request(platformApiUrl, "/v1/app/entitlements"),
  checkAccess: (featureCode) => request<AccessResponse>(platformApiUrl, `/v1/app/access/${encodeURIComponent(featureCode)}`),
  redeem: (code, idempotencyKey) => request(platformApiUrl, "/v1/app/redemptions", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": idempotencyKey }, body: JSON.stringify({ code: code.trim() }) }),
  submitFeedback: (input) => request(platformApiUrl, "/v1/app/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }),
}

export async function exchangePlatformSession(token: string): Promise<PlatformResponse<PlatformSession>> {
  accessToken = token
  const response = await aisenHubClient.getProfile()
  return { requestId: response.requestId, data: { authenticated: true, identity: response.data.profile } }
}

export async function getPlatformSession(): Promise<PlatformResponse<PlatformSession>> {
  const session = await getCurrentSession()
  if (!session?.access_token) {
    accessToken = null
    return { requestId: "local-session", data: { authenticated: false, identity: null } }
  }
  return exchangePlatformSession(session.access_token)
}

export function clearPlatformSession(): void {
  accessToken = null
}

export { platformPublicApiUrl }
