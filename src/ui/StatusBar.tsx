import type { SaveStatus } from '../file/useAutosave.ts'

interface StatusBarProps {
  fileName: string
  editing: boolean
  status: SaveStatus
  onOpenAnother: () => void
  onGrantPermission: () => void
  onOverwrite: () => void
  onReload: () => void
}

export function StatusBar(props: StatusBarProps) {
  const { fileName, editing, status } = props
  return (
    <footer className="statusbar">
      <span className="statusbar-file" title={fileName}>
        {fileName}
      </span>
      <span className={`statusbar-mode${editing ? ' is-editing' : ''}`}>
        {editing
          ? 'Editing · Esc to finish'
          : 'Reading · double-click to edit · select + H to highlight'}
      </span>
      <span className={`statusbar-save save-${status.kind}`}>
        <SaveLabel
          status={status}
          onGrantPermission={props.onGrantPermission}
          onOverwrite={props.onOverwrite}
          onReload={props.onReload}
        />
      </span>
      <button type="button" className="statusbar-open" onClick={props.onOpenAnother}>
        Open…
      </button>
    </footer>
  )
}

function SaveLabel({
  status,
  onGrantPermission,
  onOverwrite,
  onReload,
}: Pick<StatusBarProps, 'status' | 'onGrantPermission' | 'onOverwrite' | 'onReload'>) {
  switch (status.kind) {
    case 'clean':
      return <>No changes</>
    case 'dirty':
      return <>Unsaved changes…</>
    case 'saving':
      return <>Saving…</>
    case 'saved':
      return <>Saved</>
    case 'no-permission':
      return (
        <>
          Write access needed{' '}
          <button type="button" onClick={onGrantPermission}>
            Grant
          </button>
        </>
      )
    case 'conflict':
      return (
        <>
          File changed on disk{' '}
          <button type="button" onClick={onOverwrite}>
            Overwrite
          </button>{' '}
          <button type="button" onClick={onReload}>
            Reload
          </button>
        </>
      )
    case 'error':
      return <>Save failed: {status.message}</>
  }
}
