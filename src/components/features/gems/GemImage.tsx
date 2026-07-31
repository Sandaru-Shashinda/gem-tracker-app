import { useState, useEffect } from "react"
import { getImageById, type Image } from "@/lib/api/images"
import { Loader2, Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface GemImageProps {
  imageId: string
  className?: string
  alt?: string
}

// Module-level cache: imageId -> resolved Image data
// Persists across re-renders and remounts — no redundant API calls
const imageCache = new Map<string, Image>()

// In-flight deduplication: if two mounts request the same imageId simultaneously,
// they share one promise instead of making two network requests
const inflight = new Map<string, Promise<Image>>()

/**
 * Seed the cache with images that arrived on another payload.
 *
 * The public report verification page has no auth token, so `getImageById` is a
 * guaranteed 401 there. It instead receives the images inline with the report and
 * primes them here, letting every preview component keep using `<GemImage imageId>`
 * unchanged. Callers with a token are unaffected — this just skips a round trip.
 */
export function primeImageCache(images?: Array<Partial<Image> & { _id: string }>) {
  if (!images) return
  for (const image of images) {
    if (image?._id && image.url) imageCache.set(image._id, image as Image)
  }
}

export function GemImage({ imageId, className, alt }: GemImageProps) {
  const cached = imageId ? imageCache.get(imageId) : undefined
  const [image, setImage] = useState<Image | null>(cached ?? null)
  const [loading, setLoading] = useState(!cached && !!imageId)
  const [error, setError] = useState(!imageId)

  useEffect(() => {
    if (!imageId) {
      setLoading(false)
      setError(true)
      return
    }

    // Already in cache — nothing to do
    if (imageCache.has(imageId)) {
      setImage(imageCache.get(imageId)!)
      setLoading(false)
      setError(false)
      return
    }

    let isMounted = true

    const fetchImage = async () => {
      setLoading(true)
      try {
        // Reuse an existing in-flight request if one is already running
        let promise = inflight.get(imageId)
        if (!promise) {
          promise = getImageById(imageId)
          inflight.set(imageId, promise)
        }

        const data = await promise
        imageCache.set(imageId, data) // Store in module-level cache
        inflight.delete(imageId)

        if (isMounted) {
          setImage(data)
          setError(false)
        }
      } catch (err) {
        console.error("Failed to fetch image:", imageId, err)
        inflight.delete(imageId)
        if (isMounted) {
          setError(true)
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchImage()

    return () => {
      isMounted = false
    }
  }, [imageId])

  if (loading) {
    return (
      <div
        className={cn("flex items-center justify-center", className)}
        style={{ backgroundColor: "#f8fafc" }}
      >
        <Loader2 className='w-4 h-4 animate-spin' style={{ color: "#cbd5e1" }} />
      </div>
    )
  }

  if (error || !image || !image.url) {
    return (
      <div
        className={cn("flex items-center justify-center", className)}
        style={{ backgroundColor: "#f1f5f9", color: "#94a3b8" }}
      >
        <Search className='w-4 h-4' />
      </div>
    )
  }

  return (
    <img
      src={image.url}
      alt={alt || image.name}
      className={cn("object-cover", className)}
      style={{ objectFit: className?.includes("object-contain") ? "contain" : "cover" }}
    />
  )
}
