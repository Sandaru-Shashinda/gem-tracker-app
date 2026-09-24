import type { GemReference } from "../types"
import { API_BASE_URL, fetchWithAuth } from "./config"

/**
 * The names the identification fields offer. Both are free text on the form — a stone
 * the reference table does not cover still has to be named — so these lists are the
 * published table *and* every name the lab has actually recorded, folded together
 * server-side. See GET /api/references/identifications.
 */
export interface IdentificationOptions {
  species: string[]
  varieties: string[]
}

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

  getIdentifications: async (): Promise<IdentificationOptions> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/references/identifications`)
    if (!response.ok) throw new Error("Failed to fetch identification options")
    return response.json()
  },
}
