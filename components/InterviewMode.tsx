'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, RefreshCw, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { isSpeechRecognitionAvailable, createRecognition } from '@/utils/speechUtils'
import { buildInterviewPrompt } from '@/utils/buildPrompt'
import type { Framework, InterviewAnswers } from '@/lib/types'

interface Props {
  framework: Framework
  onGenerate: (text: string) => void
}

const GOLD = '#B8962E'
const NAVY = '#1e3a5f'
const RED = '#c0392b'

const EMPTY_ANSWERS: InterviewAnswers = {
  q1: '', q2: '', q3: '', q4: '', q5: '',
  q6: '', q7: '', q8: '', q9: '', q10: '',
}

interface Question {
  id: keyof InterviewAnswers
  text: string
  hint?: string
  block: string
  neverAutoStop?: boolean
  skipIfFramework?: boolean
  required?: boolean
}

const ALL_QUESTIONS: Question[] = [
  {
    id: 'q1',
    text: "What's your prospect's name?",
    block: 'The Prospect',
    required: true,
  },
  {
    id: 'q2',
    text: "Walk me through their current situation — where are they stuck, what specific numbers are they at, and what's frustrating them?",
    hint: "Include real numbers if they mentioned any. The more specific, the better the game plan.",
    block: 'Where They Are',
    required: true,
    neverAutoStop: true,
  },
  {
    id: 'q3',
    text: "What's their dream outcome — where exactly do they want to get to? Include any specific numbers or timeline they mentioned.",
    hint: "Try to include their exact words. The closer to what they actually said, the more the game plan will resonate.",
    block: 'Where They Want To Go',
    required: true,
  },
  {
    id: 'q4',
    text: "Why does hitting that goal actually matter to them personally? What changes in their life when they get there?",
    block: 'The Why',
  },
  {
    id: 'q5',
    text: "What is the one thing actually blocking them — not the symptoms, the real root cause? And why can't what they're currently doing fix it?",
    hint: "This fills two sections in the game plan: the core problem AND why their current approach keeps failing.",
    block: 'The Problem',
    required: true,
    neverAutoStop: true,
  },
  {
    id: 'q6',
    text: "Why are YOU the right person to solve this for them? What have you done or seen that makes you credible here?",
    block: 'The Solution',
  },
  {
    id: 'q7',
    text: "What do you call your framework or system?",
    block: 'The Solution',
    skipIfFramework: true,
  },
  {
    id: 'q8',
    text: "Walk me through each step of your solution — what it's called and what it does for this specific person.",
    block: 'The Solution',
    neverAutoStop: true,
    skipIfFramework: true,
  },
  {
    id: 'q9',
    text: "Any real numbers — what they could earn, what this costs, how the math works? Say skip if nothing specific was mentioned.",
    block: 'Numbers & Close',
  },
  {
    id: 'q10',
    text: "How does the game plan close — book a call, text you back, something else?",
    block: 'Numbers & Close',
  },
]

function Spinner() {
  return (
    <span className="flex gap-1">
      {[0, 150, 300].map(d => (
        <span key={d} className="h-1.5 w-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: `${d}ms` }} />
      ))}
    </span>
  )
}

export default function InterviewMode({ framework, onGenerate }: Props) {
  const [started, setStarted] = useState(false)
  const [answers, setAnswers] = useState<InterviewAnswers>(EMPTY_ANSWERS)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [speechAvailable] = useState(isSpeechRecognitionAvailable)

  const recognitionRef = useRef<any>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const hasFramework = !!(framework.frameworkName && framework.steps.length > 0 && framework.steps[0].name)

  const questions = ALL_QUESTIONS.filter(q => {
    if (q.skipIfFramework && hasFramework) return false
    return true
  })

  const current = questions[currentIndex]
  const currentAnswer = current ? (answers[current.id] ?? '') : ''
  const isLast = currentIndex === questions.length - 1

  const requiredMet = questions
    .filter(q => q.required)
    .every(q => (answers[q.id] ?? '').trim())

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    }
  }, [])

  function startRecording() {
    if (!speechAvailable) return
    const rec = createRecognition()
    if (!rec) return

    recognitionRef.current = rec
    let finalText = (answers[current.id] ?? '') as string

    rec.onresult = (e: any) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += (finalText ? ' ' : '') + t.trim()
        else interim += t
      }
      setAnswers(prev => ({ ...prev, [current.id]: finalText + (interim ? ' ' + interim : '') }))

      if (!current.neverAutoStop) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = setTimeout(() => stopRecording(), 3000)
      }
    }

    rec.onerror = (e: any) => {
      if (e.error !== 'aborted') toast.error('Mic: ' + e.error)
      setIsRecording(false)
      recognitionRef.current = null
    }

    rec.onend = () => {
      setIsRecording(false)
      recognitionRef.current = null
    }

    rec.start()
    setIsRecording(true)

    if (!current.neverAutoStop) {
      silenceTimerRef.current = setTimeout(() => stopRecording(), 5000)
    }
  }

  function stopRecording() {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setIsRecording(false)
  }

  function toggleRecording() {
    if (isRecording) stopRecording()
    else startRecording()
  }

  function rerecord() {
    stopRecording()
    setAnswers(prev => ({ ...prev, [current.id]: '' }))
    setTimeout(() => startRecording(), 200)
  }

  function nextQuestion() {
    stopRecording()
    if (isLast) { setShowReview(true); return }
    setCurrentIndex(i => i + 1)
  }

  function prevQuestion() {
    stopRecording()
    setCurrentIndex(i => Math.max(0, i - 1))
  }

  async function handleGenerate() {
    if (!requiredMet) {
      toast.error('Please answer the required questions before generating.')
      return
    }
    setIsGenerating(true)
    try {
      const merged: InterviewAnswers = {
        ...answers,
        q7: answers.q7 || framework.frameworkName,
      }
      const { system, userMessage } = buildInterviewPrompt(framework, merged)
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, userMessage }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Generation failed')
      onGenerate(data.text)
      toast.success('Game plan built!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Check your API key and try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  // ── Start screen ──────────────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-5 text-center space-y-6">
        <div>
          <h2 className="text-[22px] font-bold mb-2" style={{ color: NAVY }}>Interview Mode</h2>
          <p className="text-[14px]" style={{ color: '#9b9ea6' }}>
            {questions.length} questions about your prospect. Type or speak your answers.
          </p>
        </div>

        {hasFramework && (
          <div className="rounded-2xl border px-5 py-3 inline-block" style={{ borderColor: 'rgba(184,150,46,0.3)', backgroundColor: 'rgba(184,150,46,0.05)' }}>
            <p className="text-[13px]" style={{ color: GOLD }}>
              Using framework from Tab 1: <strong>{framework.frameworkName}</strong> — steps pre-filled.
            </p>
          </div>
        )}

        <button
          onClick={() => setStarted(true)}
          className="inline-flex items-center gap-2 rounded-2xl px-8 py-3.5 text-[15px] font-semibold text-white hover:opacity-90"
          style={{ backgroundColor: GOLD }}
        >
          Start Interview <ChevronRight className="h-4 w-4" />
        </button>

        {!speechAvailable && (
          <p className="text-[12px]" style={{ color: '#9b9ea6' }}>
            Voice mode works best in Chrome or Edge. On other browsers, you can type your answers instead.
          </p>
        )}
      </div>
    )
  }

  // ── Review screen ─────────────────────────────────────────────────────────
  if (showReview) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-5 space-y-6">
        <div>
          <h2 className="text-[20px] font-bold" style={{ color: NAVY }}>Review Your Answers</h2>
          <p className="text-[13px] mt-1" style={{ color: '#9b9ea6' }}>Edit any answer before generating.</p>
        </div>

        <div className="space-y-4">
          {questions.map(q => {
            const val = (answers[q.id] ?? '') as string
            const isEmpty = !val.trim()
            return (
              <div key={q.id}>
                <label className="block text-[12px] font-semibold mb-1" style={{ color: isEmpty && q.required ? RED : '#9b9ea6' }}>
                  {q.text} {q.required && <span style={{ color: RED }}>*</span>}
                </label>
                <textarea
                  value={val}
                  onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  rows={3}
                  className="w-full resize-y rounded-xl border px-3 py-2.5 text-[14px] focus:outline-none"
                  style={{
                    borderColor: isEmpty && q.required ? RED : '#e8e4d9',
                    backgroundColor: 'white',
                    color: '#2d3036',
                    fontFamily: 'Arial, Helvetica, sans-serif',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = GOLD)}
                  onBlur={e => (e.currentTarget.style.borderColor = isEmpty && q.required ? RED : '#e8e4d9')}
                />
              </div>
            )
          })}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { setShowReview(false); setCurrentIndex(questions.length - 1) }}
            className="flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-[14px] font-medium hover:bg-[#f3f0e9]"
            style={{ borderColor: '#e8e4d9', color: '#6b6e77' }}
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !requiredMet}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3 text-[15px] font-semibold text-white disabled:opacity-40 hover:opacity-90"
            style={{ backgroundColor: GOLD }}
          >
            {isGenerating ? <><Spinner /> Building your game plan…</> : <><Sparkles className="h-4 w-4" /> Build Game Plan</>}
          </button>
        </div>
      </div>
    )
  }

  // ── Question screen ───────────────────────────────────────────────────────
  const blockQuestions = questions.filter(q => q.block === current.block)
  const posInBlock = blockQuestions.indexOf(current) + 1

  return (
    <div className="max-w-2xl mx-auto py-8 px-5 space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => { stopRecording(); setCurrentIndex(i) }}
              className="rounded-full transition-all"
              style={{
                height: '8px',
                width: i === currentIndex ? '28px' : '8px',
                backgroundColor: i < currentIndex ? GOLD : i === currentIndex ? GOLD : '#e8e4d9',
                opacity: i < currentIndex ? 0.4 : 1,
              }}
            />
          ))}
        </div>
        <span className="text-[12px]" style={{ color: '#9b9ea6' }}>
          {currentIndex + 1} of {questions.length}
        </span>
      </div>

      {/* Block label */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: GOLD }}>
          {current.block}
        </p>
        <div className="rounded-2xl border bg-white p-8 text-center" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          <h2 className="text-[20px] font-semibold leading-snug" style={{ color: '#2d3036' }}>
            {current.text}
          </h2>
          {current.hint && (
            <p className="mt-3 text-[12px] italic text-left rounded-xl px-4 py-2.5" style={{ color: '#9b9ea6', background: '#f8f6f1' }}>
              {current.hint}
            </p>
          )}
          {current.neverAutoStop && (
            <p className="mt-3 text-[12px]" style={{ color: '#b0aba2' }}>
              Take your time — this one never auto-stops. Tap Stop when you&apos;re done.
            </p>
          )}
        </div>
      </div>

      {/* Answer textarea */}
      <div className="relative">
        <textarea
          value={currentAnswer}
          onChange={e => setAnswers(prev => ({ ...prev, [current.id]: e.target.value }))}
          placeholder={isRecording ? 'Listening…' : speechAvailable ? 'Tap the mic to speak, or type here…' : 'Type your answer here…'}
          rows={4}
          className="w-full resize-none rounded-2xl border px-4 py-3.5 text-[14px] leading-relaxed placeholder-[#c8cad0] focus:outline-none"
          style={{
            borderColor: isRecording ? GOLD : '#e8e4d9',
            backgroundColor: isRecording ? 'rgba(184,150,46,0.02)' : 'white',
            color: '#2d3036',
            fontFamily: 'Arial, Helvetica, sans-serif',
          }}
        />
        {isRecording && (
          <div className="absolute top-4 right-4 flex gap-1">
            {[0, 150, 300].map(d => (
              <span key={d} className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ backgroundColor: GOLD, animationDelay: `${d}ms` }} />
            ))}
          </div>
        )}
      </div>

      {/* Mic button */}
      {speechAvailable && (
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={toggleRecording}
            className={`flex h-16 w-16 items-center justify-center rounded-full shadow-md transition-all ${isRecording ? 'mic-pulse' : 'hover:scale-105'}`}
            style={{ backgroundColor: isRecording ? RED : GOLD }}
          >
            {isRecording ? <MicOff className="h-7 w-7 text-white" /> : <Mic className="h-7 w-7 text-white" />}
          </button>
          <p className="text-[12px]" style={{ color: '#9b9ea6' }}>
            {isRecording ? 'Listening… tap to stop' : 'Tap to speak'}
          </p>
          {isRecording && (
            <button onClick={rerecord} className="flex items-center gap-1 text-[12px] hover:underline" style={{ color: '#9b9ea6' }}>
              <RefreshCw className="h-3 w-3" /> Re-record
            </button>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevQuestion}
          disabled={currentIndex === 0}
          className="flex items-center gap-1 rounded-xl px-3 py-2 text-[13px] font-medium disabled:opacity-30 hover:bg-[#f3f0e9]"
          style={{ color: '#6b6e77' }}
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </button>

        {isLast ? (
          <button
            onClick={() => setShowReview(true)}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-semibold text-white hover:opacity-90"
            style={{ backgroundColor: GOLD }}
          >
            Review Answers <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={nextQuestion}
            className="flex items-center gap-1 rounded-xl px-4 py-2 text-[13px] font-medium hover:bg-[#f3f0e9]"
            style={{ color: '#2d3036' }}
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Skip to review if enough answered */}
      {currentIndex >= 5 && requiredMet && (
        <button
          onClick={() => setShowReview(true)}
          className="w-full text-center text-[12px] py-1.5 hover:underline"
          style={{ color: '#9b9ea6' }}
        >
          Skip to review & build →
        </button>
      )}
    </div>
  )
}
