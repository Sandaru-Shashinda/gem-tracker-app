import type { Post, PostCategory, PostStatus } from "../types"
import { API_BASE_URL, describeFailure, fetchWithAuth } from "./config"

export interface PostPage {
  posts: Post[]
  page: number
  pages: number
  total: number
  /** Drafts across the whole section, ignoring any filter. */
  draftCount: number
}

export interface PostFilters {
  page?: number
  limit?: number
  search?: string
  status?: PostStatus | ""
  category?: PostCategory | ""
  /** Narrow to the signed-in user's own posts. */
  mine?: boolean
}

/**
 * Field errors the API returns when it rejects a post, keyed by field so the
 * editor can put each message under the input it belongs to.
 */
export type PostFieldErrors = Partial<Record<"title" | "body", string>>

export class PostValidationError extends Error {
  readonly errors: PostFieldErrors

  constructor(message: string, errors: PostFieldErrors) {
    super(message)
    this.name = "PostValidationError"
    this.errors = errors
  }
}

const failOrThrow = async (response: Response, fallback: string) => {
  if (response.status === 400) {
    try {
      const body = await response.clone().json()
      if (body?.errors) {
        throw new PostValidationError(body.message || fallback, body.errors)
      }
    } catch (error) {
      if (error instanceof PostValidationError) throw error
      // Not the shape we expected — fall through to the generic message.
    }
  }
  throw new Error(await describeFailure(response, fallback))
}

export const postsApi = {
  getPosts: async (filters: PostFilters = {}): Promise<PostPage> => {
    const params = new URLSearchParams({
      page: String(filters.page ?? 1),
      limit: String(filters.limit ?? 10),
    })
    if (filters.search) params.set("search", filters.search)
    if (filters.status) params.set("status", filters.status)
    if (filters.category) params.set("category", filters.category)
    if (filters.mine) params.set("mine", "true")

    const response = await fetchWithAuth(`${API_BASE_URL}/posts?${params}`)
    if (!response.ok) throw new Error(await describeFailure(response, "Failed to load posts"))
    return response.json()
  },

  // FormData throughout, because a post may carry a cover image and
  // fetchWithAuth drops the JSON content-type when it sees one.
  createPost: async (data: FormData): Promise<Post> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/posts`, {
      method: "POST",
      body: data,
    })
    if (!response.ok) await failOrThrow(response, "Failed to create post")
    return response.json()
  },

  updatePost: async (id: string, data: FormData): Promise<Post> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/posts/${id}`, {
      method: "PUT",
      body: data,
    })
    if (!response.ok) await failOrThrow(response, "Failed to update post")
    return response.json()
  },

  /** Publish, unpublish or archive. Admin only — the API enforces it. */
  updateStatus: async (id: string, status: PostStatus): Promise<Post> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/posts/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    })
    if (!response.ok) throw new Error(await describeFailure(response, "Failed to update post"))
    return response.json()
  },

  deletePost: async (id: string): Promise<void> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/posts/${id}`, {
      method: "DELETE",
    })
    if (!response.ok) throw new Error(await describeFailure(response, "Failed to delete post"))
  },
}
