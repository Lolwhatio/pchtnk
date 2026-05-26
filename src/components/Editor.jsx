import { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import './Editor.css'

const zenFocusKey = new PluginKey('zenFocus')
const ZenFocusPlugin = new Plugin({
  key: zenFocusKey,
  props: {
    decorations(state) {
      const { selection } = state
      const decorations = []
      state.doc.forEach((node, offset) => {
        const from = offset
        const to = offset + node.nodeSize
        if (selection.from >= from && selection.from < to) {
          decorations.push(Decoration.node(from, to, { class: 'zen-active' }))
        }
      })
      return DecorationSet.create(state.doc, decorations)
    }
  }
})

const OptimaShortcuts = Extension.create({
  name: 'optimaShortcuts',
  addKeyboardShortcuts() {
    return {
      'Mod-0': () => this.editor.chain().focus().setParagraph().run(),
      'Mod-1': () => this.editor.chain().focus().toggleHeading({ level: 1 }).run(),
      'Mod-2': () => this.editor.chain().focus().toggleHeading({ level: 2 }).run(),
      'Mod-3': () => this.editor.chain().focus().toggleHeading({ level: 3 }).run(),
      'Mod-4': () => this.editor.chain().focus().toggleHeading({ level: 4 }).run(),
      'Mod-5': () => this.editor.chain().focus().toggleHeading({ level: 5 }).run(),
      'Mod-6': () => this.editor.chain().focus().toggleHeading({ level: 6 }).run(),
      'Mod--': () => this.editor.chain().focus().toggleStrike().run(),
      'Mod-k': () => {
        if (this.editor.isActive('link')) {
          return this.editor.chain().focus().unsetLink().run()
        }
        const url = prompt('Введите ссылку:')
        if (url) this.editor.chain().focus().setLink({ href: url }).run()
        return true
      },
      'Mod-Shift-Backspace': () =>
        this.editor.chain().focus().unsetAllMarks().clearNodes().run(),
      'Mod-l': () => this.editor.chain().focus().toggleBulletList().run(),
      'Mod-Shift-l': () => this.editor.chain().focus().toggleOrderedList().run(),
      'Mod-Shift-b': () => this.editor.chain().focus().toggleBlockquote().run(),
      'Mod-Shift-p': () => this.editor.chain().focus().toggleCodeBlock().run(),
    }
  },
  addProseMirrorPlugins() {
    return [ZenFocusPlugin]
  }
})

export default function Editor({ onReady, onChange, zenMode }) {
  const wrapRef = useRef(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        codeBlock: { languageClassPrefix: 'language-' },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Placeholder.configure({
        placeholder: ({ editor }) => {
          // Показываем только когда документ полностью пустой
          const { doc } = editor.state
          if (doc.childCount !== 1) return ''
          const first = doc.firstChild
          if (!first || first.type.name !== 'paragraph' || first.textContent !== '') return ''
          return 'Привет! Начни писать здесь…'
        },
        showOnlyCurrent: false,
      }),
      OptimaShortcuts,
    ],
    content: getInitialContent(),
    autofocus: 'end',
    onUpdate: ({ editor }) => {
      onChange?.()
      saveToSession(editor)
    },
  })

  useEffect(() => {
    if (editor) onReady?.(editor)
    return () => { if (editor && !editor.isDestroyed) onReady?.(null) }
  }, [editor])

  // Typewriter scroll — активная строка всегда по центру
  useEffect(() => {
    if (!editor || !zenMode) return

    const centerActive = () => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const wrap = wrapRef.current
        if (!wrap) return
        const active = wrap.querySelector('.zen-active')
        if (!active) return
        active.scrollIntoView({ block: 'center', behavior: 'instant' })
      }))
    }

    editor.on('selectionUpdate', centerActive)
    editor.on('update', centerActive)
    // Центрируем сразу при входе в дзен
    centerActive()
    return () => {
      editor.off('selectionUpdate', centerActive)
      editor.off('update', centerActive)
    }
  }, [editor, zenMode])

  return (
    <div
      className={`editor-wrap${zenMode ? ' editor-wrap--zen' : ''}`}
      ref={wrapRef}
    >
      <EditorContent editor={editor} className="editor-content" />
    </div>
  )
}

function getInitialContent() {
  try {
    const saved = sessionStorage.getItem('pechatniki-draft')
    if (saved) return JSON.parse(saved)
  } catch {}
  return { type: 'doc', content: [{ type: 'paragraph' }] }
}

function saveToSession(editor) {
  try {
    sessionStorage.setItem('pechatniki-draft', JSON.stringify(editor.getJSON()))
  } catch {}
}
