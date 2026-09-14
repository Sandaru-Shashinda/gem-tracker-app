import type { ContactMessage, ContactStatus } from "../types"
import { API_BASE_URL, describeFailure, fetchWithAuth } from "./config"

export interface ContactMessagePage {
  messages: ContactMessage[]
  page: number
  pages: number
  total: number
  /** Messages still marked NEW across the whole inbox, ignoring any filter. */
  newCount: number
}

export const contactApi = {
  getMessages: async (
    page = 1,
    limit = 10,
    search = "",
    status: ContactStatus | "" = "",
  ): Promise<ContactMessagePage> => {
    let url = `${API_BASE_URL}/contact?page=${page}&limit=${limit}`
    if (search) url += `&search=${encodeURIComponent(search)}`
    if (status) url += `&status=${status}`

    const response = await fetchWithAuth(url)
    if (!response.ok) throw new Error(await describeFailure(response, "Failed to load messages"))
    return response.json()
  },

  updateStatus: async (id: string, status: ContactStatus): Promise<ContactMessage> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/contact/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    })
    if (!response.ok) throw new Error(await describeFailure(response, "Failed to update message"))
    return response.json()
  },

  deleteMessage: async (id: string): Promise<void> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/contact/${id}`, {
      method: "DELETE",
    })
    if (!response.ok) throw new Error(await describeFailure(response, "Failed to delete message"))
  },
}
