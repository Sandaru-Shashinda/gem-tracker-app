import { useState, useEffect, useRef } from "react"
import { getImageById, type Image } from "@/lib/api/images"
import { Loader2, Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface GemImageProps {
  imageId: string
  className?: string
  alt?: string
}

export function GemImage({ imageId, className, alt }: GemImageProps) {
  const [image, setImage] = useState<Image | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const lastFetchedId = useRef<string | null>(null)

  useEffect(() => {
    if (!imageId) {
      setLoading(false)
      setError(true)
      return
    }

    if (lastFetchedId.current === imageId) return
    lastFetchedId.current = imageId

    let isMounted = true
    const fetchImage = async () => {
      setLoading(true)
      try {
        const data = await getImageById(imageId)
        if (isMounted) {
          setImage(data)
          setError(false)
        }
      } catch (err) {
        console.error("Failed to fetch image:", imageId, err)
        if (isMounted) {
          setError(true)
          lastFetchedId.current = null // Allow retry if it failed
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
      <div className={cn("flex items-center justify-center bg-slate-50 animate-pulse", className)}>
        <Loader2 className='w-4 h-4 animate-spin text-slate-300' />
      </div>
    )
  }

  if (error || !image || !image.url) {
    return (
      <div
        className={cn("flex items-center justify-center bg-slate-100 text-slate-400", className)}
      >
        <Search className='w-4 h-4' />
      </div>
    )
  }

  return <img src={image.url} alt={alt || image.name} className={cn("object-cover", className)} />
}
