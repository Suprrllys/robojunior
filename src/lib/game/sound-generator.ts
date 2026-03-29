/**
 * Procedural sound generator using Web Audio API.
 * All sounds are created programmatically — no MP3 files needed.
 */

// Note frequencies (Hz)
const NOTE = {
  C4: 261.63,
  E4: 329.63,
  C5: 523.25,
  E5: 659.25,
  G5: 783.99,
}

/** Short click sound — 50ms, 800Hz square wave with quick decay */
export function generateClick(ctx: AudioContext, destination: AudioNode) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'square'
  osc.frequency.value = 800
  gain.gain.setValueAtTime(0.15, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)

  osc.connect(gain)
  gain.connect(destination)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.05)
}

/** Ascending 3-note chime: C5 -> E5 -> G5, 100ms each, sine wave */
export function generateSuccess(ctx: AudioContext, destination: AudioNode) {
  const notes = [NOTE.C5, NOTE.E5, NOTE.G5]

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.value = freq

    const start = ctx.currentTime + i * 0.12
    gain.gain.setValueAtTime(0.2, start)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15)

    osc.connect(gain)
    gain.connect(destination)
    osc.start(start)
    osc.stop(start + 0.15)
  })
}

/** Descending 2-note buzz: E4 -> C4, 150ms each, sawtooth */
export function generateFail(ctx: AudioContext, destination: AudioNode) {
  const notes = [NOTE.E4, NOTE.C4]

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sawtooth'
    osc.frequency.value = freq

    const start = ctx.currentTime + i * 0.18
    gain.gain.setValueAtTime(0.12, start)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18)

    osc.connect(gain)
    gain.connect(destination)
    osc.start(start)
    osc.stop(start + 0.18)
  })
}

/** Bright ping — 2000Hz, 80ms, sine with fast decay */
export function generateStar(ctx: AudioContext, destination: AudioNode) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'sine'
  osc.frequency.value = 2000

  gain.gain.setValueAtTime(0.2, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)

  osc.connect(gain)
  gain.connect(destination)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.12)
}

/** Soft notification — 600Hz, 100ms, triangle wave */
export function generateHint(ctx: AudioContext, destination: AudioNode) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'triangle'
  osc.frequency.value = 600

  gain.gain.setValueAtTime(0.15, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)

  osc.connect(gain)
  gain.connect(destination)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.12)
}

// ---- Looping music generators ----
// These return a stop function so the caller can stop them.

export interface MusicHandle {
  stop: () => void
}

/**
 * Menu music — ambient pad: low filtered drone with slow LFO.
 * Very subtle, non-distracting background.
 */
export function generateMenuMusic(
  ctx: AudioContext,
  destination: AudioNode,
): MusicHandle {
  // Low drone oscillator
  const drone = ctx.createOscillator()
  drone.type = 'sine'
  drone.frequency.value = 110 // A2

  // Second oscillator a fifth above for richness
  const drone2 = ctx.createOscillator()
  drone2.type = 'sine'
  drone2.frequency.value = 165 // E3

  // LFO to modulate volume for a breathing effect
  const lfo = ctx.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = 0.15 // Very slow

  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 0.06

  // Main gain
  const mainGain = ctx.createGain()
  mainGain.gain.value = 0.08

  // Low-pass filter for warmth
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 400
  filter.Q.value = 1

  // LFO modulates the main gain
  lfo.connect(lfoGain)
  lfoGain.connect(mainGain.gain)

  drone.connect(filter)
  drone2.connect(filter)
  filter.connect(mainGain)
  mainGain.connect(destination)

  drone.start()
  drone2.start()
  lfo.start()

  return {
    stop: () => {
      try {
        // Fade out over 0.5s to avoid pops
        mainGain.gain.setValueAtTime(mainGain.gain.value, ctx.currentTime)
        mainGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5)
        setTimeout(() => {
          try {
            drone.stop()
            drone2.stop()
            lfo.stop()
          } catch {
            // Already stopped
          }
        }, 600)
      } catch {
        // Context may be closed
      }
    },
  }
}

/**
 * Mission music — simple rhythmic pattern at 120 BPM.
 * Uses a kick-like thump and a hi-hat tick alternating.
 */
export function generateMissionMusic(
  ctx: AudioContext,
  destination: AudioNode,
): MusicHandle {
  let stopped = false
  const bpm = 120
  const beatDuration = 60 / bpm // 0.5s per beat

  // Main gain for overall volume
  const mainGain = ctx.createGain()
  mainGain.gain.value = 0.1
  mainGain.connect(destination)

  // Background pad — subtle chord
  const pad = ctx.createOscillator()
  pad.type = 'triangle'
  pad.frequency.value = 220 // A3

  const padGain = ctx.createGain()
  padGain.gain.value = 0.04
  pad.connect(padGain)
  padGain.connect(mainGain)
  pad.start()

  // Schedule beats using setTimeout for simplicity
  let beatIndex = 0
  let timer: ReturnType<typeof setTimeout> | null = null

  function scheduleBeat() {
    if (stopped) return

    try {
      const now = ctx.currentTime

      if (beatIndex % 2 === 0) {
        // "Kick" — low frequency blip
        const kick = ctx.createOscillator()
        const kickGain = ctx.createGain()
        kick.type = 'sine'
        kick.frequency.setValueAtTime(150, now)
        kick.frequency.exponentialRampToValueAtTime(50, now + 0.1)
        kickGain.gain.setValueAtTime(0.2, now)
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
        kick.connect(kickGain)
        kickGain.connect(mainGain)
        kick.start(now)
        kick.stop(now + 0.12)
      } else {
        // "Hi-hat" — high frequency noise-like click
        const hat = ctx.createOscillator()
        const hatGain = ctx.createGain()
        hat.type = 'square'
        hat.frequency.value = 6000
        hatGain.gain.setValueAtTime(0.05, now)
        hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03)
        hat.connect(hatGain)
        hatGain.connect(mainGain)
        hat.start(now)
        hat.stop(now + 0.03)
      }

      beatIndex++
    } catch {
      // Context may be closed
    }

    timer = setTimeout(scheduleBeat, beatDuration * 1000)
  }

  scheduleBeat()

  return {
    stop: () => {
      stopped = true
      if (timer !== null) clearTimeout(timer)
      try {
        mainGain.gain.setValueAtTime(mainGain.gain.value, ctx.currentTime)
        mainGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5)
        setTimeout(() => {
          try {
            pad.stop()
          } catch {
            // Already stopped
          }
        }, 600)
      } catch {
        // Context may be closed
      }
    },
  }
}
