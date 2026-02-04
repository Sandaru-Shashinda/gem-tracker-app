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

  getReports: async (page = 1, limit = 10): Promise<any> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/reports?page=${page}&limit=${limit}`)
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

  getReportById: async (id: string): Promise<any> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/reports/${id}`)
    if (!response.ok) throw new Error("Failed to fetch report")
    return response.json()
  },
}
