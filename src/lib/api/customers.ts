import type { Customer } from "../types"
import { API_BASE_URL, fetchWithAuth } from "./config"

export const customersApi = {
  getCustomers: async (
    page = 1,
    limit = 10,
    search = "",
  ): Promise<{ customers: Customer[]; total: number; page: number; limit: number }> => {
    let url = `${API_BASE_URL}/customers?page=${page}&limit=${limit}`
    if (search) url += `&search=${encodeURIComponent(search)}`

    const response = await fetchWithAuth(url)
    if (!response.ok) throw new Error("Failed to fetch customers")
    return response.json()
  },

  getCustomer: async (id: string): Promise<Customer> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/customers/${id}`)
    if (!response.ok) throw new Error("Failed to fetch customer")
    return response.json()
  },

  createCustomer: async (customerData: FormData | any): Promise<Customer> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/customers`, {
      method: "POST",
      body: customerData instanceof FormData ? customerData : JSON.stringify(customerData),
    })
    if (!response.ok) throw new Error("Failed to create customer")
    return response.json()
  },

  updateCustomer: async (id: string, updates: FormData | any): Promise<Customer> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/customers/${id}`, {
      method: "PUT",
      body: updates instanceof FormData ? updates : JSON.stringify(updates),
    })
    if (!response.ok) throw new Error("Failed to update customer")
    return response.json()
  },

  deleteCustomer: async (id: string): Promise<void> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/customers/${id}`, {
      method: "DELETE",
    })
    if (!response.ok) throw new Error("Failed to delete customer")
  },
}
