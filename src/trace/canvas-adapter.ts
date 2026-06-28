import { computeGridHeight } from './sample-grid'

export async function loadImageDataFromFile(
  file: File,
  gridWidth: number,
  gridHeight?: number,
): Promise<ImageData> {
  const bitmap = await createImageBitmap(file)
  return rasterizeBitmap(bitmap, gridWidth, gridHeight)
}

export async function loadImageDataFromBlob(
  blob: Blob,
  gridWidth: number,
  gridHeight?: number,
): Promise<ImageData> {
  const bitmap = await createImageBitmap(blob)
  return rasterizeBitmap(bitmap, gridWidth, gridHeight)
}

function rasterizeBitmap(
  bitmap: ImageBitmap,
  gridWidth: number,
  gridHeight?: number,
): ImageData {
  const height =
    gridHeight ?? computeGridHeight(bitmap.width, bitmap.height, gridWidth)
  const canvas = document.createElement('canvas')
  canvas.width = gridWidth
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.drawImage(bitmap, 0, 0, gridWidth, height)
  bitmap.close()
  return ctx.getImageData(0, 0, gridWidth, height)
}
