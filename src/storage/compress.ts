const FORMAT = 'deflate-raw' as CompressionFormat

async function streamThrough(
  data: Uint8Array,
  StreamClass: typeof CompressionStream | typeof DecompressionStream,
): Promise<Uint8Array> {
  const stream = new StreamClass(FORMAT)
  const writer = stream.writable.getWriter()
  const reader = stream.readable.getReader()
  await writer.write(data.buffer as ArrayBuffer)
  await writer.close()
  const chunks: Uint8Array[] = []
  let totalLen = 0
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    chunks.push(value)
    totalLen += value.length
  }
  const result = new Uint8Array(totalLen)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}

export async function compress(data: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream !== 'undefined') {
    return streamThrough(data, CompressionStream)
  }
  const { deflateSync } = await import('node:zlib')
  return deflateSync(data, { level: 9 })
}

export async function decompress(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream !== 'undefined') {
    return streamThrough(data, DecompressionStream)
  }
  const { inflateSync } = await import('node:zlib')
  return inflateSync(data)
}

export function encodeBase64Url(data: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]!)
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function decodeBase64Url(encoded: string): Uint8Array {
  let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4 !== 0) base64 += '='
  const binary = atob(base64)
  const data = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    data[i] = binary.charCodeAt(i)
  }
  return data
}
