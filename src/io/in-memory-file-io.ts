import type { FileIO } from './types'

export class InMemoryFileIO implements FileIO {
  private saved: { content: string; filename: string }[] = []

  readText(_file: File): Promise<string> {
    return Promise.resolve('')
  }

  saveText(content: string, filename: string): void {
    this.saved.push({ content, filename })
  }

  getSaved(): { content: string; filename: string }[] {
    return this.saved
  }

  reset(): void {
    this.saved = []
  }
}
