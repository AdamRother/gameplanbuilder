'use client'

import { useState, useEffect, useRef } from 'react'
import { KeyRound, Check, Eye, EyeOff } from 'lucide-react'
import TabBar from '@/components/TabBar'
import FrameworkBuilder from '@/components/FrameworkBuilder'
import Generator from '@/components/Generator'
import DocumentEditor from '@/components/DocumentEditor'
import type { Framework } from '@/lib/types'

const KEY_STORAGE    = 'gp_anthropic_key'
const FRAMEWORKS_KEY = 'gp_frameworks'
const ACTIVE_FW_KEY  = 'gp_active_framework'
const GAME_PLAN_KEY  = 'gp_game_plan'
const TAB_KEY        = 'gp_active_tab'
const GOLD = '#B8962E'
const NAVY = '#1e3a5f'

export default function App() {
  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1)
  const [frameworks, setFrameworks] = useState<Framework[]>([])
  const [activeFrameworkId, setActiveFrameworkId] = useState<string | null>(null)
  const [gamePlan, setGamePlan] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [keyInput, setKeyInput] = useState('')
  const [showKeyBanner, setShowKeyBanner] = useState(false)
  const [showKeyValue, setShowKeyValue] = useState(false)
  const [keySaved, setKeySaved] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const hydrated = useRef(false)

  // Load all persisted state on mount
  useEffect(() => {
    const stored = localStorage.getItem(KEY_STORAGE) ?? ''
    setApiKey(stored)
    setKeyInput(stored)
    setShowKeyBanner(!stored)

    try {
      const savedFrameworks = localStorage.getItem(FRAMEWORKS_KEY)
      if (savedFrameworks) setFrameworks(JSON.parse(savedFrameworks))

      const savedActiveId = localStorage.getItem(ACTIVE_FW_KEY)
      if (savedActiveId) setActiveFrameworkId(savedActiveId)

      const savedPlan = localStorage.getItem(GAME_PLAN_KEY)
      if (savedPlan) setGamePlan(savedPlan)

      const savedTab = localStorage.getItem(TAB_KEY)
      if (savedTab) setActiveTab(Number(savedTab) as 1 | 2 | 3)
    } catch {}

    hydrated.current = true
  }, [])

  // Persist state changes after hydration
  useEffect(() => {
    if (!hydrated.current) return
    localStorage.setItem(FRAMEWORKS_KEY, JSON.stringify(frameworks))
  }, [frameworks])

  useEffect(() => {
    if (!hydrated.current) return
    if (activeFrameworkId) localStorage.setItem(ACTIVE_FW_KEY, activeFrameworkId)
    else localStorage.removeItem(ACTIVE_FW_KEY)
  }, [activeFrameworkId])

  useEffect(() => {
    if (!hydrated.current) return
    localStorage.setItem(GAME_PLAN_KEY, gamePlan)
  }, [gamePlan])

  useEffect(() => {
    if (!hydrated.current) return
    localStorage.setItem(TAB_KEY, String(activeTab))
  }, [activeTab])

  function saveKey() {
    const trimmed = keyInput.trim()
    localStorage.setItem(KEY_STORAGE, trimmed)
    setApiKey(trimmed)
    setShowKeyBanner(false)
    setKeySaved(true)
    setTimeout(() => setKeySaved(false), 2000)
  }

  function openChange() {
    setKeyInput(apiKey)
    setShowKeyBanner(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const activeFramework = frameworks.find(f => f.id === activeFrameworkId) ?? null

  function handleTabChange(tab: 1 | 2 | 3) {
    if (tab === 2 && !activeFramework) return
    if (tab === 3 && !gamePlan) return
    setActiveTab(tab)
  }

  function handleGenerate(text: string) {
    setGamePlan(text)
    setActiveTab(3)
  }

  function handleFrameworkSave(f: Framework) {
    const isNew = !frameworks.find(x => x.id === f.id)
    if (isNew) {
      setFrameworks(prev => [...prev, f])
      setActiveFrameworkId(f.id)
      if (frameworks.length === 0) setTimeout(() => setActiveTab(2), 400)
    } else {
      setFrameworks(prev => prev.map(x => x.id === f.id ? f : x))
    }
  }

  function handleDeleteFramework(id: string) {
    setFrameworks(prev => prev.filter(f => f.id !== id))
    if (activeFrameworkId === id) {
      const remaining = frameworks.filter(f => f.id !== id)
      setActiveFrameworkId(remaining[0]?.id ?? null)
    }
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#f5f3ee' }}>
      <div className="no-print border-b bg-white" style={{ borderColor: '#e8e4d9' }}>
        <div className="px-5 py-3 flex items-center justify-between">
          <h1 className="text-[18px] font-bold" style={{ color: NAVY }}>Game Plan Builder</h1>
          {apiKey && !showKeyBanner && (
            <button
              onClick={openChange}
              className="flex items-center gap-1.5 text-[12px] rounded-lg px-2.5 py-1 hover:bg-[#f3f0e9]"
              style={{ color: '#9b9ea6' }}
            >
              <KeyRound className="h-3.5 w-3.5" />
              {keySaved ? <><Check className="h-3 w-3" style={{ color: GOLD }} /> Saved</> : 'API Key'}
            </button>
          )}
        </div>

        {/* API key banner */}
        {showKeyBanner && (
          <div className="border-t px-5 py-3" style={{ borderColor: '#e8e4d9', backgroundColor: '#fffdf7' }}>
            <p className="text-[12px] font-semibold mb-2" style={{ color: NAVY }}>
              {apiKey ? 'Update your Anthropic API Key' : 'Enter your Anthropic API Key to get started'}
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type={showKeyValue ? 'text' : 'password'}
                  value={keyInput}
                  onChange={e => setKeyInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveKey()}
                  placeholder="sk-ant-api03-..."
                  className="w-full rounded-xl border px-3 py-2 text-[13px] pr-9 focus:outline-none"
                  style={{ borderColor: '#e8e4d9', color: '#2d3036', backgroundColor: 'white' }}
                  onFocus={e => (e.currentTarget.style.borderColor = GOLD)}
                  onBlur={e => (e.currentTarget.style.borderColor = '#e8e4d9')}
                />
                <button
                  onClick={() => setShowKeyValue(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  style={{ color: '#c8cad0' }}
                >
                  {showKeyValue ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <button
                onClick={saveKey}
                disabled={!keyInput.trim()}
                className="rounded-xl px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-40"
                style={{ backgroundColor: GOLD }}
              >
                Save
              </button>
              {apiKey && (
                <button
                  onClick={() => setShowKeyBanner(false)}
                  className="rounded-xl px-3 py-2 text-[13px]"
                  style={{ color: '#9b9ea6' }}
                >
                  Cancel
                </button>
              )}
            </div>
            <p className="text-[11px] mt-1.5" style={{ color: '#c8cad0' }}>
              Your key is stored only in your browser and never sent to us.
            </p>
          </div>
        )}

        <TabBar
          activeTab={activeTab}
          frameworkSaved={!!activeFramework}
          gamePlanGenerated={!!gamePlan}
          onChange={handleTabChange}
        />
      </div>

      <div className="flex-1">
        <div style={{ display: activeTab === 1 ? 'block' : 'none' }}>
          <FrameworkBuilder
            frameworks={frameworks}
            activeFrameworkId={activeFrameworkId}
            onSave={handleFrameworkSave}
            onSetActive={setActiveFrameworkId}
            onDelete={handleDeleteFramework}
          />
        </div>
        <div style={{ display: activeTab === 2 && !!activeFramework ? 'block' : 'none' }}>
          {activeFramework && (
            <Generator
              framework={activeFramework}
              apiKey={apiKey}
              onGenerate={handleGenerate}
              onEditFramework={() => setActiveTab(1)}
            />
          )}
        </div>
        {/* Keep DocumentEditor mounted once created so DOM edits survive tab switches */}
        {gamePlan && (
          <div style={{ display: activeTab === 3 ? 'block' : 'none' }}>
            <DocumentEditor
              gamePlan={gamePlan}
              onUpdate={setGamePlan}
            />
          </div>
        )}
      </div>
    </div>
  )
}
