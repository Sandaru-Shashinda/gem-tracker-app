import type { Gem } from "../types"
import { API_BASE_URL, fetchWithAuth } from "./config"

export const gemsApi = {
  getGems: async (
    page = 1,
    limit = 10,
    filters?: {
      status?: string
      currentAssignee?: string
      startDate?: string
      endDate?: string
      gemId?: string
    },
  ): Promise<{ gems: Gem[]; total: number; page: number; limit: number; pages: number }> => {
    let url = `${API_BASE_URL}/gems?page=${page}&limit=${limit}`
    if (filters?.status) url += `&status=${filters.status}`
    if (filters?.currentAssignee) url += `&currentAssignee=${filters.currentAssignee}`
    if (filters?.startDate) url += `&startDate=${filters.startDate}`
    if (filters?.endDate) url += `&endDate=${filters.endDate}`
    if (filters?.gemId) url += `&gemId=${filters.gemId}`

    const response = await fetchWithAuth(url)
    if (!response.ok) throw new Error("Failed to fetch gems")
    return response.json()
  },

  getGemById: async (id: string): Promise<Gem> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/gems/${id}`)
    if (!response.ok) throw new Error("Failed to fetch gem")
    return response.json()
  },

  createGem: async (gemData: any): Promise<Gem> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/gems/intake`, {
      method: "POST",
      body: gemData instanceof FormData ? gemData : JSON.stringify(gemData),
    })
    if (!response.ok) throw new Error("Failed to create gem")
    return response.json()
  },

  updateGem: async (gemId: string, updates: any): Promise<Gem> => {
    let endpoint = `${API_BASE_URL}/gems/${gemId}`
    const method = "PUT"
    let payload = updates

    if (!(updates instanceof FormData)) {
      if (updates.test1) {
        endpoint = `${API_BASE_URL}/gems/${gemId}/test1`
        payload = { ...updates.test1, status: updates.status }
      } else if (updates.test2) {
        endpoint = `${API_BASE_URL}/gems/${gemId}/test2`
        payload = { ...updates.test2, status: updates.status }
      } else if (updates.finalApproval) {
        endpoint = `${API_BASE_URL}/gems/${gemId}/final-approval`
        payload = { ...updates.finalApproval, status: updates.status }
      }
    }

    const response = await fetchWithAuth(endpoint, {
      method: method,
      body: payload instanceof FormData ? payload : JSON.stringify(payload),
    })

    if (!response.ok) throw new Error("Failed to update gem")
    return response.json()
  },

  submitApproval: async (gemId: string, updates: any): Promise<Gem> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/gems/${gemId}/final-approval`, {
      method: "PUT",
      body: JSON.stringify(updates),
    })
    if (!response.ok) throw new Error("Failed to submit approval")
    return response.json()
  },

  requestCorrection: async (
    gemId: string,
    stage: "test1" | "test2",
    note: string,
  ): Promise<Gem> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/gems/${gemId}/request-correction`, {
      method: "PUT",
      body: JSON.stringify({ stage, note }),
    })
    if (!response.ok) throw new Error("Failed to request correction")
    return response.json()
  },

  saveDraft: async (gemId: string, updates: any): Promise<Gem> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/gems/${gemId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    })
    if (!response.ok) throw new Error("Failed to save draft")
    return response.json()
  },
}
