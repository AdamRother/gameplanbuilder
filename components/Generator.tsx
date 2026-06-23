'use client'

import { useState } from 'react'
import { FileText, Mic } from 'lucide-react'
import TranscriptMode from './TranscriptMode'
import InterviewMode from './InterviewMode'
import type { Framework, GeneratorMode } from '@/lib/types'

interface Props {
  framework: Framework
  onGenerate: (text: string) => void
  onEditFramework: () => void
}

const GOLD = '#B8962E'
const NAVY = '#1e3a5f'

export default function Generator({ framework, onGenerate, onEditFramework }: Props) {
  const [mode, setMode] = useState<GeneratorMode>('transcript')

  return (
    <div>
      {/* Mode toggle */}
      <div className="no-print border-b px-5 py-4" style={{ borderColor: '#e8e4d9', backgroundColor: 'white' }}>
        <div className="max-w-2xl mx-auto grid grid-cols-2 gap-3">
          <button
            onClick={() => setMode('transcript')}
            className="flex items-start gap-3 rounded-2xl border p-4 text-left transition-all hover:shadow-sm"
            style={{
              borderColor: mode === 'transcript' ? GOLD : '#e8e4d9',
              backgroundColor: mode === 'transcript' ? 'rgba(184,150,46,0.04)' : 'white',
            }}
          >
            <FileText
              className="h-5 w-5 mt-0.5 shrink-0"
              style={{ color: mode === 'transcript' ? GOLD : '#9b9ea6' }}
            />
            <div>
              <p className="text-[14px] font-semibold" style={{ color: mode === 'transcript' ? NAVY : '#2d3036' }}>
                I have a transcript
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: '#9b9ea6' }}>
                Paste or upload a call recording
              </p>
            </div>
          </button>

          <button
            onClick={() => setMode('interview')}
            className="flex items-start gap-3 rounded-2xl border p-4 text-left transition-all hover:shadow-sm"
            style={{
              borderColor: mode === 'interview' ? GOLD : '#e8e4d9',
              backgroundColor: mode === 'interview' ? 'rgba(184,150,46,0.04)' : 'white',
            }}
          >
            <Mic
              className="h-5 w-5 mt-0.5 shrink-0"
              style={{ color: mode === 'interview' ? GOLD : '#9b9ea6' }}
            />
            <div>
              <p className="text-[14px] font-semibold" style={{ color: mode === 'interview' ? NAVY : '#2d3036' }}>
                Interview me — no transcript
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: '#9b9ea6' }}>
                Answer questions by voice or type
              </p>
            </div>
          </button>
        </div>
      </div>

      {mode === 'transcript' ? (
        <TranscriptMode
          framework={framework}
          onGenerate={onGenerate}
          onEditFramework={onEditFramework}
        />
      ) : (
        <InterviewMode
          framework={framework}
          onGenerate={onGenerate}
        />
      )}
    </div>
  )
}
