'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { getAudioManager } from '@/lib/game/audio'

export default function VolumeControl() {
  const audio = getAudioManager()
  const [volume, setVolume] = useState(0.7) // default, synced in useEffect
  const [muted, setMuted] = useState(false)
  const [showSlider, setShowSlider] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Sync with audio manager after mount (avoids hydration mismatch)
  useEffect(() => {
    setVolume(audio.getVolume())
    setMuted(audio.isMuted())
    setMounted(true)
  }, [audio])
  const containerRef = useRef<HTMLDivElement>(null)

  // Close slider when clicking outside
  useEffect(() => {
    if (!showSlider) return

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSlider(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSlider])

  const handleToggleMute = useCallback(() => {
    audio.toggleMute()
    setMuted(audio.isMuted())
  }, [audio])

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) / 100
    audio.setVolume(val)
    setVolume(val)
    // Un-mute when moving slider
    if (audio.isMuted()) {
      audio.setMuted(false)
      setMuted(false)
    }
  }, [audio])

  const Icon = muted || volume === 0 ? VolumeX : Volume2

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={handleToggleMute}
        onMouseEnter={() => setShowSlider(true)}
        className="p-1.5 rounded-lg hover:bg-brand-border text-gray-400 hover:text-white transition-colors"
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        <Icon className="w-5 h-5" />
      </button>

      {showSlider && (
        <div
          className="absolute right-0 top-full mt-2 bg-brand-panel border border-brand-border rounded-xl p-3 shadow-xl z-50 min-w-[160px]"
          onMouseLeave={() => setShowSlider(false)}
        >
          <div className="flex items-center gap-3">
            <VolumeX className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            <input
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : Math.round(volume * 100)}
              onChange={handleVolumeChange}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-gray-700
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-brand-blue
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-moz-range-thumb]:w-4
                [&::-moz-range-thumb]:h-4
                [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-brand-blue
                [&::-moz-range-thumb]:border-0
                [&::-moz-range-thumb]:cursor-pointer"
              aria-label="Volume"
            />
            <Volume2 className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          </div>
          <p className="text-xs text-gray-500 text-center mt-1.5">
            {muted ? 0 : Math.round(volume * 100)}%
          </p>
        </div>
      )}
    </div>
  )
}
