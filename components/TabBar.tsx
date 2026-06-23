'use client'

import { Lock, Check } from 'lucide-react'

interface Props {
  activeTab: 1 | 2 | 3
  frameworkSaved: boolean
  gamePlanGenerated: boolean
  onChange: (tab: 1 | 2 | 3) => void
}

const NAVY = '#1e3a5f'
const GOLD = '#B8962E'

export default function TabBar({ activeTab, frameworkSaved, gamePlanGenerated, onChange }: Props) {
  const tabs: Array<{
    id: 1 | 2 | 3
    label: string
    unlocked: boolean
    done: boolean
  }> = [
    { id: 1, label: '1. Framework Builder', unlocked: true, done: frameworkSaved },
    { id: 2, label: '2. Generator', unlocked: frameworkSaved, done: gamePlanGenerated },
    { id: 3, label: '3. Editor', unlocked: gamePlanGenerated, done: false },
  ]

  return (
    <div
      className="no-print flex items-center gap-0 border-b"
      style={{ borderColor: '#e8e4d9', backgroundColor: 'white' }}
    >
      {tabs.map(tab => {
        const isActive = activeTab === tab.id
        const isLocked = !tab.unlocked

        return (
          <button
            key={tab.id}
            disabled={isLocked}
            title={
              isLocked
                ? tab.id === 2
                  ? 'Save a framework in Tab 1 first'
                  : 'Generate a game plan in Tab 2 first'
                : undefined
            }
            onClick={() => onChange(tab.id)}
            className="relative flex items-center gap-2 px-6 py-3.5 text-[13px] font-medium transition-colors"
            style={{
              color: isActive ? GOLD : isLocked ? '#c8cad0' : '#6b6e77',
              borderBottom: isActive ? `2px solid ${GOLD}` : '2px solid transparent',
              cursor: isLocked ? 'not-allowed' : 'pointer',
              marginBottom: '-1px',
            }}
          >
            {tab.done && !isActive && (
              <Check className="h-3.5 w-3.5 tab-check" />
            )}
            {tab.label}
            {isLocked && <Lock className="h-3 w-3" style={{ color: '#c8cad0' }} />}
          </button>
        )
      })}
    </div>
  )
}
