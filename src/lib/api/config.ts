export const BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace("/api", "")
  : "http://localhost:5000"
export const API_BASE_URL = `${BASE_URL}/api`

export const getAuthHeader = (): Record<string, string> => {
  const token = localStorage.getItem("token")
  return token ? { Authorization: `Bearer ${token}` } : {}
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

  return response
}
