'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import clsx from 'clsx'
import { X, ChevronDown, Search, BookOpen } from 'lucide-react'

export interface KBEntry {
  titleKey: string
  contentKey: string
  category: string
}

interface KnowledgeBaseProps {
  entries: KBEntry[]
  onClose: () => void
}

export default function KnowledgeBase({ entries, onClose }: KnowledgeBaseProps) {
  const t = useTranslations('missionShell')
  const tKb = useTranslations('knowledgeBase')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(entries.map((e) => e.category))
    return Array.from(cats)
  }, [entries])

  // Filter entries by search and category
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesCategory = !activeCategory || entry.category === activeCategory
      if (!matchesCategory) return false
      if (!searchQuery.trim()) return true

      // Search in keys as fallback — the actual translated text would need
      // the translation function, but we search in the keys themselves
      const q = searchQuery.toLowerCase()
      return (
        entry.titleKey.toLowerCase().includes(q) ||
        entry.contentKey.toLowerCase().includes(q) ||
        entry.category.toLowerCase().includes(q)
      )
    })
  }, [entries, activeCategory, searchQuery])

  const toggleItem = (index: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  // Safely get translation with fallback
  const getTranslation = (key: string): string => {
    try {
      return tKb(key)
    } catch {
      return key
    }
  }

  return (
    <>
      {/* Mobile: full-screen overlay backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 sm:bg-transparent sm:pointer-events-none"
        onClick={onClose}
      />

      {/* Panel — slides in from the right */}
      <div
        className={clsx(
          'fixed top-0 right-0 z-50 h-full',
          'w-full sm:w-96',
          'bg-brand-panel border-l border-brand-border',
          'flex flex-col shadow-2xl',
          'animate-slideInRight'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border shrink-0">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brand-blue" />
            {t('knowledgeBase')}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-brand-border transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-brand-border shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchKB')}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-brand-dark border border-brand-border text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-blue"
            />
          </div>
        </div>

        {/* Category filter */}
        {categories.length > 1 && (
          <div className="flex gap-1.5 px-4 py-2 border-b border-brand-border overflow-x-auto shrink-0">
            <button
              onClick={() => setActiveCategory(null)}
              className={clsx(
                'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                !activeCategory
                  ? 'bg-brand-blue text-white'
                  : 'bg-brand-dark text-gray-400 hover:text-gray-300'
              )}
            >
              {t('allCategories')}
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                className={clsx(
                  'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                  cat === activeCategory
                    ? 'bg-brand-blue text-white'
                    : 'bg-brand-dark text-gray-400 hover:text-gray-300'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Entries list */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {filteredEntries.length === 0 && (
            <p className="text-sm text-gray-500 text-center mt-8">{t('noKBResults')}</p>
          )}

          <div className="space-y-1.5">
            {filteredEntries.map((entry, i) => {
              const isExpanded = expandedItems.has(i)
              return (
                <div
                  key={i}
                  className="rounded-lg border border-brand-border overflow-hidden"
                >
                  <button
                    onClick={() => toggleItem(i)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-brand-dark/50 transition-colors"
                  >
                    <span className="text-sm text-white font-medium">
                      {getTranslation(entry.titleKey)}
                    </span>
                    <ChevronDown
                      className={clsx(
                        'w-4 h-4 text-gray-500 transition-transform duration-200',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3 text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">
                      {getTranslation(entry.contentKey)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
