import type { StorageBackend } from './types'

export class CompositeStorage implements StorageBackend {
  private backends: StorageBackend[]

  constructor(backends: StorageBackend[]) {
    this.backends = backends
  }

  getItem(key: string): string | null {
    for (const backend of this.backends) {
      const value = backend.getItem(key)
      if (value != null) return value
    }
    return null
  }

  setItem(key: string, value: string): void {
    for (const backend of this.backends) {
      backend.setItem(key, value)
    }
  }

  removeItem(key: string): void {
    for (const backend of this.backends) {
      backend.removeItem(key)
    }
  }
}
