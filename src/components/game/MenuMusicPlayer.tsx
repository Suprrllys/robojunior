'use client'

import { useEffect } from 'react'
import { getAudioManager } from '@/lib/game/audio'

/**
 * Drop this component into any page that should play menu/ambient music.
 * It starts menu music on mount and does nothing on unmount
 * (the next page's music player will handle the transition).
 */
export default function MenuMusicPlayer() {
  useEffect(() => {
    try {
      getAudioManager().playMusic('menu')
    } catch {
      // Audio may not be available
    }
  }, [])

  return null
}
