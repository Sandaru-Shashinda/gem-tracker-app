export const BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace("/api", "")
  : "http://localhost:5000"
export const API_BASE_URL = `${BASE_URL}/api`

export const getAuthHeader = (): Record<string, string> => {
  const token = localStorage.getItem("token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** Fired on window when the API stops accepting the stored token; GemProvider signs the user out. */
export const SESSION_ENDED_EVENT = "session-ended"

/** When the stored token lapses, in ms since the epoch — null if there is no token or no readable expiry. */
export const getTokenExpiry = (): number | null => {
  const token = localStorage.getItem("token")
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))
    return typeof payload.exp === "number" ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

/**
 * Turns a failed response into a message worth showing. The API answers with
 * { message }, and a bare status is not much use to whoever is looking at the screen —
 * "Not authorized" tells them to ask for the assignment, "Failed to update gem" does not.
 */
export const describeFailure = async (response: Response, fallback: string) => {
  let detail = ""
  try {
    const body = await response.clone().json()
    detail = typeof body?.message === "string" ? body.message : ""
  } catch {
    // Not JSON, or the body was already consumed — the status alone will have to do.
  }
  if (response.status === 401 || response.status === 403) {
    return detail || "Not authorized to save this stage of the gem."
  }
  return detail ? `${fallback}: ${detail}` : `${fallback} (${response.status})`
}

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const isFormData = options.body instanceof FormData
  const headers = {
    ...getAuthHeader(),
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...((options.headers as Record<string, string>) || {}),
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  // Login is the only other 401 the API sends, and it does not come through here — so a 401 on a
  // request that carried a token means the session is over (expired, or the account was removed).
  if (response.status === 401 && "Authorization" in headers) {
    window.dispatchEvent(new Event(SESSION_ENDED_EVENT))
  }

  return response
}

/**
 * Where the public site lives, for "view on the website" links. Overridable so a
 * staging deployment does not link staff at production.
 */
export const PUBLIC_SITE_URL = (
  import.meta.env.VITE_PUBLIC_SITE_URL || "https://grc.lk"
).replace(/\/$/, "")
