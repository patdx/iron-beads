import type { DocumentData } from '../document/types'
import { toBinary, fromBinary } from '../document/binary-codec'
import { exportAscii } from '../document/export-ascii'
import { compress, decompress, encodeBase64Url, decodeBase64Url } from '../storage/compress'
import type { ShareLink } from './browser-share-link'

export class InMemoryShareLink implements ShareLink {
  private hash = ''

  async encode(data: DocumentData): Promise<string> {
    const binary = toBinary(data)
    const compressed = await compress(binary)
    this.hash = encodeBase64Url(compressed)
    return this.hash
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
    if (!this.hash) return null
    const data = await this.decode(this.hash)
    if (data) return exportAscii(data)
    return null
  }

  setHash(hash: string): void {
    this.hash = hash
  }
}
