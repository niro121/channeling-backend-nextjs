export async function compressBillImage(file: File, maxEdge = 1000, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(async () => {
    const url = URL.createObjectURL(file)
    try {
      const image = await loadHtmlImage(url)
      return await createImageBitmap(image)
    } finally {
      URL.revokeObjectURL(url)
    }
  })

  let { width, height } = bitmap
  if (width > maxEdge || height > maxEdge) {
    const scale = maxEdge / Math.max(width, height)
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    bitmap.close()
    throw new Error("Could not process this image.")
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  )
  if (!blob) throw new Error("Could not compress this image.")
  return blob
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Could not read this image."))
    image.src = src
  })
}
