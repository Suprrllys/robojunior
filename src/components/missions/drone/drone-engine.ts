// drone-engine.ts — Drone program execution engine
// Processes block commands and returns step-by-step positions for animation

export type Direction = 'N' | 'S' | 'E' | 'W'

export interface Coord {
  x: number
  y: number
}

export interface DroneStep {
  position: Coord
  direction: Direction
  action: 'move' | 'turn' | 'takeoff' | 'land' | 'start'
}

export type CommandType = 'takeoff' | 'forward' | 'turnLeft' | 'turnRight' | 'land' | 'repeat'

export interface Command {
  id: string
  type: CommandType
  value?: number        // N for forward(N) and repeat(N)
  children?: Command[]  // nested commands inside repeat
}

const TURN_LEFT: Record<Direction, Direction> = { N: 'W', W: 'S', S: 'E', E: 'N' }
const TURN_RIGHT: Record<Direction, Direction> = { N: 'E', E: 'S', S: 'W', W: 'N' }
const MOVE_DELTA: Record<Direction, Coord> = {
  N: { x: 0, y: -1 },
  S: { x: 0, y: 1 },
  E: { x: 1, y: 0 },
  W: { x: -1, y: 0 },
}

/**
 * Expand repeat blocks into flat command list.
 * Handles nested repeats recursively.
 */
function expandCommands(commands: Command[]): Command[] {
  const result: Command[] = []
  for (const cmd of commands) {
    if (cmd.type === 'repeat') {
      const times = cmd.value ?? 2
      const inner = cmd.children ?? []
      for (let i = 0; i < times; i++) {
        result.push(...expandCommands(inner))
      }
    } else {
      result.push(cmd)
    }
  }
  return result
}

/**
 * Count total blocks including nested ones (for scoring).
 */
export function countBlocks(commands: Command[]): number {
  let count = 0
  for (const cmd of commands) {
    count += 1
    if (cmd.type === 'repeat' && cmd.children) {
      count += countBlocks(cmd.children)
    }
  }
  return count
}

/**
 * Check if program has redundant blocks (consecutive opposite turns, etc.)
 */
export function hasRedundantBlocks(commands: Command[]): boolean {
  const flat = expandCommands(commands)
  for (let i = 0; i < flat.length - 1; i++) {
    const a = flat[i].type
    const b = flat[i + 1].type
    // Opposite turns cancel out
    if ((a === 'turnLeft' && b === 'turnRight') || (a === 'turnRight' && b === 'turnLeft')) {
      return true
    }
    // Double takeoff or double land
    if ((a === 'takeoff' && b === 'takeoff') || (a === 'land' && b === 'land')) {
      return true
    }
  }
  return false
}

export interface ExecutionResult {
  steps: DroneStep[]
  success: boolean
  finalPosition: Coord
  finalDirection: Direction
  error?: string  // e.g. "off-grid"
}

/**
 * Execute a drone program and return step-by-step positions for animation.
 * Does NOT mutate inputs.
 */
export function executeDroneProgram(
  commands: Command[],
  gridSize: number,
  startPos: Coord,
  startDirection: Direction = 'N',
): ExecutionResult {
  const flat = expandCommands(commands)
  const steps: DroneStep[] = []
  let pos = { ...startPos }
  let dir = startDirection
  let airborne = false

  // Initial position
  steps.push({ position: { ...pos }, direction: dir, action: 'start' })

  for (const cmd of flat) {
    switch (cmd.type) {
      case 'takeoff': {
        airborne = true
        steps.push({ position: { ...pos }, direction: dir, action: 'takeoff' })
        break
      }

      case 'land': {
        airborne = false
        steps.push({ position: { ...pos }, direction: dir, action: 'land' })
        break
      }

      case 'turnLeft': {
        if (!airborne) {
          return { steps, success: false, finalPosition: pos, finalDirection: dir, error: 'not-airborne' }
        }
        dir = TURN_LEFT[dir]
        steps.push({ position: { ...pos }, direction: dir, action: 'turn' })
        break
      }

      case 'turnRight': {
        if (!airborne) {
          return { steps, success: false, finalPosition: pos, finalDirection: dir, error: 'not-airborne' }
        }
        dir = TURN_RIGHT[dir]
        steps.push({ position: { ...pos }, direction: dir, action: 'turn' })
        break
      }

      case 'forward': {
        if (!airborne) {
          return { steps, success: false, finalPosition: pos, finalDirection: dir, error: 'not-airborne' }
        }
        const moveCount = cmd.value ?? 1
        for (let i = 0; i < moveCount; i++) {
          const delta = MOVE_DELTA[dir]
          const newX = pos.x + delta.x
          const newY = pos.y + delta.y

          // Validate: can't go off grid
          if (newX < 0 || newX >= gridSize || newY < 0 || newY >= gridSize) {
            return {
              steps,
              success: false,
              finalPosition: pos,
              finalDirection: dir,
              error: 'off-grid',
            }
          }

          pos = { x: newX, y: newY }
          steps.push({ position: { ...pos }, direction: dir, action: 'move' })
        }
        break
      }

      // repeat is already expanded, but just in case
      default:
        break
    }
  }

  return {
    steps,
    success: true,
    finalPosition: pos,
    finalDirection: dir,
  }
}
