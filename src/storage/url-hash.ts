import type { StorageBackend } from './types'
import type { DocumentData } from '../document/types'
import { toBinary, fromBinary } from '../document/binary-codec'
import { importAscii } from '../document/import-ascii'
import { exportAscii } from '../document/export-ascii'
import {
  compress,
  decompress,
  encodeBase64Url,
  decodeBase64Url,
} from './compress'

function asciiToBinaryUrl(ascii: string): string {
  const data = importAscii(ascii)
  return encodeBase64Url(toBinary(data))
}

function binaryUrlToAscii(hash: string): string | null {
  try {
    const raw = decodeBase64Url(hash)
    const data = fromBinary(raw)
    return exportAscii(data)
  } catch {
    return null
  }
}

export async function encodeShare(data: DocumentData): Promise<string> {
  const binary = toBinary(data)
  const compressed = await compress(binary)
  return encodeBase64Url(compressed)
}

export async function decodeShare(
  encoded: string,
): Promise<DocumentData | null> {
  try {
    const raw = decodeBase64Url(encoded)
    const decompressed = await decompress(raw)
    return fromBinary(decompressed)
  } catch {
    return null
  }
}

export class UrlHashAdapter implements StorageBackend {
  getItem(key: string): string | null {
    if (key === 'source') {
      const hash = window.location.hash.slice(1)
      if (hash) return binaryUrlToAscii(hash)
    }
    return null
  }

  setItem(key: string, value: string): void {
    if (key === 'source') {
      window.location.hash = asciiToBinaryUrl(value)
    }
  }

  removeItem(_key: string): void {}
}

export async function readHashSource(): Promise<string | null> {
  const hash = window.location.hash.slice(1)
  if (!hash) return null

  const ascii = binaryUrlToAscii(hash)
  if (ascii) return ascii

  const data = await decodeShare(hash)
  if (data) return exportAscii(data)
  return null
}
