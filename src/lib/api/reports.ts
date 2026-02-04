import { API_BASE_URL, fetchWithAuth } from "./config"

export const reportsApi = {
  generateReport: async (gemId: string): Promise<{ reportUrl: string; qrCode: string }> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/reports/${gemId}/generate`, {
      method: "POST",
    })
    if (!response.ok) throw new Error("Failed to generate report")
    return response.json()
  },
}
