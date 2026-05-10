import type { StorageBackend } from './types'
import { parseTemplate, serialize } from '../template'
import { toBinary, fromBinary } from './binary-codec'
import { compress, decompress, encodeBase64Url, decodeBase64Url } from './compress'

function isBinaryFormat(base64url: string): boolean {
  try {
    const raw = decodeBase64Url(base64url)
    if (raw.length < 6) return false
    const magic = (raw[0]! << 8) | raw[1]!
    return magic === 0x4942
  } catch {
    return false
  }
}

function oldDecode(encoded: string): string | null {
  try {
    return decodeURIComponent(escape(atob(encoded)))
  } catch {
    return null
  }
}

function oldEncode(source: string): string {
  return btoa(unescape(encodeURIComponent(source)))
}

export async function encodeShare(source: string): Promise<string> {
  const template = parseTemplate(source)
  const binary = toBinary(template)
  const compressed = await compress(binary)
  return encodeBase64Url(compressed)
}

export async function decodeShare(encoded: string): Promise<string | null> {
  if (isBinaryFormat(encoded)) {
    try {
      const raw = decodeBase64Url(encoded)
      const decompressed = await decompress(raw)
      const template = fromBinary(decompressed)
      return serialize(template)
    } catch {
      return null
    }
  }
  return oldDecode(encoded)
}

export class UrlHashAdapter implements StorageBackend {
  getItem(key: string): string | null {
    if (key === 'source') {
      const hash = window.location.hash.slice(1)
      if (hash) {
        if (!isBinaryFormat(hash)) {
          return oldDecode(hash)
        }
        return null
      }
    }
    return null
  }

  setItem(key: string, value: string): void {
    if (key === 'source') {
      window.location.hash = oldEncode(value)
    }
  }

  removeItem(_key: string): void {}
}

export async function readHashSource(): Promise<string | null> {
  const hash = window.location.hash.slice(1)
  if (!hash) return null
  return decodeShare(hash)
}
