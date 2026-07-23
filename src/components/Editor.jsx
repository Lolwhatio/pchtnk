import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { TableKit } from '@tiptap/extension-table'
import { Extension, Node, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { DOMParser as ProseDOMParser } from 'prosemirror-model'
import DocLinkPopup from './DocLinkPopup'
import MediaDialog from './MediaDialog'
import EmbedDialog from './EmbedDialog'
import FootnoteDialog from './FootnoteDialog'
import { createStopWordsPlugin, stopWordsKey } from '../hooks/useStopWords'
import { collectFootnotes, uniqueSources } from '../utils/footnotes'
import { markdownToHtml } from '../utils/markdown'
import './Editor.css'

// ── Markdown-детектор ─────────────────────────────────────────────────────────

function looksLikeMarkdown(text) {
  if (!text || text.length < 10) return false
  return (
    /^#{1,6} .+/m.test(text)        || // заголовки
    /\*\*.+\*\*/s.test(text)         || // жирный
    /^[-*] .+/m.test(text)           || // маркированный список
    /^\d+\. .+/m.test(text)          || // нумерованный список
    /^> .+/m.test(text)              || // цитата
    /```[\s\S]*?```/.test(text)      || // блок кода
    /\[.+\]\(https?:\/\/.+\)/.test(text) // ссылка
  )
}

// ── Smart Paste: очистка AI-HTML ─────────────────────────────────────────────

const ALLOWED_TAGS = new Set(['p','h1','h2','h3','h4','h5','h6','ul','ol','li',
  'blockquote','pre','code','strong','em','s','br','a','img'])

// Безопасна ли ссылка. Отсекаем javascript:, vbscript:, data:text/html и т.п.
// Разрешаем http(s), mailto, tel, относительные/протокол-относительные ссылки
// и data:image/* (для встроенных картинок).
function isSafeUrl(value, forImage) {
  const v = (value || '').trim()
  if (!v) return false
  // Схему опасно определять по «:» до первого / ? # — так браузер её и читает
  const scheme = v.split(/[/?#]/, 1)[0]
  if (!scheme.includes(':')) return true // относительная ссылка — безопасна
  const proto = scheme.slice(0, scheme.indexOf(':')).toLowerCase().replace(/\s/g, '')
  if (forImage) return proto === 'https' || proto === 'http' ||
    (proto === 'data' && /^data:image\//i.test(v))
  return ['http', 'https', 'mailto', 'tel'].includes(proto)
}

function sanitizeAiHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  function clean(el) {
    // Снимаем все атрибуты кроме href у ссылок и src у картинок,
    // и только если схема ссылки безопасна
    for (const attr of [...el.attributes]) {
      const keep =
        (el.tagName === 'A'   && attr.name === 'href' && isSafeUrl(attr.value, false)) ||
        (el.tagName === 'IMG' && attr.name === 'src'  && isSafeUrl(attr.value, true))
      if (!keep) el.removeAttribute(attr.name)
    }
    for (const child of [...el.childNodes]) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (!ALLOWED_TAGS.has(child.tagName.toLowerCase())) {
          // Разворачиваем неразрешённый тег — сохраняем содержимое
          child.replaceWith(...child.childNodes)
        } else {
          clean(child)
        }
      }
    }
  }

  clean(doc.body)
  return doc.body.innerHTML
}

// ── Конвертер ссылок в embed-URL ─────────────────────────────────────────────

function toEmbedData(rawUrl) {
  const slides = rawUrl.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/)
  if (slides) return { src: `https://docs.google.com/presentation/d/${slides[1]}/embed?start=false&loop=false&delayms=3000`, type: 'slides', title: 'Google Slides' }

  const sheets = rawUrl.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (sheets) return { src: `https://docs.google.com/spreadsheets/d/${sheets[1]}/pubhtml?widget=true&headers=false`, type: 'sheets', title: 'Google Sheets' }

  const gdocs = rawUrl.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/)
  if (gdocs) return { src: `https://docs.google.com/document/d/${gdocs[1]}/preview`, type: 'gdocs', title: 'Google Docs' }

  const yt = rawUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
  if (yt) return { src: `https://www.youtube.com/embed/${yt[1]}?rel=0`, type: 'youtube', title: 'YouTube' }

  if (rawUrl.includes('figma.com')) return { src: `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(rawUrl)}`, type: 'figma', title: 'Figma' }

  return { src: rawUrl, type: 'generic', title: 'Встроенный контент' }
}

// Те же пиктограммы, что и в EmbedDialog (src/components/icons) — здесь как SVG-разметка,
// потому что NodeView рендерит через ванильный DOM, не через React.
const EMBED_ICONS = {
  slides: '<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="2" width="12" height="8" rx="1"/><line x1="4" y1="12" x2="10" y2="12"/><line x1="7" y1="10" x2="7" y2="12"/></svg>',
  sheets: '<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="1" width="12" height="12" rx="1"/><line x1="1" y1="5" x2="13" y2="5"/><line x1="1" y1="9" x2="13" y2="9"/><line x1="5" y1="1" x2="5" y2="13"/><line x1="9" y1="1" x2="9" y2="13"/></svg>',
  gdocs: '<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 1.5h5l3 3v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1z"/><path d="M8 1.5v3h3"/><line x1="4" y1="8" x2="10" y2="8"/><line x1="4" y1="10.5" x2="10" y2="10.5"/></svg>',
  youtube: '<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="2.5" width="12" height="9" rx="2"/><path d="M6 5.5l3 2-3 2z" fill="currentColor" stroke="none"/></svg>',
  figma: '<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="9.5" cy="7" r="2.5"/><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="2" y="8" width="5" height="4" rx="1"/></svg>',
  generic: '<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-dasharray="2 2"><rect x="1.5" y="1.5" width="11" height="11" rx="1.5"/></svg>',
}

// ── Resizable Image ───────────────────────────────────────────────────────────

const ResizableImage = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src:   { default: null },
      alt:   { default: null },
      title: { default: null },
      width: { default: null }, // масштаб: отображаемая ширина картинки, px
      // Кадрирование: окно (cropW × cropH) со смещением (cropX, cropY)
      // от левого верхнего угла картинки; null = без обрезки по этой оси
      cropX: { default: null },
      cropY: { default: null },
      cropW: { default: null },
      cropH: { default: null },
    }
  },

  parseHTML() {
    const int = (el, name) => el.getAttribute(name) ? parseInt(el.getAttribute(name), 10) : null
    return [{ tag: 'img[src]', getAttrs: el => ({
      src:   el.getAttribute('src'),
      alt:   el.getAttribute('alt'),
      title: el.getAttribute('title'),
      width: int(el, 'width'),
      cropX: int(el, 'data-crop-x'),
      cropY: int(el, 'data-crop-y'),
      cropW: int(el, 'data-crop-w'),
      cropH: int(el, 'data-crop-h'),
    }) }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const { cropX, cropY, cropW, cropH, ...rest } = HTMLAttributes
    const attrs = { ...rest }
    const hasCrop = cropX || cropY || cropW || cropH
    if (attrs.width) attrs.width = String(attrs.width)
    if (cropX) attrs['data-crop-x'] = String(cropX)
    if (cropY) attrs['data-crop-y'] = String(cropY)
    if (cropW) attrs['data-crop-w'] = String(cropW)
    if (cropH) attrs['data-crop-h'] = String(cropH)
    const imgStyle = [
      node.attrs.width ? `width:${node.attrs.width}px` : '',
      hasCrop ? 'max-width:none' : '',
      cropX ? `margin-left:-${cropX}px` : '',
      cropY ? `margin-top:-${cropY}px` : '',
    ].filter(Boolean).join(';')
    if (imgStyle) attrs.style = imgStyle
    // Кадр видим и в экспорте: инлайновая обёртка с overflow hidden
    if (hasCrop) {
      const boxStyle = [
        cropW ? `width:${cropW}px` : '',
        cropH ? `height:${cropH}px` : '',
        'max-width:100%',
        'overflow:hidden',
      ].filter(Boolean).join(';')
      return ['div', { class: 'img-crop', style: boxStyle }, ['img', mergeAttributes(attrs)]]
    }
    return ['img', mergeAttributes(attrs)]
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      let currentNode = node

      const wrap = document.createElement('div')
      wrap.className = 'img-wrap'
      wrap.setAttribute('contenteditable', 'false')

      // Окно кадра: прячет края картинки, ручки остаются снаружи
      const cropBox = document.createElement('div')
      cropBox.className = 'img-cropbox'

      const img = document.createElement('img')
      img.className = 'img-node'

      const applyAttrs = (a) => {
        img.src   = a.src || ''
        img.alt   = a.alt || ''
        img.title = a.title || ''
        const hasCrop = a.cropX || a.cropY || a.cropW || a.cropH
        img.style.width      = a.width ? `${a.width}px` : ''
        img.style.maxWidth   = hasCrop ? 'none' : ''
        img.style.marginLeft = a.cropX ? `-${a.cropX}px` : ''
        img.style.marginTop  = a.cropY ? `-${a.cropY}px` : ''
        cropBox.style.width  = a.cropW ? `${a.cropW}px` : ''
        cropBox.style.height = a.cropH ? `${a.cropH}px` : ''
      }
      applyAttrs(node.attrs)

      const mkHandle = (side, title) => {
        const h = document.createElement('div')
        h.className = `img-handle img-handle--${side}`
        h.title = title
        return h
      }
      const handleW  = mkHandle('w',  'Кадрировать слева')
      const handleE  = mkHandle('e',  'Кадрировать справа')
      const handleN  = mkHandle('n',  'Кадрировать сверху')
      const handleS  = mkHandle('s',  'Кадрировать снизу')
      const handleSE = mkHandle('se', 'Масштаб')

      const commit = (patch) => {
        const pos = typeof getPos === 'function' ? getPos() : null
        if (typeof pos !== 'number') return
        editor.view.dispatch(
          editor.view.state.tr.setNodeMarkup(pos, undefined, { ...currentNode.attrs, ...patch })
        )
      }

      function startDrag(e, onMove, onUp, cursor) {
        e.preventDefault()
        const overlay = document.createElement('div')
        overlay.style.cssText = `position:fixed;inset:0;z-index:9999;cursor:${cursor};`
        document.body.appendChild(overlay)
        const move = (mv) => onMove(mv)
        const up = (mu) => {
          document.removeEventListener('mousemove', move)
          document.removeEventListener('mouseup',   up)
          document.body.removeChild(overlay)
          onUp(mu)
        }
        document.addEventListener('mousemove', move)
        document.addEventListener('mouseup',   up)
      }

      // Кадр по оси: offset (скрыто с начала) + size (видимое окно).
      // Если окно вернулось к полному размеру — обрезка по оси снимается.
      const normAxis = (offset, size, full) => {
        offset = Math.max(0, Math.round(offset))
        size   = Math.round(size)
        if (offset <= 2) offset = 0
        if (offset === 0 && size >= Math.round(full) - 4) return { offset: null, size: null }
        return { offset: offset || null, size }
      }

      // Текущее состояние кадра по горизонтали/вертикали
      const cropState = () => {
        const imgW = img.getBoundingClientRect().width
        const imgH = img.getBoundingClientRect().height
        const a = currentNode.attrs
        return {
          imgW, imgH,
          x: a.cropX || 0,
          y: a.cropY || 0,
          w: a.cropW || imgW - (a.cropX || 0),
          h: a.cropH || imgH - (a.cropY || 0),
        }
      }

      // Правая грань: тянем правый край окна
      handleE.addEventListener('mousedown', (e) => {
        const s = cropState()
        const startX = e.clientX
        const calc = (mx) => Math.max(40, Math.min(s.imgW - s.x, s.w + mx - startX))
        startDrag(e,
          (mv) => { cropBox.style.width = `${calc(mv.clientX)}px` },
          (mu) => {
            const n = normAxis(s.x, calc(mu.clientX), s.imgW)
            commit({ cropX: n.offset, cropW: n.size, width: currentNode.attrs.width ?? Math.round(s.imgW) })
          },
          'ew-resize')
      })

      // Левая грань: сдвигаем левый край окна (offset растет, окно ужимается)
      handleW.addEventListener('mousedown', (e) => {
        const s = cropState()
        const startX = e.clientX
        const calc = (mx) => {
          const nx = Math.max(0, Math.min(s.x + s.w - 40, s.x + mx - startX))
          return { x: nx, w: s.w - (nx - s.x) }
        }
        startDrag(e,
          (mv) => {
            const c = calc(mv.clientX)
            img.style.marginLeft = c.x ? `-${c.x}px` : ''
            cropBox.style.width = `${c.w}px`
          },
          (mu) => {
            const c = calc(mu.clientX)
            const n = normAxis(c.x, c.w, s.imgW)
            commit({ cropX: n.offset, cropW: n.size, width: currentNode.attrs.width ?? Math.round(s.imgW) })
          },
          'ew-resize')
      })

      // Нижняя грань: тянем нижний край окна
      handleS.addEventListener('mousedown', (e) => {
        const s = cropState()
        const startY = e.clientY
        const calc = (my) => Math.max(40, Math.min(s.imgH - s.y, s.h + my - startY))
        startDrag(e,
          (mv) => { cropBox.style.height = `${calc(mv.clientY)}px` },
          (mu) => {
            const n = normAxis(s.y, calc(mu.clientY), s.imgH)
            commit({ cropY: n.offset, cropH: n.size, width: currentNode.attrs.width ?? Math.round(s.imgW) })
          },
          'ns-resize')
      })

      // Верхняя грань: сдвигаем верхний край окна
      handleN.addEventListener('mousedown', (e) => {
        const s = cropState()
        const startY = e.clientY
        const calc = (my) => {
          const ny = Math.max(0, Math.min(s.y + s.h - 40, s.y + my - startY))
          return { y: ny, h: s.h - (ny - s.y) }
        }
        startDrag(e,
          (mv) => {
            const c = calc(mv.clientY)
            img.style.marginTop = c.y ? `-${c.y}px` : ''
            cropBox.style.height = `${c.h}px`
          },
          (mu) => {
            const c = calc(mu.clientY)
            const n = normAxis(c.y, c.h, s.imgH)
            commit({ cropY: n.offset, cropH: n.size, width: currentNode.attrs.width ?? Math.round(s.imgW) })
          },
          'ns-resize')
      })

      // Угол — масштаб (пропорционально), кадр масштабируется вместе
      handleSE.addEventListener('mousedown', (e) => {
        const startX = e.clientX
        const startW = img.getBoundingClientRect().width
        const a = { ...currentNode.attrs }
        const calc = (mx) => Math.max(60, Math.min(1600, startW + mx - startX))
        const scaled = (v, f) => v ? Math.round(v * f) : null
        startDrag(e,
          (mv) => {
            const w = calc(mv.clientX)
            const f = w / startW
            img.style.width = `${w}px`
            if (a.cropX) img.style.marginLeft = `-${Math.round(a.cropX * f)}px`
            if (a.cropY) img.style.marginTop  = `-${Math.round(a.cropY * f)}px`
            if (a.cropW) cropBox.style.width  = `${Math.round(a.cropW * f)}px`
            if (a.cropH) cropBox.style.height = `${Math.round(a.cropH * f)}px`
          },
          (mu) => {
            const w = Math.round(calc(mu.clientX))
            const f = w / startW
            commit({
              width: w,
              cropX: scaled(a.cropX, f),
              cropY: scaled(a.cropY, f),
              cropW: scaled(a.cropW, f),
              cropH: scaled(a.cropH, f),
            })
          },
          'nwse-resize')
      })

      cropBox.appendChild(img)
      wrap.appendChild(cropBox)
      wrap.appendChild(handleW)
      wrap.appendChild(handleE)
      wrap.appendChild(handleN)
      wrap.appendChild(handleS)
      wrap.appendChild(handleSE)

      return {
        dom: wrap,
        update(upd) {
          if (upd.type.name !== 'image') return false
          currentNode = upd
          applyAttrs(upd.attrs)
          return true
        },
      }
    }
  },
})

// ── Embed: кастомная блочная нода ─────────────────────────────────────────────

const EmbedExtension = Node.create({
  name: 'embed',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src:    { default: null },
      type:   { default: 'generic' },
      title:  { default: 'Встроенный контент' },
      height: { default: 400 },
    }
  },

  parseHTML()  { return [{ tag: 'div[data-embed-src]' }] },
  renderHTML({ node }) {
    return ['div', {
      'data-embed-src':    node.attrs.src,
      'data-embed-type':   node.attrs.type,
      'data-embed-height': node.attrs.height,
      class: 'embed-node',
    }]
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      let currentNode = node

      const dom = document.createElement('div')
      dom.className = `embed-wrap embed-type-${node.attrs.type}`
      dom.setAttribute('contenteditable', 'false')

      const label = document.createElement('div')
      label.className = 'embed-label'
      const labelIcon = document.createElement('span')
      labelIcon.className = 'embed-label-icon'
      labelIcon.innerHTML = EMBED_ICONS[node.attrs.type] || EMBED_ICONS.generic
      const labelText = document.createElement('span')
      labelText.className = 'embed-label-text'
      labelText.textContent = node.attrs.title
      label.appendChild(labelIcon)
      label.appendChild(labelText)

      const body = document.createElement('div')
      body.className = 'embed-body'
      body.style.height = `${node.attrs.height || 400}px`

      const iframe = document.createElement('iframe')
      iframe.src = node.attrs.src || ''
      iframe.title = node.attrs.title
      iframe.allowFullscreen = true
      iframe.setAttribute('allow', 'autoplay; fullscreen; clipboard-write')
      iframe.setAttribute('loading', 'lazy')
      iframe.className = 'embed-iframe'

      // ── Drag-to-resize handle ──────────────────────────────
      const handle = document.createElement('div')
      handle.className = 'embed-resize-handle'

      handle.addEventListener('mousedown', (e) => {
        e.preventDefault()
        const startY = e.clientY
        const startH = parseInt(body.style.height, 10) || 400

        // Overlay prevents iframe from swallowing mouse events during drag
        const overlay = document.createElement('div')
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;cursor:ns-resize;'
        document.body.appendChild(overlay)

        const onMove = (mv) => {
          const newH = Math.max(120, Math.min(1600, startH + mv.clientY - startY))
          body.style.height = `${newH}px`
        }

        const onUp = (mu) => {
          document.removeEventListener('mousemove', onMove)
          document.removeEventListener('mouseup',   onUp)
          document.body.removeChild(overlay)

          const newH = Math.max(120, Math.min(1600, startH + mu.clientY - startY))
          const pos  = typeof getPos === 'function' ? getPos() : null
          if (typeof pos === 'number') {
            editor.view.dispatch(
              editor.view.state.tr.setNodeMarkup(pos, undefined, {
                ...currentNode.attrs,
                height: newH,
              })
            )
          }
        }

        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup',   onUp)
      })

      body.appendChild(iframe)
      dom.appendChild(label)
      dom.appendChild(body)
      dom.appendChild(handle)

      return {
        dom,
        update(upd) {
          if (upd.type.name !== 'embed') return false
          currentNode = upd
          iframe.src = upd.attrs.src || ''
          dom.className = `embed-wrap embed-type-${upd.attrs.type}`
          labelIcon.innerHTML = EMBED_ICONS[upd.attrs.type] || EMBED_ICONS.generic
          labelText.textContent = upd.attrs.title
          body.style.height = `${upd.attrs.height || 400}px`
          return true
        },
      }
    }
  },
})

// ── Дзен: подсветка активного блока ──────────────────────────────────────────

const zenFocusKey = new PluginKey('zenFocus')
const ZenFocusPlugin = new Plugin({
  key: zenFocusKey,
  props: {
    decorations(state) {
      const { selection } = state
      const decorations = []
      state.doc.forEach((node, offset) => {
        const from = offset
        const to   = offset + node.nodeSize
        if (selection.from >= from && selection.from < to) {
          decorations.push(Decoration.node(from, to, { class: 'zen-active' }))
        }
      })
      return DecorationSet.create(state.doc, decorations)
    }
  }
})

// ── DocLink: кастомная инлайн-нода ────────────────────────────────────────────

const DocLink = Node.create({
  name: 'docLink',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      id:    { default: null },
      label: { default: '' },
    }
  },

  parseHTML() {
    return [{
      tag: 'span[data-doc-id]',
      getAttrs: el => ({
        id:    el.getAttribute('data-doc-id'),
        label: el.getAttribute('data-label') || el.textContent,
      }),
    }]
  },

  renderHTML({ node }) {
    return ['span', {
      class:         'doc-link',
      'data-doc-id': node.attrs.id,
      'data-label':  node.attrs.label,
    }, node.attrs.label]
  },
})

// ── Сноски ────────────────────────────────────────────────────────────────────
// Надстрочный номер в тексте + источник за ним, как в Word.
// Номер НЕ хранится в документе — его рисует CSS-счётчик, поэтому
// вставка сноски в середину автоматически перенумеровывает остальные.

const Footnote = Node.create({
  name: 'footnote',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      note: { default: '' }, // описание источника
      url:  { default: '' }, // необязательная ссылка
    }
  },

  parseHTML() {
    return [{
      tag: 'sup[data-footnote]',
      getAttrs: el => ({
        note: el.getAttribute('data-note') || '',
        url:  el.getAttribute('data-url')  || '',
      }),
    }]
  },

  renderHTML({ node }) {
    return ['sup', {
      'data-footnote': '',
      'data-note': node.attrs.note,
      'data-url':  node.attrs.url,
      class: 'footnote-ref',
      title: node.attrs.note || node.attrs.url || 'Сноска',
    }]
  },

  addCommands() {
    return {
      insertFootnote: (attrs = {}) => ({ chain }) =>
        chain().focus().insertContent({ type: 'footnote', attrs }).run(),
    }
  },
})

// Блок «Источники» — сам собирается из сносок документа и живёт в актуальном
// состоянии: добавил сноску — строка появилась, удалил — исчезла.
const SourcesList = Node.create({
  name: 'sourcesList',
  group: 'block',
  atom: true,

  parseHTML() { return [{ tag: 'div[data-sources-list]' }] },
  renderHTML() { return ['div', { 'data-sources-list': '', class: 'sources-list' }] },

  addCommands() {
    return {
      insertSourcesList: () => ({ chain }) =>
        chain().focus().insertContent({ type: 'sourcesList' }).run(),
    }
  },

  addNodeView() {
    return ({ editor }) => {
      const dom = document.createElement('div')
      dom.className = 'sources-list'
      dom.setAttribute('contenteditable', 'false')

      const render = () => {
        const items = collectFootnotes(editor.state.doc)
        dom.replaceChildren()

        const title = document.createElement('div')
        title.className = 'sources-list__title'
        title.textContent = 'Источники'
        dom.appendChild(title)

        if (!items.length) {
          const empty = document.createElement('div')
          empty.className = 'sources-list__empty'
          empty.textContent = 'Сносок пока нет — добавьте их кнопкой на панели'
          dom.appendChild(empty)
          return
        }

        const ol = document.createElement('ol')
        ol.className = 'sources-list__items'
        for (const it of items) {
          const li = document.createElement('li')
          // Ссылку ставим только если схема безопасна
          if (it.url && isSafeUrl(it.url, false)) {
            const a = document.createElement('a')
            a.href = it.url
            a.target = '_blank'
            a.rel = 'noopener noreferrer'
            a.textContent = it.note || it.url
            li.appendChild(a)
          } else {
            li.textContent = it.note || it.url || '—'
          }
          ol.appendChild(li)
        }
        dom.appendChild(ol)
      }

      render()
      editor.on('update', render)

      return {
        dom,
        ignoreMutation: () => true,
        destroy() { editor.off('update', render) },
      }
    }
  },
})

// ── Шорткаты Печатников ───────────────────────────────────────────────────────

const OptimaShortcuts = Extension.create({
  name: 'optimaShortcuts',
  addKeyboardShortcuts() {
    return {
      'Mod-k': () => {
        const currentUrl = this.editor.getAttributes('link').href || ''
        window.dispatchEvent(new CustomEvent('pechatniki:link-dialog', { detail: { currentUrl } }))
        return true
      },
      // Заголовки — ⌘⌥1…6 и абзац — ⌘⌥0: родные шорткаты TipTap
      // (⌘⇧3/4/5 в macOS заняты системными скриншотами)
      'Mod-Shift--': () => this.editor.chain().focus().toggleStrike().run(),
      'Mod-Shift-Backspace': () =>
        this.editor.chain().focus().unsetAllMarks().clearNodes().run(),
      'Mod-Shift-l': () => this.editor.chain().focus().toggleBulletList().run(),
      'Mod-Shift-o': () => this.editor.chain().focus().toggleOrderedList().run(),
      'Mod-Shift-b': () => this.editor.chain().focus().toggleBlockquote().run(),
      'Mod-Shift-p': () => this.editor.chain().focus().toggleCodeBlock().run(),
    }
  },
  addProseMirrorPlugins() {
    return [ZenFocusPlugin]
  }
})

// ─────────────────────────────────────────────────────────────────────────────

export default function Editor({ onReady, onChange, zenMode, initialContent, docs, onDocSelect, stopPhrases, typograf }) {
  const wrapRef = useRef(null)
  const phrasesRef = useRef(stopPhrases ?? [])
  const typografRef = useRef(typograf)
  const isPastingRef = useRef(false)

  // Синхронизируем рефы при смене пропсов
  useEffect(() => {
    phrasesRef.current = stopPhrases ?? []
    typografRef.current = typograf
  }, [stopPhrases, typograf])

  // eslint-disable-next-line react-hooks/refs
  const stopWordsPlugin = useMemo(() => createStopWordsPlugin(phrasesRef), []) // phrasesRef is stable, plugin reads .current lazily

  // ── suggestion state ──────────────────────────────────────────────────────
  const [suggestion, setSuggestion] = useState(null)
  const [suggIdx, setSuggIdx] = useState(0)
  const [lastFilteredDocs, setLastFilteredDocs] = useState(null)

  // ── Media / Embed диалоги ─────────────────────────────────────────────────
  const [mediaDialog, setMediaDialog] = useState(false)
  const [embedDialog, setEmbedDialog] = useState(false)
  // Сноска: null | { existing, number, pos } — pos есть только при правке
  const [footnoteDialog, setFootnoteDialog] = useState(null)

  const filteredDocs = useMemo(() => {
    if (!suggestion || !docs) return []
    const q = suggestion.query.toLowerCase()
    return docs.filter(d => !q || (d.title || '').toLowerCase().includes(q)).slice(0, 8)
  }, [suggestion?.query, docs]) // eslint-disable-line

  // сброс индекса при смене списка
  if (lastFilteredDocs !== filteredDocs) {
    setLastFilteredDocs(filteredDocs)
    setSuggIdx(0)
  }

  // ── TipTap ────────────────────────────────────────────────────────────────
  const editor = useEditor({
    editorProps: {
      attributes: { spellcheck: 'true' },
      // Drag & drop изображений прямо в редактор
      handleDrop(view, event) {
        const files = [...(event.dataTransfer?.files || [])].filter(f => f.type.startsWith('image/'))
        if (!files.length) return false
        event.preventDefault()
        const coords = { left: event.clientX, top: event.clientY }
        const pos = view.posAtCoords(coords)?.pos ?? view.state.selection.from
        files.forEach(file => {
          const reader = new FileReader()
          reader.onload = (e) => {
            const node = view.state.schema.nodes.image.create({ src: e.target.result })
            view.dispatch(view.state.tr.insert(pos, node))
          }
          reader.readAsDataURL(file)
        })
        return true
      },
      // Smart Paste: вставка изображений и очистка AI-HTML
      handlePaste(view, event) {
        isPastingRef.current = true
        setTimeout(() => { isPastingRef.current = false }, 200)
        const files = [...(event.clipboardData?.files || [])].filter(f => f.type.startsWith('image/'))
        if (files.length) {
          files.forEach(file => {
            const reader = new FileReader()
            reader.onload = (e) => {
              const node = view.state.schema.nodes.image.create({ src: e.target.result })
              view.dispatch(view.state.tr.replaceSelectionWith(node))
            }
            reader.readAsDataURL(file)
          })
          return true
        }

        // Если есть HTML — чистим от AI-мусора и прогоняем через типограф
        const html = event.clipboardData?.getData('text/html')
        if (html) {
          event.preventDefault()
          const clean = sanitizeAiHtml(html)
          const withTypo = typografRef.current ? typografRef.current.execute(clean) : clean
          const container = document.createElement('div')
          container.innerHTML = withTypo
          const slice = ProseDOMParser.fromSchema(view.state.schema).parseSlice(container)
          view.dispatch(view.state.tr.replaceSelection(slice))
          return true
        }

        // Plain text — проверяем, похоже ли на markdown
        const plain = event.clipboardData?.getData('text/plain') || ''
        if (looksLikeMarkdown(plain)) {
          event.preventDefault()
          const converted = markdownToHtml(plain)
          const container = document.createElement('div')
          container.innerHTML = converted
          const slice = ProseDOMParser.fromSchema(view.state.schema).parseSlice(container)
          view.dispatch(view.state.tr.replaceSelection(slice))
          return true
        }

        return false
      },
    },
    extensions: [
      StarterKit.configure({
        heading:   { levels: [1, 2, 3, 4, 5, 6] },
        codeBlock: { languageClassPrefix: 'language-' },
        link:      false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      ResizableImage,
      EmbedExtension,
      Footnote,
      SourcesList,
      TableKit.configure({
        table: { resizable: true, HTMLAttributes: { class: 'pm-table' } },
      }),
      Placeholder.configure({
        placeholder: ({ editor: e }) => {
          const { doc } = e.state
          if (doc.childCount !== 1) return ''
          const first = doc.firstChild
          if (!first || first.type.name !== 'paragraph' || first.textContent !== '') return ''
          return 'Привет! Начни писать здесь…'
        },
        showOnlyCurrent: false,
      }),
      DocLink,
      OptimaShortcuts,
      Extension.create({
        name: 'stopWords',
        addProseMirrorPlugins: () => [stopWordsPlugin],
      }),
    ],
    content:   initialContent ?? getInitialContent(),
    autofocus: 'end',
    onUpdate: () => { onChange?.() },
  })

  useEffect(() => {
    if (editor) onReady?.(editor)
    return () => { if (editor && !editor.isDestroyed) onReady?.(null) }
  }, [editor]) // eslint-disable-line react-hooks/exhaustive-deps

  // Обновляем декорации стоп-слов при смене списка
  useEffect(() => {
    if (!editor) return
    editor.view.dispatch(editor.state.tr.setMeta(stopWordsKey, true))
  }, [stopPhrases, editor])

  // ── Слушаем кнопки тулбара для медиа/эмбедов ─────────────────────────────
  useEffect(() => {
    const onImg   = () => setMediaDialog(true)
    const onEmbed = () => setEmbedDialog(true)
    const onFootnote = () => setFootnoteDialog({ existing: null, number: 0, pos: null })
    const onSources  = () => editor?.commands.insertSourcesList()
    // Правка из панели сносок
    const onEditFootnote = (e) => {
      const { pos, number, note, url } = e.detail || {}
      if (pos == null) return
      setFootnoteDialog({ pos, number, existing: { note: note || '', url: url || '' } })
    }
    window.addEventListener('pechatniki:insert-image', onImg)
    window.addEventListener('pechatniki:insert-embed', onEmbed)
    window.addEventListener('pechatniki:insert-footnote', onFootnote)
    window.addEventListener('pechatniki:insert-sources', onSources)
    window.addEventListener('pechatniki:edit-footnote', onEditFootnote)
    return () => {
      window.removeEventListener('pechatniki:insert-image', onImg)
      window.removeEventListener('pechatniki:insert-embed', onEmbed)
      window.removeEventListener('pechatniki:insert-footnote', onFootnote)
      window.removeEventListener('pechatniki:insert-sources', onSources)
      window.removeEventListener('pechatniki:edit-footnote', onEditFootnote)
    }
  }, [editor])

  // ── Сноска: вставка / правка / удаление ──────────────────────────────────
  const handleFootnoteConfirm = useCallback((attrs) => {
    if (!editor) return
    if (footnoteDialog?.pos != null) {
      // Правка существующей — меняем атрибуты ноды на её позиции
      editor.view.dispatch(
        editor.view.state.tr.setNodeMarkup(footnoteDialog.pos, undefined, attrs)
      )
    } else {
      editor.commands.insertFootnote(attrs)
    }
  }, [editor, footnoteDialog])

  const handleFootnoteDelete = useCallback(() => {
    if (!editor || footnoteDialog?.pos == null) return
    const { pos } = footnoteDialog
    editor.view.dispatch(editor.view.state.tr.delete(pos, pos + 1))
  }, [editor, footnoteDialog])

  const handleInsertImage = useCallback(({ src }) => {
    editor?.chain().focus().insertContent({ type: 'image', attrs: { src } }).run()
    setMediaDialog(false)
  }, [editor])

  const handleInsertEmbed = useCallback((rawUrl) => {
    const data = toEmbedData(rawUrl)
    editor?.chain().focus().insertContent([{ type: 'embed', attrs: data }]).run()
    setEmbedDialog(false)
  }, [editor])

  // ── Детекция [[query и / ─────────────────────────────────────────────────
  useEffect(() => {
    if (!editor) return
    const detect = () => {
      if (editor.isDestroyed) return
      if (isPastingRef.current) { setSuggestion(null); return }
      const { $from } = editor.state.selection
      if ($from.parent.type.name === 'codeBlock') { setSuggestion(null); return }

      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset)

      // [[...]] → DocLink (только если пользователь сам набирает, не вставляет)
      const match = textBefore.match(/\[\[([^\][]*)$/)
      if (match) {
        const query  = match[1]
        const from   = $from.pos - query.length - 2
        const coords = editor.view.coordsAtPos(from)
        setSuggestion({ query, from, to: $from.pos, coords })
        return
      }
      setSuggestion(null)

    }
    editor.on('update',          detect)
    editor.on('selectionUpdate', detect)
    return () => {
      editor.off('update',          detect)
      editor.off('selectionUpdate', detect)
    }
  }, [editor])

  // ── Вставка ссылки на документ ───────────────────────────────────────────
  const insertDocLink = useCallback((doc) => {
    if (!suggestion || !editor) return
    editor.chain()
      .focus()
      .deleteRange({ from: suggestion.from, to: suggestion.to })
      .insertContentAt(suggestion.from, [
        { type: 'docLink', attrs: { id: doc.id, label: doc.title || 'Без названия' } },
        { type: 'text', text: ' ' },
      ])
      .run()
    setSuggestion(null)
  }, [suggestion, editor])

  // ── Клавиатурная навигация по списку (перехватываем до TipTap) ───────────
  useEffect(() => {
    if (!suggestion || filteredDocs.length === 0) return
    const handler = (e) => {
      if      (e.key === 'Escape')    { setSuggestion(null); e.preventDefault(); e.stopImmediatePropagation() }
      else if (e.key === 'ArrowDown') { setSuggIdx(i => (i + 1) % filteredDocs.length); e.preventDefault(); e.stopImmediatePropagation() }
      else if (e.key === 'ArrowUp')   { setSuggIdx(i => (i - 1 + filteredDocs.length) % filteredDocs.length); e.preventDefault(); e.stopImmediatePropagation() }
      else if (e.key === 'Enter' || e.key === 'Tab') {
        insertDocLink(filteredDocs[suggIdx])
        e.preventDefault()
        e.stopImmediatePropagation()
      }
    }
    window.addEventListener('keydown', handler, { capture: true })
    return () => window.removeEventListener('keydown', handler, { capture: true })
  }, [suggestion, filteredDocs, suggIdx, insertDocLink])

  // ── Клик по doc-link → открыть документ ─────────────────────────────────
  const handleWrapClick = useCallback((e) => {
    const el = e.target.closest('[data-doc-id]')
    if (el) { e.preventDefault(); onDocSelect?.(el.dataset.docId, true); return }

    // Клик по сноске — правим её источник
    const fn = e.target.closest('sup[data-footnote]')
    if (fn && editor) {
      e.preventDefault()
      const pos = editor.view.posAtDOM(fn, 0)
      const all = collectFootnotes(editor.state.doc)
      const idx = all.findIndex(it => it.pos === pos)
      setFootnoteDialog({
        pos,
        number: idx >= 0 ? idx + 1 : all.length + 1,
        existing: { note: fn.dataset.note || '', url: fn.dataset.url || '' },
      })
    }
  }, [onDocSelect, editor])

  // ── Typewriter scroll в Дзен ─────────────────────────────────────────────
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
    editor.on('update',          centerActive)
    centerActive()
    return () => {
      editor.off('selectionUpdate', centerActive)
      editor.off('update',          centerActive)
    }
  }, [editor, zenMode])

  return (
    <div
      className={`editor-wrap${zenMode ? ' editor-wrap--zen' : ''}`}
      ref={wrapRef}
      onClick={handleWrapClick}
    >
      <EditorContent editor={editor} className="editor-content" />

      {suggestion && (
        <DocLinkPopup
          query={suggestion.query}
          coords={suggestion.coords}
          docs={filteredDocs}
          selectedIdx={suggIdx}
          onSelect={insertDocLink}
        />
      )}

      {mediaDialog && (
        <MediaDialog
          onConfirm={handleInsertImage}
          onClose={() => setMediaDialog(false)}
        />
      )}

      {embedDialog && (
        <EmbedDialog
          onConfirm={handleInsertEmbed}
          onClose={() => setEmbedDialog(false)}
        />
      )}

      {footnoteDialog && (
        <FootnoteDialog
          existing={footnoteDialog.existing}
          number={footnoteDialog.number}
          sources={uniqueSources(editor, footnoteDialog.pos)}
          onConfirm={handleFootnoteConfirm}
          onDelete={footnoteDialog.pos != null ? handleFootnoteDelete : undefined}
          onClose={() => setFootnoteDialog(null)}
        />
      )}
    </div>
  )
}

function getInitialContent() {
  try {
    const saved = localStorage.getItem('pechatniki-draft')
    if (saved) return JSON.parse(saved)
  } catch { /* ignored */ }
  return { type: 'doc', content: [{ type: 'paragraph' }] }
}
