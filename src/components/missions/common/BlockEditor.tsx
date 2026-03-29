'use client'

import { useState, useCallback, useId } from 'react'
import { useTranslations } from 'next-intl'
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import clsx from 'clsx'
import { getAudioManager } from '@/lib/game/audio'
import type { Command, CommandType } from '@/components/missions/drone/drone-engine'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BlockEditorProps {
  maxBlocks: number
  onRun: (program: Command[]) => void
  disabled?: boolean
  running?: boolean
}

interface PaletteItem {
  type: CommandType
  labelKey: string
  color: string
  category: 'action' | 'movement' | 'control'
  hasValue?: boolean
  hasChildren?: boolean
}

// ---------------------------------------------------------------------------
// Palette definition
// ---------------------------------------------------------------------------

const PALETTE: PaletteItem[] = [
  { type: 'takeoff', labelKey: 'blockEditor.takeoff', color: '#22C55E', category: 'action' },
  { type: 'forward', labelKey: 'blockEditor.forward', color: '#3B82F6', category: 'movement', hasValue: true },
  { type: 'turnLeft', labelKey: 'blockEditor.turnLeft', color: '#3B82F6', category: 'movement' },
  { type: 'turnRight', labelKey: 'blockEditor.turnRight', color: '#3B82F6', category: 'movement' },
  { type: 'land', labelKey: 'blockEditor.land', color: '#22C55E', category: 'action' },
  { type: 'repeat', labelKey: 'blockEditor.repeat', color: '#F97316', category: 'control', hasValue: true, hasChildren: true },
]

const CATEGORY_COLORS: Record<string, string> = {
  movement: '#3B82F6',
  control: '#F97316',
  action: '#22C55E',
}

function makeId() {
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createCommand(type: CommandType): Command {
  const cmd: Command = { id: makeId(), type }
  if (type === 'forward') cmd.value = 1
  if (type === 'repeat') {
    cmd.value = 2
    cmd.children = []
  }
  return cmd
}

// ---------------------------------------------------------------------------
// Palette Block (draggable source)
// ---------------------------------------------------------------------------

function PaletteBlock({ item, disabled }: { item: PaletteItem; disabled: boolean }) {
  const t = useTranslations('game')

  return (
    <button
      disabled={disabled}
      className={clsx(
        'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold text-white',
        'border-2 transition-all cursor-grab active:cursor-grabbing',
        'hover:scale-105 active:scale-95',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100',
        'min-h-[44px]', // mobile touch target
      )}
      style={{
        backgroundColor: `${item.color}22`,
        borderColor: item.color,
      }}
    >
      <BlockIcon type={item.type} />
      <span>{t(item.labelKey)}</span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Block Icon
// ---------------------------------------------------------------------------

function BlockIcon({ type }: { type: CommandType }) {
  switch (type) {
    case 'takeoff': return <span>&#9650;</span>   // up triangle
    case 'land': return <span>&#9660;</span>       // down triangle
    case 'forward': return <span>&#8593;</span>    // up arrow
    case 'turnLeft': return <span>&#8630;</span>   // left curve
    case 'turnRight': return <span>&#8631;</span>  // right curve
    case 'repeat': return <span>&#8635;</span>     // repeat symbol
    default: return null
  }
}

// ---------------------------------------------------------------------------
// Sortable Program Block
// ---------------------------------------------------------------------------

function SortableProgramBlock({
  command,
  onRemove,
  onValueChange,
  onChildrenChange,
  disabled,
  depth = 0,
  maxBlocks,
  totalBlocks,
}: {
  command: Command
  onRemove: () => void
  onValueChange: (value: number) => void
  onChildrenChange?: (children: Command[]) => void
  disabled: boolean
  depth?: number
  maxBlocks: number
  totalBlocks: number
}) {
  const t = useTranslations('game')
  const palette = PALETTE.find(p => p.type === command.type)
  const color = palette?.color ?? '#666'

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: command.id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const isRepeat = command.type === 'repeat'

  const addChildBlock = (type: CommandType) => {
    if (!onChildrenChange) return
    if (totalBlocks >= maxBlocks) return
    const newCmd = createCommand(type)
    onChildrenChange([...(command.children ?? []), newCmd])
  }

  const removeChild = (idx: number) => {
    if (!onChildrenChange) return
    const updated = [...(command.children ?? [])]
    updated.splice(idx, 1)
    onChildrenChange(updated)
  }

  const updateChildValue = (idx: number, value: number) => {
    if (!onChildrenChange) return
    const updated = [...(command.children ?? [])]
    updated[idx] = { ...updated[idx], value }
    onChildrenChange(updated)
  }

  return (
    <div ref={setNodeRef} style={style} className="w-full">
      <div
        className={clsx(
          'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold text-white',
          'border-2 transition-all group',
          'min-h-[44px]', // mobile touch target
        )}
        style={{
          backgroundColor: `${color}22`,
          borderColor: color,
          marginLeft: depth * 16,
        }}
      >
        {/* Drag handle */}
        <span {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-white">
          &#9776;
        </span>

        <BlockIcon type={command.type} />
        <span>{t(palette?.labelKey ?? 'blockEditor.forward')}</span>

        {/* Editable value for forward(N) and repeat(N) */}
        {(command.type === 'forward' || command.type === 'repeat') && (
          <span className="flex items-center gap-1">
            <span>(</span>
            <input
              type="number"
              min={1}
              max={command.type === 'forward' ? 9 : 5}
              value={command.value ?? 1}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                if (!isNaN(v) && v >= 1) {
                  onValueChange(Math.min(v, command.type === 'forward' ? 9 : 5))
                }
              }}
              disabled={disabled}
              className="w-10 bg-black/30 border border-gray-600 rounded text-center text-white text-sm py-0.5 focus:border-white focus:outline-none"
            />
            <span>)</span>
          </span>
        )}

        {/* Remove button */}
        <button
          onClick={onRemove}
          disabled={disabled}
          className="ml-auto text-gray-500 hover:text-red-400 transition-colors disabled:opacity-30 text-lg leading-none"
          aria-label="Remove block"
        >
          &times;
        </button>
      </div>

      {/* Nested children for repeat block */}
      {isRepeat && (
        <div
          className="mt-1 ml-4 pl-3 border-l-2 space-y-1"
          style={{ borderColor: `${color}66`, marginLeft: (depth + 1) * 16 }}
        >
          {(command.children ?? []).map((child, idx) => (
            <SortableProgramBlock
              key={child.id}
              command={child}
              onRemove={() => removeChild(idx)}
              onValueChange={(v) => updateChildValue(idx, v)}
              disabled={disabled}
              depth={0}
              maxBlocks={maxBlocks}
              totalBlocks={totalBlocks}
            />
          ))}

          {/* Add block inside repeat */}
          {totalBlocks < maxBlocks && (
            <div className="flex flex-wrap gap-1 pt-1">
              {PALETTE.filter(p => p.type !== 'repeat').map(item => (
                <button
                  key={item.type}
                  onClick={() => addChildBlock(item.type)}
                  disabled={disabled || totalBlocks >= maxBlocks}
                  className="px-2 py-1 rounded text-xs font-bold text-white/60 border border-dashed border-gray-600 hover:border-gray-400 hover:text-white transition-colors disabled:opacity-30"
                >
                  <BlockIcon type={item.type} /> +
                </button>
              ))}
            </div>
          )}
          {(command.children ?? []).length === 0 && (
            <p className="text-xs text-gray-600 py-1">{t('blockEditor.dropHere')}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Count all blocks recursively
// ---------------------------------------------------------------------------

function countAllBlocks(commands: Command[]): number {
  let count = 0
  for (const cmd of commands) {
    count += 1
    if (cmd.children) {
      count += countAllBlocks(cmd.children)
    }
  }
  return count
}

// ---------------------------------------------------------------------------
// Main BlockEditor Component
// ---------------------------------------------------------------------------

export default function BlockEditor({ maxBlocks, onRun, disabled = false, running = false }: BlockEditorProps) {
  const t = useTranslations('game')
  const [program, setProgram] = useState<Command[]>([])
  const dndId = useId()

  const totalBlocks = countAllBlocks(program)
  const isDisabled = disabled || running

  const addBlock = useCallback((type: CommandType) => {
    if (totalBlocks >= maxBlocks) return
    setProgram(prev => [...prev, createCommand(type)])
    try {
      getAudioManager().playSFX('click')
    } catch {
      // Audio may not be available
    }
  }, [totalBlocks, maxBlocks])

  const removeBlock = useCallback((idx: number) => {
    setProgram(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const updateValue = useCallback((idx: number, value: number) => {
    setProgram(prev => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], value }
      return updated
    })
  }, [])

  const updateChildren = useCallback((idx: number, children: Command[]) => {
    setProgram(prev => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], children }
      return updated
    })
  }, [])

  const clearProgram = useCallback(() => {
    setProgram([])
  }, [])

  const handleRun = useCallback(() => {
    onRun(program)
  }, [onRun, program])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setProgram(prev => {
      const oldIndex = prev.findIndex(c => c.id === active.id)
      const newIndex = prev.findIndex(c => c.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return prev
      return arrayMove(prev, oldIndex, newIndex)
    })
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  return (
    <div className="space-y-4">
      {/* Block Palette */}
      <div>
        <p className="text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">
          {t('blockEditor.palette')}
        </p>
        <div className="flex flex-wrap gap-2">
          {PALETTE.map(item => (
            <button
              key={item.type}
              onClick={() => addBlock(item.type)}
              disabled={isDisabled || totalBlocks >= maxBlocks}
              className={clsx(
                'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold text-white',
                'border-2 transition-all',
                'hover:scale-105 active:scale-95',
                'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100',
                'min-h-[44px]',
              )}
              style={{
                backgroundColor: `${item.color}22`,
                borderColor: item.color,
              }}
            >
              <BlockIcon type={item.type} />
              <span>{t(item.labelKey)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Program Area */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">
            {t('blockEditor.program')}
          </p>
          <span className={clsx(
            'text-xs font-bold px-2 py-0.5 rounded-full',
            totalBlocks >= maxBlocks ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-300',
          )}>
            {t('blockEditor.blocksCount', { used: totalBlocks, max: maxBlocks })}
          </span>
        </div>

        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={program.map(c => c.id)} strategy={verticalListSortingStrategy}>
            <div className="min-h-[80px] bg-gray-900 border border-[var(--brand-border)] rounded-xl p-3 space-y-1">
              {program.length === 0 && (
                <p className="text-gray-600 text-sm py-4 text-center">
                  {t('blockEditor.emptyHint')}
                </p>
              )}
              {program.map((cmd, idx) => (
                <SortableProgramBlock
                  key={cmd.id}
                  command={cmd}
                  onRemove={() => removeBlock(idx)}
                  onValueChange={(v) => updateValue(idx, v)}
                  onChildrenChange={cmd.type === 'repeat' ? (children) => updateChildren(idx, children) : undefined}
                  disabled={isDisabled}
                  maxBlocks={maxBlocks}
                  totalBlocks={totalBlocks}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        <button
          onClick={handleRun}
          disabled={isDisabled || program.length === 0}
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
          onClick={clearProgram}
          disabled={isDisabled || program.length === 0}
          className={clsx(
            'px-4 py-3 bg-[var(--brand-panel)] border border-[var(--brand-border)]',
            'hover:border-red-500 text-gray-400 hover:text-red-400',
            'font-bold rounded-xl transition-colors',
            'disabled:opacity-40 disabled:hover:border-[var(--brand-border)] disabled:hover:text-gray-400',
            'min-h-[48px]',
          )}
        >
          {t('blockEditor.clear')}
        </button>
      </div>
    </div>
  )
}
