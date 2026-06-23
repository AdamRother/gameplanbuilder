'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, Edit2, Plus, X, Mic, MicOff, Sparkles, RefreshCw, Trash2, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { createRecognition, isSpeechRecognitionAvailable } from '@/utils/speechUtils'
import type { Framework, Step, ProofItem, ProofItemType } from '@/lib/types'

interface Props {
  frameworks: Framework[]
  activeFrameworkId: string | null
  onSave: (f: Framework) => void
  onSetActive: (id: string) => void
  onDelete: (id: string) => void
}

const GOLD = '#B8962E'
const NAVY = '#1e3a5f'
const RED = '#c0392b'

function newFramework(): Framework {
  return {
    id: crypto.randomUUID(),
    frameworkName: '',
    stepCount: 3,
    steps: [{ name: '', notes: '' }, { name: '', notes: '' }, { name: '', notes: '' }],
    proofItems: [],
  }
}

// ── Plain input ───────────────────────────────────────────────────────────────
function Input({ label, value, onChange, placeholder, multiline = false, required = false }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder: string; multiline?: boolean; required?: boolean
}) {
  const base: React.CSSProperties = {
    borderColor: '#e8e4d9', backgroundColor: 'white', color: '#2d3036',
    fontSize: '14px', fontFamily: 'Arial, Helvetica, sans-serif',
  }
  return (
    <div className="space-y-1">
      <label className="block text-[12px] font-semibold uppercase tracking-wide" style={{ color: '#9b9ea6' }}>
        {label}{required && <span style={{ color: RED }}> *</span>}
      </label>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
            className="w-full resize-y rounded-xl border px-3 py-2.5 focus:outline-none" style={base}
            onFocus={e => (e.currentTarget.style.borderColor = GOLD)}
            onBlur={e => (e.currentTarget.style.borderColor = '#e8e4d9')} />
        : <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            className="w-full rounded-xl border px-3 py-2.5 focus:outline-none" style={base}
            onFocus={e => (e.currentTarget.style.borderColor = GOLD)}
            onBlur={e => (e.currentTarget.style.borderColor = '#e8e4d9')} />}
    </div>
  )
}

// ── Shared AI rewrite UI (used by both AiInput and AiTextarea) ────────────────
function AiPromptRow({ stepName, fieldLabel, currentValue, onRewrite }: {
  stepName: string; fieldLabel: string; currentValue: string
  onRewrite: (instruction: string) => Promise<void>
}) {
  const [show, setShow] = useState(false)
  const [instruction, setInstruction] = useState('')
  const [loading, setLoading] = useState(false)

  async function run() {
    if (!instruction.trim()) return
    setLoading(true)
    await onRewrite(instruction)
    setInstruction('')
    setShow(false)
    setLoading(false)
  }

  const sendIcon = (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  )
  const dots = <span className="flex gap-0.5 px-1">{[0,100,200].map(d=><span key={d} className="h-1.5 w-1.5 rounded-full bg-white animate-bounce" style={{animationDelay:`${d}ms`}}/>)}</span>

  return (
    <>
      <button type="button" onClick={() => setShow(p => !p)} title="Rewrite with AI"
        className="absolute top-2 right-2 rounded-lg p-1 transition-colors hover:bg-[#f3f0e9]"
        style={{ color: show ? GOLD : '#c8cad0' }}>
        <Sparkles className="h-3.5 w-3.5" />
      </button>
      {show && (
        <div className="flex gap-2 mt-1.5">
          <input autoFocus type="text" value={instruction} onChange={e => setInstruction(e.target.value)}
            placeholder="What needs to change?"
            className="flex-1 rounded-xl border px-3 py-2 text-[13px] focus:outline-none"
            style={{ borderColor: GOLD, backgroundColor: 'white', color: '#2d3036' }}
            onKeyDown={e => { if (e.key==='Enter') run(); if (e.key==='Escape') setShow(false) }} />
          <button onClick={run} disabled={loading || !instruction.trim()}
            className="rounded-xl px-3 py-2 text-white disabled:opacity-40" style={{ backgroundColor: GOLD }}>
            {loading ? dots : sendIcon}
          </button>
          <button onClick={() => setShow(false)} className="rounded-xl px-2 hover:bg-[#f3f0e9]" style={{ color: '#9b9ea6' }}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  )
}

async function callClaude(system: string, userMessage: string): Promise<string> {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, userMessage }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Request failed')
  return data.text.trim()
}

// ── AI single-line input ──────────────────────────────────────────────────────
function AiInput({ label, value, onChange, placeholder, stepContext, fieldLabel, required = false }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder: string; stepContext: string; fieldLabel: string; required?: boolean
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[12px] font-semibold uppercase tracking-wide" style={{ color: '#9b9ea6' }}>
        {label}{required && <span style={{ color: RED }}> *</span>}
      </label>
      <div className="relative">
        <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full rounded-xl border px-3 py-2.5 pr-9 text-[14px] focus:outline-none"
          style={{ borderColor: '#e8e4d9', backgroundColor: 'white', color: '#2d3036', fontFamily: 'Arial, Helvetica, sans-serif' }}
          onFocus={e => (e.currentTarget.style.borderColor = GOLD)}
          onBlur={e => (e.currentTarget.style.borderColor = '#e8e4d9')} />
        <AiPromptRow stepName={stepContext} fieldLabel={fieldLabel} currentValue={value}
          onRewrite={async (instruction) => {
            const result = await callClaude(
              `You rewrite framework field values. Return ONLY the replacement text — no explanation, no quotes.`,
              `Context: ${stepContext}\nField: ${fieldLabel}\nCurrent: "${value || '(empty)'}"\nInstruction: ${instruction}\n\nReturn the replacement text only.`
            )
            onChange(result)
            toast.success('Updated')
          }} />
      </div>
    </div>
  )
}

// ── AI textarea ───────────────────────────────────────────────────────────────
function AiTextarea({ label, value, onChange, placeholder, stepName, fieldLabel, hint }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder: string; stepName: string; fieldLabel: string; hint?: string
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <label className="block text-[12px] font-semibold uppercase tracking-wide" style={{ color: '#9b9ea6' }}>{label}</label>
        {hint && <span className="text-[11px]" style={{ color: '#c8cad0' }}>{hint}</span>}
      </div>
      <div className="relative">
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
          className="w-full resize-y rounded-xl border px-3 py-2.5 pr-9 text-[14px] focus:outline-none"
          style={{ borderColor: '#e8e4d9', backgroundColor: 'white', color: '#2d3036', fontFamily: 'Arial, Helvetica, sans-serif' }}
          onFocus={e => (e.currentTarget.style.borderColor = GOLD)}
          onBlur={e => (e.currentTarget.style.borderColor = '#e8e4d9')} />
        <AiPromptRow stepName={stepName} fieldLabel={fieldLabel} currentValue={value}
          onRewrite={async (instruction) => {
            const result = await callClaude(
              `You rewrite framework field values. Return ONLY the replacement text — no explanation, no quotes.`,
              `Step: "${stepName}"\nField: ${fieldLabel}\nCurrent: "${value || '(empty)'}"\nInstruction: ${instruction}\n\nReturn the replacement text only.`
            )
            onChange(result)
            toast.success('Updated')
          }} />
      </div>
    </div>
  )
}

// ── Proof items ───────────────────────────────────────────────────────────────
function ProofItemEditor({ item, index, onChange, onRemove }: {
  item: ProofItem; index: number
  onChange: (i: number, updated: ProofItem) => void
  onRemove: (i: number) => void
}) {
  const labels: Record<ProofItemType, string> = { testimonial: 'Testimonial', result: 'Result / Case Study', video: 'Video / Link' }
  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: '#e8e4d9', backgroundColor: '#fefefe' }}>
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(['testimonial', 'result', 'video'] as ProofItemType[]).map(t => (
            <button key={t} onClick={() => onChange(index, { type: t })}
              className="rounded-lg px-2.5 py-1 text-[12px] font-medium transition-colors"
              style={{ backgroundColor: item.type===t?'rgba(184,150,46,0.1)':'transparent', color: item.type===t?GOLD:'#9b9ea6', border: `1px solid ${item.type===t?'rgba(184,150,46,0.3)':'#e8e4d9'}` }}>
              {labels[t]}
            </button>
          ))}
        </div>
        <button onClick={() => onRemove(index)} className="rounded-lg p-1 hover:bg-[#f3f0e9]" style={{ color: '#9b9ea6' }}>
          <X className="h-4 w-4" />
        </button>
      </div>
      {item.type==='testimonial' && <>
        <Input label="Quote" value={item.quote??''} onChange={v=>onChange(index,{...item,quote:v})} placeholder="What they said, in their exact words…" multiline />
        <Input label="Attribution" value={item.attribution??''} onChange={v=>onChange(index,{...item,attribution:v})} placeholder="e.g. Sarah M., marriage coach" />
      </>}
      {item.type==='result' && <Input label="Result Description" value={item.description??''} onChange={v=>onChange(index,{...item,description:v})} placeholder="e.g. John went from 3 clients/month to 14 in 60 days." multiline />}
      {item.type==='video' && <>
        <Input label="Video URL" value={item.url??''} onChange={v=>onChange(index,{...item,url:v})} placeholder="https://loom.com/share/..." />
        <Input label="Description" value={item.description??''} onChange={v=>onChange(index,{...item,description:v})} placeholder="e.g. Watch how 10 clients in 30 days works in practice." />
      </>}
    </div>
  )
}

// ── Brain Dump ────────────────────────────────────────────────────────────────
function BrainDumpMode({ stepCount, onStepsGenerated }: {
  stepCount: 3 | 4
  onStepsGenerated: (frameworkName: string, steps: Step[]) => void
}) {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const recognitionRef = useRef<any>(null)
  const [speechAvailable] = useState(isSpeechRecognitionAvailable)

  useEffect(() => () => { recognitionRef.current?.stop() }, [])

  function startRecording() {
    const rec = createRecognition()
    if (!rec) return
    recognitionRef.current = rec
    let final = transcript
    rec.onresult = (e: any) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += (final ? ' ' : '') + t.trim()
        else interim += t
      }
      setTranscript(final + (interim ? ' ' + interim : ''))
    }
    rec.onerror = (e: any) => { if (e.error!=='aborted') toast.error('Mic error: '+e.error); setIsRecording(false); recognitionRef.current=null }
    rec.onend = () => { setIsRecording(false); recognitionRef.current=null }
    rec.start()
    setIsRecording(true)
  }

  function stopRecording() { recognitionRef.current?.stop(); recognitionRef.current=null; setIsRecording(false) }

  async function generateSteps() {
    if (!transcript.trim()) { toast.error('Record or type your brain dump first.'); return }
    setIsGenerating(true)
    try {
      const text = await callClaude(
        `You extract a structured consulting framework from a brain dump. Return ONLY valid JSON — no markdown, no commentary.`,
        `The consultant is building a ${stepCount}-step framework. Brain dump:

---
${transcript}
---

Extract exactly ${stepCount} steps. Return this exact JSON shape:
{
  "frameworkName": "Branded 2–5 word name",
  "steps": [
    {
      "name": "1–3 words ONLY — e.g. 'Ads Funnel', 'Fixed Fulfillment', 'Webinar Launch'",
      "heresWhy": "Why this step matters and what it produces for the prospect (2 sentences)",
      "ifYouDont": "What stays broken or gets worse if they skip this step (1–2 sentences)",
      "onceYouDo": "What the prospect has or feels once this step is complete (1–2 sentences)"
    }
  ]
}
- Exactly ${stepCount} steps. Step names 1–3 words only. Return ONLY the JSON object.`
      )

      let parsed: { frameworkName: string; steps: Step[] }
      try { parsed = JSON.parse(text) }
      catch {
        const m = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
        if (m) parsed = JSON.parse(m[1])
        else throw new Error('AI returned malformed output. Please try again.')
      }
      if (!parsed.steps || parsed.steps.length < stepCount) throw new Error('AI returned fewer steps than expected. Try again.')
      onStepsGenerated(parsed.frameworkName, parsed.steps.slice(0, stepCount))
      toast.success(`${stepCount} steps generated!`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-white p-6 text-center space-y-4" style={{ borderColor: isRecording ? GOLD : '#e8e4d9' }}>
        <div className="space-y-1">
          <p className="text-[15px] font-semibold" style={{ color: NAVY }}>{isRecording ? 'Listening…' : 'Brain dump your framework'}</p>
          <p className="text-[13px]" style={{ color: '#9b9ea6' }}>
            {isRecording ? 'Talk through each step — what it is, what it does, why it matters.' : `Just talk. Describe your ${stepCount}-step process however it comes out — AI extracts everything.`}
          </p>
        </div>
        <button onClick={() => isRecording ? stopRecording() : startRecording()}
          className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full shadow-lg transition-all ${isRecording ? 'mic-pulse' : 'hover:scale-105'}`}
          style={{ backgroundColor: isRecording ? RED : GOLD }}>
          {isRecording ? <MicOff className="h-8 w-8 text-white" /> : <Mic className="h-8 w-8 text-white" />}
        </button>
        <p className="text-[12px]" style={{ color: '#9b9ea6' }}>{isRecording ? 'Tap to stop' : speechAvailable ? 'Tap to start' : 'Voice unavailable — type below'}</p>
      </div>

      <div className="space-y-1.5">
        <label className="block text-[12px] font-semibold uppercase tracking-wide" style={{ color: '#9b9ea6' }}>
          {isRecording ? 'Live transcript' : 'Your brain dump'}
        </label>
        <textarea value={transcript} onChange={e => setTranscript(e.target.value)}
          placeholder="Your words appear here as you speak, or type directly…" rows={5}
          className="w-full resize-y rounded-xl border px-3 py-2.5 text-[14px] focus:outline-none leading-relaxed"
          style={{ borderColor: isRecording?GOLD:'#e8e4d9', backgroundColor: isRecording?'rgba(184,150,46,0.02)':'white', color: '#2d3036', fontFamily: 'Arial, Helvetica, sans-serif' }}
          onFocus={e => (e.currentTarget.style.borderColor=GOLD)} onBlur={e => (e.currentTarget.style.borderColor='#e8e4d9')} />
        {transcript && (
          <div className="flex justify-between items-center">
            <p className="text-[11px]" style={{ color: '#c8cad0' }}>{transcript.length.toLocaleString()} chars</p>
            <button onClick={() => setTranscript('')} className="text-[12px] hover:underline flex items-center gap-1" style={{ color: '#9b9ea6' }}>
              <RefreshCw className="h-3 w-3" /> Clear
            </button>
          </div>
        )}
      </div>

      <button onClick={generateSteps} disabled={isGenerating || !transcript.trim()}
        className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-semibold text-white disabled:opacity-40 hover:opacity-90"
        style={{ backgroundColor: GOLD }}>
        {isGenerating
          ? <><span className="flex gap-1">{[0,150,300].map(d=><span key={d} className="h-1.5 w-1.5 rounded-full bg-white animate-bounce" style={{animationDelay:`${d}ms`}}/>)}</span>Building your {stepCount} steps…</>
          : <><Sparkles className="h-4 w-4" /> Build My Framework</>}
      </button>
    </div>
  )
}

// ── Framework form (create / edit) ────────────────────────────────────────────
function FrameworkForm({ initial, onSave, onCancel }: {
  initial: Framework
  onSave: (f: Framework) => void
  onCancel?: () => void
}) {
  const [form, setForm] = useState<Framework>(initial)
  const [buildMode, setBuildMode] = useState<'brain-dump' | 'manual'>('brain-dump')
  const [stepsReady, setStepsReady] = useState(initial.steps.some(s => s.name))

  function updateStep(i: number, field: keyof Step, val: string) {
    const steps = [...form.steps]
    steps[i] = { ...steps[i], [field]: val }
    setForm({ ...form, steps })
  }

  function setStepCount(count: 3 | 4) {
    const steps = [...form.steps]
    if (count === 4 && steps.length < 4) steps.push({ name: '', notes: '' })
    if (count === 3 && steps.length > 3) steps.pop()
    setForm({ ...form, stepCount: count, steps })
    if (buildMode === 'brain-dump') setStepsReady(false)
  }

  function handleBrainDumpGenerated(frameworkName: string, steps: Step[]) {
    setForm(f => ({ ...f, frameworkName: frameworkName || f.frameworkName, steps }))
    setStepsReady(true)
  }

  function addProofItem() {
    if ((form.proofItems ?? []).length >= 5) return
    setForm({ ...form, proofItems: [...(form.proofItems ?? []), { type: 'testimonial' }] })
  }

  function updateProofItem(i: number, updated: ProofItem) {
    const items = [...(form.proofItems ?? [])]
    items[i] = updated
    setForm({ ...form, proofItems: items })
  }

  function removeProofItem(i: number) {
    setForm({ ...form, proofItems: (form.proofItems ?? []).filter((_, idx) => idx !== i) })
  }

  function handleSave() {
    if (!form.frameworkName.trim()) { toast.error('Give your framework a name before saving.'); return }
    if (form.steps.slice(0, form.stepCount).some(s => !s.name.trim())) { toast.error('Name all your steps before saving.'); return }
    onSave(form)
    toast.success('Framework saved.')
  }

  const canSave = form.frameworkName.trim() && form.steps.slice(0, form.stepCount).every(s => s.name.trim())
  const showSteps = buildMode === 'manual' || stepsReady

  return (
    <div className="space-y-6">
      {onCancel && (
        <button onClick={onCancel} className="flex items-center gap-1.5 text-[13px] hover:underline" style={{ color: '#9b9ea6' }}>
          ← Back to frameworks
        </button>
      )}

      {/* Step count */}
      <div className="space-y-2">
        <label className="block text-[12px] font-semibold uppercase tracking-wide" style={{ color: '#9b9ea6' }}>How many steps?</label>
        <div className="flex gap-2">
          {([3, 4] as (3|4)[]).map(n => (
            <button key={n} onClick={() => setStepCount(n)}
              className="rounded-xl border px-5 py-2 text-[14px] font-medium transition-colors"
              style={{ borderColor: form.stepCount===n?GOLD:'#e8e4d9', backgroundColor: form.stepCount===n?'rgba(184,150,46,0.08)':'white', color: form.stepCount===n?GOLD:'#6b6e77' }}>
              {n} steps
            </button>
          ))}
        </div>
      </div>

      {/* Mode toggle */}
      <div className="space-y-4">
        <div className="flex gap-2">
          {[['brain-dump', '🎙 Brain Dump — Build It For Me'], ['manual', "✏️ I'll Type It Out"]] .map(([mode, label]) => (
            <button key={mode} onClick={() => setBuildMode(mode as 'brain-dump' | 'manual')}
              className="flex-1 rounded-xl border py-2.5 text-[13px] font-medium transition-colors"
              style={{ borderColor: buildMode===mode?GOLD:'#e8e4d9', backgroundColor: buildMode===mode?'rgba(184,150,46,0.06)':'white', color: buildMode===mode?GOLD:'#6b6e77' }}>
              {label}
            </button>
          ))}
        </div>
        {buildMode === 'brain-dump' && <BrainDumpMode stepCount={form.stepCount} onStepsGenerated={handleBrainDumpGenerated} />}
      </div>

      {/* Steps */}
      {showSteps && (
        <div className="space-y-4">
          {stepsReady && buildMode === 'brain-dump' && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold" style={{ color: NAVY }}>Your {form.stepCount} steps</p>
                <p className="text-[12px] mt-0.5" style={{ color: '#9b9ea6' }}>
                  These are your notes — AI adapts them for each specific prospect when building the game plan.
                </p>
              </div>
              <button onClick={() => setStepsReady(false)} className="text-[12px] hover:underline shrink-0" style={{ color: '#9b9ea6' }}>Re-record</button>
            </div>
          )}
          {buildMode === 'manual' && (
            <p className="text-[12px]" style={{ color: '#9b9ea6' }}>
              Write your notes — AI will adapt and personalize them for each prospect when generating the game plan.
            </p>
          )}

          {form.steps.slice(0, form.stepCount).map((step, i) => (
            <div key={i} className="rounded-2xl border p-5 space-y-4" style={{ borderColor: '#e8e4d9', backgroundColor: '#fefefe' }}>
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: GOLD }}>{i + 1}</div>
                <span className="text-[13px] font-semibold" style={{ color: NAVY }}>Step {i + 1}</span>
              </div>
              <AiInput label="Step Name (1–3 words)" value={step.name} onChange={v => updateStep(i, 'name', v)}
                placeholder="e.g. Ads Funnel · Fixed Fulfillment · Webinar Launch"
                stepContext={`Step ${i+1} of the ${form.frameworkName||'framework'}. Names must be 1–3 words only.`}
                fieldLabel="Step Name" required />
              <AiTextarea label="Why it matters" value={step.heresWhy??''} onChange={v => updateStep(i, 'heresWhy', v)}
                placeholder="What does this step do, and why does the prospect need it?"
                stepName={step.name||`Step ${i+1}`} fieldLabel="Why it matters" hint="AI adapts per prospect" />
              <AiTextarea label="Without this step" value={step.ifYouDont??''} onChange={v => updateStep(i, 'ifYouDont', v)}
                placeholder="What stays broken or gets worse if they skip this step?"
                stepName={step.name||`Step ${i+1}`} fieldLabel="Without this step" hint="AI adapts per prospect" />
              <AiTextarea label="After this step" value={step.onceYouDo??''} onChange={v => updateStep(i, 'onceYouDo', v)}
                placeholder="What does the prospect have or feel once this step is done?"
                stepName={step.name||`Step ${i+1}`} fieldLabel="After this step" hint="AI adapts per prospect" />
            </div>
          ))}
        </div>
      )}

      {/* Framework name */}
      {showSteps && (
        <AiInput label="Framework Name" value={form.frameworkName} onChange={v => setForm({...form, frameworkName: v})}
          placeholder="e.g. The Predictable Legacy Engine"
          stepContext={`A ${form.stepCount}-step consulting framework. Steps: ${form.steps.slice(0, form.stepCount).map(s => s.name).filter(Boolean).join(', ') || 'not yet named'}.`}
          fieldLabel="Framework Name" required />
      )}

      {/* Proof items */}
      {showSteps && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-wide" style={{ color: '#9b9ea6' }}>Proof — Testimonials, Results, Links</label>
              <p className="text-[12px] mt-0.5" style={{ color: '#b0aba2' }}>Optional. Up to 5. Rendered verbatim in &ldquo;This Is What&apos;s Possible.&rdquo;</p>
            </div>
            {(form.proofItems??[]).length < 5 && (
              <button onClick={addProofItem} className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[13px] font-medium hover:bg-[#f3f0e9]"
                style={{ borderColor: '#e8e4d9', color: GOLD }}>
                <Plus className="h-3.5 w-3.5" /> Add Proof
              </button>
            )}
          </div>
          {(form.proofItems??[]).length === 0 && (
            <div className="rounded-xl border border-dashed px-4 py-5 text-center text-[13px]" style={{ borderColor: '#e8e4d9', color: '#b0aba2' }}>No proof items yet.</div>
          )}
          {(form.proofItems??[]).map((item, i) => (
            <ProofItemEditor key={i} item={item} index={i} onChange={updateProofItem} onRemove={removeProofItem} />
          ))}
        </div>
      )}

      {/* Save */}
      {showSteps && (
        <div className="flex gap-3">
          {onCancel && (
            <button onClick={onCancel} className="flex-1 rounded-2xl border py-3.5 text-[15px] font-medium" style={{ borderColor: '#e8e4d9', color: '#6b6e77' }}>
              Cancel
            </button>
          )}
          <button onClick={handleSave} disabled={!canSave}
            className="flex-1 rounded-2xl py-3.5 text-[15px] font-semibold text-white disabled:opacity-40 hover:opacity-90"
            style={{ backgroundColor: GOLD }}>
            Save Framework →
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function FrameworkBuilder({ frameworks, activeFrameworkId, onSave, onSetActive, onDelete }: Props) {
  const [view, setView] = useState<'list' | 'new' | { editing: Framework }>('list')

  const isCreating = view === 'new'
  const isEditing = typeof view === 'object' && 'editing' in view
  const showForm = isCreating || isEditing || frameworks.length === 0

  if (showForm) {
    const initial = isEditing ? (view as { editing: Framework }).editing : newFramework()
    return (
      <div className="max-w-2xl mx-auto py-8 px-5">
        <FrameworkForm
          initial={initial}
          onSave={(f) => { onSave(f); setView('list') }}
          onCancel={frameworks.length > 0 ? () => setView('list') : undefined}
        />
      </div>
    )
  }

  // ── Framework list ──────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto py-8 px-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: NAVY }}>Your Frameworks</h1>
          <p className="text-[13px] mt-1" style={{ color: '#9b9ea6' }}>Select which one to use for Tab 2.</p>
        </div>
        <button onClick={() => setView('new')}
          className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-[13px] font-medium hover:bg-[#f3f0e9]"
          style={{ borderColor: '#e8e4d9', color: GOLD }}>
          <Plus className="h-3.5 w-3.5" /> Add Framework
        </button>
      </div>

      <div className="space-y-3">
        {frameworks.map(f => {
          const isActive = f.id === activeFrameworkId
          return (
            <div key={f.id} className="rounded-2xl border bg-white p-5 transition-all"
              style={{ borderColor: isActive ? GOLD : '#e8e4d9', boxShadow: isActive ? '0 0 0 1px rgba(184,150,46,0.3)' : 'none' }}>
              <div className="flex items-start gap-4">
                {/* Radio select */}
                <button onClick={() => onSetActive(f.id)}
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                  style={{ borderColor: isActive ? GOLD : '#c8cad0', backgroundColor: isActive ? GOLD : 'transparent' }}>
                  {isActive && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[15px]" style={{ color: NAVY }}>{f.frameworkName}</p>
                  <p className="text-[12px] mt-0.5" style={{ color: '#9b9ea6' }}>
                    {f.stepCount} steps: {f.steps.slice(0, f.stepCount).map(s => s.name).filter(Boolean).join(' · ')}
                  </p>
                  {isActive && (
                    <span className="inline-flex items-center gap-1 mt-1.5 rounded-lg px-2 py-0.5 text-[11px] font-semibold"
                      style={{ backgroundColor: 'rgba(184,150,46,0.1)', color: GOLD }}>
                      <Check className="h-3 w-3" /> Active for Tab 2
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setView({ editing: f })}
                    className="rounded-lg p-1.5 hover:bg-[#f3f0e9]" style={{ color: '#6b6e77' }} title="Edit">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => { if (confirm(`Delete "${f.frameworkName}"?`)) onDelete(f.id) }}
                    className="rounded-lg p-1.5 hover:bg-[#fef0f0]" style={{ color: '#c0392b' }} title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <ChevronRight className="h-4 w-4 ml-1" style={{ color: '#c8cad0' }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
