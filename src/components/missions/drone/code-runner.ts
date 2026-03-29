// code-runner.ts — Sandboxed code interpreter for drone missions 5-10
// Parses player JS-like code using regex/string matching.
// Extracts API calls and executes them step-by-step against a grid simulation.
// NEVER uses eval() or Function() — security critical.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DroneAPI {
  flyTo(x: number, y: number): void
  install(item: string): void
  forward(n: number): void
  turnLeft(): void
  turnRight(): void
  seeWall(direction: 'front' | 'left' | 'right'): boolean
  atExit(): boolean
}

export type APICall =
  | { type: 'flyTo'; args: [number, number]; droneIndex?: number }
  | { type: 'install'; args: [string]; droneIndex?: number }
  | { type: 'forward'; args: [number] }
  | { type: 'turnLeft'; args: [] }
  | { type: 'turnRight'; args: [] }
  | { type: 'seeWall'; args: ['front' | 'left' | 'right'] }
  | { type: 'atExit'; args: [] }

export interface ParseResult {
  success: boolean
  calls: APICall[]
  error?: string
  usedLoop: boolean
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

function trimComments(code: string): string {
  // Remove single-line comments
  return code
    .split('\n')
    .map(line => {
      const commentIdx = line.indexOf('//')
      if (commentIdx >= 0) return line.slice(0, commentIdx)
      return line
    })
    .join('\n')
}

function parseNumber(s: string): number | null {
  const trimmed = s.trim()
  const n = Number(trimmed)
  if (isNaN(n)) return null
  return n
}

function parseString(s: string): string | null {
  const trimmed = s.trim()
  // Match "string" or 'string'
  const match = trimmed.match(/^["'](.*)["']$/)
  if (match) return match[1]
  return null
}

// ---------------------------------------------------------------------------
// Mission 5: Parse swarm code (drones[i].flyTo / .install, for loops)
// ---------------------------------------------------------------------------

export function parseSwarmCode(code: string, droneCount: number): ParseResult {
  const cleaned = trimComments(code).trim()
  if (!cleaned) {
    return { success: false, calls: [], error: 'Empty program', usedLoop: false }
  }

  const calls: APICall[] = []
  let usedLoop = false

  try {
    // Check for for-loop pattern
    const forLoopMatch = cleaned.match(
      /for\s*\(\s*let\s+(\w+)\s*=\s*(\d+)\s*;\s*\1\s*<\s*(\d+)\s*;\s*\1\s*\+\+\s*\)\s*\{([\s\S]*?)\}/
    )

    if (forLoopMatch) {
      usedLoop = true
      const varName = forLoopMatch[1]
      const start = parseInt(forLoopMatch[2], 10)
      const end = parseInt(forLoopMatch[3], 10)
      const body = forLoopMatch[4]

      if (end > 100 || end - start > 100) {
        return { success: false, calls: [], error: 'Loop limit exceeded (max 100 iterations)', usedLoop: true }
      }

      for (let i = start; i < end; i++) {
        // Replace variable references with current value
        const expanded = body.replace(new RegExp(`\\b${varName}\\b`, 'g'), String(i))
        const bodyCalls = parseSwarmBodyCalls(expanded, droneCount)
        if (!bodyCalls.success) return bodyCalls
        calls.push(...bodyCalls.calls)
      }
    } else {
      // No loop — parse line-by-line
      const lines = cleaned.split(/[;\n]/).filter(l => l.trim())
      for (const line of lines) {
        const lineCalls = parseSwarmBodyCalls(line, droneCount)
        if (!lineCalls.success) return lineCalls
        calls.push(...lineCalls.calls)
      }
    }

    return { success: true, calls, usedLoop }
  } catch {
    return { success: false, calls: [], error: 'Syntax error in program', usedLoop: false }
  }
}

function parseSwarmBodyCalls(code: string, droneCount: number): ParseResult {
  const calls: APICall[] = []
  const lines = code.split(/[;\n]/).filter(l => l.trim())

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Match drones[N].flyTo(x, y) or drones[N].flyTo(targets[N])
    const flyToTargetsMatch = trimmed.match(
      /drones\[(\d+)\]\.flyTo\s*\(\s*targets\[(\d+)\]\s*\)/
    )
    if (flyToTargetsMatch) {
      const droneIdx = parseInt(flyToTargetsMatch[1], 10)
      const targetIdx = parseInt(flyToTargetsMatch[2], 10)
      if (droneIdx < 0 || droneIdx >= droneCount) {
        return { success: false, calls: [], error: `Invalid drone index: ${droneIdx}`, usedLoop: false }
      }
      // Use targetIdx as a marker — the mission component resolves actual coordinates
      calls.push({ type: 'flyTo', args: [-1, targetIdx], droneIndex: droneIdx })
      continue
    }

    const flyToMatch = trimmed.match(
      /drones\[(\d+)\]\.flyTo\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/
    )
    if (flyToMatch) {
      const droneIdx = parseInt(flyToMatch[1], 10)
      const x = parseInt(flyToMatch[2], 10)
      const y = parseInt(flyToMatch[3], 10)
      if (droneIdx < 0 || droneIdx >= droneCount) {
        return { success: false, calls: [], error: `Invalid drone index: ${droneIdx}`, usedLoop: false }
      }
      calls.push({ type: 'flyTo', args: [x, y], droneIndex: droneIdx })
      continue
    }

    // Match drones[N].install("item")
    const installMatch = trimmed.match(
      /drones\[(\d+)\]\.install\s*\(\s*["']([^"']+)["']\s*\)/
    )
    if (installMatch) {
      const droneIdx = parseInt(installMatch[1], 10)
      const item = installMatch[2]
      if (droneIdx < 0 || droneIdx >= droneCount) {
        return { success: false, calls: [], error: `Invalid drone index: ${droneIdx}`, usedLoop: false }
      }
      calls.push({ type: 'install', args: [item], droneIndex: droneIdx })
      continue
    }

    // Unknown line — skip empty/whitespace, error on real content
    if (trimmed.length > 0 && !trimmed.match(/^[\s{}]*$/)) {
      return { success: false, calls: [], error: `Unknown command: ${trimmed.slice(0, 50)}`, usedLoop: false }
    }
  }

  return { success: true, calls, usedLoop: false }
}

// ---------------------------------------------------------------------------
// Mission 6: Parse maze code (drone.forward, drone.turnLeft, etc.)
// Uses a simple while-loop interpreter with wall-following logic
// ---------------------------------------------------------------------------

export interface MazeState {
  x: number
  y: number
  dir: 'N' | 'E' | 'S' | 'W'
  wallHits: number
  steps: number
  atExit: boolean
  path: Array<{ x: number; y: number; dir: 'N' | 'E' | 'S' | 'W'; action: string }>
}

type Dir = 'N' | 'E' | 'S' | 'W'

const DIR_DELTA: Record<Dir, { dx: number; dy: number }> = {
  N: { dx: 0, dy: -1 },
  E: { dx: 1, dy: 0 },
  S: { dx: 0, dy: 1 },
  W: { dx: -1, dy: 0 },
}

const TURN_LEFT_MAP: Record<Dir, Dir> = { N: 'W', W: 'S', S: 'E', E: 'N' }
const TURN_RIGHT_MAP: Record<Dir, Dir> = { N: 'E', E: 'S', S: 'W', W: 'N' }

function getFrontDir(dir: Dir): Dir { return dir }
function getLeftDir(dir: Dir): Dir { return TURN_LEFT_MAP[dir] }
function getRightDir(dir: Dir): Dir { return TURN_RIGHT_MAP[dir] }

function isWall(
  x: number, y: number, checkDir: Dir,
  walls: Set<string>, gridSize: number,
): boolean {
  const delta = DIR_DELTA[checkDir]
  const nx = x + delta.dx
  const ny = y + delta.dy
  if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) return true
  return walls.has(`${nx},${ny}`)
}

export function executeMazeCode(
  code: string,
  walls: Set<string>,
  gridSize: number,
  startX: number,
  startY: number,
  startDir: Dir,
  exitX: number,
  exitY: number,
): { success: boolean; state: MazeState; error?: string } {
  const cleaned = trimComments(code).trim()
  if (!cleaned) {
    return {
      success: false,
      state: { x: startX, y: startY, dir: startDir, wallHits: 0, steps: 0, atExit: false, path: [] },
      error: 'Empty program',
    }
  }

  const state: MazeState = {
    x: startX,
    y: startY,
    dir: startDir,
    wallHits: 0,
    steps: 0,
    atExit: false,
    path: [{ x: startX, y: startY, dir: startDir, action: 'start' }],
  }

  const MAX_STEPS = 500 // safety limit

  // Check for while loop pattern
  const whileMatch = cleaned.match(
    /while\s*\(\s*!?\s*drone\.atExit\s*\(\s*\)\s*\)\s*\{([\s\S]*?)\}/
  )

  if (whileMatch) {
    const body = whileMatch[1]
    const statements = parseBodyStatements(body)
    if (!statements.success) {
      return { success: false, state, error: statements.error }
    }

    // Execute while loop
    if (statements.stmts.length === 0) {
      return { success: false, state, error: 'Empty loop body. Add commands inside the while loop.' }
    }
    let loopIterations = 0
    while (!state.atExit && state.steps < MAX_STEPS) {
      loopIterations++
      if (loopIterations > MAX_STEPS) break
      for (const stmt of statements.stmts) {
        if (state.atExit) break
        executeStatement(stmt, state, walls, gridSize, exitX, exitY)
        if (state.steps >= MAX_STEPS) break
      }
    }

    if (state.steps >= MAX_STEPS) {
      return { success: false, state, error: 'Program exceeded step limit (500). Check for infinite loops.' }
    }
  } else {
    // No while loop — parse sequential statements
    const statements = parseBodyStatements(cleaned)
    if (!statements.success) {
      return { success: false, state, error: statements.error }
    }

    for (const stmt of statements.stmts) {
      executeStatement(stmt, state, walls, gridSize, exitX, exitY)
      if (state.steps >= MAX_STEPS) {
        return { success: false, state, error: 'Too many steps. Optimize your program.' }
      }
    }
  }

  return { success: true, state }
}

// ---------------------------------------------------------------------------
// Statement types for maze
// ---------------------------------------------------------------------------

type MazeStatement =
  | { type: 'forward'; n: number }
  | { type: 'turnLeft' }
  | { type: 'turnRight' }
  | { type: 'if'; condition: 'wall_front' | 'wall_left' | 'wall_right' | 'no_wall_front' | 'no_wall_left' | 'no_wall_right'; body: MazeStatement[]; elseBody?: MazeStatement[] }

function parseBodyStatements(body: string): { success: boolean; stmts: MazeStatement[]; error?: string } {
  const stmts: MazeStatement[] = []
  let remaining = body.trim()

  while (remaining.length > 0) {
    remaining = remaining.trim()
    if (!remaining) break

    // Skip semicolons and braces
    if (remaining[0] === ';' || remaining[0] === '{' || remaining[0] === '}') {
      remaining = remaining.slice(1)
      continue
    }

    // drone.forward(N)
    const fwdMatch = remaining.match(/^drone\.forward\s*\(\s*(\d+)\s*\)/)
    if (fwdMatch) {
      stmts.push({ type: 'forward', n: parseInt(fwdMatch[1], 10) })
      remaining = remaining.slice(fwdMatch[0].length)
      continue
    }

    // drone.turnLeft()
    const tlMatch = remaining.match(/^drone\.turnLeft\s*\(\s*\)/)
    if (tlMatch) {
      stmts.push({ type: 'turnLeft' })
      remaining = remaining.slice(tlMatch[0].length)
      continue
    }

    // drone.turnRight()
    const trMatch = remaining.match(/^drone\.turnRight\s*\(\s*\)/)
    if (trMatch) {
      stmts.push({ type: 'turnRight' })
      remaining = remaining.slice(trMatch[0].length)
      continue
    }

    // if (drone.seeWall("front")) { ... } else { ... }
    // if (!drone.seeWall("front")) { ... }
    const ifMatch = remaining.match(
      /^if\s*\(\s*(!?)\s*drone\.seeWall\s*\(\s*["'](front|left|right)["']\s*\)\s*\)\s*\{/
    )
    if (ifMatch) {
      const negated = ifMatch[1] === '!'
      const wallDir = ifMatch[2] as 'front' | 'left' | 'right'
      const condKey = negated ? `no_wall_${wallDir}` : `wall_${wallDir}`
      remaining = remaining.slice(ifMatch[0].length)

      // Find matching closing brace
      const bodyEnd = findMatchingBrace(remaining)
      if (bodyEnd === -1) {
        return { success: false, stmts: [], error: 'Missing closing brace in if-block' }
      }

      const ifBody = remaining.slice(0, bodyEnd)
      remaining = remaining.slice(bodyEnd + 1).trim()

      const parsedBody = parseBodyStatements(ifBody)
      if (!parsedBody.success) return parsedBody

      // Check for else
      let elseBody: MazeStatement[] | undefined
      const elseMatch = remaining.match(/^else\s*\{/)
      if (elseMatch) {
        remaining = remaining.slice(elseMatch[0].length)
        const elseEnd = findMatchingBrace(remaining)
        if (elseEnd === -1) {
          return { success: false, stmts: [], error: 'Missing closing brace in else-block' }
        }
        const elseContent = remaining.slice(0, elseEnd)
        remaining = remaining.slice(elseEnd + 1).trim()
        const parsedElse = parseBodyStatements(elseContent)
        if (!parsedElse.success) return parsedElse
        elseBody = parsedElse.stmts
      }

      stmts.push({
        type: 'if',
        condition: condKey as MazeStatement extends { type: 'if' } ? MazeStatement['condition'] : never,
        body: parsedBody.stmts,
        elseBody,
      })
      continue
    }

    // Skip whitespace, newlines
    const wsMatch = remaining.match(/^[\s;]+/)
    if (wsMatch) {
      remaining = remaining.slice(wsMatch[0].length)
      continue
    }

    // Unknown token
    const snippet = remaining.slice(0, 40)
    return { success: false, stmts: [], error: `Unknown command near: "${snippet}"` }
  }

  return { success: true, stmts }
}

function findMatchingBrace(s: string): number {
  let depth = 0
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '{') depth++
    if (s[i] === '}') {
      if (depth === 0) return i
      depth--
    }
  }
  return -1
}

function executeStatement(
  stmt: MazeStatement,
  state: MazeState,
  walls: Set<string>,
  gridSize: number,
  exitX: number,
  exitY: number,
) {
  switch (stmt.type) {
    case 'forward': {
      for (let i = 0; i < stmt.n; i++) {
        const delta = DIR_DELTA[state.dir]
        const nx = state.x + delta.dx
        const ny = state.y + delta.dy

        if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize || walls.has(`${nx},${ny}`)) {
          state.wallHits++
          state.steps++
          state.path.push({ x: state.x, y: state.y, dir: state.dir, action: 'wall_hit' })
        } else {
          state.x = nx
          state.y = ny
          state.steps++
          state.path.push({ x: nx, y: ny, dir: state.dir, action: 'move' })
        }

        if (state.x === exitX && state.y === exitY) {
          state.atExit = true
          return
        }
      }
      break
    }
    case 'turnLeft': {
      state.dir = TURN_LEFT_MAP[state.dir]
      state.steps++
      state.path.push({ x: state.x, y: state.y, dir: state.dir, action: 'turn' })
      break
    }
    case 'turnRight': {
      state.dir = TURN_RIGHT_MAP[state.dir]
      state.steps++
      state.path.push({ x: state.x, y: state.y, dir: state.dir, action: 'turn' })
      break
    }
    case 'if': {
      const conditionMet = evaluateCondition(stmt.condition, state, walls, gridSize)
      if (conditionMet) {
        for (const s of stmt.body) {
          executeStatement(s, state, walls, gridSize, exitX, exitY)
          if (state.atExit) return
        }
      } else if (stmt.elseBody) {
        for (const s of stmt.elseBody) {
          executeStatement(s, state, walls, gridSize, exitX, exitY)
          if (state.atExit) return
        }
      }
      break
    }
  }
}

function evaluateCondition(
  condition: string,
  state: MazeState,
  walls: Set<string>,
  gridSize: number,
): boolean {
  switch (condition) {
    case 'wall_front': return isWall(state.x, state.y, getFrontDir(state.dir), walls, gridSize)
    case 'wall_left': return isWall(state.x, state.y, getLeftDir(state.dir), walls, gridSize)
    case 'wall_right': return isWall(state.x, state.y, getRightDir(state.dir), walls, gridSize)
    case 'no_wall_front': return !isWall(state.x, state.y, getFrontDir(state.dir), walls, gridSize)
    case 'no_wall_left': return !isWall(state.x, state.y, getLeftDir(state.dir), walls, gridSize)
    case 'no_wall_right': return !isWall(state.x, state.y, getRightDir(state.dir), walls, gridSize)
    default: return false
  }
}

// ---------------------------------------------------------------------------
// Mission 7: Search & Rescue
// API: drone.flyTo(x,y), drone.scanHeat(), drone.dropMarker("red"),
//      drone.sendReport(count)
// ---------------------------------------------------------------------------

export interface SearchRescueState {
  droneX: number
  droneY: number
  cellsScanned: number
  survivorsFound: number
  usedLoop: boolean
  usedNestedLoops: boolean
  actions: Array<
    | { type: 'flyTo'; x: number; y: number }
    | { type: 'scan'; x: number; y: number; heat: number }
    | { type: 'marker'; x: number; y: number }
    | { type: 'found'; x: number; y: number }
  >
}

export function executeSearchRescueCode(
  code: string,
  debris: Set<string>,
  survivors: Array<{ x: number; y: number }>,
  gridSize: number,
): { success: boolean; state: SearchRescueState; error?: string } {
  const cleaned = trimComments(code).trim()
  const state: SearchRescueState = {
    droneX: 0, droneY: 0,
    cellsScanned: 0, survivorsFound: 0,
    usedLoop: false, usedNestedLoops: false,
    actions: [],
  }

  if (!cleaned) {
    return { success: false, state, error: 'Empty program' }
  }

  // Detect loops for scoring
  const hasForLoop = /for\s*\(/.test(cleaned)
  const hasWhileLoop = /while\s*\(/.test(cleaned)
  state.usedLoop = hasForLoop || hasWhileLoop
  // Nested = two for loops (one inside another) or for inside while etc.
  const forCount = (cleaned.match(/for\s*\(/g) ?? []).length
  const whileCount = (cleaned.match(/while\s*\(/g) ?? []).length
  state.usedNestedLoops = (forCount + whileCount) >= 2

  const MAX_ACTIONS = 500
  const scannedSet = new Set<string>()
  const foundSet = new Set<string>()
  const markerSet = new Set<string>()

  // Helper: compute heat at a given cell
  function getHeat(x: number, y: number): number {
    // Exact survivor location = 100
    if (survivors.some(s => s.x === x && s.y === y)) return 100
    // Adjacent to survivor = 50-80
    for (const s of survivors) {
      const dist = Math.abs(s.x - x) + Math.abs(s.y - y)
      if (dist === 1) return 70 + Math.floor(Math.random() * 11) // 70-80
      if (dist === 2) return 50 + Math.floor(Math.random() * 11) // 50-60
    }
    return Math.floor(Math.random() * 20) // 0-19
  }

  // Extract sequential API calls from the code
  // Support nested for loops: for (let y = A; y < B; y++) { for (let x = C; x < D; x++) { ... } }
  try {
    // Try to detect nested for-loop pattern
    const nestedForMatch = cleaned.match(
      /for\s*\(\s*let\s+(\w+)\s*=\s*(\d+)\s*;\s*\1\s*<\s*(\d+)\s*;\s*\1\s*\+\+\s*\)\s*\{([\s\S]*?for\s*\(\s*let\s+(\w+)\s*=\s*(\d+)\s*;\s*\5\s*<\s*(\d+)\s*;\s*\5\s*\+\+\s*\)\s*\{([\s\S]*?)\}\s*[\s\S]*?)\}/
    )

    // Single for-loop pattern
    const singleForMatch = !nestedForMatch ? cleaned.match(
      /for\s*\(\s*let\s+(\w+)\s*=\s*(\d+)\s*;\s*\1\s*<\s*(\d+)\s*;\s*\1\s*\+\+\s*\)\s*\{([\s\S]*?)\}/
    ) : null

    // Collect statements to execute, expanding loops into iterations
    interface SimpleCall {
      method: string
      args: string[]
    }

    const expandBody = (body: string, varName: string, value: number): string => {
      return body.replace(new RegExp(`\\b${varName}\\b`, 'g'), String(value))
    }

    const extractCalls = (text: string): SimpleCall[] => {
      const calls: SimpleCall[] = []
      const lines = text.split(/[;\n]/).filter(l => l.trim())
      for (const line of lines) {
        const t = line.trim()
        if (!t || /^[\s{}]*$/.test(t)) continue
        // drone.flyTo(x, y)
        const flyMatch = t.match(/drone\.flyTo\s*\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/)
        if (flyMatch) { calls.push({ method: 'flyTo', args: [flyMatch[1], flyMatch[2]] }); continue }
        // drone.scanHeat()
        if (/drone\.scanHeat\s*\(\s*\)/.test(t)) { calls.push({ method: 'scanHeat', args: [] }); continue }
        // drone.dropMarker("red")
        if (/drone\.dropMarker\s*\(/.test(t)) { calls.push({ method: 'dropMarker', args: [] }); continue }
        // drone.sendReport(N)
        const reportMatch = t.match(/drone\.sendReport\s*\(\s*(\d+)\s*\)/)
        if (reportMatch) { calls.push({ method: 'sendReport', args: [reportMatch[1]] }); continue }
        // Variable declarations like let heat = drone.scanHeat()
        if (/let\s+\w+\s*=\s*drone\.scanHeat\s*\(\s*\)/.test(t)) { calls.push({ method: 'scanHeat', args: [] }); continue }
        // if (heat >= N || heat === 100 || drone.scanHeat() >= N) { drone.dropMarker("red") }
        // Handle simple inline if-conditions related to heat
        const ifHeatMatch = t.match(/if\s*\(/)
        if (ifHeatMatch) {
          // Extract the condition part and body
          const afterIf = t.slice(t.indexOf('('))
          const braceIdx = afterIf.indexOf('{')
          if (braceIdx >= 0) {
            const bodyPart = afterIf.slice(braceIdx + 1)
            const closeBrace = bodyPart.lastIndexOf('}')
            const ifBody = closeBrace >= 0 ? bodyPart.slice(0, closeBrace) : bodyPart
            const innerCalls = extractCalls(ifBody)
            // For if-conditions, we'll need to evaluate at runtime
            // For simplicity, mark as conditional calls
            calls.push({ method: 'if_heat_check', args: [afterIf.slice(1, braceIdx).replace(/\)$/, '')] })
            calls.push(...innerCalls)
            calls.push({ method: 'end_if', args: [] })
            continue
          }
        }
        // Skip let declarations, variable assignments without API
        if (/^(let|const|var)\s/.test(t)) continue
        // Skip unknown — don't error on every line
      }
      return calls
    }

    let allCalls: SimpleCall[] = []

    if (nestedForMatch) {
      const outerVar = nestedForMatch[1]
      const outerStart = parseInt(nestedForMatch[2], 10)
      const outerEnd = parseInt(nestedForMatch[3], 10)
      const outerBody = nestedForMatch[4]
      const innerVar = nestedForMatch[5]
      const innerStart = parseInt(nestedForMatch[6], 10)
      const innerEnd = parseInt(nestedForMatch[7], 10)
      const innerBody = nestedForMatch[8]

      if (outerEnd - outerStart > 100 || innerEnd - innerStart > 100) {
        return { success: false, state, error: 'Loop limit exceeded (max 100 iterations per loop)' }
      }

      // Get code before and after the inner loop in the outer body
      const innerLoopFull = outerBody.match(
        /for\s*\(\s*let\s+\w+\s*=\s*\d+\s*;\s*\w+\s*<\s*\d+\s*;\s*\w+\s*\+\+\s*\)\s*\{[\s\S]*?\}/
      )
      const beforeInner = innerLoopFull ? outerBody.slice(0, outerBody.indexOf(innerLoopFull[0])) : ''
      const afterInner = innerLoopFull ? outerBody.slice(outerBody.indexOf(innerLoopFull[0]) + innerLoopFull[0].length) : ''

      for (let ov = outerStart; ov < outerEnd; ov++) {
        // Code before inner loop
        if (beforeInner.trim()) {
          const expanded = expandBody(beforeInner, outerVar, ov)
          allCalls.push(...extractCalls(expanded))
        }

        for (let iv = innerStart; iv < innerEnd; iv++) {
          let expanded = expandBody(innerBody, outerVar, ov)
          expanded = expandBody(expanded, innerVar, iv)
          allCalls.push(...extractCalls(expanded))
        }

        // Code after inner loop
        if (afterInner.trim()) {
          const expanded = expandBody(afterInner, outerVar, ov)
          allCalls.push(...extractCalls(expanded))
        }
      }
    } else if (singleForMatch) {
      const varName = singleForMatch[1]
      const start = parseInt(singleForMatch[2], 10)
      const end = parseInt(singleForMatch[3], 10)
      const body = singleForMatch[4]

      if (end - start > 100) {
        return { success: false, state, error: 'Loop limit exceeded (max 100 iterations)' }
      }

      for (let i = start; i < end; i++) {
        const expanded = expandBody(body, varName, i)
        allCalls.push(...extractCalls(expanded))
      }
    } else {
      allCalls = extractCalls(cleaned)
    }

    // Execute the calls
    let lastHeat = 0
    let inConditional = false
    let conditionMet = false

    for (const call of allCalls) {
      if (state.actions.length >= MAX_ACTIONS) {
        return { success: false, state, error: 'Program exceeded action limit (500).' }
      }

      if (call.method === 'if_heat_check') {
        inConditional = true
        // Evaluate: check if lastHeat meets condition
        const cond = call.args[0]
        if (/>=\s*80/.test(cond) || /===?\s*100/.test(cond)) {
          conditionMet = lastHeat >= 80
        } else if (/>=\s*50/.test(cond)) {
          conditionMet = lastHeat >= 50
        } else if (/>=\s*70/.test(cond)) {
          conditionMet = lastHeat >= 70
        } else if (/>\s*0/.test(cond) || />=\s*1/.test(cond)) {
          conditionMet = lastHeat > 0
        } else {
          conditionMet = lastHeat >= 50 // default threshold
        }
        continue
      }

      if (call.method === 'end_if') {
        inConditional = false
        conditionMet = false
        continue
      }

      // If inside a conditional block and condition not met, skip
      if (inConditional && !conditionMet) continue

      switch (call.method) {
        case 'flyTo': {
          const x = parseInt(call.args[0], 10)
          const y = parseInt(call.args[1], 10)
          if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) {
            return { success: false, state, error: `flyTo(${x}, ${y}) is out of bounds` }
          }
          if (debris.has(`${x},${y}`)) {
            // Debris — drone can't land, skip but don't error
            continue
          }
          state.droneX = x
          state.droneY = y
          state.actions.push({ type: 'flyTo', x, y })
          break
        }
        case 'scanHeat': {
          const heat = getHeat(state.droneX, state.droneY)
          lastHeat = heat
          const key = `${state.droneX},${state.droneY}`
          if (!scannedSet.has(key)) {
            scannedSet.add(key)
            state.cellsScanned++
          }
          state.actions.push({ type: 'scan', x: state.droneX, y: state.droneY, heat })

          // Auto-detect survivor if heat = 100
          if (heat === 100 && !foundSet.has(key)) {
            foundSet.add(key)
            state.survivorsFound++
            state.actions.push({ type: 'found', x: state.droneX, y: state.droneY })
          }
          break
        }
        case 'dropMarker': {
          const key = `${state.droneX},${state.droneY}`
          if (!markerSet.has(key)) {
            markerSet.add(key)
            state.actions.push({ type: 'marker', x: state.droneX, y: state.droneY })
          }
          break
        }
        case 'sendReport': {
          // Report is informational, doesn't change state
          break
        }
      }
    }

    return { success: true, state }
  } catch {
    return { success: false, state, error: 'Syntax error in program' }
  }
}

// ---------------------------------------------------------------------------
// Mission 8: Blind Navigation
// API: drone.camera.scan(), drone.angleTo(landmark), drone.rotate(angle),
//      drone.forward(n), drone.atDestination(), drone.getHeading(),
//      drone.distanceTo(landmark)
// ---------------------------------------------------------------------------

export interface BlindNavState {
  droneX: number
  droneY: number
  heading: number // degrees, 0 = East (right), 90 = South
  reachedTarget: boolean
  totalDist: number
  usedLoop: boolean
  usedFunctions: boolean
  actions: Array<
    | { type: 'move'; x: number; y: number }
    | { type: 'rotate'; angle: number }
    | { type: 'scan'; landmarks: string[] }
  >
}

export function executeBlindNavCode(
  code: string,
  landmarks: Array<{ id: string; x: number; y: number }>,
  target: { x: number; y: number },
  start: { x: number; y: number },
  gridSize: number,
): { success: boolean; state: BlindNavState; error?: string } {
  const cleaned = trimComments(code).trim()
  const state: BlindNavState = {
    droneX: start.x, droneY: start.y,
    heading: 0,
    reachedTarget: false,
    totalDist: 0,
    usedLoop: /for\s*\(|while\s*\(/.test(cleaned),
    usedFunctions: /function\s+\w+/.test(cleaned),
    actions: [],
  }

  if (!cleaned) {
    return { success: false, state, error: 'Empty program' }
  }

  const MAX_ACTIONS = 500

  // For this mission, parse line-by-line with simple variable support
  // Support: let var = drone.X(), drone.forward(N), drone.rotate(N),
  //          simple while (!drone.atDestination()) loops
  try {
    // Detect while loop
    const whileMatch = cleaned.match(
      /while\s*\(\s*!?\s*drone\.atDestination\s*\(\s*\)\s*\)\s*\{([\s\S]*?)\}/
    )

    interface NavCall {
      method: string
      args: string[]
    }

    const extractNavCalls = (text: string): NavCall[] => {
      const calls: NavCall[] = []
      const lines = text.split(/[;\n]/).filter(l => l.trim())
      for (const line of lines) {
        const t = line.trim()
        if (!t || /^[\s{}]*$/.test(t)) continue
        // drone.camera.scan()
        if (/drone\.camera\.scan\s*\(\s*\)/.test(t)) { calls.push({ method: 'cameraScan', args: [] }); continue }
        // drone.angleTo(landmark) or let x = drone.angleTo(...)
        const angleMatch = t.match(/drone\.angleTo\s*\(\s*["']?(\w+)["']?\s*\)/)
        if (angleMatch) { calls.push({ method: 'angleTo', args: [angleMatch[1]] }); continue }
        // drone.distanceTo(landmark)
        const distMatch = t.match(/drone\.distanceTo\s*\(\s*["']?(\w+)["']?\s*\)/)
        if (distMatch) { calls.push({ method: 'distanceTo', args: [distMatch[1]] }); continue }
        // drone.rotate(N)
        const rotMatch = t.match(/drone\.rotate\s*\(\s*(-?\d+(?:\.\d+)?)\s*\)/)
        if (rotMatch) { calls.push({ method: 'rotate', args: [rotMatch[1]] }); continue }
        // drone.forward(N)
        const fwdMatch = t.match(/drone\.forward\s*\(\s*(\d+(?:\.\d+)?)\s*\)/)
        if (fwdMatch) { calls.push({ method: 'forward', args: [fwdMatch[1]] }); continue }
        // drone.getHeading()
        if (/drone\.getHeading\s*\(\s*\)/.test(t)) { calls.push({ method: 'getHeading', args: [] }); continue }
        // drone.atDestination() — used in conditions mostly
        if (/drone\.atDestination\s*\(\s*\)/.test(t)) { calls.push({ method: 'atDestination', args: [] }); continue }
        // skip let/const/var, if statements (simplified)
        if (/^(let|const|var)\s/.test(t)) continue
      }
      return calls
    }

    const executeNavCall = (call: NavCall): void => {
      if (state.actions.length >= MAX_ACTIONS || state.reachedTarget) return

      switch (call.method) {
        case 'cameraScan': {
          // Return landmarks within 5 cells
          const visible = landmarks.filter(lm => {
            const dist = Math.sqrt((lm.x - state.droneX) ** 2 + (lm.y - state.droneY) ** 2)
            return dist <= 5
          })
          state.actions.push({ type: 'scan', landmarks: visible.map(l => l.id) })
          break
        }
        case 'angleTo': {
          // Compute angle to landmark (doesn't generate action, just data)
          const lm = landmarks.find(l => l.id === call.args[0])
          if (lm) {
            const angle = Math.atan2(lm.y - state.droneY, lm.x - state.droneX) * 180 / Math.PI
            // Store as last computed angle for rotate commands
            state.heading = angle
            state.actions.push({ type: 'rotate', angle })
          }
          break
        }
        case 'rotate': {
          const angle = parseFloat(call.args[0])
          state.heading = (state.heading + angle) % 360
          if (state.heading < 0) state.heading += 360
          state.actions.push({ type: 'rotate', angle: state.heading })
          break
        }
        case 'forward': {
          const n = Math.min(parseInt(call.args[0], 10), 15)
          const rad = state.heading * Math.PI / 180
          const nx = Math.round(state.droneX + Math.cos(rad) * n)
          const ny = Math.round(state.droneY + Math.sin(rad) * n)
          const clampedX = Math.max(0, Math.min(gridSize - 1, nx))
          const clampedY = Math.max(0, Math.min(gridSize - 1, ny))
          const dist = Math.sqrt((clampedX - state.droneX) ** 2 + (clampedY - state.droneY) ** 2)
          state.totalDist += dist
          state.droneX = clampedX
          state.droneY = clampedY
          state.actions.push({ type: 'move', x: clampedX, y: clampedY })
          // Check destination
          if (state.droneX === target.x && state.droneY === target.y) {
            state.reachedTarget = true
          }
          break
        }
        case 'atDestination': {
          if (state.droneX === target.x && state.droneY === target.y) {
            state.reachedTarget = true
          }
          break
        }
      }
    }

    if (whileMatch) {
      const body = whileMatch[1]
      const calls = extractNavCalls(body)
      let iterations = 0
      while (!state.reachedTarget && iterations < 200 && state.actions.length < MAX_ACTIONS) {
        for (const call of calls) {
          executeNavCall(call)
          if (state.reachedTarget) break
        }
        iterations++
      }
    } else {
      const calls = extractNavCalls(cleaned)
      for (const call of calls) {
        executeNavCall(call)
        if (state.reachedTarget) break
      }
    }

    // For a simple approach: if code just does flyTo-style movements toward target,
    // check direct navigation commands
    // drone.flyTo is also supported as a shortcut
    const flyToMatch = cleaned.match(/drone\.flyTo\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/g)
    if (flyToMatch && !state.reachedTarget) {
      for (const m of flyToMatch) {
        const coords = m.match(/(\d+)\s*,\s*(\d+)/)
        if (coords) {
          const x = parseInt(coords[1], 10)
          const y = parseInt(coords[2], 10)
          if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
            const dist = Math.sqrt((x - state.droneX) ** 2 + (y - state.droneY) ** 2)
            state.totalDist += dist
            state.droneX = x
            state.droneY = y
            state.actions.push({ type: 'move', x, y })
            if (x === target.x && y === target.y) {
              state.reachedTarget = true
              break
            }
          }
        }
      }
    }

    return { success: true, state }
  } catch {
    return { success: false, state, error: 'Syntax error in program' }
  }
}

// ---------------------------------------------------------------------------
// Mission 9: Air Convoy
// API: fleet[i].flyTo(x,y), fleet[i].grab(), fleet[i].drop(),
//      fleet.filter(fn), fleet.sort(fn), distance(a, b)
// ---------------------------------------------------------------------------

export interface ConvoyState {
  deliveredCount: number
  totalDistance: number
  usedFilter: boolean
  usedSort: boolean
  actions: Array<
    | { type: 'flyTo'; droneIndex: number; x: number; y: number }
    | { type: 'grab'; droneIndex: number; orderIndex: number }
    | { type: 'drop'; droneIndex: number; orderIndex: number }
  >
}

export function executeConvoyCode(
  code: string,
  drones: Array<{ x: number; y: number }>,
  orders: Array<{ pickup: { x: number; y: number }; dropoff: { x: number; y: number } }>,
  gridSize: number,
): { success: boolean; state: ConvoyState; error?: string } {
  const cleaned = trimComments(code).trim()
  const state: ConvoyState = {
    deliveredCount: 0,
    totalDistance: 0,
    usedFilter: /\.filter\s*\(/.test(cleaned),
    usedSort: /\.sort\s*\(/.test(cleaned),
    actions: [],
  }

  if (!cleaned) {
    return { success: false, state, error: 'Empty program' }
  }

  const MAX_ACTIONS = 500

  // Track drone positions and states
  const droneStates = drones.map((d, i) => ({
    id: i, x: d.x, y: d.y, carrying: -1, busy: false,
  }))

  const orderStates = orders.map((o, i) => ({
    id: i, ...o, delivered: false, pickedUp: false,
  }))

  try {
    // Parse the code looking for fleet[N].flyTo(), fleet[N].grab(), fleet[N].drop()
    // Also support: for (let i = 0; i < N; i++) { ... } with orders[i] references

    // Check for for-loop
    const forMatch = cleaned.match(
      /for\s*\(\s*let\s+(\w+)\s*=\s*(\d+)\s*;\s*\1\s*<\s*(\d+)\s*;\s*\1\s*\+\+\s*\)\s*\{([\s\S]*?)\}/
    )

    interface ConvoyCall {
      method: string
      droneRef: string // 'fleet[0]', 'fleet[i]', 'd', 'closest', etc.
      args: string[]
      orderRef?: string
    }

    const extractConvoyCalls = (text: string): ConvoyCall[] => {
      const calls: ConvoyCall[] = []
      const lines = text.split(/[;\n]/).filter(l => l.trim())

      for (const line of lines) {
        const t = line.trim()
        if (!t || /^[\s{}]*$/.test(t)) continue

        // let d = fleet[N] or let d = findClosest(fleet, orders[N].pickup)
        const letFleetMatch = t.match(/let\s+(\w+)\s*=\s*fleet\[(\d+)\]/)
        if (letFleetMatch) {
          calls.push({ method: 'assign', droneRef: letFleetMatch[1], args: [letFleetMatch[2]] })
          continue
        }

        // let d = findClosest(fleet, ...)
        const findClosestMatch = t.match(/let\s+(\w+)\s*=\s*findClosest\s*\(\s*fleet/)
        if (findClosestMatch) {
          calls.push({ method: 'findClosest', droneRef: findClosestMatch[1], args: [] })
          continue
        }

        // fleet[N].flyTo(x, y) or fleet[N].flyTo(orders[M].pickup.x, orders[M].pickup.y)
        const fleetFlyMatch = t.match(/fleet\[(\d+)\]\.flyTo\s*\(\s*orders\[(\d+)\]\.(pickup|dropoff)\.x\s*,\s*orders\[\2\]\.\3\.y\s*\)/)
        if (fleetFlyMatch) {
          const di = parseInt(fleetFlyMatch[1], 10)
          const oi = parseInt(fleetFlyMatch[2], 10)
          const which = fleetFlyMatch[3] as 'pickup' | 'dropoff'
          calls.push({ method: 'flyToOrder', droneRef: `fleet[${di}]`, args: [String(di)], orderRef: `${oi}:${which}` })
          continue
        }

        // fleet[N].flyTo(N, N)
        const fleetFlyXYMatch = t.match(/fleet\[(\d+)\]\.flyTo\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/)
        if (fleetFlyXYMatch) {
          calls.push({ method: 'flyTo', droneRef: `fleet[${fleetFlyXYMatch[1]}]`, args: [fleetFlyXYMatch[1], fleetFlyXYMatch[2], fleetFlyXYMatch[3]] })
          continue
        }

        // d.flyTo(orders[N].pickup.x, orders[N].pickup.y) — variable reference
        const varFlyOrderMatch = t.match(/(\w+)\.flyTo\s*\(\s*orders\[(\d+)\]\.(pickup|dropoff)\.x\s*,\s*orders\[\2\]\.\3\.y\s*\)/)
        if (varFlyOrderMatch) {
          calls.push({ method: 'flyToOrder', droneRef: varFlyOrderMatch[1], args: [], orderRef: `${varFlyOrderMatch[2]}:${varFlyOrderMatch[3]}` })
          continue
        }

        // d.flyTo(x, y)
        const varFlyMatch = t.match(/(\w+)\.flyTo\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/)
        if (varFlyMatch) {
          calls.push({ method: 'flyTo', droneRef: varFlyMatch[1], args: ['var', varFlyMatch[2], varFlyMatch[3]] })
          continue
        }

        // fleet[N].grab() or d.grab()
        const grabMatch = t.match(/(fleet\[(\d+)\]|(\w+))\.grab\s*\(\s*\)/)
        if (grabMatch) {
          const ref = grabMatch[2] !== undefined ? `fleet[${grabMatch[2]}]` : grabMatch[3]
          calls.push({ method: 'grab', droneRef: ref, args: [] })
          continue
        }

        // fleet[N].drop() or d.drop()
        const dropMatch = t.match(/(fleet\[(\d+)\]|(\w+))\.drop\s*\(\s*\)/)
        if (dropMatch) {
          const ref = dropMatch[2] !== undefined ? `fleet[${dropMatch[2]}]` : dropMatch[3]
          calls.push({ method: 'drop', droneRef: ref, args: [] })
          continue
        }

        // Skip let/const/var, filter, sort calls, if, etc.
        if (/^(let|const|var)\s/.test(t)) continue
        if (/\.(filter|sort)\s*\(/.test(t)) continue
        if (/distance\s*\(/.test(t)) continue
      }
      return calls
    }

    // Resolve drone index from reference
    let varDroneMap: Record<string, number> = {}

    const resolveDroneIndex = (ref: string): number => {
      const fleetMatch = ref.match(/^fleet\[(\d+)\]$/)
      if (fleetMatch) return parseInt(fleetMatch[1], 10)
      if (ref in varDroneMap) return varDroneMap[ref]
      return 0 // default fallback
    }

    const executeConvoyCall = (call: ConvoyCall, iterVar?: string, iterVal?: number): void => {
      if (state.actions.length >= MAX_ACTIONS) return

      switch (call.method) {
        case 'assign': {
          const idx = parseInt(call.args[0], 10)
          varDroneMap[call.droneRef] = idx
          break
        }
        case 'findClosest': {
          // Find closest free drone to current context
          // For simplicity, pick the first non-busy drone
          const free = droneStates.find(d => !d.busy)
          if (free) {
            varDroneMap[call.droneRef] = free.id
          }
          break
        }
        case 'flyToOrder': {
          let di = resolveDroneIndex(call.droneRef)
          if (call.orderRef) {
            let [oiStr, which] = call.orderRef.split(':')
            let oi = parseInt(oiStr, 10)
            if (iterVar && oiStr === iterVar) oi = iterVal!
            if (oi < 0 || oi >= orderStates.length) break
            const order = orderStates[oi]
            const dest = which === 'pickup' ? order.pickup : order.dropoff
            const dist = Math.abs(dest.x - droneStates[di].x) + Math.abs(dest.y - droneStates[di].y)
            state.totalDistance += dist
            droneStates[di].x = dest.x
            droneStates[di].y = dest.y
            state.actions.push({ type: 'flyTo', droneIndex: di, x: dest.x, y: dest.y })
          }
          break
        }
        case 'flyTo': {
          let di: number
          if (call.args[0] === 'var') {
            di = resolveDroneIndex(call.droneRef)
          } else {
            di = parseInt(call.args[0], 10)
          }
          const x = parseInt(call.args[call.args[0] === 'var' ? 1 : 1], 10)
          const y = parseInt(call.args[call.args[0] === 'var' ? 2 : 2], 10)
          if (di >= 0 && di < droneStates.length && x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
            const dist = Math.abs(x - droneStates[di].x) + Math.abs(y - droneStates[di].y)
            state.totalDistance += dist
            droneStates[di].x = x
            droneStates[di].y = y
            state.actions.push({ type: 'flyTo', droneIndex: di, x, y })
          }
          break
        }
        case 'grab': {
          const di = resolveDroneIndex(call.droneRef)
          // Find order whose pickup matches drone position
          const oi = orderStates.findIndex(o =>
            !o.pickedUp && !o.delivered &&
            o.pickup.x === droneStates[di].x && o.pickup.y === droneStates[di].y
          )
          if (oi >= 0) {
            orderStates[oi].pickedUp = true
            droneStates[di].carrying = oi
            droneStates[di].busy = true
            state.actions.push({ type: 'grab', droneIndex: di, orderIndex: oi })
          }
          break
        }
        case 'drop': {
          const di = resolveDroneIndex(call.droneRef)
          const carrying = droneStates[di].carrying
          if (carrying >= 0) {
            const order = orderStates[carrying]
            if (droneStates[di].x === order.dropoff.x && droneStates[di].y === order.dropoff.y) {
              order.delivered = true
              state.deliveredCount++
              state.actions.push({ type: 'drop', droneIndex: di, orderIndex: carrying })
            }
            droneStates[di].carrying = -1
            droneStates[di].busy = false
          }
          break
        }
      }
    }

    if (forMatch) {
      const varName = forMatch[1]
      const start = parseInt(forMatch[2], 10)
      const end = parseInt(forMatch[3], 10)
      const body = forMatch[4]

      if (end - start > 100) {
        return { success: false, state, error: 'Loop limit exceeded' }
      }

      for (let i = start; i < end; i++) {
        // Expand loop variable in body
        const expanded = body.replace(new RegExp(`\\b${varName}\\b`, 'g'), String(i))
        varDroneMap = {} // reset per iteration
        const calls = extractConvoyCalls(expanded)
        for (const call of calls) {
          executeConvoyCall(call, varName, i)
        }
      }
    } else {
      const calls = extractConvoyCalls(cleaned)
      for (const call of calls) {
        executeConvoyCall(call)
      }
    }

    return { success: true, state }
  } catch {
    return { success: false, state, error: 'Syntax error in program' }
  }
}

// ---------------------------------------------------------------------------
// Mission 10: Smart City System
// API: events array, fleet array, findClosest(fleet, loc),
//      distance(a, b), drone.flyTo(x,y), drone.handleEvent(id)
// ---------------------------------------------------------------------------

export interface SmartCityState {
  eventsHandled: number
  dronesUsed: number
  emergencyHandledFirst: boolean
  usedSort: boolean
  actions: Array<
    | { type: 'flyTo'; droneIndex: number; x: number; y: number }
    | { type: 'handleEvent'; droneIndex: number; eventId: number }
  >
}

export function executeSmartCityCode(
  code: string,
  drones: Array<{ x: number; y: number }>,
  events: Array<{ id: number; type: string; location: { x: number; y: number }; priority: number }>,
  gridSize: number,
): { success: boolean; state: SmartCityState; error?: string } {
  const cleaned = trimComments(code).trim()
  const state: SmartCityState = {
    eventsHandled: 0,
    dronesUsed: 0,
    emergencyHandledFirst: false,
    usedSort: /\.sort\s*\(/.test(cleaned) || /events\.sort/.test(cleaned),
    actions: [],
  }

  if (!cleaned) {
    return { success: false, state, error: 'Empty program' }
  }

  const MAX_ACTIONS = 500

  const droneStates = drones.map((d, i) => ({
    id: i, x: d.x, y: d.y, busy: false,
  }))

  const eventStates = events.map(e => ({ ...e, handled: false }))
  const usedDrones = new Set<number>()
  const handledOrder: string[] = [] // track order of event types handled

  try {
    // Determine event processing order
    // If code sorts events by priority, process high priority first
    let sortedEvents = [...eventStates]
    if (state.usedSort) {
      // Sort by priority descending (emergency = 3 first)
      sortedEvents.sort((a, b) => b.priority - a.priority)
    }

    // Check for for-loop pattern
    const forMatch = cleaned.match(
      /for\s*\(\s*let\s+(\w+)\s*=\s*(\d+)\s*;\s*\1\s*<\s*(\d+|events\.length)\s*;\s*\1\s*\+\+\s*\)\s*\{([\s\S]*?)\}/
    )

    // Also check forEach pattern
    const forEachMatch = !forMatch ? cleaned.match(
      /(?:events|sortedEvents)\.forEach\s*\(\s*(?:\(\s*)?(\w+)(?:\s*\))?\s*=>\s*\{([\s\S]*?)\}\s*\)/) : null

    const findClosestDrone = (loc: { x: number; y: number }): number => {
      let bestIdx = -1
      let bestDist = Infinity
      for (const d of droneStates) {
        if (d.busy) continue
        const dist = Math.abs(d.x - loc.x) + Math.abs(d.y - loc.y)
        if (dist < bestDist) {
          bestDist = dist
          bestIdx = d.id
        }
      }
      return bestIdx
    }

    const processEvent = (eventIdx: number): void => {
      if (state.actions.length >= MAX_ACTIONS) return
      const evt = sortedEvents[eventIdx]
      if (!evt || evt.handled) return

      const di = findClosestDrone(evt.location)
      if (di < 0) return // no free drones

      // Fly to event
      const dist = Math.abs(evt.location.x - droneStates[di].x) + Math.abs(evt.location.y - droneStates[di].y)
      droneStates[di].x = evt.location.x
      droneStates[di].y = evt.location.y
      droneStates[di].busy = true
      usedDrones.add(di)
      state.actions.push({ type: 'flyTo', droneIndex: di, x: evt.location.x, y: evt.location.y })

      // Handle event
      evt.handled = true
      state.eventsHandled++
      handledOrder.push(evt.type)
      state.actions.push({ type: 'handleEvent', droneIndex: di, eventId: evt.id })

      // Free drone after handling
      droneStates[di].busy = false
    }

    if (forMatch) {
      const endVal = forMatch[3] === 'events.length' ? sortedEvents.length : parseInt(forMatch[3], 10)
      const startVal = parseInt(forMatch[2], 10)

      for (let i = startVal; i < Math.min(endVal, sortedEvents.length); i++) {
        processEvent(i)
        if (state.actions.length >= MAX_ACTIONS) break
      }
    } else if (forEachMatch) {
      for (let i = 0; i < sortedEvents.length; i++) {
        processEvent(i)
        if (state.actions.length >= MAX_ACTIONS) break
      }
    } else {
      // Try line-by-line for individual event handling
      // Match patterns like: fleet[N].flyTo(events[M].location.x, ...)
      const eventHandleRegex = /(?:fleet\[(\d+)\]|(\w+))\.flyTo\s*\(\s*events\[(\d+)\]\.location\.x\s*,\s*events\[\3\]\.location\.y\s*\)/g
      let ehMatch: RegExpExecArray | null
      while ((ehMatch = eventHandleRegex.exec(cleaned)) !== null) {
        const di = ehMatch[1] !== undefined ? parseInt(ehMatch[1], 10) : 0
        const ei = parseInt(ehMatch[3], 10)
        if (ei < sortedEvents.length && di < droneStates.length) {
          processEvent(ei)
        }
      }

      // If no events handled yet, try simple sequential processing
      if (state.eventsHandled === 0) {
        // Check for handleEvent calls
        const handleRegex = /\.handleEvent\s*\(\s*(\d+)\s*\)/g
        let hMatch: RegExpExecArray | null
        while ((hMatch = handleRegex.exec(cleaned)) !== null) {
          const eventId = parseInt(hMatch[1], 10)
          const idx = sortedEvents.findIndex(e => e.id === eventId)
          if (idx >= 0) processEvent(idx)
        }
      }

      // Last resort: process all events in order if code has findClosest usage
      if (state.eventsHandled === 0 && /findClosest/.test(cleaned)) {
        for (let i = 0; i < sortedEvents.length; i++) {
          processEvent(i)
        }
      }
    }

    // Check if emergencies were handled first
    const emergencyCount = events.filter(e => e.type === 'emergency').length
    const firstNHandled = handledOrder.slice(0, emergencyCount)
    state.emergencyHandledFirst = firstNHandled.every(t => t === 'emergency') && firstNHandled.length === emergencyCount

    state.dronesUsed = usedDrones.size

    return { success: true, state }
  } catch {
    return { success: false, state, error: 'Syntax error in program' }
  }
}
