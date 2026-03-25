'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Player {
  id: string
  username: string
  country: string
  xp: number
}

const COUNTRY_FLAGS: Record<string, string> = {
  SA: '🇸🇦', RU: '🇷🇺', IN: '🇮🇳', CN: '🇨🇳', BR: '🇧🇷', OTHER: '🌍',
}

const RANK_ICONS = ['🥇', '🥈', '🥉']

interface LiveLeaderboardProps {
  initialLeaders: Player[]
  currentUserId: string
}

export default function LiveLeaderboard({ initialLeaders, currentUserId }: LiveLeaderboardProps) {
  const supabase = createClient()
  const [leaders, setLeaders] = useState<Player[]>(initialLeaders)
  const [flashId, setFlashId] = useState<string | null>(null)

  useEffect(() => {
    const channel = supabase
      .channel('leaderboard')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
      }, (payload) => {
        const updated = payload.new as Player
        setLeaders(prev => {
          const exists = prev.find(p => p.id === updated.id)
          const newList = exists
            ? prev.map(p => p.id === updated.id ? { ...p, xp: updated.xp } : p)
            : [...prev, { id: updated.id, username: updated.username, country: updated.country, xp: updated.xp }]
          return newList.sort((a, b) => b.xp - a.xp).slice(0, 50)
        })
        setFlashId(updated.id)
        setTimeout(() => setFlashId(null), 2000)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  return (
    <div className="bg-brand-panel border border-brand-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-bold text-gray-500 uppercase border-b border-brand-border">
        <div className="col-span-1">Rank</div>
        <div className="col-span-7">Player</div>
        <div className="col-span-2 text-center">Country</div>
        <div className="col-span-2 text-right">XP</div>
      </div>

      {leaders.map((player, i) => {
        const rank = i + 1
        const isMe = player.id === currentUserId
        const isFlashing = player.id === flashId

        return (
          <div
            key={player.id}
            className={`grid grid-cols-12 gap-4 px-6 py-4 border-b border-brand-border last:border-0 transition-all duration-700 ${
              isFlashing ? 'bg-brand-gold/10' :
              isMe ? 'bg-brand-blue/10' : 'hover:bg-brand-dark'
            }`}
          >
            <div className="col-span-1 flex items-center">
              <span className="text-lg font-black" style={{ color: rank <= 3 ? ['#FFD700','#C0C0C0','#CD7F32'][rank-1] : '#6B7280' }}>
                {rank <= 3 ? RANK_ICONS[rank - 1] : rank}
              </span>
            </div>
            <div className="col-span-7 flex items-center gap-2">
              <span className="font-medium text-white">
                {player.username}
                {isMe && <span className="ml-2 text-xs text-brand-blue">(you)</span>}
              </span>
            </div>
            <div className="col-span-2 flex items-center justify-center">
              <span className="text-xl">{COUNTRY_FLAGS[player.country] || '🌍'}</span>
            </div>
            <div className="col-span-2 flex items-center justify-end">
              <span className={`font-bold transition-all duration-300 ${isFlashing ? 'text-brand-gold scale-110' : 'text-brand-gold'}`}>
                {player.xp.toLocaleString()}
              </span>
            </div>
          </div>
        )
      })}

      {leaders.length === 0 && (
        <div className="px-6 py-12 text-center text-gray-400">
          <div className="text-4xl mb-2">🏆</div>
          <p>No players yet. Be the first!</p>
        </div>
      )}
    </div>
  )
}
