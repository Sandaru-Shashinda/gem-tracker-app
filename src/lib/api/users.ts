import type { User } from "../types"
import { API_BASE_URL, describeFailure, fetchWithAuth } from "./config"

const toUser = (data: any): User => ({
  id: data._id,
  name: data.name,
  role: data.role,
  age: data.age,
  dob: data.dob,
  idNumber: data.idNumber,
  address: data.address,
  email: data.email,
  phoneNumber: data.phoneNumber,
  profileImage: data.profileImage,
  avatar: data.name
    .split(" ")
    .map((n: string) => n[0])
    .join(""),
})

/** Keeps the signed-in user cached across reloads in step with what the API returned. */
const storeCurrentUser = (user: User) => {
  localStorage.setItem("user", JSON.stringify(user))
  return user
}

const readProfileResponse = async (response: Response, fallback: string) => {
  if (!response.ok) throw new Error(await describeFailure(response, fallback))
  return storeCurrentUser(toUser(await response.json()))
}

export interface ProfileUpdate {
  name?: string
  email?: string
  age?: string
  dob?: string
  idNumber?: string
  address?: string
  phoneNumber?: string
}

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
    localStorage.setItem("token", data.token)
    return storeCurrentUser(toUser(data))
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
    return data.map(toUser)
  },

  createUser: async (userData: any): Promise<User> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      body: JSON.stringify(userData),
    })
    if (!response.ok) throw new Error("Failed to create user")
    return toUser(await response.json())
  },

  updateUser: async (userId: string, updates: Partial<User>): Promise<User> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/auth/users/${userId}`, {
      method: "POST",
      body: JSON.stringify(updates),
    })
    if (!response.ok) throw new Error("Failed to update user")
    return toUser(await response.json())
  },

  deleteUser: async (userId: string): Promise<void> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/auth/users/${userId}`, {
      method: "DELETE",
    })
    if (!response.ok) throw new Error("Failed to delete user")
  },

  getProfile: async (): Promise<User> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/auth/profile`)
    return readProfileResponse(response, "Failed to load profile")
  },

  updateProfile: async (updates: ProfileUpdate): Promise<User> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/auth/profile`, {
      method: "PUT",
      body: JSON.stringify(updates),
    })
    return readProfileResponse(response, "Failed to update profile")
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/auth/profile/password`, {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    if (!response.ok) throw new Error(await describeFailure(response, "Failed to change password"))
  },

  uploadProfileImage: async (file: File): Promise<User> => {
    const formData = new FormData()
    formData.append("image", file)
    const response = await fetchWithAuth(`${API_BASE_URL}/auth/profile/image`, {
      method: "POST",
      body: formData,
    })
    return readProfileResponse(response, "Failed to upload profile image")
  },

  removeProfileImage: async (): Promise<User> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/auth/profile/image`, {
      method: "DELETE",
    })
    return readProfileResponse(response, "Failed to remove profile image")
  },
}
