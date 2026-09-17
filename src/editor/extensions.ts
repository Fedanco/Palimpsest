import { getSchema } from '@tiptap/core'
import Highlight from '@tiptap/extension-highlight'
import StarterKit from '@tiptap/starter-kit'
import { RawBlock } from './extensions/RawBlock.ts'
import { RawInline } from './extensions/RawInline.ts'
import { SourceTracking } from './extensions/SourceTracking.ts'

/** The one list of extensions, shared by the editor and the headless pipeline. */
export const extensions = [
  StarterKit.configure({
    // A trailing empty paragraph would be a "new block" on every save.
    trailingNode: false,
    link: { openOnClick: false, autolink: false, linkOnPaste: false },
    codeBlock: { HTMLAttributes: { class: 'code-block' } },
  }),
  Highlight.configure({ multicolor: false }),
  RawBlock,
  RawInline,
  SourceTracking,
]

export const schema = getSchema(extensions)
