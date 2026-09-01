import {
  createPlatformClient,
  type PlatformClient,
  type PlatformResponse,
} from "@aisenhub/platform-client"
import type {
  SessionExchangeResponse,
  SessionResponse,
} from "@aisenhub/contracts"

const platformApiUrl =
  import.meta.env.VITE_PLATFORM_API_URL ??
  "http://127.0.0.1:54321/functions/v1/platform-api"
const platformPublicApiUrl =
  import.meta.env.VITE_PLATFORM_PUBLIC_API_URL ??
  "http://127.0.0.1:54321/functions/v1/platform-public"
let csrfToken: string | undefined

export const aisenHubClient: PlatformClient = createPlatformClient({
  baseUrl: platformApiUrl,
  publicBaseUrl: platformPublicApiUrl,
  appSlug: "aisenlens",
  csrfToken: () => csrfToken,
})

export function rememberPlatformSession(
  response: PlatformResponse<SessionExchangeResponse | SessionResponse>,
) {
  if (response.data.authenticated && response.data.csrfToken)
    csrfToken = response.data.csrfToken
  return response
}

export async function exchangePlatformSession(accessToken: string) {
  return rememberPlatformSession(
    await aisenHubClient.exchangeSession(accessToken),
  )
}

export async function getPlatformSession() {
  return rememberPlatformSession(await aisenHubClient.getSession())
}

export function clearPlatformSession() {
  csrfToken = undefined
}
