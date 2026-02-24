/**
 * Compresses an image file to a target size in KB.
 * It scales down the image dimensions if they are too large and iteratively
 * adjusts the JPEG quality to try and reach the target size.
 */
export const compressImage = async (file: File, targetSizeKB: number = 30): Promise<File> => {
  // If the file is already smaller than the target, return it as is
  if (file.size / 1024 <= targetSizeKB) {
    return file
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement("canvas")
        let width = img.width
        let height = img.height

        // Scale down if very large to help compression
        // 800px is usually plenty for gem tracking previews
        const maxDimension = 800
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension
            width = maxDimension
          } else {
            width = (width / height) * maxDimension
            height = maxDimension
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Could not get canvas context"))
          return
        }

        // Fill white background for JPEGs (in case of PNG transparency)
        ctx.fillStyle = "#FFFFFF"
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)

        // Binary search or iterative approach for quality
        let minQuality = 0.1
        let maxQuality = 0.9
        let currentQuality = 0.5
        let bestBlob: Blob | null = null

        const checkCompression = (q: number, iterations: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Canvas toBlob failed"))
                return
              }

              const sizeKB = blob.size / 1024
              bestBlob = blob

              if (iterations > 0) {
                if (sizeKB > targetSizeKB) {
                  maxQuality = q
                  currentQuality = (minQuality + q) / 2
                } else {
                  minQuality = q
                  currentQuality = (maxQuality + q) / 2
                  // If we are already under the target, we could stop but let's try to get closer
                }
                checkCompression(currentQuality, iterations - 1)
              } else {
                // Return the best one we found
                resolve(
                  new File([bestBlob!], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                    type: "image/jpeg",
                  }),
                )
              }
            },
            "image/jpeg",
            q,
          )
        }

        // 4 iterations are usually enough to get close to the target color
        checkCompression(currentQuality, 4)
      }
      img.onerror = (err) => reject(err)
    }
    reader.onerror = (err) => reject(err)
  })
}
