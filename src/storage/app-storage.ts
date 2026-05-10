import type { StorageBackend } from './types'
import { CompositeStorage } from './composite'
import { DefaultsAdapter } from './defaults'
import { LocalStorageAdapter } from './local-storage'
import { UrlHashAdapter } from './url-hash'

export function createAppStorage(defaultSource: string): StorageBackend {
  return new CompositeStorage([
    new UrlHashAdapter(),
    new LocalStorageAdapter(),
    new DefaultsAdapter({ source: defaultSource }),
  ])
}
