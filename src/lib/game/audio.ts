/**
 * Audio manager — single looping background music (MP3) + Web Audio SFX.
 *
 * Music: /audio/music.mp3 — loops forever.
 * SFX: generated via Web Audio API (no MP3 needed).
 *
 * AudioContext lazily initialized on first user interaction.
 */

import {
  generateClick,
  generateSuccess,
  generateFail,
  generateStar,
  generateHint,
} from './sound-generator'

type SFXName = 'click' | 'success' | 'fail' | 'star' | 'hint'

const SFX_GENERATORS: Record<SFXName, (ctx: AudioContext, dest: AudioNode) => void> = {
  click: generateClick,
  success: generateSuccess,
  fail: generateFail,
  star: generateStar,
  hint: generateHint,
}

const VOLUME_STORAGE_KEY = 'robojunior_audio_volume'
const MUTE_STORAGE_KEY = 'robojunior_audio_muted'

class AudioManager {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private musicGain: GainNode | null = null
  private sfxGain: GainNode | null = null

  private musicElement: HTMLAudioElement | null = null
  private musicSource: MediaElementAudioSourceNode | null = null
  private musicPlaying = false

  private globalVolume = 0.7
  private musicVolumeFactor = 0.5
  private muted = false
  private disposed = false
  private unlocked = false

  constructor() {
    if (typeof window === 'undefined') return
    this.loadSettings()
    this.setupVisibilityListener()
    this.setupUnlockListener()
  }

  // ---- AudioContext lazy init ----

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined' || this.disposed) return null

    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()

        this.masterGain = this.ctx.createGain()
        this.masterGain.gain.value = this.muted ? 0 : this.globalVolume
        this.masterGain.connect(this.ctx.destination)

        this.musicGain = this.ctx.createGain()
        this.musicGain.gain.value = this.musicVolumeFactor
        this.musicGain.connect(this.masterGain)

        this.sfxGain = this.ctx.createGain()
        this.sfxGain.gain.value = 1
        this.sfxGain.connect(this.masterGain)
      } catch {
        return null
      }
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }

    return this.ctx
  }

  private setupUnlockListener() {
    if (typeof window === 'undefined') return

    const unlock = () => {
      if (this.unlocked) return
      this.unlocked = true
      this.ensureContext()
      // Auto-start music on first interaction
      this.startMusic()
      ;['click', 'touchstart', 'keydown'].forEach((evt) => {
        document.removeEventListener(evt, unlock, true)
      })
    }

    ;['click', 'touchstart', 'keydown'].forEach((evt) => {
      document.addEventListener(evt, unlock, true)
    })
  }

  // ---- Music (single looping MP3) ----

  startMusic() {
    if (typeof window === 'undefined' || this.disposed || this.musicPlaying) return

    const ctx = this.ensureContext()
    if (!ctx || !this.musicGain) return

    try {
      if (!this.musicElement) {
        this.musicElement = new Audio('/audio/music.mp3')
        this.musicElement.loop = true
        this.musicElement.volume = 1 // volume controlled via gain node
        this.musicSource = ctx.createMediaElementSource(this.musicElement)
        this.musicSource.connect(this.musicGain)
      }

      this.musicElement.play().catch(() => {
        // Browser may block autoplay — will retry on next user interaction
      })
      this.musicPlaying = true
    } catch {
      // Audio not available
    }
  }

  stopMusic() {
    if (this.musicElement) {
      this.musicElement.pause()
    }
    this.musicPlaying = false
  }

  // Keep playMusic for backward compatibility (MissionShell calls it)
  playMusic(_track?: string) {
    this.startMusic()
  }

  // ---- SFX ----

  playSFX(name: string) {
    if (typeof window === 'undefined' || this.disposed) return

    const generator = SFX_GENERATORS[name as SFXName]
    if (!generator) return

    const ctx = this.ensureContext()
    if (!ctx || !this.sfxGain) return

    try {
      generator(ctx, this.sfxGain)
    } catch {
      // SFX generation failed
    }
  }

  // ---- Volume ----

  setVolume(level: number) {
    this.globalVolume = Math.max(0, Math.min(1, level))
    if (this.masterGain && !this.muted) {
      this.masterGain.gain.value = this.globalVolume
    }
    this.saveSettings()
  }

  getVolume(): number {
    return this.globalVolume
  }

  toggleMute() {
    this.muted = !this.muted
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : this.globalVolume
    }
    this.saveSettings()
  }

  isMuted(): boolean {
    return this.muted
  }

  setMuted(m: boolean) {
    this.muted = m
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : this.globalVolume
    }
    this.saveSettings()
  }

  // ---- Persistence ----

  private loadSettings() {
    try {
      const vol = localStorage.getItem(VOLUME_STORAGE_KEY)
      if (vol !== null) this.globalVolume = parseFloat(vol)
      const muted = localStorage.getItem(MUTE_STORAGE_KEY)
      if (muted !== null) this.muted = muted === 'true'
    } catch {}
  }

  private saveSettings() {
    try {
      localStorage.setItem(VOLUME_STORAGE_KEY, String(this.globalVolume))
      localStorage.setItem(MUTE_STORAGE_KEY, String(this.muted))
    } catch {}
  }

  // ---- Tab visibility ----

  private setupVisibilityListener() {
    if (typeof window === 'undefined') return

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.musicElement && this.musicPlaying) {
          this.musicElement.pause()
        }
      } else {
        if (this.musicElement && this.musicPlaying) {
          this.musicElement.play().catch(() => {})
        }
        if (this.ctx?.state === 'suspended') {
          this.ctx.resume().catch(() => {})
        }
      }
    })
  }

  // ---- Cleanup ----

  dispose() {
    this.disposed = true
    this.stopMusic()
    if (this.ctx) {
      this.ctx.close().catch(() => {})
      this.ctx = null
    }
  }
}

// Singleton
let instance: AudioManager | null = null

export function getAudioManager(): AudioManager {
  if (!instance) {
    instance = new AudioManager()
  }
  return instance
}
