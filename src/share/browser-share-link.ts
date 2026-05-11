import type { DocumentData } from '../document/types'
import { toBinary, fromBinary } from '../document/binary-codec'
import { exportAscii } from '../document/export-ascii'
import { compress, decompress, encodeBase64Url, decodeBase64Url } from '../storage/compress'

export interface ShareLink {
  encode(data: DocumentData): Promise<string>
  decode(hash: string): Promise<DocumentData | null>
  readFromHash(): Promise<string | null>
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

export class BrowserShareLink implements ShareLink {
  async encode(data: DocumentData): Promise<string> {
    const binary = toBinary(data)
    const compressed = await compress(binary)
    return encodeBase64Url(compressed)
  }

  async decode(encoded: string): Promise<DocumentData | null> {
    try {
      const raw = decodeBase64Url(encoded)
      const decompressed = await decompress(raw)
      return fromBinary(decompressed)
    } catch {
      return null
    }
  }

  async readFromHash(): Promise<string | null> {
    const hash = window.location.hash.slice(1)
    if (!hash) return null

    const ascii = binaryUrlToAscii(hash)
    if (ascii) return ascii

    const data = await this.decode(hash)
    if (data) return exportAscii(data)
    return null
  }
}
