'use client'

import { useState } from 'react'
import { FileDown, Copy, Printer, Check } from 'lucide-react'
import { toast } from 'sonner'
import { exportDocx, exportDocxFromHtml } from '@/utils/exportDocx'

interface Props {
  gamePlanText: string
  prospectName?: string
  getEditedText?: () => string
  getEditedHtml?: () => string
}

const GOLD = '#B8962E'

export default function ExportButtons({ gamePlanText, prospectName, getEditedText, getEditedHtml }: Props) {
  const [copying, setCopying] = useState(false)
  const [docxLoading, setDocxLoading] = useState(false)

  const filename = (prospectName || 'game_plan').replace(/[^a-z0-9]/gi, '_')

  async function handleDocx() {
    setDocxLoading(true)
    try {
      const html = getEditedHtml ? getEditedHtml() : ''
      if (html) {
        await exportDocxFromHtml(html, filename)
      } else {
        await exportDocx(gamePlanText, filename)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setDocxLoading(false)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(getEditedText ? getEditedText() : gamePlanText)
      setCopying(true)
      setTimeout(() => setCopying(false), 2000)
    } catch {
      toast.error('Copy failed')
    }
  }

  function handlePrint() {
    window.print()
  }

  const btnClass = "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-medium transition-colors hover:bg-[#f3f0e9] disabled:opacity-50"
  const btnStyle = { borderColor: '#e8e4d9', backgroundColor: 'white', color: '#2d3036' }

  return (
    <div className="no-print flex flex-wrap gap-2 pt-4 border-t" style={{ borderColor: '#e8e4d9' }}>
      <div className="relative group">
        <button onClick={handleDocx} disabled={docxLoading} className={btnClass} style={btnStyle}>
          {docxLoading ? (
            <span className="flex gap-1">
              {[0, 150, 300].map(d => <span key={d} className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
            </span>
          ) : (
            <FileDown className="h-4 w-4" style={{ color: GOLD }} />
          )}
          Download .docx
        </button>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
          <div className="rounded-lg bg-[#2d3036] px-3 py-1.5 text-[11px] text-white whitespace-nowrap shadow-lg">
            Opens automatically in Pages on Mac
          </div>
        </div>
      </div>

      <button onClick={handlePrint} className={btnClass} style={btnStyle}>
        <Printer className="h-4 w-4" style={{ color: GOLD }} />
        Print / Save PDF
      </button>

      <button onClick={handleCopy} className={btnClass} style={btnStyle}>
        {copying ? (
          <><Check className="h-4 w-4" style={{ color: '#27ae60' }} /> Copied!</>
        ) : (
          <><Copy className="h-4 w-4" style={{ color: GOLD }} /> Copy to clipboard</>
        )}
      </button>
    </div>
  )
}
