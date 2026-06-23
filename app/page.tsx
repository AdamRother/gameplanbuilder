'use client'

import { useState } from 'react'
import TabBar from '@/components/TabBar'
import FrameworkBuilder from '@/components/FrameworkBuilder'
import Generator from '@/components/Generator'
import DocumentEditor from '@/components/DocumentEditor'
import type { Framework } from '@/lib/types'

export default function App() {
  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1)
  const [frameworks, setFrameworks] = useState<Framework[]>([])
  const [activeFrameworkId, setActiveFrameworkId] = useState<string | null>(null)
  const [gamePlan, setGamePlan] = useState('')

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
        <div className="px-5 py-3">
          <h1 className="text-[18px] font-bold" style={{ color: '#1e3a5f' }}>Game Plan Builder</h1>
        </div>
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
