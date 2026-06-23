'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Sparkles, Video } from 'lucide-react'
import { toast } from 'sonner'
import { buildRewritePrompt } from '@/utils/buildPrompt'
import ExportButtons from './ExportButtons'

interface Props {
  gamePlan: string
  onUpdate: (text: string) => void
}

const GOLD = '#B8962E'

// ── Inline markdown renderer ──────────────────────────────────────────────────
function renderInline(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
}

// ── Convert Claude's markdown output to styled HTML ───────────────────────────
// Rule: NO inline margin/line-height on block elements — CSS owns all spacing.
// Only keep inline styles that carry visual identity (color, font-weight, font-size, padding-left)
// AND are needed by the DOCX exporter to classify element types.
function textToHtml(text: string): string {
  const lines = text.split('\n')
  let html = ''
  let i = 0
  let tableRows: string[][] = []

  function flushTable() {
    if (tableRows.length === 0) return
    const [header, ...data] = tableRows
    html += `<table>`
    if (header) {
      html += `<tr>${header.map(c => `<th style="border:1px solid #e8e4d9;padding:8px 12px;background:#f3f0e9;font-weight:600;color:#1e3a5f;">${renderInline(c)}</th>`).join('')}</tr>`
    }
    data.forEach(row => {
      html += `<tr>${row.map(c => `<td style="border:1px solid #e8e4d9;padding:8px 12px;">${renderInline(c)}</td>`).join('')}</tr>`
    })
    html += '</table>'
    tableRows = []
  }

  function renderBullet(content: string) {
    // padding-left kept for DOCX exporter detection (checks paddingLeft >= 10)
    const m = content.match(/^\*\*(.*?)\*\*:?\s*(.*)/)
    if (m) {
      const label = m[1].replace(/:$/, '')
      html += `<p style="padding-left:16px;"><span style="color:#1e3a5f;">• </span><strong>${label}:</strong> ${renderInline(m[2])}</p>`
    } else {
      html += `<p style="padding-left:16px;"><span style="color:#1e3a5f;">• </span>${renderInline(content)}</p>`
    }
  }

  while (i < lines.length) {
    const raw = lines[i]
    const t = raw.trim()

    // Empty line → small spacer div (gives visual breathing room between sections)
    if (!t) { flushTable(); html += '<div class="doc-spacer"></div>'; i++; continue }

    if (t === '---') { flushTable(); html += '<hr>'; i++; continue }

    if (t.startsWith('# ')) {
      flushTable()
      // font-size + text-align + color kept for DOCX exporter H1 detection
      html += `<div style="font-size:26px;font-weight:700;text-align:center;color:#1e3a5f;">${renderInline(t.slice(2))}</div>`
      i++; continue
    }
    if (t.startsWith('## ')) {
      flushTable()
      html += `<h2>${renderInline(t.slice(3))}</h2>`
      i++; continue
    }
    if (t.startsWith('### ')) {
      flushTable()
      // class="doc-step" for editor CSS; font-weight + color kept for DOCX exporter detection
      html += `<p class="doc-step" style="font-weight:700;color:#6c3483;">${renderInline(t.slice(4))}</p>`
      i++; continue
    }
    if (t.startsWith('> ')) {
      flushTable()
      html += `<blockquote>${renderInline(t.slice(2))}</blockquote>`
      i++; continue
    }

    if (t.includes('|')) {
      const cells = t.split('|').map(c => c.trim()).filter(c => c !== '')
      if (cells.every(c => /^[-:]+$/.test(c))) { i++; continue }
      tableRows.push(cells)
      i++; continue
    }

    if (tableRows.length > 0) flushTable()

    if (/^[-*•](\s|$)/.test(t)) {
      let content = t.replace(/^[-*•]\s*/, '')
      if (!content.trim()) {
        let j = i + 1
        while (j < lines.length && !lines[j].trim()) j++
        if (j < lines.length) {
          const nextLine = lines[j].trim()
          if (!/^(#{1,3} |---|>|\||-\s|\* )/.test(nextLine)) { content = nextLine; i = j }
        }
      }
      if (content.trim()) renderBullet(content)
      i++; continue
    }

    if (t.startsWith('Watch:')) {
      html += `<p style="margin-top:10px;color:#2d3036;">${renderInline(t)}</p>`
      i++; continue
    }

    html += `<p>${renderInline(t)}</p>`
    i++
  }

  flushTable()
  return html
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DocumentEditor({ gamePlan, onUpdate }: Props) {
  const editorRef       = useRef<HTMLDivElement>(null)
  const lastRenderedRef = useRef('')
  const savedRangeRef   = useRef<Range | null>(null)
  const savedTextRef    = useRef('')
  const modalInputRef   = useRef<HTMLInputElement>(null)

  // Small popup above selection
  const [popup, setPopup] = useState<{ visible: boolean; top: number; left: number }>({ visible: false, top: 0, left: 0 })
  // Full modal for typing the instruction
  const [modal, setModal]             = useState(false)
  const [instruction, setInstruction] = useState('')
  const [isRewriting, setIsRewriting] = useState(false)

  // ── Initialize ─────────────────────────────────────────────────────────────
  useEffect(() => {
    document.execCommand('defaultParagraphSeparator', false, 'p')
  }, [])

  useEffect(() => {
    if (editorRef.current && gamePlan && gamePlan !== lastRenderedRef.current) {
      lastRenderedRef.current = gamePlan
      editorRef.current.innerHTML = textToHtml(gamePlan)
    }
  }, [gamePlan])

  function saveCurrentText() {
    if (editorRef.current) {
      const text = editorRef.current.innerText ?? ''
      lastRenderedRef.current = text
      onUpdate(text)
    }
  }

  // ── Enter key: strip heading styles from new paragraph ────────────────────
  function handleEditorKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      setTimeout(() => {
        const sel = window.getSelection()
        if (!sel || !sel.rangeCount) return
        const node = sel.anchorNode
        const el = (node?.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement) as HTMLElement | null
        let block: HTMLElement | null = el
        while (block && block.parentElement !== editorRef.current) block = block.parentElement
        if (!block || block.tagName === 'LI') return
        const s = block.style
        const colorVal = s.color || ''
        const isPurple = colorVal === '#6c3483' || colorVal.includes('108, 52') || colorVal.includes('108,52')
        const isNavy   = colorVal === '#1e3a5f' || colorVal.includes('30, 58')  || colorVal.includes('30,58')
        const isHeadingTag  = ['H1', 'H2', 'H3'].includes(block.tagName)
        const isBoldColored = s.fontWeight === '700' && (isPurple || isNavy)
        const isLargeFont   = parseFloat(s.fontSize || '0') > 16
        if (isHeadingTag || isBoldColored || isLargeFont) {
          block.removeAttribute('style')
          if (!block.innerHTML.trim() || block.innerHTML === '<br>') block.innerHTML = '<br>'
        }
      }, 0)
    }
  }

  // ── Selection tracking — shows small "Rewrite with AI" chip ───────────────
  const checkSelection = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setPopup(p => ({ ...p, visible: false }))
      return
    }
    const range = sel.getRangeAt(0)
    const rect  = range.getBoundingClientRect()
    savedRangeRef.current = range.cloneRange()
    savedTextRef.current  = sel.toString().trim()
    setPopup({ visible: true, top: rect.top - 44, left: rect.left + rect.width / 2 })
  }, [])

  useEffect(() => {
    function handleMouseUp(e: MouseEvent) {
      if ((e.target as Element).closest?.('.ai-popup')) return
      checkSelection()
    }
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('keyup',   checkSelection)
    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('keyup',   checkSelection)
    }
  }, [checkSelection])

  // ── Open modal — saves selection first, then shows modal ──────────────────
  function openRewriteModal(e: React.MouseEvent) {
    e.preventDefault()  // don't clear selection
    setPopup(p => ({ ...p, visible: false }))
    setInstruction('')
    setModal(true)
    setTimeout(() => modalInputRef.current?.focus(), 50)
  }

  function closeModal() {
    setModal(false)
    setInstruction('')
  }

  // ── AI rewrite ─────────────────────────────────────────────────────────────
  async function handleRewrite() {
    if (!instruction.trim() || isRewriting) return
    setIsRewriting(true)
    try {
      const fullText = editorRef.current?.innerText ?? gamePlan
      const { system, userMessage } = buildRewritePrompt(fullText, savedTextRef.current, instruction)
      const res  = await fetch('/api/claude', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system, userMessage }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Rewrite failed')

      // Restore the selection and replace the text
      const sel = window.getSelection()
      if (savedRangeRef.current && sel) {
        sel.removeAllRanges()
        sel.addRange(savedRangeRef.current)
        // Convert plain text to HTML: double-newlines → <p> breaks, single → <br>
        const html = data.text.trim()
          .split(/\n\n+/)
          .map((para: string) =>
            `<p>${para
              .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
              .replace(/\n/g, '<br>')}</p>`
          )
          .join('')
        document.execCommand('insertHTML', false, html)
      }
      closeModal()
      saveCurrentText()
      toast.success('Text rewritten')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsRewriting(false)
    }
  }

  const prospectName = gamePlan.split('\n')[0]?.replace(/^#\s*/, '').replace(/×.+/, '').trim() || 'game_plan'

  return (
    <div className="max-w-3xl mx-auto py-8 px-5 space-y-4">

      <style>{`
        .doc-editor p                  { margin: 0 0 8px; line-height: 1.65; }
        .doc-editor > div              { margin: 0 0 8px; line-height: 1.65; }
        .doc-editor .doc-spacer        { height: 8px; margin: 0; line-height: 1; }
        .doc-editor .doc-step          { margin: 16px 0 5px; }
        .doc-editor h2                 { font-size: 17px; font-weight: 700; color: #1e3a5f; margin: 22px 0 8px; line-height: 1.4; }
        .doc-editor blockquote         { border-left: 3px solid #B8962E; margin: 0 0 8px; padding: 7px 14px; background: rgba(184,150,46,0.04); font-style: italic; color: #4a4d56; line-height: 1.65; }
        .doc-editor hr                 { border: none; border-top: 1px solid #e8e4d9; margin: 16px 0; }
        .doc-editor table              { width: 100%; border-collapse: collapse; margin: 0 0 14px; font-size: 14px; }
        .doc-editor th, .doc-editor td { text-align: left; vertical-align: top; }
        .doc-editor ul                 { padding-left: 22px; margin: 0 0 8px; }
        .doc-editor ol                 { padding-left: 22px; margin: 0 0 8px; }
        .doc-editor li                 { line-height: 1.65; margin-bottom: 4px; }
        .doc-editor a                  { color: #1e6bb8; text-decoration: underline; cursor: pointer; }
      `}</style>

      {/* Loom reminder */}
      <div className="no-print flex items-start gap-3 rounded-2xl border px-4 py-3.5"
        style={{ borderColor: 'rgba(184,150,46,0.3)', backgroundColor: 'rgba(184,150,46,0.05)' }}>
        <Video className="h-4 w-4 mt-0.5 shrink-0" style={{ color: GOLD }} />
        <div>
          <p className="text-[13px] font-semibold" style={{ color: '#2d3036' }}>Record your Loom walkthrough before sending.</p>
          <p className="text-[12px] mt-0.5" style={{ color: '#9b9ea6' }}>The document is the guide; the video is where you build certainty.</p>
        </div>
      </div>

      {/* Small popup chip — appears above selection, opens modal on click */}
      {popup.visible && (
        <div className="ai-popup no-print"
          style={{ position: 'fixed', top: popup.top, left: popup.left, transform: 'translateX(-50%)', zIndex: 9999,
            background: '#1e3a5f', borderRadius: 8, padding: '5px 12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)', pointerEvents: 'all' }}>
          <button onMouseDown={openRewriteModal}
            className="flex items-center gap-1.5 text-[12px] font-medium text-white whitespace-nowrap">
            <Sparkles className="h-3.5 w-3.5" style={{ color: GOLD }} />
            Rewrite with AI
          </button>
        </div>
      )}

      {/* Modal — focus-independent, won't disappear when typing */}
      {modal && (
        <div className="no-print fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.35)' }}
          onMouseDown={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full mx-4" style={{ maxWidth: 440 }}>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 shrink-0" style={{ color: GOLD }} />
              <p className="text-[14px] font-semibold" style={{ color: '#1e3a5f' }}>Rewrite with AI</p>
            </div>
            <p className="text-[12px] mb-4 mt-1" style={{ color: '#9b9ea6' }}>
              Selected: <em style={{ color: '#4a4d56' }}>"{savedTextRef.current.slice(0, 80)}{savedTextRef.current.length > 80 ? '…' : ''}"</em>
            </p>
            <input
              ref={modalInputRef}
              type="text"
              value={instruction}
              onChange={e => setInstruction(e.target.value)}
              placeholder="e.g. Make it more confident and direct"
              className="w-full rounded-xl px-3.5 py-2.5 text-[13px] focus:outline-none"
              style={{ border: '1.5px solid #e8e4d9', color: '#2d3036' }}
              onKeyDown={e => { if (e.key === 'Enter') handleRewrite(); if (e.key === 'Escape') closeModal() }}
            />
            <div className="flex gap-2 mt-3 justify-end">
              <button onClick={closeModal}
                className="px-4 py-2 text-[13px] rounded-xl hover:bg-[#f3f0e9] transition-colors"
                style={{ color: '#9b9ea6' }}>
                Cancel
              </button>
              <button onClick={handleRewrite} disabled={isRewriting || !instruction.trim()}
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white rounded-xl disabled:opacity-50 transition-opacity"
                style={{ backgroundColor: GOLD }}>
                {isRewriting ? (
                  <><span className="flex gap-0.5">{[0,100,200].map(d => <span key={d} className="h-1.5 w-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: `${d}ms` }} />)}</span> Rewriting…</>
                ) : 'Rewrite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document */}
      <div className="print-only-doc rounded-2xl border bg-white"
        style={{ borderColor: 'rgba(0,0,0,0.05)', boxShadow: '0 2px 24px rgba(0,0,0,0.06)' }}>
        <div className="px-12 py-10">
          <div ref={editorRef} className="doc-editor" contentEditable suppressContentEditableWarning
            onKeyDown={handleEditorKeyDown}
            style={{ minHeight: '600px', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '15px', lineHeight: '1.7', color: '#2d3036', outline: 'none' }} />
        </div>
      </div>

      <ExportButtons
        gamePlanText={gamePlan}
        prospectName={prospectName}
        getEditedText={() => editorRef.current?.innerText ?? gamePlan}
        getEditedHtml={() => editorRef.current?.innerHTML ?? ''}
      />

      <p className="no-print text-center text-[12px]" style={{ color: '#b0aba2' }}>
        Select any text to rewrite it with AI.
      </p>
    </div>
  )
}
