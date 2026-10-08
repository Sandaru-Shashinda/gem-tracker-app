import { API_BASE_URL, fetchWithAuth } from "./config"

export const reportsApi = {
  generateReport: async (
    gemId: string,
    config: { size: "small" | "medium" | "large"; includeLogo: boolean },
  ): Promise<{ reportUrl: string; qrCode: string }> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/reports/${gemId}/generate`, {
      method: "POST",
      body: JSON.stringify(config),
    })
    if (!response.ok) throw new Error("Failed to generate report")
    return response.json()
  },

  getReports: async (
    page = 1,
    limit = 10,
    filters?: {
      /** Matches the report number or the gem's GRC number. */
      search?: string
      status?: string
      type?: string
      mode?: string
      /** ISO instant, inclusive. */
      from?: string
      /** ISO instant, exclusive. */
      to?: string
    },
  ): Promise<any> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    for (const [key, value] of Object.entries(filters ?? {})) {
      if (value) params.set(key, value)
    }
    const response = await fetchWithAuth(`${API_BASE_URL}/reports?${params}`)
    if (!response.ok) throw new Error("Failed to fetch reports")
    return response.json()
  },

  updateReport: async (id: string, updates: any): Promise<any> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/reports/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    })
    if (!response.ok) throw new Error("Failed to update report")
    return response.json()
  },

  /**
   * Saves the custom certificate a report prints, or clears it with null.
   *
   * Its own endpoint rather than a field on updateReport: that route moves the gem to
   * DONE as a side effect, which rewording a printed certificate has no business doing.
   * The size picks which stored document is written, so a report only ever touches the
   * one its own paper size prints from.
   */
  saveCustomCard: async (
    id: string,
    customCard: unknown | null,
    reportSize: "small" | "medium" | "large" = "small",
  ): Promise<unknown> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/reports/${id}/custom-card`, {
      method: "PUT",
      body: JSON.stringify({ customCard, reportSize }),
    })
    if (!response.ok) throw new Error("Failed to save custom card")
    return response.json()
  },

  /**
   * Saves the video link the report's QR page offers, or clears it with an empty string.
   * Its own endpoint for the same reason as the custom card: it must not move the gem.
   */
  saveVideoUrl: async (id: string, videoUrl: string): Promise<{ videoUrl?: string }> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/reports/${id}/video`, {
      method: "PUT",
      body: JSON.stringify({ videoUrl }),
    })
    if (!response.ok) throw new Error("Failed to save video link")
    return response.json()
  },

  getReportById: async (id: string): Promise<any> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/reports/${id}`)
    if (!response.ok) throw new Error("Failed to fetch report")
    return response.json()
  },
}
