'use client'

import { useState } from 'react'
import GameOnboarding from './GameOnboarding'

/**
 * Client-side wrapper that renders GameOnboarding overlay on the roles page.
 * The roles page is a server component, so this client component handles
 * the localStorage check and overlay display.
 */
export default function GameOnboardingWrapper() {
  const [done, setDone] = useState(false)

  if (done) return null

  return <GameOnboarding onComplete={() => setDone(true)} />
}
