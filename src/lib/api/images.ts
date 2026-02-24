import { API_BASE_URL, fetchWithAuth } from "./config"

export interface ImageMetadata {
  [key: string]: any
}

export interface Image {
  _id: string
  name: string
  originalName: string
  url: string
  category: string
  description?: string
  tags?: string[]
  uploadedBy: {
    _id: string
    name: string
    role: string
  }
  metadata?: ImageMetadata
  createdAt: string
  updatedAt: string
}

export interface UploadImageParams {
  file: File
  category?: string
  description?: string
  tags?: string | string[]
  name?: string
  metadata?: ImageMetadata
}

export const uploadImage = async (params: UploadImageParams): Promise<Image> => {
  const formData = new FormData()
  formData.append("image", params.file)

  if (params.category) formData.append("category", params.category)
  if (params.description) formData.append("description", params.description)
  if (params.name) formData.append("name", params.name)
  if (params.tags) {
    if (Array.isArray(params.tags)) {
      formData.append("tags", params.tags.join(","))
    } else {
      formData.append("tags", params.tags)
    }
  }
  if (params.metadata) {
    formData.append("metadata", JSON.stringify(params.metadata))
  }

  const response = await fetchWithAuth(`${API_BASE_URL}/images`, {
    method: "POST",
    body: formData,
  })
  if (!response.ok) throw new Error("Failed to upload image")
  return response.json()
}

export const getImages = async (category?: string): Promise<Image[]> => {
  const url = category ? `${API_BASE_URL}/images?category=${category}` : `${API_BASE_URL}/images`
  const response = await fetchWithAuth(url)
  if (!response.ok) throw new Error("Failed to fetch images")
  return response.json()
}

export const getImageById = async (id: string): Promise<Image> => {
  const response = await fetchWithAuth(`${API_BASE_URL}/images/${id}`)
  if (!response.ok) throw new Error("Failed to fetch image")
  return response.json()
}

export const updateImage = async (id: string, data: Partial<UploadImageParams>): Promise<Image> => {
  const response = await fetchWithAuth(`${API_BASE_URL}/images/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error("Failed to update image")
  return response.json()
}

export const deleteImage = async (id: string): Promise<void> => {
  const response = await fetchWithAuth(`${API_BASE_URL}/images/${id}`, {
    method: "DELETE",
  })
  if (!response.ok) throw new Error("Failed to delete image")
}
