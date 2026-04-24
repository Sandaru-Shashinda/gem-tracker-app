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
      body: JSON.stringify(gemData),
    })
    if (!response.ok) throw new Error("Failed to create gem")
    return response.json()
  },

  updateGem: async (gemId: string, updates: any): Promise<Gem> => {
    let endpoint = `${API_BASE_URL}/gems/${gemId}`
    let payload = updates
    let stageKey: string | null = null

    if (updates.test1) {
      endpoint = `${API_BASE_URL}/gems/${gemId}/test1`
      payload = { ...updates.test1, status: updates.status }
      stageKey = "test1"
    } else if (updates.test2) {
      endpoint = `${API_BASE_URL}/gems/${gemId}/test2`
      payload = { ...updates.test2, status: updates.status }
      stageKey = "test2"
    } else if (updates.finalApproval) {
      endpoint = `${API_BASE_URL}/gems/${gemId}/final-approval`
      payload = { ...updates.finalApproval, status: updates.status }
      stageKey = "finalApproval"
    }

    const response = await fetchWithAuth(endpoint, {
      method: "PUT",
      body: JSON.stringify(payload),
    })

    if (!response.ok) throw new Error("Failed to update gem")
    const data = await response.json()

    // Stage write endpoints return { gem, test1/test2/finalApproval } — merge into Gem shape
    if (stageKey && data.gem) {
      return { ...data.gem, [stageKey]: data[stageKey] } as Gem
    }
    return data as Gem
  },

  addGemImages: async (gemId: string, imageIds: string[]): Promise<Gem> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/gems/${gemId}/images`, {
      method: "POST",
      body: JSON.stringify({ imageIds }),
    })
    if (!response.ok) throw new Error("Failed to add images")
    return response.json()
  },

  submitApproval: async (gemId: string, updates: any): Promise<Gem> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/gems/${gemId}/final-approval`, {
      method: "PUT",
      body: JSON.stringify(updates),
    })
    if (!response.ok) throw new Error("Failed to submit approval")
    const data = await response.json()
    // Merge { gem, finalApproval } into Gem shape
    if (data.gem) return { ...data.gem, finalApproval: data.finalApproval } as Gem
    return data as Gem
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

  requestApproverCorrection: async (gemId: string, note: string): Promise<Gem> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/gems/${gemId}/request-approver-correction`, {
      method: "PUT",
      body: JSON.stringify({ note }),
    })
    if (!response.ok) throw new Error("Failed to request approver correction")
    return response.json()
  },

  dismissApproverCorrection: async (gemId: string): Promise<Gem> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/gems/${gemId}/dismiss-approver-correction`, {
      method: "PUT",
      body: JSON.stringify({}),
    })
    if (!response.ok) throw new Error("Failed to dismiss approver correction")
    return response.json()
  },

  deleteGem: async (id: string): Promise<void> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/gems/${id}`, {
      method: "DELETE",
    })
    if (!response.ok) throw new Error("Failed to delete gem")
  },
}
