export interface FileIO {
  readText(file: File): Promise<string>
  saveText(content: string, filename: string): void
}

export interface SessionState {
  notes: string
  selectedLayerIndex: number
  zoom: number
}
