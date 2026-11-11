import { API_BASE_URL, fetchWithAuth } from "./config"

/** A photo or video in a gem's Drive folder, as the API lists it. */
export interface GemMediaFile {
  id: string
  name: string
  mimeType: string
  kind: "image" | "video" | "other"
  size: number | null
  createdTime: string
  durationMillis: number | null
  hasThumbnail: boolean
  /** Lets <img> and <video> load this one file, which cannot send the auth header. */
  token: string
}

export interface GemMediaListing {
  /** The folder in Drive, or null when nothing has been uploaded yet. */
  folderUrl: string | null
  files: GemMediaFile[]
}

/** Window event fired with a gem's current Drive files whenever the media panel loads or changes them. */
export const GEM_MEDIA_CHANGED = "gem-media-changed"

export interface GemMediaChangedDetail {
  gemId: string
  files: GemMediaFile[]
}

export const announceGemMedia = (gemId: string, files: GemMediaFile[]) =>
  window.dispatchEvent(
    new CustomEvent<GemMediaChangedDetail>(GEM_MEDIA_CHANGED, { detail: { gemId, files } }),
  )

/** Thrown when the API has no Drive credentials, so the panel can say so instead of failing. */
export class DriveNotConfiguredError extends Error {}

const mediaBase = (gemId: string) => `${API_BASE_URL}/gems/${encodeURIComponent(gemId)}/media`

export const mediaApi = {
  list: async (gemId: string): Promise<GemMediaListing> => {
    const response = await fetchWithAuth(mediaBase(gemId))
    if (response.status === 503) throw new DriveNotConfiguredError("Google Drive is not set up")
    if (!response.ok) throw new Error("Failed to load the gem's Drive files")
    return response.json()
  },

  /**
   * Uploads one file into the gem's folder.
   *
   * The API only opens the upload; the bytes go from the browser straight to Google, so
   * a video is not held to the API's request size limit. XHR rather than fetch because
   * fetch cannot report upload progress.
   */
  upload: async (gemId: string, file: File, onProgress?: (fraction: number) => void): Promise<void> => {
    const mimeType = file.type || "application/octet-stream"
    const response = await fetchWithAuth(`${mediaBase(gemId)}/uploads`, {
      method: "POST",
      body: JSON.stringify({ name: file.name, mimeType, size: file.size }),
    })
    if (response.status === 503) throw new DriveNotConfiguredError("Google Drive is not set up")
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      throw new Error(body?.message || "Could not start the upload")
    }
    const { uploadUrl } = await response.json()

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open("PUT", uploadUrl)
      xhr.setRequestHeader("Content-Type", mimeType)
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress?.(event.loaded / event.total)
      }
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(new Error(`Drive refused the upload (${xhr.status})`))
      xhr.onerror = () => reject(new Error("The upload to Drive was interrupted"))
      xhr.send(file)
    })
  },

  remove: async (gemId: string, fileId: string): Promise<void> => {
    const response = await fetchWithAuth(`${mediaBase(gemId)}/${encodeURIComponent(fileId)}`, {
      method: "DELETE",
    })
    if (!response.ok) throw new Error("Failed to delete the file")
  },

  /** Drive's preview of a photo or video, at about `size` px on its long side. */
  thumbnailUrl: (gemId: string, file: GemMediaFile, size = 400) =>
    `${mediaBase(gemId)}/${encodeURIComponent(file.id)}/thumbnail?size=${size}&t=${encodeURIComponent(file.token)}`,

  /** Where a <video> plays a video from the folder. */
  streamUrl: (gemId: string, file: GemMediaFile) =>
    `${mediaBase(gemId)}/${encodeURIComponent(file.id)}/stream?t=${encodeURIComponent(file.token)}`,
}

/** The Drive link a report stores when its video is picked from the gem's folder. */
export const driveFileLink = (fileId: string) => `https://drive.google.com/file/d/${fileId}/view`
