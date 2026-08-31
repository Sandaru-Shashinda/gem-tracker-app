import type { GemReference } from "../types"
import { API_BASE_URL, fetchWithAuth } from "./config"

export const referencesApi = {
  searchReferences: async (
    riMin?: string,
    riMax?: string,
    sg?: string,
    hardness?: string,
  ): Promise<GemReference[]> => {
    let url = `${API_BASE_URL}/references/search`
    const params = new URLSearchParams()
    if (riMin) params.append("riMin", riMin)
    if (riMax) params.append("riMax", riMax)
    if (sg) params.append("sg", sg)
    if (hardness) params.append("hardness", hardness)
    if (params.toString()) url += `?${params.toString()}`

    const response = await fetchWithAuth(url)
    if (!response.ok) throw new Error("Failed to search references")
    return response.json()
  },

  getReferences: async (): Promise<GemReference[]> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/references`)
    if (!response.ok) throw new Error("Failed to fetch references")
    return response.json()
  },

  getSpecies: async (): Promise<string[]> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/references/species`)
    if (!response.ok) throw new Error("Failed to fetch species")
    return response.json()
  },
}
