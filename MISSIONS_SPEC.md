# RoboJunior Missions — Full Technical Specification

**Date:** 2026-03-26
**Status:** Approved by product owner
**Engine:** PixiJS (WebGL 2D/2.5D)
**Stack:** Next.js + Supabase + PixiJS
**Localization:** EN / RU / AR / HI

---

## 1. Architecture Overview

### Tech Stack
- **Game Engine:** PixiJS v8 (free, WebGL, particles, animations, mobile-ready)
- **Framework:** Next.js (existing) — pages, routing, auth, API
- **Database:** Supabase (existing) — auth, progress, coop, leaderboards
- **Audio:** Howler.js (free, cross-browser, mobile-compatible)
- **Drag & Drop:** @dnd-kit (existing) + PixiJS native drag for in-game
- **Code Editor:** Monaco Editor (for programmer Hard missions)

### File Structure
```
src/
  components/
    engine/                    # PixiJS wrapper components
      PixiCanvas.tsx           # Main PixiJS canvas React wrapper
      PixiStage.tsx            # Stage management
      particles/               # Particle effects
      sprites/                 # Sprite management
      audio/                   # Audio manager (Howler.js)
    missions/
      common/
        MissionShell.tsx       # Shared mission wrapper (timer, score, hints, result)
        HintPanel.tsx          # Hint button + progressive hints
        ResultScreen.tsx       # Post-mission result screen (stars, score, rewards)
        OnboardingOverlay.tsx  # Onboarding tutorial overlay
        KnowledgeBase.tsx      # Side panel with reference materials
        CodeEditor.tsx         # Monaco editor for programmer missions
        BlockEditor.tsx        # Block-based visual programming editor
      drone/
        DroneMission1.tsx      # First Flight
        DroneMission2.tsx      # Mapping
        ...
        DroneMission10.tsx     # Smart City System
        drone-engine.ts        # Drone simulation logic
        drone-sprites.ts       # Drone-specific sprites and animations
        drone-api.ts           # API that player's code calls (drone.forward, etc.)
      robot/
        RobotMission1.tsx      # First Helper
        ...
        RobotMission10.tsx     # Robot Factory
        robot-engine.ts        # Physics simulation for robot testing
        robot-sprites.ts       # Robot-specific sprites
      entrepreneur/
        EntrepreneurMission1.tsx  # The Idea
        ...
        EntrepreneurMission10.tsx # BRICS Ecosystem
        entrepreneur-engine.ts    # Business simulation logic
        entrepreneur-sprites.ts   # NPC, office, city sprites
      coop/
        CoopMission1.tsx       # Solar Farm
        ...
        CoopMission5.tsx       # City Launch
    rewards/
      SkinGallery.tsx          # Avatar skin selection
      RewardUnlock.tsx         # Reward unlock animation
  lib/
    game/
      missions.ts             # Mission registry (updated)
      scoring.ts              # Scoring algorithms per role
      rewards.ts              # Reward calculation (XP, coins, skins)
      hints.ts                # Hint system logic
      audio.ts                # Audio manager (background music + SFX)
      progress.ts             # Mission progress tracking
  assets/
    sprites/                  # PixiJS sprite sheets
    audio/
      music/                  # Background music (menu + mission)
      sfx/                    # Sound effects
    fonts/                    # Game fonts
  types/
    game.ts                   # Updated type definitions
```

### PixiJS Integration with Next.js
- PixiJS canvas wrapped in React component with `useEffect` for lifecycle
- Game state managed via React state + PixiJS ticker for animations
- Dynamic import (`next/dynamic`) with `ssr: false` for PixiJS components
- Responsive canvas: adapts to container size, mobile-friendly

---

## 2. Lore

**Setting:** BRICS City — a brand new city being built from scratch in the desert by an international coalition of BRICS+ countries. Players are recruited as specialists to help build different aspects of the city.

Each mission = a new stage of city construction. The city grows visually on the mission map as players complete missions.

---

## 3. Common Systems

### 3.1 Mission Shell (MissionShell.tsx)

Every mission is wrapped in a shell that provides:
- Mission title + description
- Hint button (always visible, top-right corner)
- Knowledge Base toggle (side panel, right edge)
- Score display (updates in real-time where applicable)
- Exit button (return to map)
- Result screen (shown on completion/failure)

### 3.2 Onboarding (OnboardingOverlay.tsx)

Shown ONCE before the first mission of each role. 3-5 steps:
- Step 1: "Who you are" — role description
- Step 2: "What you do" — core mechanic explanation
- Step 3: "How it works" — interactive demo (try dragging a block / component)
- Step 4: "How you score" — scoring explanation
- Step 5: "Start!" — dismiss and begin

Stored in Supabase: `onboarding_completed` flag per role per user.

### 3.3 Hint System (HintPanel.tsx)

**Button "Hint" is always visible** in top-right corner. Not intrusive.
Player clicks when THEY want help. No auto-triggers.
No score penalty. Private "independence meter" tracked in profile.

**Programmer — 3 levels per click:**
1. Direction: "Your loop is infinite. What condition should stop it?"
2. Structure: Code skeleton with blanks
3. Solution: Full working code (must be retyped, not copy-paste)

**Constructor — 2 levels per click:**
1. Problem zone highlight: "The issue is in this part of the design"
2. Working configuration example

**Entrepreneur — 2 levels per click:**
1. Mentor observation: "Costs are growing faster than revenue. Check the budget"
2. Specific recommendation: "In this situation, companies usually do X or Y"

Hints are mission-specific — each mission has its own hint texts.

### 3.4 Result Screen (ResultScreen.tsx)

Shown after mission completion or failure.

**Layout:**
```
┌──────────────────────────────────────────┐
│          ★  ★  ☆                         │
│      MISSION COMPLETE / FAILED           │
│      Mission 4/10 · Medium               │
│                                          │
│  YOUR SCORE              1,450 pts       │
│  ──────────────────────────              │
│  [Component 1]            800/1000       │
│  [Component 2]            400/500        │
│  Bonus Objective          250/500        │
│                                          │
│  REWARDS: (only on first successful)     │
│  +120 XP    +45 coins                    │
│                                          │
│  SKILLS PRACTICED:                       │
│  [Skill 1]  [Skill 2]                    │
│                                          │
│  "Just 85 points from 3 stars!"          │
│  (near-miss indicator, if applicable)    │
│                                          │
│  [ RETRY ]          [ NEXT >> ]          │
│         [ Back to Map ]                  │
└──────────────────────────────────────────┘
```

**Star thresholds:**
- 1 star: 50%+ of max score (mission passed)
- 2 stars: 75%+ of max score
- 3 stars: 95%+ of max score

**Near-miss:** if within 10% of next star threshold, show "Just N points from X stars!"

**Bonus objectives:** hidden on first play, revealed after first completion.

**Expert solution (programmer only):** "Expert: 12 lines. You: 18. [See Expert Solution]" — optional click.

### 3.5 Knowledge Base (KnowledgeBase.tsx)

Side panel, toggleable, available during any mission.

**Programmer reference:**
- Available commands list with descriptions and examples
- Language constructs: variables, loops, conditions, functions, arrays
- Common patterns: wall-following, spiral search, sorting
- Error messages explained in plain language

**Constructor reference:**
- Physics: mass, center of gravity, torque — simple language + illustrations
- Materials table: strength, weight, cost, flexibility
- Mechanisms: gears, levers, bearings — how they work, where to use
- Electronics: motor types, batteries, sensors — specs and wiring

**Entrepreneur reference:**
- Glossary: MVP, PMF, IPO, B2B/B2C, unit economics, LTV, CAC, burn rate, NPV, ROI
- Each term: 2-3 sentences + real-world example
- Mini case studies: "Company X did this → result was this"
- Situation guides: "Competitor lowered price — 3 possible strategies and when each works"

### 3.6 Scoring System

#### Programmer scoring:
```
maxScore = 1000
correctness = (objectives_completed / total_objectives) * 400     // 40%
efficiency = max(0, 1 - (player_commands / optimal_commands - 1)) * 300  // 30%
speed = max(0, 1 - time_taken / time_limit) * 200                // 20% (generous limit)
style = bonus_for_advanced_constructs * 100                       // 10%

score = correctness + efficiency + speed + style
```

#### Constructor scoring:
```
maxScore = 1000
design = (compatible_components / required_components) * 350      // 35%
physics = (tests_passed / total_tests) * 300                      // 30%
budget = max(0, 1 - money_spent / budget_limit) * 200             // 20%
testing = (survived_all_tests ? 1 : partial) * 150                // 15%

score = design + physics + budget + testing
```

#### Entrepreneur scoring:
```
maxScore = 1000
decisions = (good_decisions / total_decisions) * 350              // 35%
financials = normalize(final_profit, min_possible, max_possible) * 300  // 30%
team = (team_morale + team_coverage) / 2 * 200                   // 20%
timing = (deadlines_met / total_deadlines) * 150                  // 15%

score = decisions + financials + team + timing
```

### 3.7 Rewards

**Per mission (first successful completion only):**
- XP: 50 (easy) / 100 (medium) / 200 (hard)
- Coins: 20 (easy) / 40 (medium) / 80 (hard)

**Block completion rewards (avatar skins):**

| Achievement | Reward |
|------------|--------|
| All Easy missions of one role (missions 1-3) | Role-themed avatar skin |
| All Medium missions of one role (missions 4-6) | Animated avatar skin |
| All Hard missions of one role (missions 7-10) | Epic skin + title ("Master Pilot" / "Chief Engineer" / "CEO") |
| All 10 missions of one role | Legendary skin + unique profile frame |
| All 30 missions of all roles | Secret "BRICS City Founder" skin + animated frame |

Skins are for player avatar (profile page).

### 3.8 Adaptive Recommendations

No forced difficulty changes. Instead:
- Mission map shows "Recommended" badge on 1-2 missions based on completed missions
- If player picks Hard with no Medium completions — one-time note: "Players who completed [Mission X] first scored 40% higher here" → let them proceed anyway
- After 3+ failures — add "Review Concepts" button (opens Knowledge Base to relevant topic) + "Try a Related Mission"
- Never block access to any mission

### 3.9 Audio System

**Howler.js** for cross-browser + mobile audio.

**Background music:**
- Menu / mission map: calm, ambient electronic
- Missions: upbeat, energetic electronic / synthwave
- Music crossfades on scene transitions
- Volume control in settings
- Auto-pause when tab is not focused

**Sound effects:**
- UI: button clicks, panel open/close, tab switch
- Mission start / complete / fail jingles
- Star earned sound (1, 2, 3 — escalating)
- Reward unlock fanfare
- Programmer: code compile success/error beep
- Constructor: mechanical assembly sounds, test pass/fail
- Entrepreneur: cash register, notification dings

Source: Free libraries (Freesound.org, Mixkit, OpenGameArt).

### 3.10 Mobile Adaptation

- PixiJS canvas: responsive, fills viewport
- Touch controls: tap instead of click, pinch-to-zoom on maps
- Drag-and-drop: uses touch events via PixiJS + @dnd-kit touch sensors
- Code editor (programmer Hard): Monaco Editor has mobile mode, but add large font option
- Block editor: larger blocks on mobile, snap-to-grid
- Panels (hints, knowledge base): full-screen overlay on mobile instead of side panel
- Minimum supported width: 360px (iPhone SE)

### 3.11 Localization

All mission texts, hints, knowledge base entries, UI strings — in 4 languages:
- English (EN) — primary
- Russian (RU)
- Arabic (AR) — RTL support
- Hindi (HI)

Using existing next-intl setup. Translation keys follow pattern:
```
missions.drone.m1.title
missions.drone.m1.description
missions.drone.m1.onboarding.step1
missions.drone.m1.hint.level1
missions.drone.m1.result.bonus_objective
knowledge.programmer.loops.title
knowledge.programmer.loops.description
knowledge.programmer.loops.example
```

---

## 4. Mission Definitions

### 4.1 ROLE: Drone Programmer (CODE-BASED)

This is the ONLY role with programming tasks.

**Progression:**
- Easy (missions 1-3): Visual block programming (drag-and-drop command blocks)
- Medium (missions 4-6): Blocks + simple JavaScript code (variables, loops, conditions)
- Hard (missions 7-10): Full JavaScript code in Monaco Editor

**Available API for player code (drone-api.ts):**
```typescript
interface DroneAPI {
  // Movement
  forward(steps: number): void
  turnLeft(): void
  turnRight(): void
  flyTo(x: number, y: number): void
  rotate(degrees: number): void
  land(): void
  takeoff(): void

  // Sensors
  seeWall(direction: 'front' | 'left' | 'right'): boolean
  scanHeat(): number
  camera: {
    scan(): ScanResult
    findNearest(type: string): Landmark | null
  }

  // State
  position: { x: number, y: number }
  battery: number
  busy: boolean
  atDestination(target?: { x: number, y: number }): boolean
  atExit(): boolean

  // Actions
  dropMarker(color: string): void
  grab(item: string): void
  drop(): void
  install(item: string): void
  sendReport(data: any): void
  interrupt(): void
  spiralSearch(radius: number): void

  // Swarm
  angleTo(target: any): number
}
```

#### Mission 1 — "First Flight" (Easy)
- **Story:** Deliver construction materials to BRICS City building site
- **Mechanic:** Block programming. Assemble: `takeoff → forward(3) → turnRight → forward(2) → land`
- **Grid:** 5x5, start bottom-left, target top-right, no obstacles
- **Visual:** 2.5D desert landscape, animated drone with propellers, shadows on ground, outline of future city
- **Success criteria:** Drone reaches target cell
- **Scoring:** correctness (reached target), efficiency (block count vs optimal), speed (time)
- **Max blocks:** 8
- **Optimal solution:** 5 blocks
- **Skills practiced:** Sequential commands
- **Hint L1:** "The drone needs to go right and up. Start with takeoff."
- **Hint L2:** "takeoff → forward(?) → turnRight → forward(?) → land"
- **Hint L3:** "takeoff → forward(4) → turnRight → forward(4) → land"

#### Mission 2 — "Mapping" (Easy)
- **Story:** Photograph the territory — fly over all marked points
- **Mechanic:** Block programming. Must visit all 5 marked cells. Introduce `repeat(N) { ... }` block
- **Grid:** 6x6, 5 photo points scattered, no obstacles
- **Visual:** Fog of war clears as drone flies, photos "develop" with fade-in effect
- **Success criteria:** All 5 points photographed
- **Scoring:** correctness (points covered), efficiency (blocks used), speed
- **Max blocks:** 14
- **Optimal solution:** 8 blocks (using repeat)
- **Skills practiced:** Loops (repeat)
- **Hint L1:** "You need to visit all blue squares. Can you find a pattern?"
- **Hint L2:** "The points form a zigzag. Use repeat(N) to avoid duplicating commands."
- **Hint L3:** Show optimal block arrangement

#### Mission 3 — "Night Watch" (Easy)
- **Story:** Program a patrol drone for the night construction site
- **Mechanic:** Block programming. Create patrol route using `loop { ... }` (infinite loop). Must cover 80%+ of grid
- **Grid:** 5x5, no obstacles, coverage tracking
- **Visual:** Night scene, flashlight beam from drone, firefly particles, thieves flee when illuminated
- **Success criteria:** Patrol covers 80%+ of territory
- **Scoring:** correctness (coverage %), efficiency (route length), style (no overlapping paths)
- **Max blocks:** 12
- **Optimal solution:** 7 blocks
- **Skills practiced:** Infinite loops, coverage algorithms
- **Hint L1:** "A good patrol visits every area. Think about a snake-like pattern."
- **Hint L2:** "loop { forward(4) → turnRight → forward(1) → turnRight → forward(4) → turnLeft → forward(1) → turnLeft }"
- **Hint L3:** Show optimal solution with coverage visualization

#### Mission 4 — "Storm Delivery" (Medium)
- **Story:** Deliver medicine in a sandstorm. Wind pushes the drone
- **Mechanic:** Blocks + code. Wind changes direction each turn. Must compensate:
```javascript
if (wind.direction === "east") {
  drone.moveLeft(1);
}
drone.forward(3);
```
- **Grid:** 7x7, start bottom-left, target top-right, wind indicator
- **Visual:** Sandstorm particles, drone shakes, wind direction indicator, medicine package on drone
- **Success criteria:** Drone delivers package to target
- **Scoring:** correctness (delivery), efficiency (commands), speed, style (clean conditionals)
- **Skills practiced:** Conditionals (if/else), variables
- **Hint L1:** "The wind pushes your drone. You need to counteract it."
- **Hint L2:** "Use if (wind.direction === '...') to check wind and compensate."
- **Hint L3:** Full solution code

#### Mission 5 — "Drone Swarm" (Medium)
- **Story:** Control 3 drones to install solar panels
- **Mechanic:** Code. Write one program using arrays:
```javascript
for (let i = 0; i < 3; i++) {
  drones[i].flyTo(targets[i]);
  drones[i].install("solar_panel");
}
```
- **Grid:** 8x8, 3 drones at bottom, 3 targets scattered
- **Visual:** 3 drones with colored trails (red/blue/green), panels install one by one
- **Success criteria:** All 3 panels installed
- **Scoring:** correctness (panels installed), efficiency (total flight distance), speed
- **Skills practiced:** Arrays, for loops, variables
- **Hint L1:** "You have 3 drones and 3 targets. Use an array to manage them."
- **Hint L2:** "for (let i = 0; i < 3; i++) { drones[i].flyTo(targets[i]); ... }"
- **Hint L3:** Full solution

#### Mission 6 — "Sensor Maze" (Medium)
- **Story:** Fly through a skyscraper under construction without hitting security lasers
- **Mechanic:** Code. Drone sees 2 cells ahead. Use sensor data:
```javascript
while (!drone.atExit()) {
  if (drone.seeWall("front")) {
    if (!drone.seeWall("right")) {
      drone.turnRight();
    } else {
      drone.turnLeft();
    }
  }
  drone.forward(1);
}
```
- **Grid:** 10x10 maze, start left, exit right
- **Visual:** Building interior, laser beams (red lines), 3rd person view behind drone
- **Success criteria:** Drone reaches exit with ≤2 laser hits
- **Scoring:** correctness (reached exit), efficiency (steps), style (wall-following algorithm)
- **Skills practiced:** While loops, nested conditionals, sensor reading
- **Hint L1:** "The drone can see walls ahead and to the sides. Use seeWall() to navigate."
- **Hint L2:** "while (!drone.atExit()) { if (drone.seeWall('front')) { ... } drone.forward(1); }"
- **Hint L3:** Full wall-following algorithm

#### Mission 7 — "Search & Rescue" (Hard)
- **Story:** Earthquake! Find survivors with thermal scanner
- **Mechanic:** Full code in Monaco Editor:
```javascript
let survivors = [];
for (let x = 0; x < grid.width; x++) {
  for (let y = 0; y < grid.height; y++) {
    drone.flyTo(x, y);
    let temp = drone.scanHeat();
    if (temp > 36.0) {
      survivors.push({ x: x, y: y });
      drone.dropMarker("red");
    }
  }
}
drone.sendReport(survivors);
```
- **Grid:** 10x10, 8 survivors hidden, debris obstacles
- **Visual:** Destroyed buildings, heat map overlay, rescue markers
- **Success criteria:** Found 60%+ survivors (5 of 8)
- **Scoring:** correctness (survivors found), efficiency (cells scanned), speed, style (optimized scanning)
- **Skills practiced:** Nested loops, arrays, objects, conditionals
- **Hint L1:** "Scan the grid systematically. Each cell may have a survivor if temperature > 36."
- **Hint L2:** "Use nested for-loops to visit every cell. Push coordinates to an array."
- **Hint L3:** Full solution code

#### Mission 8 — "Blind Navigation" (Hard)
- **Story:** GPS broken in canyon. Navigate by camera and landmarks
- **Mechanic:** Full code. Functions, algorithmic thinking:
```javascript
function navigateToTarget(drone, target) {
  while (!drone.atDestination(target)) {
    let scan = drone.camera.scan();
    let landmark = scan.findNearest("tower");
    if (landmark) {
      let angle = drone.angleTo(landmark);
      drone.rotate(angle);
      drone.forward(landmark.distance / 2);
    } else {
      drone.spiralSearch(5);
    }
  }
}
navigateToTarget(drone, basecamp);
```
- **Grid:** 15x15, 5 landmarks, target at center, no grid lines visible
- **Visual:** Canyon landscape, drone "vision" cone visualized, landmarks highlight when detected
- **Success criteria:** Drone reaches target
- **Scoring:** correctness (reached target), efficiency (total distance), speed, style (function usage)
- **Skills practiced:** Functions, algorithm design, problem decomposition
- **Hint L1:** "Without GPS, you need landmarks. Use camera.scan() to find them."
- **Hint L2:** "Create a function. Find nearest landmark, calculate angle, fly toward it."
- **Hint L3:** Full solution

#### Mission 9 — "Air Convoy" (Hard)
- **Story:** Build delivery routing system — assign orders to drones
- **Mechanic:** Full code. Sorting, filtering, function design:
```javascript
function assignDelivery(order, fleet) {
  let available = fleet.filter(function(d) {
    return d.battery > 30 && d.busy === false;
  });
  available.sort(function(a, b) {
    return distance(a.pos, order.pickup) - distance(b.pos, order.pickup);
  });
  if (available.length === 0) return "no_drones";
  let best = available[0];
  best.flyTo(order.pickup);
  best.grab(order.package);
  best.flyTo(order.delivery);
  best.drop();
  return "delivered";
}
```
- **Scenario:** 5 drones, 10 orders arriving over time, limited battery
- **Visual:** City map top-down, drone routes drawn as lines, warehouses blink on orders
- **Success criteria:** 70%+ orders delivered (7 of 10)
- **Scoring:** correctness (deliveries), efficiency (total flight distance), speed, style (clean code)
- **Skills practiced:** filter, sort, functions, resource management algorithms
- **Hint L1:** "Filter drones by battery and availability. Sort by distance to pickup."
- **Hint L2:** "fleet.filter(d => d.battery > 30 && !d.busy).sort(by distance)"
- **Hint L3:** Full solution

#### Mission 10 — "Smart City System" (Hard)
- **Story:** Final — unified drone system: patrol + delivery + emergency response
- **Mechanic:** Full code. Priority queues, event handling:
```javascript
function droneController(events, fleet) {
  events.sort(function(a, b) { return a.priority - b.priority; });
  for (let i = 0; i < events.length; i++) {
    let event = events[i];
    if (event.type === "emergency") {
      let rescueDrone = findClosest(fleet, event.location);
      rescueDrone.interrupt();
      rescueDrone.flyTo(event.location);
    } else if (event.type === "delivery") {
      assignDelivery(event, fleet);
    } else if (event.type === "patrol") {
      assignPatrol(event.area, fleet);
    }
  }
}
```
- **Scenario:** 8 drones, mixed events (emergencies, deliveries, patrols) arriving dynamically
- **Visual:** Full BRICS City panorama at night, lights, drones flying, real-time dashboard with metrics
- **Success criteria:** 60%+ events handled correctly
- **Scoring:** correctness (events handled), efficiency (drone utilization), speed, style (priority handling)
- **Skills practiced:** Event handling, priority systems, code architecture
- **Hint L1:** "Sort events by priority. Emergencies first, then deliveries, then patrols."
- **Hint L2:** "Use events.sort() and a for-loop with if/else for each event type."
- **Hint L3:** Full solution

---

### 4.2 ROLE: Robot Constructor (ENGINEERING — NO CODE)

This role has NO programming. All tasks are engineering: design, physics, assembly, testing.

**Progression:**
- Easy (missions 1-3): Drag-and-drop assembly, simple choices
- Medium (missions 4-6): Physics calculations, parameter tuning, multi-system design
- Hard (missions 7-10): Complex engineering with multiple interacting systems

#### Mission 1 — "First Helper" (Easy)
- **Story:** Build a cargo robot for the construction site
- **Mechanic:** Drag-and-drop parts onto a blueprint: chassis → arms → wheels → motor → battery. Each part has weight and cost. Must stay within budget (80 coins) and weight limit (50 kg). After assembly → test: robot tries to lift a box.
- **Visual:** Workbench with tools, sparks on part installation, test on polygon
- **Success criteria:** Robot lifts the box without falling over
- **Scoring:** design (all slots filled correctly), physics (weight balanced), budget (under limit), testing (box lifted)
- **Parts available:** 3 chassis, 2 arm types, 3 wheel types, 2 motors, 2 batteries — each with stats
- **Hint L1:** "The robot needs a chassis, arms, wheels, motor, and battery. Start with the chassis."
- **Hint L2:** "Your robot is too heavy for this motor. Try a lighter chassis or stronger motor."
- **Onboarding:** "You are an engineer. Robots don't appear by themselves — they need to be designed and assembled from parts. Drag the chassis onto the blueprint..."

#### Mission 2 — "Wheels or Legs?" (Easy)
- **Story:** Robot works on rough terrain. Choose the right locomotion
- **Mechanic:** 3 chassis options (wheels / tracks / legs) — each with stats (speed, terrain handling, power consumption). Test on 3 surfaces: sand, rocks, stairs. Choose the best for the task requirement (must handle all 3).
- **Visual:** Test polygon with 3 surface zones, robot drives/gets stuck/falls
- **Success criteria:** Correct chassis choice that handles the required terrain
- **Scoring:** design (correct choice), physics (passes all surfaces), budget, testing
- **Hint L1:** "Each chassis type has strengths and weaknesses. Check which surfaces you need to cross."
- **Hint L2:** "Tracks handle sand and rocks but are slow on stairs. Legs handle stairs but are expensive."

#### Mission 3 — "Balance Master" (Easy)
- **Story:** Robot carries fragile solar panels across a narrow bridge
- **Mechanic:** Place cargo items on the robot to keep center of gravity centered. Visual balance indicator (like a spirit level). If CoG is off-center → robot tips over on the bridge.
- **Visual:** Bridge over a chasm, robot wobbles, balance indicator
- **Success criteria:** Robot crosses bridge without tipping
- **Scoring:** design (cargo placement), physics (CoG within tolerance), testing (crossed bridge)
- **Hint L1:** "Heavy items should be placed near the center. Distribute weight evenly left and right."
- **Hint L2:** Highlight the center-of-gravity indicator and show which side is heavier

#### Mission 4 — "Gear Ratio" (Medium)
- **Story:** Robot must climb a steep slope in a quarry with heavy load
- **Mechanic:** Choose gear ratio via sliders. Low ratio = fast but weak. High ratio = slow but strong. Calculator: `force = torque × gear_ratio`. Test: robot climbs hill with cargo. Too weak = slides back. Too fast = overheats.
- **Visual:** Gear mechanism cross-section with spinning gears, force/speed visualization
- **Success criteria:** Robot climbs slope with cargo
- **Scoring:** design (gear selection), physics (force > required), budget, testing
- **Hint L1:** "More gears = more force but less speed. The slope is steep and the load is heavy."
- **Hint L2:** "You need at least X Newtons of force. Current ratio gives you Y. Increase the ratio."

#### Mission 5 — "Robot Welder" (Medium)
- **Story:** Configure a welding arm for bridge construction
- **Mechanic:** Choose joint types (hinge/rotary/linear) for each arm segment. Set segment lengths. Check reach zone — arm must reach all weld points on blueprint. Visual reach zone overlay. Adjust speed and precision.
- **Visual:** Arm blueprint with reach zone overlay, welding test with sparks
- **Success criteria:** Arm reaches all weld points
- **Scoring:** design (joint selection), physics (reach covers all points), budget, testing (weld quality)
- **Hint L1:** "The arm needs to reach all blue dots on the blueprint. Adjust segment lengths."
- **Hint L2:** "A rotary joint at the base gives wider reach. Linear joints are more precise."

#### Mission 6 — "Power Budget" (Medium)
- **Story:** Robot must work 8 hours on a solar farm without recharging
- **Mechanic:** Energy budget. Each component has power draw (motor: 50W, sensor: 5W, arm: 80W). Battery capacity in Wh. Must satisfy: `total_consumption × 8 ≤ battery_capacity`. Can add solar panel on roof. Optimization puzzle.
- **Visual:** Energy consumption diagram, battery discharge simulation, hour counter
- **Success criteria:** Robot operates 8+ hours
- **Scoring:** design (component selection), physics (energy math correct), budget, testing (lasted 8h)
- **Hint L1:** "Add up the power consumption of all components. Multiply by 8 hours."
- **Hint L2:** "Total consumption: X watts. Need: X × 8 = Y Wh. Your battery: Z Wh. Need bigger battery or fewer components."

#### Mission 7 — "Underwater Explorer" (Hard)
- **Story:** Design an underwater robot for pipeline inspection
- **Mechanic:** Multi-system engineering:
  - Hull: choose shape and material (pressure = depth × density × g)
  - Buoyancy: robot mass vs displaced water volume (Archimedes' principle)
  - Thrusters: placement for maneuverability
  - Seals: choose gaskets for different pressure ratings
  Test: robot submerges. Wrong calculations = leaks/sinks/floats up.
- **Visual:** Underwater scene, bubbles, robot descends, pressure indicators
- **Success criteria:** Robot reaches target depth, inspects pipe section, returns
- **Scoring:** design (all systems), physics (calculations correct), budget, testing
- **Hint L1:** "The hull must withstand pressure at depth. Calculate: pressure = depth × 1000 × 9.8"
- **Hint L2:** "For buoyancy: robot weight must equal weight of displaced water. Adjust ballast."

#### Mission 8 — "Assembly Line" (Hard)
- **Story:** Design a 4-robot assembly line for solar panel production
- **Mechanic:** Place 4 robots on conveyor. Assign operations (cut/bend/weld/inspect). Set timing — robot 2 can't start until robot 1 finishes. Find bottleneck and optimize. Gantt chart shows timing.
- **Visual:** Conveyor with robots, Gantt chart, panels-per-hour counter
- **Success criteria:** Line produces 1+ panel per cycle without jams
- **Scoring:** design (robot placement), physics (timing), budget, testing (throughput)
- **Hint L1:** "Each robot needs enough time to finish before the next item arrives."
- **Hint L2:** "Robot 3 is the slowest (bottleneck). Speed it up or split its task."

#### Mission 9 — "Stress Test" (Hard)
- **Story:** Robot must survive extreme conditions — 55°C heat, sand, vibration
- **Mechanic:** Engineering analysis:
  - Thermal: electronics overheat? Need heatsink? What power?
  - Dust protection: IP rating selection, filters, seals
  - Vibration dampening: dampers for sensitive components
  Test chamber: robot undergoes stress, components fail if unprotected.
- **Visual:** Climate chamber, thermometer, sand indicator, vibration effect
- **Success criteria:** Robot survives all 3 stress tests
- **Scoring:** design (protection choices), physics (thermal calculations), budget, testing
- **Hint L1:** "Electronics fail above 70°C. The environment is 55°C. How much heat does the motor add?"
- **Hint L2:** "You need a heatsink that dissipates at least X watts. Current: Y watts. Add a bigger one."

#### Mission 10 — "Robot Factory" (Hard)
- **Story:** Final — design a complete robotic infrastructure for BRICS City
- **Mechanic:** System design:
  - Choose 5 robot types for the city (from catalog of 10, each with pros/cons)
  - Place charging stations (coverage calculation)
  - Design maintenance routes
  - Calculate total budget and ROI timeline
  City "comes alive" with robots.
- **Visual:** City map, robots moving, dashboard with metrics
- **Success criteria:** City serviced by robots at 60%+ coverage
- **Scoring:** design (robot selection), physics (coverage), budget (ROI), testing (simulation)
- **Hint L1:** "Different areas need different robots. Match robot capabilities to area requirements."
- **Hint L2:** "Charging stations must cover all robots. Each station serves robots within X meter radius."

---

### 4.3 ROLE: Tech Entrepreneur (MANAGEMENT — NO CODE)

This role has NO programming. All tasks are management: research, team building, strategy, finance.

**Progression:**
- Easy (missions 1-3): Simple choices, drag-and-drop, visual feedback
- Medium (missions 4-6): Multi-factor decisions, dashboards, time pressure
- Hard (missions 7-10): Complex strategy, data analysis, multi-country operations

#### Mission 1 — "The Idea" (Easy)
- **Story:** Find a startup idea. Survey BRICS City residents
- **Mechanic:** Click on NPC residents on city streets. Each describes a problem (speech bubble). Drag problem stickers to a board. Group by theme (drag to columns). Select the most common problem → that's your idea.
- **Visual:** City streets, NPCs with speech bubbles, sticky-note board
- **Success criteria:** Selected problem that 3+ NPCs mentioned
- **Scoring:** decisions (correct grouping + selection), completeness (NPCs surveyed), timing
- **NPCs:** 12 residents, 4 problem themes, 1 clear winner (mentioned by 4+ NPCs)
- **Hint L1:** "Talk to more people. Look for problems that multiple residents mention."
- **Hint L2:** "Group similar problems together. The biggest group is your best opportunity."
- **Onboarding:** "You are a tech entrepreneur. Good businesses start not with a product, but with a problem. Go out to the streets and find out what bothers people..."

#### Mission 2 — "Dream Team" (Easy)
- **Story:** Hire 3 team members for your startup. Budget limited.
- **Mechanic:** Candidate cards (name, skills, salary, personality). Must cover all functions: development, design, marketing. Some candidates conflict with each other. Stay within budget. After hiring → 1-month simulation: team works or fights.
- **Visual:** HR board with cards, office, team working/arguing
- **Success criteria:** Team covers all 3 functions, stays in budget, no unresolvable conflicts
- **Scoring:** decisions (role coverage), financials (budget), team (compatibility)
- **Candidates:** 8 candidates with different skill/cost/personality combos
- **Hint L1:** "Your team needs three skills: development, design, and marketing. Check each candidate's strengths."
- **Hint L2:** "Watch out for personality conflicts. Candidate A and Candidate D don't work well together."

#### Mission 3 — "MVP Launch" (Easy)
- **Story:** Build minimum product and get first 100 customers
- **Mechanic:** Choose 3 features from list of 10. Allocate team time between features (sliders). Launch → customer feedback (positive/negative). Too many features = not enough time. Too few = customers dissatisfied.
- **Visual:** Kanban board (To Do / In Progress / Done), launch timer, customer reviews
- **Success criteria:** Product launched, 50+ customers acquired
- **Scoring:** decisions (feature selection), financials (within budget), timing (launched on time)
- **Hint L1:** "MVP means Minimum Viable Product — the smallest thing that solves the core problem."
- **Hint L2:** "Focus on features that directly solve the problem from Mission 1. Nice-to-haves can wait."

#### Mission 4 — "Investor Pitch" (Medium)
- **Story:** Convince an investor in 5 minutes. Build your pitch deck.
- **Mechanic:** Drag slides into correct order (Problem → Solution → Market → Business Model → Team → Ask). Fill key numbers (market size, price, costs). Investor asks 5 questions — choose correct answers. Knowledge base explains: TAM/SAM/SOM, burn rate, runway.
- **Visual:** Conference room, screen with slides, investor with reactions (frowns/nods/smiles)
- **Success criteria:** Investor agrees to fund (correct slide order + 3/5 answers correct)
- **Scoring:** decisions (slide order + answers), financials (numbers make sense), timing
- **Hint L1:** "A good pitch tells a story: Problem → Solution → Why now → Business model → Ask."
- **Hint L2:** "The investor asked about market size. Check the Knowledge Base for TAM/SAM/SOM."

#### Mission 5 — "Price It Right" (Medium)
- **Story:** Set the right product price. Too high = no buyers. Too low = bankruptcy.
- **Mechanic:** Dashboard with sliders: product price, customer acquisition cost, conversion rate. Graphs update in real-time: revenue, customers, profit/loss. Find the sweet spot where profit is maximized.
- **Visual:** Interactive graphs, calculator, "green zone" indicator
- **Success criteria:** Business is profitable (revenue > costs)
- **Scoring:** decisions (pricing strategy), financials (profit margin), timing
- **Hint L1:** "If nobody buys at this price, it's too high. If you're losing money per sale, it's too low."
- **Hint L2:** "Unit economics: each customer should bring in more money (LTV) than it costs to acquire them (CAC)."

#### Mission 6 — "Crisis Mode" (Medium)
- **Story:** Competitor copied your product and sells cheaper. React!
- **Mechanic:** Series of decisions with 30-second timer each:
  - Lower price / Add unique features / Enter new market?
  - Cut team / Find new investor / Cut marketing?
  - Respond publicly / Ignore / Sue?
  Each decision affects 4 metrics: money, customers, team morale, reputation.
- **Visual:** Dashboard with red indicators, timer, metrics rise/fall after each decision
- **Success criteria:** Company survives (no metric reaches zero)
- **Scoring:** decisions (quality), financials (money > 0), team (morale > 0), timing (decisions made in time)
- **Hint L1:** "Focus on what makes your product unique. Price wars are rarely won by startups."
- **Hint L2:** "Team morale is dropping. If it hits zero, key employees will leave."

#### Mission 7 — "Go Global" (Hard)
- **Story:** Expand to BRICS countries. Each has its own rules.
- **Mechanic:** World map with 5 countries. For each:
  - Study market (cards: population, avg income, competitors)
  - Choose entry strategy (partner / subsidiary / franchise)
  - Adapt pricing for local market
  - Assign manager from pool (language skills, experience, cost)
  Results after 3 simulated "months" — success graphs per country.
- **Visual:** World map, flags, connection lines between offices, per-country graphs
- **Success criteria:** Successful entry in 2+ countries
- **Scoring:** decisions (strategy fit), financials (profitable in 2+), team (manager assignments)
- **Hint L1:** "Each country has different income levels. Your premium pricing won't work everywhere."
- **Hint L2:** "India has a huge market but lower income. Consider a different price point there."

#### Mission 8 — "Data-Driven" (Hard)
- **Story:** Analyze 10,000 customers to plan growth strategy
- **Mechanic:** Interactive BI dashboard (NO code):
  - Filter customers by country/plan/activity (checkboxes and sliders)
  - Build charts by dragging axes (drag "country" to X, "revenue" to Y)
  - Find insights: "Premium customers in India drive 80% of profit"
  - Allocate marketing budget based on findings
- **Visual:** BI dashboard (Tableau-like), charts build on the fly
- **Success criteria:** Identified the correct key segment (highest revenue segment)
- **Scoring:** decisions (correct insight), financials (budget allocation), timing
- **Hint L1:** "Try grouping customers by country AND plan type. Which combination brings the most revenue?"
- **Hint L2:** "Filter to show only Premium plan customers. Compare revenue across countries."

#### Mission 9 — "Exit Strategy" (Hard)
- **Story:** Corporation wants to buy your startup. Sell or keep growing?
- **Mechanic:** Financial calculator:
  - Fill 5-year forecast (revenue, costs, growth) via sliders
  - Compare NPV with buyer's offer
  - Deal terms: equity %, stay as CEO?, earn-out
  - Final decision: SELL / KEEP — choose 3 supporting arguments
  Different outcomes based on choice + justification quality.
- **Visual:** Negotiation room, two scenario screens (sell vs grow), NPV calculator
- **Success criteria:** Made a justified decision (any choice is valid if arguments match data)
- **Scoring:** decisions (argument quality), financials (math correct), timing
- **Hint L1:** "NPV = Net Present Value. It's what your future profits are worth today."
- **Hint L2:** "If the offer is higher than your NPV, selling might make sense. But consider non-financial factors too."

#### Mission 10 — "BRICS City Ecosystem" (Hard)
- **Story:** Final — build a startup ecosystem for the city
- **Mechanic:** Strategic map:
  - Place 6 startups on city map (choose from 12 candidates)
  - Create partnerships (drag connection lines)
  - Distribute support fund (budget) between startups
  - Assign mentors (each boosts specific startup skills)
  - Run 12-month simulation — watch ecosystem grow or collapse
- **Visual:** City map with startup icons, pulsing connection lines, city grows on success
- **Success criteria:** Ecosystem grows for 6+ months out of 12
- **Scoring:** decisions (startup selection + partnerships), financials (fund distribution), team (mentor matching)
- **Hint L1:** "Startups in related industries make better partners. Look for complementary capabilities."
- **Hint L2:** "Don't spread the fund equally. Invest more in startups with the highest growth potential."

---

### 4.4 COOPERATIVE MISSIONS (Async multiplayer)

Each player does their part in their own time. One player's output becomes input for the next.

#### Coop 1 — "Solar Farm" (Easy)
- **Drone Programmer:** Scan territory, find the best location (flattest area with most sun)
- **Robot Constructor:** Design installer robots based on terrain data from drone scan
- **Entrepreneur:** Calculate budget, choose panel supplier, set energy prices
- **Flow:** Drone scan data → Constructor uses terrain info → Entrepreneur gets cost/output data
- **Success criteria per role:** Same as solo missions but with shared data

#### Coop 2 — "The Bridge" (Medium)
- **Drone Programmer:** Aerial survey of gorge, create 3D map
- **Robot Constructor:** Design welding robots with reach zone matching bridge dimensions
- **Entrepreneur:** Material tender, logistics management, deadline tracking
- **Flow:** Drone map → Constructor designs for specific dimensions → Entrepreneur manages resources

#### Coop 3 — "Rescue Operation" (Medium)
- **Drone Programmer:** Find survivors with thermal scanner, provide coordinates
- **Robot Constructor:** Select rescue robot type for conditions (debris/water/fire)
- **Entrepreneur:** Coordinate resources, prioritize, handle media communication
- **Flow:** Drone coordinates → Constructor matches robot to conditions → Entrepreneur allocates resources

#### Coop 4 — "Smart District" (Hard)
- **Drone Programmer:** Traffic monitoring and security surveillance system
- **Robot Constructor:** Service robots (cleaning, repair, delivery)
- **Entrepreneur:** District budget management, KPIs, reporting
- **Flow:** Drone traffic data → Constructor designs service fleet → Entrepreneur manages operations

#### Coop 5 — "City Launch" (Hard)
- **Story:** Final — launch the entire BRICS City
- **All 3 roles** solve their domain challenges with interconnected data
- **Team score** = average of all 3 individual scores
- **Reward:** Special team badge + bonus XP

---

## 5. Database Schema Updates (Supabase)

```sql
-- Mission progress tracking
ALTER TABLE mission_progress ADD COLUMN stars INTEGER DEFAULT 0;
ALTER TABLE mission_progress ADD COLUMN best_score INTEGER DEFAULT 0;
ALTER TABLE mission_progress ADD COLUMN attempts INTEGER DEFAULT 0;
ALTER TABLE mission_progress ADD COLUMN hints_used INTEGER DEFAULT 0;
ALTER TABLE mission_progress ADD COLUMN first_clear_rewarded BOOLEAN DEFAULT FALSE;
ALTER TABLE mission_progress ADD COLUMN bonus_objective_visible BOOLEAN DEFAULT FALSE;
ALTER TABLE mission_progress ADD COLUMN bonus_objective_completed BOOLEAN DEFAULT FALSE;

-- Avatar skins
CREATE TABLE avatar_skins (
  id TEXT PRIMARY KEY,
  name_key TEXT NOT NULL,
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'secret')),
  unlock_condition TEXT NOT NULL,
  image_url TEXT NOT NULL
);

CREATE TABLE user_skins (
  user_id UUID REFERENCES profiles(id),
  skin_id TEXT REFERENCES avatar_skins(id),
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, skin_id)
);

ALTER TABLE profiles ADD COLUMN equipped_skin TEXT REFERENCES avatar_skins(id);
ALTER TABLE profiles ADD COLUMN equipped_frame TEXT;
ALTER TABLE profiles ADD COLUMN title_key TEXT;

-- Achievement tracking for block rewards
CREATE TABLE achievements (
  id TEXT PRIMARY KEY,
  name_key TEXT NOT NULL,
  description_key TEXT NOT NULL,
  condition_type TEXT NOT NULL,
  condition_value JSONB NOT NULL,
  reward_skin_id TEXT REFERENCES avatar_skins(id),
  reward_title_key TEXT
);

CREATE TABLE user_achievements (
  user_id UUID REFERENCES profiles(id),
  achievement_id TEXT REFERENCES achievements(id),
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);

-- Onboarding tracking
CREATE TABLE onboarding_status (
  user_id UUID REFERENCES profiles(id),
  role TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, role)
);

-- Independence meter (hints tracking)
ALTER TABLE profiles ADD COLUMN missions_without_hints INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN total_missions_completed INTEGER DEFAULT 0;
```

---

## 6. Increments

### Increment 1: Engine + 3 Pilot Missions
- PixiJS integration with Next.js (PixiCanvas, PixiStage)
- MissionShell (score, hints, result screen)
- Audio system (Howler.js, 1 menu track, 1 mission track, basic SFX)
- Drone Mission 1 "First Flight" (block editor + drone simulation)
- Robot Mission 1 "First Helper" (drag-and-drop assembly + test)
- Entrepreneur Mission 1 "The Idea" (NPC interaction + sticker board)
- Onboarding for each role
- Basic Knowledge Base (minimal content)
- Mobile responsive canvas
- Localization for pilot missions (4 languages)

### Increment 2: All Easy Missions (6 more)
- Drone Missions 2-3
- Robot Missions 2-3
- Entrepreneur Missions 2-3
- Block completion reward: Easy skins (3 role-themed skins)
- Knowledge Base content expansion

### Increment 3: All Medium Missions (9)
- Drone Missions 4-6 (code editor introduction)
- Robot Missions 4-6 (physics calculations)
- Entrepreneur Missions 4-6 (dashboards, timer)
- Block completion reward: Medium animated skins
- More SFX and mission-specific music variations

### Increment 4: All Hard Missions (12)
- Drone Missions 7-10 (Monaco Editor, full JS)
- Robot Missions 7-10 (complex multi-system engineering)
- Entrepreneur Missions 7-10 (BI dashboard, financial modeling)
- Block completion rewards: Epic skins + titles
- Legendary skins for full role completion
- Secret "BRICS City Founder" skin

### Increment 5: Coop + Polish
- 5 cooperative missions with async data flow
- Supabase realtime for coop data exchange
- Additional sound effects and music tracks
- Final localization pass (all 4 languages)
- Adaptive recommendations system
- Profile page updates (independence meter, skins, titles, frames)
- Final testing and mobile polish
```
