/**
 * Generates minimal valid MP3 files as placeholders.
 *
 * These are tiny valid MP3 frames (silent) so Howler.js can load them
 * without errors. Replace with real audio files later.
 *
 * Run: node scripts/generate-placeholder-audio.js
 */

const fs = require('fs')
const path = require('path')

const audioDir = path.join(__dirname, '..', 'public', 'audio')

// Minimal valid MP3 frame — a single MPEG Audio Layer 3 frame of silence.
// This is a valid 128kbps 44100Hz stereo MP3 frame (417 bytes).
// Frame header: 0xFF 0xFB 0x90 0x00 = MPEG1 Layer3 128kbps 44100Hz stereo
const FRAME_HEADER = Buffer.from([0xFF, 0xFB, 0x90, 0x00])
const FRAME_PADDING = Buffer.alloc(413, 0) // Rest of frame is silence
const SINGLE_FRAME = Buffer.concat([FRAME_HEADER, FRAME_PADDING])

// For music files, repeat the frame a few times so Howler sees a valid duration
function createPlaceholderMp3(frameCount = 1) {
  const frames = []
  for (let i = 0; i < frameCount; i++) {
    frames.push(SINGLE_FRAME)
  }
  return Buffer.concat(frames)
}

// Ensure directory exists
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true })
}

const files = {
  // Music — slightly longer (a few frames)
  'music_menu.mp3': createPlaceholderMp3(10),
  'music_mission.mp3': createPlaceholderMp3(10),
  // SFX — single frame
  'click.mp3': createPlaceholderMp3(2),
  'success.mp3': createPlaceholderMp3(3),
  'fail.mp3': createPlaceholderMp3(3),
  'star.mp3': createPlaceholderMp3(2),
  'hint.mp3': createPlaceholderMp3(2),
}

for (const [filename, buffer] of Object.entries(files)) {
  const filePath = path.join(audioDir, filename)
  fs.writeFileSync(filePath, buffer)
  console.log(`Created ${filePath} (${buffer.length} bytes)`)
}

console.log('\nAll placeholder audio files created.')
