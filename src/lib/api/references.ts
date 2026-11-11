import type { GemReference } from "../types"
import { API_BASE_URL, describeFailure, fetchWithAuth } from "./config"

/**
 * The names the identification fields offer. Both are free text on the form — a stone
 * the reference table does not cover still has to be named — so these lists are the
 * published table *and* every name the lab has actually recorded, folded together
 * server-side. See GET /api/references/identifications.
 */
export interface IdentificationOptions {
  species: string[]
  varieties: string[]
  /** Everything the lab has saved in the other free-text fields, offered back as suggestions. */
  history: FieldHistory
}

export interface FieldHistory {
  itemDescription: string[]
  comments: string[]
  specialNote: string[]
  treatment: string[]
  colour: string[]
  cuttingShape: string[]
  crownStyle: string[]
  pavilionStyle: string[]
}

export const EMPTY_HISTORY: FieldHistory = {
  itemDescription: [],
  comments: [],
  specialNote: [],
  treatment: [],
  colour: [],
  cuttingShape: [],
  crownStyle: [],
  pavilionStyle: [],
}

/** A dropdown whose suggestions can be deleted: the two name lists or one of the history lists. */
export type SuggestionField = "species" | "varieties" | keyof FieldHistory

/** A suggestion taken off its dropdown. The gem records it came from keep the value. */
export interface HiddenSuggestion {
  _id: string
  field: SuggestionField
  value: string
  createdAt: string
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

  getHiddenSuggestions: async (): Promise<HiddenSuggestion[]> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/references/suggestions/hidden`)
    if (!response.ok) throw new Error(await describeFailure(response, "Failed to load deleted suggestions"))
    return response.json()
  },

  hideSuggestion: async (field: SuggestionField, value: string): Promise<HiddenSuggestion> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/references/suggestions/hidden`, {
      method: "POST",
      body: JSON.stringify({ field, value }),
    })
    if (!response.ok) throw new Error(await describeFailure(response, "Failed to delete suggestion"))
    return response.json()
  },

  restoreSuggestion: async (id: string): Promise<void> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/references/suggestions/hidden/${id}`, {
      method: "DELETE",
    })
    if (!response.ok) throw new Error(await describeFailure(response, "Failed to restore suggestion"))
  },
}
