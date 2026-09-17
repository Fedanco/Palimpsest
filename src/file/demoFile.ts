import type { OpenedFile } from './fsAccess.ts'

/**
 * Development only: an in-memory stand-in for a FileSystemFileHandle so the
 * whole flow can be exercised without the native file picker
 * (`http://localhost:5173/?demo=marker-like.md` loads `fixtures/marker-like.md`).
 * Every save is kept on `window.__palimpsestDemo` for inspection.
 */

declare global {
  interface Window {
    __palimpsestDemo?: { name: string; saves: string[]; current: string }
  }
}

class MemoryFileHandle {
  readonly kind = 'file' as const
  private lastModified = Date.now()

  readonly name: string
  private text: string

  constructor(name: string, text: string) {
    this.name = name
    this.text = text
  }

  async getFile(): Promise<File> {
    return new File([this.text], this.name, {
      type: 'text/markdown',
      lastModified: this.lastModified,
    })
  }

  async createWritable(): Promise<FileSystemWritableFileStream> {
    const chunks: string[] = []
    const commit = () => {
      this.text = chunks.join('')
      this.lastModified = Date.now()
      const demo = window.__palimpsestDemo
      if (demo) {
        demo.saves.push(this.text)
        demo.current = this.text
      }
    }
    const stream = {
      async write(data: unknown) {
        chunks.push(typeof data === 'string' ? data : String(data))
      },
      async close() {
        commit()
      },
      async abort() {},
      async seek() {},
      async truncate() {},
    }
    return stream as unknown as FileSystemWritableFileStream
  }

  async queryPermission(): Promise<PermissionState> {
    return 'granted'
  }
  async requestPermission(): Promise<PermissionState> {
    return 'granted'
  }
  async isSameEntry(other: FileSystemHandle): Promise<boolean> {
    return other === (this as unknown as FileSystemHandle)
  }
}

export async function openDemoFile(name: string): Promise<OpenedFile> {
  const res = await fetch(`/fixtures/${name}`)
  if (!res.ok) throw new Error(`Demo fixture not found: ${name}`)
  const text = await res.text()
  window.__palimpsestDemo = { name, saves: [], current: text }
  const handle = new MemoryFileHandle(name, text) as unknown as FileSystemFileHandle
  const file = await handle.getFile()
  return { handle, name, text, lastModified: file.lastModified }
}
