'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import clsx from 'clsx'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SimpleCodeEditorProps {
  /** Placeholder/starter code shown when editor is empty */
  starterCode?: string
  /** Called when player clicks Run */
  onRun: (code: string) => void
  /** Editor is disabled (mission completed) */
  disabled?: boolean
  /** Currently running animation */
  running?: boolean
  /** Syntax error message to display */
  error?: string
  /** Hint text below editor */
  hint?: string
}

// ---------------------------------------------------------------------------
// Simple keyword highlighting
// ---------------------------------------------------------------------------

const KEYWORDS = [
  'for', 'while', 'if', 'else', 'let', 'const', 'var', 'function', 'return', 'true', 'false',
]

const API_METHODS = [
  'flyTo', 'install', 'forward', 'turnLeft', 'turnRight', 'seeWall', 'atExit',
  'scanHeat', 'dropMarker', 'sendReport',
  'scan', 'angleTo', 'rotate', 'atDestination', 'getHeading', 'distanceTo',
  'grab', 'drop', 'filter', 'sort', 'findClosest', 'distance',
  'handleEvent',
]

function highlightCode(code: string): string {
  // Escape HTML
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Highlight strings
  html = html.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span style="color:#A5D6A7">$&</span>')

  // Highlight numbers (not inside strings — good enough approximation)
  html = html.replace(/\b(\d+)\b/g, '<span style="color:#FFD54F">$1</span>')

  // Highlight comments
  html = html.replace(/(\/\/.*)/g, '<span style="color:#757575">$1</span>')

  // Highlight keywords
  for (const kw of KEYWORDS) {
    const re = new RegExp(`\\b(${kw})\\b`, 'g')
    html = html.replace(re, `<span style="color:#CE93D8">$1</span>`)
  }

  // Highlight API methods
  for (const method of API_METHODS) {
    const re = new RegExp(`\\b(${method})\\b`, 'g')
    html = html.replace(re, `<span style="color:#64B5F6">$1</span>`)
  }

  // Highlight drone/drones/targets/fleet/orders/events variables
  html = html.replace(/\b(drones?|targets?|fleet|orders?|events?|camera)\b/g, '<span style="color:#4FC3F7">$1</span>')

  return html
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SimpleCodeEditor({
  starterCode = '',
  onRun,
  disabled = false,
  running = false,
  error,
  hint,
}: SimpleCodeEditorProps) {
  const t = useTranslations('game')
  const [code, setCode] = useState(starterCode)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLPreElement>(null)
  const isDisabled = disabled || running

  // Sync scroll between textarea and highlight overlay
  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
  }, [])

  // Handle tab key for indentation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newCode = code.slice(0, start) + '  ' + code.slice(end)
      setCode(newCode)
      // Restore cursor position after React re-render
      requestAnimationFrame(() => {
        textarea.selectionStart = start + 2
        textarea.selectionEnd = start + 2
      })
    }
  }, [code])

  const handleRun = useCallback(() => {
    onRun(code)
  }, [onRun, code])

  const handleReset = useCallback(() => {
    setCode(starterCode)
  }, [starterCode])

  return (
    <div className="space-y-3">
      {/* Editor container */}
      <div className="relative bg-gray-950 rounded-xl border border-[var(--brand-border)] overflow-hidden">
        {/* Line numbers + highlight overlay + textarea stack */}
        <div className="relative min-h-[200px] max-h-[400px]">
          {/* Syntax-highlighted overlay (behind textarea) */}
          <pre
            ref={highlightRef}
            className="absolute inset-0 p-4 m-0 font-mono text-sm leading-6 whitespace-pre-wrap break-words overflow-hidden pointer-events-none"
            style={{ color: '#E0E0E0' }}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: highlightCode(code) + '\n' }}
          />

          {/* Actual textarea (transparent text, visible caret) */}
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            disabled={isDisabled}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className={clsx(
              'relative w-full min-h-[200px] max-h-[400px] p-4 m-0',
              'font-mono text-sm leading-6',
              'bg-transparent text-transparent caret-white',
              'resize-y outline-none border-none',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'selection:bg-blue-500/30',
            )}
            style={{ WebkitTextFillColor: 'transparent' }}
          />
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg px-4 py-2 text-red-300 text-sm font-mono">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3">
        <button
          onClick={handleRun}
          disabled={isDisabled || !code.trim()}
          className={clsx(
            'px-8 py-3 font-black text-sm rounded-xl transition-all uppercase tracking-wider',
            'bg-[var(--brand-blue)] text-white',
            'hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105',
            'active:scale-95',
            'disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-none',
            'min-h-[48px]',
          )}
        >
          {running ? t('blockEditor.running') : t('blockEditor.run')}
        </button>
        <button
          onClick={handleReset}
          disabled={isDisabled}
          className={clsx(
            'px-4 py-3 bg-[var(--brand-panel)] border border-[var(--brand-border)]',
            'hover:border-yellow-500 text-gray-400 hover:text-yellow-400',
            'font-bold rounded-xl transition-colors',
            'disabled:opacity-40 disabled:hover:border-[var(--brand-border)] disabled:hover:text-gray-400',
            'min-h-[48px]',
          )}
        >
          {t('blockEditor.clear')}
        </button>
      </div>

      {/* Hint */}
      {hint && (
        <p className="text-xs text-gray-500">{hint}</p>
      )}
    </div>
  )
}
