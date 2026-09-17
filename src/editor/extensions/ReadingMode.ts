import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export const readingModeKey = new PluginKey('readingMode')

/**
 * Reading is the default state, editing the exception.
 *
 * - Double-click a block: the editor becomes editable, the caret lands where
 *   you clicked, and that top-level block gets the `is-editing` class.
 * - Escape: back to reading.
 */
export const ReadingMode = Extension.create({
  name: 'readingMode',

  addKeyboardShortcuts() {
    return {
      Escape: () => {
        if (!this.editor.isEditable) return false
        this.editor.setEditable(false)
        this.editor.view.dom.blur()
        return true
      },
    }
  },

  addProseMirrorPlugins() {
    const editor = this.editor
    return [
      new Plugin({
        key: readingModeKey,
        props: {
          handleDoubleClick(view, pos) {
            if (editor.isEditable) return false
            const $pos = view.state.doc.resolve(pos)
            // Raw blocks (math, tables, HTML) are opaque: nothing to edit inline.
            if ($pos.depth === 0 || $pos.node(1).type.name === 'rawBlock') return false
            editor.setEditable(true)
            const selection = TextSelection.near($pos)
            view.dispatch(view.state.tr.setSelection(selection))
            view.focus()
            return true
          },
          decorations(state) {
            if (!editor.isEditable) return null
            const $from = state.selection.$from
            if ($from.depth === 0) return null
            const start = $from.before(1)
            const end = $from.after(1)
            return DecorationSet.create(state.doc, [
              Decoration.node(start, end, { class: 'is-editing' }),
            ])
          },
        },
      }),
    ]
  },
})
