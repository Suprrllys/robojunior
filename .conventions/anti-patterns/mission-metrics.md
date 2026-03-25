# Anti-Pattern: Custom MissionMetrics Fields

## The Bug

Passing custom fields to `completeMission()` metrics that don't exist in
`MissionMetrics` interface causes TypeScript errors:

```ts
// BAD — 'modules_selected' and 'budget_spent' don't exist in MissionMetrics
await completeMission(userId, 'robot_constructor', missionNumber, difficulty, score, {
  modules_selected: 5,       // TS error
  budget_spent: 80,          // TS error
  requirements_met: true,    // TS error
})
```

## The Fix

Always check `src/types/database.ts` for the `MissionMetrics` interface.
Only use its defined fields:

```ts
interface MissionMetrics {
  decision_time_avg: number   // average time per decision (seconds)
  attempts: number            // number of attempts
  style: 'fast' | 'analytical' | 'balanced'
  creativity_score: number    // 0-100
  precision_score: number     // 0-100
  teamwork_score: number      // 0-100 (coop only)
}
```

## Correct Usage

Map your game-specific data into these existing fields:

```ts
await completeMission(userId, 'robot_constructor', missionNumber, difficulty, score, {
  decision_time_avg: elapsed / moduleCount,
  attempts: 1,
  style: totalCost < budget * 0.8 ? 'analytical' : 'fast',
  precision_score: Math.round((precision / reqPrecision) * 50),
  creativity_score: Math.max(0, Math.min(100, score - 50)),
  teamwork_score: 0,
})
```

## Why This Matters

The metrics param is `Partial<MissionMetrics>` so missing fields are OK,
but invalid fields cause build failures. The competency scoring system
reads these specific fields to update player competency axes.
