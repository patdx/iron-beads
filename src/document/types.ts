export interface Layer {
  name: string
  rows: string[]
}

export interface DocumentData {
  palette: Record<string, string>
  layers: Layer[]
}

export interface Document {
  data: DocumentData
  history: {
    entries: Uint8Array[]
    index: number
  }
}
