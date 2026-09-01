const DEFAULT_MAX_EDGE = 1000
const FALLBACK_MAX_EDGES = [1000, 800, 640]

function scaledSize(width: number, height: number, maxEdge: number) {
  if (width <= maxEdge && height <= maxEdge) {
    return { width, height }
  }
  const scale = maxEdge / Math.max(width, height)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

function canvasToJpeg(bitmap: ImageBitmap, quality: number): Promise<Blob> {
  const canvas = document.createElement("canvas")
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext("2d", { alpha: false })
  if (!ctx) {
    canvas.width = 0
    canvas.height = 0
    throw new Error("Could not process this image.")
  }
  ctx.drawImage(bitmap, 0, 0)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        canvas.width = 0
        canvas.height = 0
        if (!blob) {
          reject(new Error("Could not compress this image."))
          return
        }
        resolve(blob)
      },
      "image/jpeg",
      quality
    )
  })
}

async function bitmapFromFile(
  file: File,
  options?: ImageBitmapOptions
): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, options)
  } catch {
    const url = URL.createObjectURL(file)
    try {
      const image = await loadHtmlImage(url)
      return await createImageBitmap(image, options)
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

/**
 * Downscale in the decoder so Android never allocates the full camera bitmap
 * (12MP RGBA is ~50MB and triggers "low memory" on many cashier phones).
 */
async function compressAtMaxEdge(file: File, maxEdge: number, quality: number): Promise<Blob> {
  const probe = await bitmapFromFile(file, {
    resizeWidth: 64,
    resizeQuality: "pixelated",
    imageOrientation: "from-image",
  })
  const target = scaledSize(probe.width, probe.height, maxEdge)
  probe.close()

  const bitmap = await bitmapFromFile(file, {
    resizeWidth: target.width,
    resizeHeight: target.height,
    resizeQuality: "medium",
    imageOrientation: "from-image",
  })
  try {
    return await canvasToJpeg(bitmap, quality)
  } finally {
    bitmap.close()
  }
}

export async function compressBillImage(
  file: File,
  maxEdge = DEFAULT_MAX_EDGE,
  quality = 0.82
): Promise<Blob> {
  const edges = [maxEdge, ...FALLBACK_MAX_EDGES.filter((edge) => edge < maxEdge)]
  let lastError: unknown
  for (const edge of edges) {
    try {
      return await compressAtMaxEdge(file, edge, quality)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Could not compress this image.")
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Could not read this image."))
    image.src = src
  })
}
