# Project Brief — Increment 1: PixiJS Engine + 3 Pilot Missions

## What we're building
Integration of PixiJS game engine into existing RoboJunior Next.js app, plus 3 pilot missions (one per role), shared mission infrastructure (shell, hints, results, onboarding, knowledge base), audio system, and updated mission pages.

## Project root
`C:\Users\serge\OneDrive\Документы\Vibecoding Projects\Case-TvoyProekt-Innovatika\results\product-mvp\`

## Full spec
Read `MISSIONS_SPEC.md` in the project root for complete specifications.

## Existing stack
- Next.js 14.2.5 + React 18 + TypeScript
- Supabase (auth, DB) — clients at `src/lib/supabase/client.ts` and `server.ts`
- Localization: next-intl with messages in `messages/en.json`, `messages/ru.json`, `messages/ar.json`
- Existing pages: auth, roles, missions (drone/robot/entrepreneur), dashboard, profile, coop, shop, leaderboard
- Existing game components: `src/components/game/DroneGame.tsx`, `RobotGame.tsx`, `EntrepreneurGame.tsx`
- Existing types: `src/types/game.ts`, `src/types/database.ts`
- Existing scoring: `src/lib/game/scoring.ts`, `rewards.ts`, `missions.ts`
- Tailwind CSS for styling
- @dnd-kit for drag-and-drop

## Requirements

### Task 1 — PixiJS Engine Integration + Audio System
1. Install `pixi.js` (v8), `howler` packages
2. Create `src/components/engine/PixiCanvas.tsx` — React wrapper for PixiJS Application. Must:
   - Use dynamic import with `ssr: false` in Next.js
   - Accept width/height props, be responsive (resize with container)
   - Clean up PixiJS app on unmount
   - Support mobile touch events
3. Create `src/lib/game/audio.ts` — Audio manager using Howler.js:
   - `playMusic(track: 'menu' | 'mission')` — crossfade between tracks
   - `playSFX(name: string)` — fire-and-forget sound effects
   - `setVolume(level: number)` — global volume
   - Auto-pause when tab loses focus
   - Use placeholder audio files (generate simple tones or use public domain)
4. Create placeholder audio files in `public/audio/`:
   - `music_menu.mp3` — calm ambient loop (can be a short silent placeholder)
   - `music_mission.mp3` — upbeat loop
   - SFX: `click.mp3`, `success.mp3`, `fail.mp3`, `star.mp3`, `hint.mp3`

### Task 2 — Mission Shell + Shared UI Components
1. Create `src/components/missions/common/MissionShell.tsx`:
   - Wrapper around any mission content
   - Props: missionTitle, missionNumber, totalMissions, difficulty, role, score, maxScore, children, onComplete, onFail, hints (array of strings), knowledgeBaseContent, onboardingSteps
   - Shows: mission title bar, real-time score display, hint button (top-right), knowledge base toggle (right edge), exit button
   - Manages mission state: playing / completed / failed
   - On complete/fail: shows ResultScreen overlay

2. Create `src/components/missions/common/HintPanel.tsx`:
   - Button always visible, shows lightbulb icon
   - On click: shows next hint level (progressive)
   - Props: hints (string[]), maxLevels (2 or 3), role
   - Tracks current hint level internally
   - Plays `hint.mp3` SFX on reveal
   - Mobile: full-screen overlay instead of popup

3. Create `src/components/missions/common/ResultScreen.tsx`:
   - Full-screen overlay shown on mission end
   - Props: score, maxScore (1000), scoreBreakdown (array of {label, value, max}), isSuccess, isFirstClear, xpEarned, coinsEarned, skillsPracticed (string[]), missionNumber, totalMissions, nearMissPoints, nearMissStarLevel, onRetry, onNext, onBackToMap
   - Star calculation: 1 star = 50%+, 2 = 75%+, 3 = 95%+
   - Animated star fill (left to right, 0.3s each)
   - Score counting animation (0 to final in ~1.5s)
   - Near-miss indicator: "Just N points from X stars!" if within 10% of threshold
   - Rewards shown only on first successful clear
   - Buttons: Retry, Next (prominent), Back to Map
   - Plays `success.mp3` or `fail.mp3`, then `star.mp3` per star earned

4. Create `src/components/missions/common/OnboardingOverlay.tsx`:
   - Full-screen overlay, 3-5 steps with Next/Skip buttons
   - Props: steps (array of {titleKey, descriptionKey, imageComponent?}), onComplete
   - Step indicator dots at bottom
   - "Skip" button always available
   - On complete: marks onboarding done (calls Supabase)

5. Create `src/components/missions/common/KnowledgeBase.tsx`:
   - Side panel (slides in from right)
   - Props: entries (array of {titleKey, contentKey, category})
   - Categorized sections with expandable items
   - Mobile: full-screen overlay
   - Search/filter by category

### Task 3 — Block Editor for Visual Programming
1. Create `src/components/missions/common/BlockEditor.tsx`:
   - Visual block programming editor for drone Easy missions
   - Available blocks: `takeoff`, `forward(N)`, `turnLeft`, `turnRight`, `land`, `repeat(N) { ... }`
   - Blocks are draggable from a palette on the left into a program area on the right
   - Use @dnd-kit for drag-and-drop (already in dependencies)
   - Each block has a color based on type (movement = blue, control = orange, action = green)
   - `forward(N)` and `repeat(N)` have editable number inputs
   - `repeat(N)` block can contain nested blocks (indented)
   - Program area shows blocks in sequence
   - "Run" button to execute the program
   - "Clear" button to reset
   - Block count display: "Blocks: 5/8"
   - Mobile: larger touch targets, vertical layout
   - Returns the program as an array of command objects

### Task 4 — Drone Mission 1 "First Flight"
1. Create `src/components/missions/drone/DroneMission1.tsx`:
   - Uses PixiCanvas for 2.5D game rendering
   - 5x5 grid rendered in isometric/2.5D perspective
   - Desert landscape background (sand-colored tiles with subtle texture)
   - Drone sprite: simple animated quadcopter with spinning propellers
   - Shadow under drone that follows it
   - Start position: bottom-left (0,4), Target: top-right (4,0) marked with flag
   - Player assembles program using BlockEditor component
   - On "Run": drone executes commands with smooth animation (0.5s per move)
   - Collision detection: drone can't go off grid
   - Success: drone reaches target cell → trigger MissionShell.onComplete
   - Fail: drone doesn't reach target after program finishes → show "Try again"
   - Scoring (maxScore = 1000):
     - correctness: reached target? 400 points
     - efficiency: max(0, 1 - (blocks_used / 5 - 1)) * 300 (5 = optimal)
     - speed: max(0, 1 - time_seconds / 120) * 200 (generous 2-min limit)
     - style: used no redundant blocks? 100 bonus
   - Particle effect on drone propellers
   - Success animation: confetti particles + drone does a victory spin

2. Create `src/components/missions/drone/drone-engine.ts`:
   - `executeDroneProgram(commands, grid, startPos, direction)`: runs commands step-by-step
   - Returns array of {position, direction} for each step (for animation)
   - Validates moves (can't go off-grid)
   - Handles `repeat(N)` by expanding commands

3. Update drone missions page `src/app/[locale]/(game)/missions/drone/page.tsx`:
   - Support 10 missions (not just 2)
   - Show mission cards for missions 1-10 with difficulty labels
   - All missions accessible (no locks)
   - Show "Recommended" badge on missions 1-3 for new players
   - Load the appropriate mission component based on mission number
   - For now, only Mission 1 is fully implemented; others show "Coming Soon"

### Task 5 — Robot Mission 1 "First Helper"
1. Create `src/components/missions/robot/RobotMission1.tsx`:
   - Engineering assembly mission — NO CODE
   - Left panel: parts catalog with drag-and-drop parts
   - Right panel: robot blueprint with 5 slots (head, body, left-arm, right-arm, legs)
   - Parts (each with stats):
     - Chassis: Light (15kg, $20, strength:3), Medium (25kg, $35, strength:5), Heavy (40kg, $50, strength:8)
     - Arms: Basic Gripper ($15, precision:3, lift:5kg), Power Gripper ($30, precision:2, lift:15kg), Precision Gripper ($25, precision:5, lift:8kg)
     - Wheels: Small ($10, speed:fast, terrain:flat), Medium ($20, speed:medium, terrain:rough), Tank Tracks ($35, speed:slow, terrain:all)
     - Motor: Basic ($15, power:low), Standard ($25, power:medium), Heavy-duty ($40, power:high)
     - Battery: Small ($10, 4h runtime), Medium ($20, 8h runtime), Large ($35, 12h runtime)
   - Budget: 80 coins max
   - Weight limit: 50kg
   - Real-time budget and weight counters
   - "Test Robot" button: PixiJS animation showing robot trying to lift a 10kg box
     - Success if: strength >= 5 AND motor power >= medium AND all slots filled
     - Robot visually succeeds or fails (lifts box / drops it / tips over)
   - Scoring (maxScore = 1000):
     - design: all 5 slots filled correctly = 350
     - physics: robot passes test = 300
     - budget: (1 - money_spent/80) * 200
     - testing: smooth test = 150, jerky = 75, fail = 0
   - Use PixiCanvas for the test animation
   - Use @dnd-kit for part dragging

2. Update robot missions page similarly to drone page (10 missions, only M1 implemented).

### Task 6 — Entrepreneur Mission 1 "The Idea"
1. Create `src/components/missions/entrepreneur/EntrepreneurMission1.tsx`:
   - Management mission — NO CODE
   - Split screen: left = city street view (PixiCanvas), right = sticky-note board
   - City street: 12 NPC characters standing at various positions
     - Each NPC has a name, avatar color, and a problem description
     - Click NPC → speech bubble with problem text
     - 4 problem themes: Transportation (4 NPCs), Energy (3 NPCs), Water (2 NPCs), Communication (3 NPCs)
   - After talking to NPC: a sticky note appears with the problem summary
   - Right panel: board with 4 columns (player can create/rename columns)
   - Drag sticky notes into columns to group by theme
   - "Submit" button: player selects which column = their startup idea
   - Scoring (maxScore = 1000):
     - decisions: correct grouping (each note in right column) = 350 × (correct/total)
     - financials (NPCs surveyed): surveyed 10+ = 300, 8+ = 200, 6+ = 100
     - team: N/A for this mission, flat 200
     - timing: completed within 5 min = 150, within 10 = 100, else 50
   - Success criteria: selected the column with 4+ NPCs (Transportation)
   - NPC interaction via PixiCanvas with click detection
   - Sticky notes via React DOM (not PixiJS) for easier text handling

2. Update entrepreneur missions page similarly.

### Task 7 — Database Schema Updates + New Mission Registry
1. Create `src/lib/db/schema-update.sql` with:
   - Add `difficulty` column to `mission_progress` unique constraint (currently missing — schema has `unique(user_id, role, mission_number)` but needs difficulty)
   - Add `stars`, `best_score`, `attempts`, `hints_used`, `first_clear_rewarded`, `bonus_objective_visible`, `bonus_objective_completed` columns to `mission_progress`
   - Create `avatar_skins` table
   - Create `user_skins` table
   - Create `achievements` and `user_achievements` tables
   - Create `onboarding_status` table
   - Add `equipped_skin`, `equipped_frame`, `title_key`, `missions_without_hints`, `total_missions_completed` to profiles

2. Update `src/lib/game/missions.ts`:
   - Expand MISSION_REGISTRY to 30 missions (10 per role × 3 difficulties = but actually each mission has fixed difficulty tier based on number, so 10 entries per role)
   - Add new fields: successCriteria, hints, skills, optimalSolution, etc.

3. Update `src/types/game.ts` and `src/types/database.ts` with new types

4. Update `src/lib/game/scoring.ts` to use new scoring algorithms from spec
5. Update `src/lib/game/rewards.ts` with new reward values (XP: 50/100/200, Coins: 20/40/80)

### Task 8 — Localization (EN + RU)
1. Add all new translation keys to `messages/en.json` and `messages/ru.json`:
   - Mission titles, descriptions, hints for all 3 pilot missions
   - Onboarding step texts for all 3 roles
   - Knowledge base entries (minimal set for pilot)
   - UI strings: "Hint", "Knowledge Base", "Mission Complete", "Mission Failed", "Retry", "Next", "Back to Map", stars, scoring labels, etc.
   - Result screen strings
   - Block editor labels

## Tech stack
- Next.js 14.2.5, React 18, TypeScript
- PixiJS v8 (NEW)
- Howler.js (NEW)
- Supabase (existing)
- @dnd-kit (existing)
- next-intl (existing)
- Tailwind CSS (existing)

## Out of scope
- Missions 2-10 gameplay (show "Coming Soon")
- Monaco Editor (that's for Medium/Hard missions in later increments)
- Coop missions
- Avatar skin gallery UI
- Hindi (AR) localization (EN + RU first)
- Real audio assets (use placeholders)

## Success criteria
- Game builds without errors (`npm run build`)
- Drone Mission 1 is playable: drag blocks, run program, see drone fly, get score + stars
- Robot Mission 1 is playable: drag parts, test robot, see animation, get score + stars
- Entrepreneur Mission 1 is playable: click NPCs, read problems, group stickers, submit idea, get score + stars
- All 3 missions show onboarding on first play
- Hint button works (progressive hints)
- Result screen shows stars, score breakdown, rewards
- Knowledge base panel opens with relevant content
- Audio plays (even if placeholder)
- Pages responsive on mobile (360px+)
- Existing pages (auth, profile, coop, shop, leaderboard) still work
