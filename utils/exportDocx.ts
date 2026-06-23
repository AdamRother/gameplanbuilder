import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  Packer,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  BorderStyle,
} from 'docx'

const NAVY = '1e3a5f'
const GOLD = 'B8962E'
const PURPLE = '6c3483'

// Page content width: 12240 (8.5in) - 1440 left - 1440 right = 9360 twips
const CONTENT_WIDTH = 9360

// ── Shared helpers ─────────────────────────────────────────────────────────────

function rgbToHex(rgb: string): string {
  const m = rgb.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/)
  if (m) return [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('')
  const hex = rgb.replace('#', '')
  return /^[0-9a-fA-F]{3,6}$/.test(hex) ? hex.toLowerCase() : '2d3036'
}

// HTML font-size attribute (1-7) → half-points
function fontSizeToHalfPts(n: number): number {
  return ({ 1: 16, 2: 20, 3: 24, 4: 28, 5: 36, 6: 48, 7: 72 } as Record<number, number>)[n] ?? 22
}

interface RunCtx { bold?: boolean; italics?: boolean; underline?: boolean; color?: string; size?: number }

function extractRunsFromNode(node: Node, ctx: RunCtx): TextRun[] {
  const runs: TextRun[] = []
  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = clean(child.textContent || '')
      if (text) {
        const runOpts: Record<string, unknown> = { text, font: (ctx as any).fontFamily || 'Arial', size: ctx.size ?? 22, color: ctx.color, bold: ctx.bold, italics: ctx.italics, underline: ctx.underline ? {} : undefined, strike: (ctx as any).strike }
        if ((ctx as any).vertAlign) runOpts.vertAlign = (ctx as any).vertAlign
        runs.push(new TextRun(runOpts as any))
      }
      continue
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue
    const el = child as HTMLElement
    const tag = el.tagName.toLowerCase()
    if (el.style.position === 'absolute') continue
    const c: RunCtx = { ...ctx }
    if (tag === 'b' || tag === 'strong') c.bold = true
    if (tag === 'i' || tag === 'em')     c.italics = true
    if (tag === 'u')                     c.underline = true
    if (tag === 's' || tag === 'strike' || tag === 'del') (c as any).strike = true
    if (tag === 'sup') (c as any).vertAlign = 'superscript'
    if (tag === 'sub') (c as any).vertAlign = 'subscript'
    if (tag === 'font') {
      const fc = el.getAttribute('color'); const fs = el.getAttribute('size')
      if (fc) c.color = rgbToHex(fc)
      if (fs) c.size  = fontSizeToHalfPts(parseInt(fs))
    }
    if (tag === 'span') {
      if (el.style.color)       c.color = rgbToHex(el.style.color)
      if (el.style.fontSize)    c.size  = Math.round(parseFloat(el.style.fontSize) * 1.5)
      if (el.style.fontFamily)  (c as any).fontFamily = el.style.fontFamily.replace(/['"]/g, '').split(',')[0].trim()
      if (el.style.fontWeight === 'bold' || el.style.fontWeight === '700') c.bold = true
      if (el.style.fontStyle  === 'italic')                                c.italics = true
      if (el.style.textDecoration?.includes('underline'))                  c.underline = true
      if (el.style.textDecoration?.includes('line-through'))               (c as any).strike = true
    }
    runs.push(...extractRunsFromNode(el, c))
  }
  return runs
}

function buildDocxConfig(children: (Paragraph | Table)[]) {
  return new Document({
    sections: [{ children, properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }, size: { width: 12240, height: 15840 } } } }],
    numbering: { config: [{ reference: 'bullets', levels: [{ level: 0, format: 'bullet' as any, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 180 } } } }] }] },
    styles: { default: { document: { run: { font: 'Arial', size: 22 }, paragraph: { spacing: { line: 320, after: 200 } } } } },
  })
}

async function triggerDownload(doc: Document, filename: string) {
  const buffer = await Packer.toBuffer(doc)
  const blob = new Blob([new Uint8Array(buffer as unknown as ArrayBuffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.docx') ? filename : filename + '.docx'
  a.click()
  URL.revokeObjectURL(url)
}

function buildTableColWidths(colCount: number): number[] {
  const firstW = Math.floor(CONTENT_WIDTH * 0.50)
  const otherW = colCount > 1 ? Math.floor((CONTENT_WIDTH - firstW) / (colCount - 1)) : 0
  const lastW  = colCount > 1 ? CONTENT_WIDTH - firstW - otherW * (colCount - 2) : CONTENT_WIDTH
  return Array.from({ length: colCount }, (_, i) => i === 0 ? firstW : i === colCount - 1 ? lastW : otherW)
}

const CELL_BORDERS = {
  top:    { style: BorderStyle.SINGLE, size: 4, color: 'D5D0C5' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D5D0C5' },
  left:   { style: BorderStyle.SINGLE, size: 4, color: 'D5D0C5' },
  right:  { style: BorderStyle.SINGLE, size: 4, color: 'D5D0C5' },
}
const CELL_MARGINS = { top: 100, bottom: 100, left: 140, right: 140 }

function buildTableFromHtmlEl(tableEl: HTMLElement, children: (Paragraph | Table)[]) {
  const allRows = tableEl.querySelectorAll('tr')
  if (!allRows.length) return
  const colCount = Math.max(...Array.from(allRows).map(r => r.querySelectorAll('td,th').length))
  const colWidths = buildTableColWidths(colCount)
  const tableRows: TableRow[] = Array.from(allRows).map((tr, ri) => {
    const cells = tr.querySelectorAll('td,th')
    const isHdr = ri === 0
    return new TableRow({ children: Array.from(cells).map(cell => new TableCell({ children: [new Paragraph({ children: extractRunsFromNode(cell, { size: 20, color: isHdr ? NAVY : undefined, bold: isHdr || undefined }) })], shading: { type: ShadingType.CLEAR, fill: isHdr ? 'EDE8DC' : ri % 2 === 0 ? 'FFFFFF' : 'F8F6F1' }, borders: CELL_BORDERS, margins: CELL_MARGINS })) })
  })
  children.push(new Paragraph({ spacing: { before: 240, after: 0 } }))
  children.push(new Table({ rows: tableRows, width: { size: CONTENT_WIDTH, type: WidthType.DXA }, columnWidths: colWidths }))
  children.push(new Paragraph({ spacing: { before: 0, after: 280 } }))
}

// ── Export from editor HTML (WYSIWYG) ─────────────────────────────────────────
export async function exportDocxFromHtml(html: string, filename: string): Promise<void> {
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<!DOCTYPE html><html><body>${html}</body></html>`, 'text/html')
  const children: (Paragraph | Table)[] = []

  for (const el of doc.body.children) {
    const htmlEl = el as HTMLElement
    const tag = el.tagName.toLowerCase()
    const style = htmlEl.style

    if (tag === 'table') { buildTableFromHtmlEl(htmlEl, children); continue }

    // Unordered list
    if (tag === 'ul') {
      for (const li of htmlEl.querySelectorAll('li')) {
        children.push(new Paragraph({ children: extractRunsFromNode(li, { size: 22 }), bullet: { level: 0 }, spacing: { before: 0, after: 140 } }))
      }
      continue
    }

    // Ordered list
    if (tag === 'ol') {
      let n = 1
      for (const li of htmlEl.querySelectorAll('li')) {
        const runs = extractRunsFromNode(li, { size: 22 })
        children.push(new Paragraph({
          children: [new TextRun({ text: `${n++}. `, font: 'Arial', size: 22 }), ...runs],
          spacing: { before: 0, after: 140 },
        }))
      }
      continue
    }

    if (tag === 'hr') {
      children.push(new Paragraph({ spacing: { before: 240, after: 240 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E8E4D9', space: 1 } } }))
      continue
    }

    // Spacer div
    if (tag === 'div' && (htmlEl.classList.contains('doc-spacer') || (parseInt(style.height || '0') >= 6 && !el.children.length))) {
      children.push(new Paragraph({ spacing: { before: 0, after: 240 } })); continue
    }

    if (tag === 'blockquote') {
      children.push(new Paragraph({
        children: extractRunsFromNode(htmlEl, { size: 22, italics: true }),
        indent: { left: 480 },
        spacing: { before: 200, after: 200 },
        border: { left: { style: BorderStyle.SINGLE, size: 16, color: GOLD, space: 8 } },
      }))
      continue
    }

    // H1: centered div with large font
    if (style.textAlign === 'center' && parseInt(style.fontSize || '0') >= 20) {
      children.push(new Paragraph({
        children: extractRunsFromNode(htmlEl, { bold: true, size: 44, color: NAVY }),
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 560 },
      }))
      continue
    }

    // H2
    if (tag === 'h2') {
      children.push(new Paragraph({
        children: extractRunsFromNode(htmlEl, { bold: true, size: 28, color: NAVY }),
        spacing: { before: 440, after: 200 },
      }))
      continue
    }

    // Step/H3 — purple bold paragraph
    const colorHex = style.color ? rgbToHex(style.color) : ''
    if (style.fontWeight === '700' && colorHex === '6c3483') {
      children.push(new Paragraph({
        children: extractRunsFromNode(htmlEl, { bold: true, size: 24, color: PURPLE }),
        spacing: { before: 320, after: 140 },
      }))
      continue
    }

    // Bullet — padding-left marks it; inline "• " is the bullet character
    if (parseInt(style.paddingLeft || '0') >= 10) {
      children.push(new Paragraph({
        children: extractRunsFromNode(htmlEl, { size: 22 }),
        indent: { left: 240 },
        spacing: { before: 0, after: 140 },
      }))
      continue
    }

    // Regular paragraph
    const runs = extractRunsFromNode(htmlEl, { size: 22 })
    if (runs.length) {
      const alignment = style.textAlign === 'center' ? AlignmentType.CENTER : style.textAlign === 'right' ? AlignmentType.RIGHT : undefined
      children.push(new Paragraph({ children: runs, spacing: { before: 0, after: 200 }, alignment }))
    }
  }

  await triggerDownload(buildDocxConfig(children), filename)
}

function clean(text: string): string {
  return text
    .replace(/—/g, '-')
    .replace(/–/g, '-')
    .replace(/\s--\s/g, ' - ')
    .trim()
}

// Parse a markdown string into TextRun[] preserving bold
function inlineRuns(raw: string, size = 22, color?: string): TextRun[] {
  const text = clean(raw.replace(/\*\*([^*]+)\*\*/g, '\x00B\x00$1\x00E\x00'))
  const segments = text.split(/\x00[BE]\x00/)
  const runs: TextRun[] = []
  let bold = false
  for (const seg of segments) {
    if (seg === 'B') { bold = true; continue }
    if (seg === 'E') { bold = false; continue }
    if (seg) runs.push(new TextRun({ text: seg, bold, font: 'Arial', size, color }))
  }
  if (!runs.length) runs.push(new TextRun({ text: '', font: 'Arial', size }))
  return runs
}

type Line =
  | { kind: 'skip' }
  | { kind: 'header'; text: string }
  | { kind: 'h2'; text: string }
  | { kind: 'step'; text: string }
  | { kind: 'bullet'; text: string }
  | { kind: 'sub-bullet'; label: string; body: string }
  | { kind: 'quote'; text: string }
  | { kind: 'table'; cells: string[] }
  | { kind: 'para'; text: string }

function classify(raw: string): Line {
  const t = raw.trim()
  if (!t || t === '---') return { kind: 'skip' }

  if (t.startsWith('# '))   return { kind: 'header', text: t.slice(2) }
  if (t.startsWith('## '))  return { kind: 'h2',     text: t.slice(3) }
  if (t.startsWith('### ')) return { kind: 'step',   text: t.slice(4) }
  if (t.startsWith('> '))   return { kind: 'quote',  text: t.slice(2).replace(/^["'"]|["'"]$/g, '') }

  if (t.startsWith('|')) {
    if (/^[\s\-|:]+$/.test(t)) return { kind: 'table', cells: [] }
    const cells = t.split('|').map(c => c.trim()).filter(Boolean)
    return { kind: 'table', cells }
  }

  if (t.startsWith('- ') || t.startsWith('* ') || t.startsWith('• ')) {
    const content = t.replace(/^[-*•]\s+/, '')
    const m = content.match(/^\*\*(.*?)\*\*:?\s*(.*)/)
    if (m) return { kind: 'sub-bullet', label: m[1].replace(/:$/, ''), body: m[2] }
    return { kind: 'bullet', text: content.replace(/\*\*(.*?)\*\*/g, '$1') }
  }

  return { kind: 'para', text: t }
}

export async function exportDocx(markdownText: string, filename: string): Promise<void> {
  const lines = markdownText.split('\n').map(classify)
  const children: (Paragraph | Table)[] = []
  let tableBuffer: string[][] = []

  function flushTable() {
    const validRows = tableBuffer.filter(r => r.length > 0)
    tableBuffer = []
    if (!validRows.length) return
    const [header, ...data] = validRows
    const colCount = Math.max(...validRows.map(r => r.length))
    const colWidths = buildTableColWidths(colCount)

    const rows: TableRow[] = [
      new TableRow({
        children: (header ?? []).map((cell) =>
          new TableCell({
            children: [new Paragraph({ children: inlineRuns(cell, 20, NAVY) })],
            shading: { type: ShadingType.CLEAR, fill: 'EDE8DC' },
            borders: CELL_BORDERS,
            margins: CELL_MARGINS,
          })
        ),
      }),
      ...data.map((row, rowIdx) =>
        new TableRow({
          children: row.map((cell) =>
            new TableCell({
              children: [new Paragraph({ children: inlineRuns(cell, 20) })],
              shading: { type: ShadingType.CLEAR, fill: rowIdx % 2 === 0 ? 'FFFFFF' : 'F8F6F1' },
              borders: CELL_BORDERS,
              margins: CELL_MARGINS,
            })
          ),
        })
      ),
    ]

    children.push(new Paragraph({ spacing: { before: 240, after: 0 } }))
    children.push(new Table({ rows, width: { size: CONTENT_WIDTH, type: WidthType.DXA }, columnWidths: colWidths }))
    children.push(new Paragraph({ spacing: { before: 0, after: 280 } }))
  }

  for (const line of lines) {
    if (line.kind === 'table') { tableBuffer.push(line.cells); continue }
    if (tableBuffer.length) flushTable()

    switch (line.kind) {
      case 'skip':
        children.push(new Paragraph({ spacing: { before: 0, after: 240 } }))
        break

      case 'header':
        children.push(new Paragraph({
          children: [new TextRun({ text: clean(line.text), bold: true, font: 'Arial', size: 44, color: NAVY })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 560 },
        }))
        break

      case 'h2':
        children.push(new Paragraph({
          children: [new TextRun({ text: clean(line.text), bold: true, font: 'Arial', size: 28, color: NAVY })],
          spacing: { before: 440, after: 200 },
        }))
        break

      case 'step':
        children.push(new Paragraph({
          children: [new TextRun({ text: clean(line.text), bold: true, font: 'Arial', size: 24, color: PURPLE })],
          spacing: { before: 320, after: 140 },
        }))
        break

      case 'bullet':
        children.push(new Paragraph({
          children: inlineRuns(line.text),
          bullet: { level: 0 },
          spacing: { before: 0, after: 140 },
        }))
        break

      case 'sub-bullet':
        children.push(new Paragraph({
          children: [
            new TextRun({ text: clean(line.label) + ': ', bold: true, font: 'Arial', size: 22 }),
            ...inlineRuns(line.body),
          ],
          bullet: { level: 0 },
          spacing: { before: 0, after: 140 },
        }))
        break

      case 'quote':
        children.push(new Paragraph({
          children: [
            new TextRun({ text: '"', font: 'Arial', size: 22, italics: true, color: GOLD }),
            new TextRun({ text: clean(line.text), font: 'Arial', size: 22, italics: true }),
            new TextRun({ text: '"', font: 'Arial', size: 22, italics: true, color: GOLD }),
          ],
          indent: { left: 480 },
          spacing: { before: 200, after: 200 },
          border: { left: { style: BorderStyle.SINGLE, size: 16, color: GOLD, space: 8 } },
        }))
        break

      case 'para':
        children.push(new Paragraph({
          children: inlineRuns(line.text),
          spacing: { before: 0, after: 200 },
        }))
        break
    }
  }

  flushTable()
  await triggerDownload(buildDocxConfig(children), filename)
}
