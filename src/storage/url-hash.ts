import type { StorageBackend } from './types'
import { toBinary, fromBinary } from '../document/binary-codec'
import { importAscii } from '../document/import-ascii'
import { exportAscii } from '../document/export-ascii'
import { encodeBase64Url, decodeBase64Url } from './compress'

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
