'use client'

import { useState, useRef } from 'react'
import { Sparkles, Upload, ChevronDown, ChevronUp, Edit2 } from 'lucide-react'
import { toast } from 'sonner'
import { buildTranscriptPrompt } from '@/utils/buildPrompt'
import { loadPdfText } from '@/utils/speechUtils'
import type { Framework } from '@/lib/types'

interface Props {
  framework: Framework
  apiKey: string
  onGenerate: (text: string) => void
  onEditFramework: () => void
}

const GOLD = '#B8962E'
const NAVY = '#1e3a5f'

export default function TranscriptMode({ framework, apiKey, onGenerate, onEditFramework }: Props) {
  const [transcript, setTranscript] = useState('')
  const [notes, setNotes] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [frameworkOpen, setFrameworkOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      if (file.name.endsWith('.pdf')) {
        const text = await loadPdfText(file)
        setTranscript(text)
        toast.success('PDF parsed successfully')
      } else {
        const text = await file.text()
        setTranscript(text)
        toast.success('File loaded')
      }
    } catch {
      toast.error("Couldn't read this PDF. Try copying and pasting the text instead.")
    }
    e.target.value = ''
  }

  async function handleGenerate() {
    if (!transcript.trim()) { toast.error('Please add a transcript before generating.'); return }
    setIsGenerating(true)
    try {
      const { system, userMessage } = buildTranscriptPrompt(framework, transcript, notes)
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, userMessage, apiKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Generation failed')
      onGenerate(data.text)
      toast.success('Game plan built!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-5 space-y-5">
      {/* Framework preview card */}
      <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: '#e8e4d9' }}>
        <button
          className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-[#faf9f6]"
          onClick={() => setFrameworkOpen(!frameworkOpen)}
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: GOLD }}>Framework</p>
            <p className="text-[15px] font-semibold mt-0.5" style={{ color: NAVY }}>{framework.frameworkName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={e => { e.stopPropagation(); onEditFramework() }}
              className="rounded-lg px-2.5 py-1 text-[12px] font-medium hover:bg-[#f3f0e9]"
              style={{ color: '#6b6e77' }}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            {frameworkOpen
              ? <ChevronUp className="h-4 w-4" style={{ color: '#9b9ea6' }} />
              : <ChevronDown className="h-4 w-4" style={{ color: '#9b9ea6' }} />}
          </div>
        </button>
        {frameworkOpen && (
          <div className="border-t px-5 py-4 space-y-2" style={{ borderColor: '#f0ede6' }}>
            {framework.steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: GOLD }}>{i + 1}</span>
                <span className="text-[13px] font-medium" style={{ color: NAVY }}>{step.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transcript input */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: '#2d3036' }}>Paste or Upload Transcript</h2>
            <p className="text-[12px] mt-0.5" style={{ color: '#9b9ea6' }}>Supports .txt and .pdf files</p>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[13px] font-medium hover:bg-[#f3f0e9]"
            style={{ borderColor: '#e8e4d9', color: '#6b6e77' }}
          >
            <Upload className="h-3.5 w-3.5" /> Upload file
          </button>
          <input ref={fileRef} type="file" accept=".txt,.pdf" className="hidden" onChange={handleFile} />
        </div>

        <textarea
          value={transcript}
          onChange={e => setTranscript(e.target.value)}
          placeholder={"Paste your call transcript here…\n\n\"Hey, so tell me where you're at right now...\""}
          className="w-full resize-y rounded-2xl border px-4 py-3.5 text-[14px] placeholder-[#c8cad0] focus:outline-none leading-relaxed"
          style={{
            minHeight: '320px',
            backgroundColor: 'white',
            borderColor: '#e8e4d9',
            color: '#2d3036',
            fontFamily: 'Arial, Helvetica, sans-serif',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = GOLD)}
          onBlur={e => (e.currentTarget.style.borderColor = '#e8e4d9')}
        />
        {transcript.length > 0 && (
          <p className="text-right text-[11px]" style={{ color: '#c8cad0' }}>
            {transcript.length.toLocaleString()} characters
          </p>
        )}
      </div>

      {/* Additional context */}
      <div className="space-y-2">
        <div>
          <h2 className="text-[15px] font-semibold" style={{ color: '#2d3036' }}>Additional Context</h2>
          <p className="text-[12px] mt-0.5" style={{ color: '#9b9ea6' }}>
            Anything not captured in the transcript — corrections, extra details, or notes that should affect the game plan.
          </p>
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="e.g. The prospect runs a team of 5. They mentioned off-camera that budget isn't an issue. Their main hesitation is time…"
          className="w-full resize-y rounded-2xl border px-4 py-3.5 text-[14px] placeholder-[#c8cad0] focus:outline-none leading-relaxed"
          style={{
            minHeight: '100px',
            backgroundColor: 'white',
            borderColor: '#e8e4d9',
            color: '#2d3036',
            fontFamily: 'Arial, Helvetica, sans-serif',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = GOLD)}
          onBlur={e => (e.currentTarget.style.borderColor = '#e8e4d9')}
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={isGenerating || !transcript.trim()}
        className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-semibold text-white transition-opacity disabled:opacity-40 hover:opacity-90"
        style={{ backgroundColor: GOLD }}
      >
        {isGenerating ? (
          <>
            <span className="flex gap-1">
              {[0, 150, 300].map(d => (
                <span key={d} className="h-1.5 w-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </span>
            Building your game plan…
          </>
        ) : (
          <><Sparkles className="h-4 w-4" /> Build Game Plan</>
        )}
      </button>
    </div>
  )
}
