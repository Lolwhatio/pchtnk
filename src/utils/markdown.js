import { marked } from 'marked'

marked.setOptions({ breaks: true, gfm: true })

export function markdownToHtml(md) {
  return marked.parse(md)
}

export function editorToMarkdown(editor) {
  const json = editor.getJSON()
  return nodesToMd(json.content || [])
}

function nodesToMd(nodes) {
  return nodes.map(nodeToMd).join('')
}

function nodeToMd(node) {
  switch (node.type) {
    case 'heading': {
      const hashes = '#'.repeat(node.attrs?.level || 1)
      return `${hashes} ${inlinesToText(node.content)}\n\n`
    }
    case 'paragraph':
      return node.content?.length ? `${inlinesToText(node.content)}\n\n` : '\n'
    case 'bulletList':
      return (node.content || []).map(li =>
        `- ${nodesToMd(li.content || []).trim()}`
      ).join('\n') + '\n\n'
    case 'orderedList':
      return (node.content || []).map((li, i) =>
        `${i + 1}. ${nodesToMd(li.content || []).trim()}`
      ).join('\n') + '\n\n'
    case 'listItem':
      return nodesToMd(node.content || [])
    case 'blockquote':
      return nodesToMd(node.content || [])
        .split('\n').filter(Boolean).map(l => `> ${l}`).join('\n') + '\n\n'
    case 'codeBlock': {
      const lang = node.attrs?.language || ''
      const code = node.content?.[0]?.text || ''
      return `\`\`\`${lang}\n${code}\n\`\`\`\n\n`
    }
    case 'horizontalRule':
      return `---\n\n`
    case 'hardBreak':
      return '  \n'
    default:
      return nodesToMd(node.content || [])
  }
}

function inlinesToText(nodes = []) {
  return nodes.map(n => {
    let text = n.text || nodesToMd(n.content || [])
    const marks = n.marks || []
    for (const m of marks) {
      if (m.type === 'bold')   text = `**${text}**`
      if (m.type === 'italic') text = `_${text}_`
      if (m.type === 'strike') text = `~~${text}~~`
      if (m.type === 'code')   text = `\`${text}\``
      if (m.type === 'link')   text = `[${text}](${m.attrs?.href || ''})`
    }
    return text
  }).join('')
}
