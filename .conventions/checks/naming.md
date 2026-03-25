# Naming Conventions

## Game Components

| Pattern | Example |
|---------|---------|
| Game component | `DroneGame.tsx`, `RobotGame.tsx`, `EntrepreneurGame.tsx` |
| Shared UI component | `DifficultySelector.tsx`, `MissionCard.tsx`, `GameToast.tsx` |
| Props interface | `DroneGameProps`, `RobotGameProps` (component name + Props) |
| Sub-components | `DraggableModule`, `DroppableSlot`, `RobotSVG`, `StatBar` |

## i18n Key Naming

Keys are namespaced by domain:

| Namespace | Pattern | Example |
|-----------|---------|---------|
| Game common | `game.common.{key}` | `game.common.difficulty`, `game.common.easy` |
| Role-specific | `game.{role}.{key}` | `game.robot.slot_head`, `game.drone.m1_title` |
| Mission UI | `missions.{key}` | `missions.missionComplete`, `missions.backToRoles` |
| Module names | `game.{role}.mod_{type}_t{tier}` | `game.robot.mod_frame_t1` |
| Slot names | `game.{role}.slot_{name}` | `game.robot.slot_left_arm` |
| Type labels | `game.{role}.type_{name}` | `game.robot.type_motor` |
| Stat labels | `game.{role}.stat_{name}` | `game.robot.stat_strength` |

## TypeScript Types

| Pattern | Location |
|---------|----------|
| `Difficulty` type | `@/types/game` |
| `MissionConfig` | `@/types/game` |
| `MissionResult` | `@/types/game` |
| `MissionMetrics` | `@/types/database` |
| `Role` type | `@/types/database` |
| `ShopItem`, `InventoryItem` | `@/types/game` |

## Constants

- Module-level constants: `UPPER_SNAKE_CASE` (e.g. `ALL_MODULES`, `MODULE_TYPES`)
- i18n key maps: `SLOT_LABELS`, `TYPE_LABEL_KEYS`
- Difficulty arrays: `VALID_DIFFICULTIES`
