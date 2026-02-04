export const BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace("/api", "")
  : "http://localhost:5000"
export const API_BASE_URL = `${BASE_URL}/api`

export const getAuthHeader = (): Record<string, string> => {
  const token = localStorage.getItem("token")
  return token ? { Authorization: `Bearer ${token}` } : {}
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
