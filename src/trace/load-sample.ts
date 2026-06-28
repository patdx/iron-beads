import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PNG } from 'pngjs'
import { loadImageDataFromBlob } from './canvas-adapter'
import { traceSampleUrl, type TraceSample } from './samples'

const SAMPLES_DIR = join(process.cwd(), 'public/trace-samples')

export function pngBufferToImageData(buffer: Buffer): ImageData {
  const png = PNG.sync.read(buffer)
  const data = new Uint8ClampedArray(png.width * png.height * 4)

  for (let i = 0, j = 0; i < png.data.length; i += 4, j += 4) {
    data[j] = png.data[i]!
    data[j + 1] = png.data[i + 1]!
    data[j + 2] = png.data[i + 2]!
    data[j + 3] = png.data[i + 3]!
  }

  return { width: png.width, height: png.height, data } as ImageData
}

export function readSampleImageData(filename: string): ImageData {
  return pngBufferToImageData(readFileSync(join(SAMPLES_DIR, filename)))
}

export async function loadImageDataFromUrl(
  url: string,
  gridWidth: number,
): Promise<ImageData> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to load image: ${response.status}`)
  }
  const blob = await response.blob()
  return loadImageDataFromBlob(blob, gridWidth)
}

export async function loadSampleImageData(
  sample: TraceSample,
  gridWidth: number,
): Promise<ImageData> {
  return loadImageDataFromUrl(traceSampleUrl(sample), gridWidth)
}
