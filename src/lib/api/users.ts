import type { User } from "../types"
import { API_BASE_URL, fetchWithAuth } from "./config"

export const usersApi = {
  login: async (email: string, password: string): Promise<User> => {
    // Login doesn't use fetchWithAuth because it doesn't need an existing token
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

  getUsers: async (role?: string): Promise<User[]> => {
    const url = role ? `${API_BASE_URL}/auth/users?role=${role}` : `${API_BASE_URL}/auth/users`
    const response = await fetchWithAuth(url)
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
    const response = await fetchWithAuth(`${API_BASE_URL}/auth/register`, {
      method: "POST",
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
    const response = await fetchWithAuth(`${API_BASE_URL}/auth/users/${userId}`, {
      method: "POST",
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
    const response = await fetchWithAuth(`${API_BASE_URL}/auth/users/${userId}`, {
      method: "DELETE",
    })
    if (!response.ok) throw new Error("Failed to delete user")
  },
}
