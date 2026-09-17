/**
 * Local file access through the File System Access API (Chrome / Edge).
 * No accounts, no upload: the browser hands us a handle to a file on disk
 * and we read and write it in place.
 */

export interface OpenedFile {
  handle: FileSystemFileHandle
  name: string
  text: string
  /** Modification time reported by the OS when we read the file. */
  lastModified: number
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function'
}

/** Shows the picker and reads the chosen Markdown file. Returns null if the user cancels. */
export async function openMarkdownFile(): Promise<OpenedFile | null> {
  if (!window.showOpenFilePicker) throw new Error('File System Access API not supported')
  let handles: FileSystemFileHandle[]
  try {
    handles = await window.showOpenFilePicker({
      multiple: false,
      id: 'palimpsest-md',
      types: [
        {
          description: 'Markdown',
          accept: { 'text/markdown': ['.md', '.markdown', '.txt'] },
        },
      ],
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return null
    throw err
  }
  const handle = handles[0]
  if (!handle) return null

  // Ask for write access while we still have the user's click behind us:
  // a permission prompt from an autosave timer would be refused.
  await handle.requestPermission({ mode: 'readwrite' }).catch(() => 'prompt' as PermissionState)

  const file = await handle.getFile()
  return { handle, name: file.name, text: await file.text(), lastModified: file.lastModified }
}

export async function hasWritePermission(handle: FileSystemFileHandle): Promise<boolean> {
  return (await handle.queryPermission({ mode: 'readwrite' })) === 'granted'
}

/** Must be called from a user gesture (click, key press). */
export async function requestWritePermission(handle: FileSystemFileHandle): Promise<boolean> {
  return (await handle.requestPermission({ mode: 'readwrite' })) === 'granted'
}

/** Overwrites the file. Resolves with the new modification time. */
export async function writeMarkdownFile(
  handle: FileSystemFileHandle,
  text: string,
): Promise<number> {
  const writable = await handle.createWritable()
  try {
    await writable.write(text)
  } finally {
    await writable.close()
  }
  return (await handle.getFile()).lastModified
}

/** Modification time of the file on disk right now. */
export async function currentLastModified(handle: FileSystemFileHandle): Promise<number> {
  return (await handle.getFile()).lastModified
}
