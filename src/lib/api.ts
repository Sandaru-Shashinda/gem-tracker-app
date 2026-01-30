import type { User, Gem, GemReference, Customer } from "./types"

const BASE_URL = import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL.replace("/api", "")
    : "http://localhost:5000"
const API_BASE_URL = `${BASE_URL}/api`

const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem("token")
    return token ? { Authorization: `Bearer ${token}` } : {}
}

export const api = {
    BASE_URL,
    // --- Auth ---
    login: async (email: string, password: string): Promise<User> => {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        })

        if (!response.ok) {
            throw new Error("Invalid email or password")
        }

        const data = await response.json()
        const user: User = {
            id: data._id,
            name: data.name,
            role: data.role,
            age: data.age,
            dob: data.dob,
            idNumber: data.idNumber,
            address: data.address,
            avatar: data.name
                .split(" ")
                .map((n: string) => n[0])
                .join(""),
        }

        localStorage.setItem("token", data.token)
        localStorage.setItem("user", JSON.stringify(user))
        return user
    },

    logout: async () => {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
    },

    getCurrentUser: (): User | null => {
        const user = localStorage.getItem("user")
        return user ? JSON.parse(user) : null
    },

    // --- Gems ---
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

        const response = await fetch(url, {
            headers: getAuthHeader(),
        })
        if (!response.ok) throw new Error("Failed to fetch gems")
        return response.json()
    },

    createGem: async (gemData: any): Promise<Gem> => {
        const isFormData = gemData instanceof FormData
        const response = await fetch(`${API_BASE_URL}/gems/intake`, {
            method: "POST",
            headers: isFormData
                ? { ...getAuthHeader() }
                : {
                    "Content-Type": "application/json",
                    ...getAuthHeader(),
                },
            body: isFormData ? gemData : JSON.stringify(gemData),
        })
        if (!response.ok) throw new Error("Failed to create gem")
        return response.json()
    },


    updateGem: async (gemId: string, updates: any): Promise<Gem> => {
        let endpoint = `${API_BASE_URL}/gems/${gemId}`
        const method = "PUT"

        let payload = updates

        if (updates.test1) {
            endpoint = `${API_BASE_URL}/gems/${gemId}/test`
            payload = { ...updates.test1 }
        } else if (updates.test2) {
            endpoint = `${API_BASE_URL}/gems/${gemId}/test`
            payload = { ...updates.test2 }
        } else if (updates.finalApproval) {
            endpoint = `${API_BASE_URL}/gems/${gemId}/approve`
            payload = updates.finalApproval
        }

        const response = await fetch(endpoint, {
            method: method,
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeader(),
            },
            body: JSON.stringify(payload),
        })

        if (!response.ok) throw new Error("Failed to update gem")
        return response.json()
    },

    // --- Reports ---
    generateReport: async (gemId: string): Promise<{ reportUrl: string; qrCode: string }> => {
        const response = await fetch(`${API_BASE_URL}/reports/${gemId}/generate`, {
            method: "POST",
            headers: getAuthHeader(),
        })
        if (!response.ok) throw new Error("Failed to generate report")
        return response.json()
    },

    // --- References ---
    searchReferences: async (ri?: string, sg?: string, hardness?: string): Promise<GemReference[]> => {
        let url = `${API_BASE_URL}/references/search`
        const params = new URLSearchParams()
        if (ri) params.append("ri", ri)
        if (sg) params.append("sg", sg)
        if (hardness) params.append("hardness", hardness)
        if (params.toString()) url += `?${params.toString()}`

        const response = await fetch(url, {
            headers: getAuthHeader(),
        })
        if (!response.ok) throw new Error("Failed to search references")
        return response.json()
    },

    getReferences: async (): Promise<GemReference[]> => {
        const response = await fetch(`${API_BASE_URL}/references`, {
            headers: getAuthHeader(),
        })
        if (!response.ok) throw new Error("Failed to fetch references")
        return response.json()
    },

    getSpecies: async (): Promise<string[]> => {
        const response = await fetch(`${API_BASE_URL}/references/species`, {
            headers: getAuthHeader(),
        })
        if (!response.ok) throw new Error("Failed to fetch species")
        return response.json()
    },

    // --- Users ---
    getUsers: async (role?: string): Promise<User[]> => {
        const url = role ? `${API_BASE_URL}/auth/users?role=${role}` : `${API_BASE_URL}/auth/users`
        const response = await fetch(url, {
            headers: getAuthHeader(),
        })
        const data = await response.json()
        return data.map((u: any) => ({
            id: u._id,
            name: u.name,
            role: u.role,
            age: u.age,
            dob: u.dob,
            idNumber: u.idNumber,
            address: u.address,
            email: u.email,
            phoneNumber: u.phoneNumber,
            avatar: u.name
                .split(" ")
                .map((n: string) => n[0])
                .join(""),
        }))
    },

    createUser: async (userData: any): Promise<User> => {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeader(),
            },
            body: JSON.stringify(userData),
        })
        if (!response.ok) throw new Error("Failed to create user")
        const data = await response.json()
        return {
            id: data._id,
            name: data.name,
            role: data.role,
            age: data.age,
            dob: data.dob,
            idNumber: data.idNumber,
            address: data.address,
            email: data.email,
            phoneNumber: data.phoneNumber,
            avatar: data.name

                .split(" ")
                .map((n: string) => n[0])
                .join(""),
        }
    },

    updateUser: async (userId: string, updates: Partial<User>): Promise<User> => {
        const response = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
            method: "POST",
            headers: {
                ...getAuthHeader(),
                "Content-Type": "application/json",
            },
            body: JSON.stringify(updates),
        })
        if (!response.ok) throw new Error("Failed to update user")
        const data = await response.json()
        return {
            id: data._id,
            name: data.name,
            role: data.role,
            age: data.age,
            dob: data.dob,
            idNumber: data.idNumber,
            address: data.address,
            email: data.email,
            phoneNumber: data.phoneNumber,
            avatar: data.name
                .split(" ")
                .map((n: string) => n[0])
                .join(""),
        }
    },

    deleteUser: async (userId: string): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
            method: "DELETE",
            headers: getAuthHeader(),
        })
        if (!response.ok) throw new Error("Failed to delete user")
    },

    // --- Customers ---
    getCustomers: async (
        page = 1,
        limit = 10,
        search = "",
    ): Promise<{ customers: Customer[]; total: number; page: number; limit: number }> => {
        let url = `${API_BASE_URL}/customers?page=${page}&limit=${limit}`
        if (search) url += `&search=${encodeURIComponent(search)}`

        const response = await fetch(url, {
            headers: getAuthHeader(),
        })
        if (!response.ok) throw new Error("Failed to fetch customers")
        return response.json()
    },

    getCustomer: async (id: string): Promise<Customer> => {
        const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
            headers: getAuthHeader(),
        })
        if (!response.ok) throw new Error("Failed to fetch customer")
        return response.json()
    },

    createCustomer: async (customerData: FormData | any): Promise<Customer> => {
        const isFormData = customerData instanceof FormData
        const response = await fetch(`${API_BASE_URL}/customers`, {
            method: "POST",
            headers: isFormData
                ? getAuthHeader()
                : {
                    "Content-Type": "application/json",
                    ...getAuthHeader(),
                },
            body: isFormData ? customerData : JSON.stringify(customerData),
        })
        if (!response.ok) throw new Error("Failed to create customer")
        return response.json()
    },

    updateCustomer: async (id: string, updates: FormData | any): Promise<Customer> => {
        const isFormData = updates instanceof FormData
        const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
            method: "PUT",
            headers: isFormData
                ? getAuthHeader()
                : {
                    "Content-Type": "application/json",
                    ...getAuthHeader(),
                },
            body: isFormData ? updates : JSON.stringify(updates),
        })
        if (!response.ok) throw new Error("Failed to update customer")
        return response.json()
    },

    deleteCustomer: async (id: string): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
            method: "DELETE",
            headers: getAuthHeader(),
        })
        if (!response.ok) throw new Error("Failed to delete customer")
    },

}
