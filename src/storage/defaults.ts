import type { StorageBackend } from './types'

export class DefaultsAdapter implements StorageBackend {
  private defaults: Record<string, string>

  constructor(defaults: Record<string, string>) {
    this.defaults = defaults
  }

  getItem(key: string): string | null {
    return this.defaults[key] ?? null
  }

  setItem(_key: string, _value: string): void {}

  removeItem(_key: string): void {}
}
