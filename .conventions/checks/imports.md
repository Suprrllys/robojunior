# Import Conventions

## Required Imports

| When you need... | Import from... |
|-----------------|----------------|
| Internal navigation | `import { Link } from '@/i18n/navigation'` |
| Client-side router | `import { useRouter } from '@/i18n/navigation'` |
| Client i18n | `import { useTranslations } from 'next-intl'` |
| Server i18n | `import { getTranslations } from 'next-intl/server'` |
| Conditional classes | `import clsx from 'clsx'` |
| Mission config | `import { getMissionConfig } from '@/lib/game/missions'` |
| Scoring | `import { completeMission } from '@/lib/game/scoring'` |
| Rewards | `import { REWARDS_BY_DIFFICULTY } from '@/lib/game/rewards'` |
| Game types | `import type { Difficulty, MissionResult } from '@/types/game'` |
| DB types | `import type { MissionMetrics, Role } from '@/types/database'` |
| Supabase (server) | `import { createClient } from '@/lib/supabase/server'` |
| Supabase (client) | `import { createClient } from '@/lib/supabase/client'` |
| Toast | `import { fireGameToast } from '@/components/game/GameToast'` |
| DnD | `import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core'` |

## Forbidden Patterns

| Instead of... | Use... |
|--------------|--------|
| `<a href="/path">` | `<Link href="/path">` from `@/i18n/navigation` |
| `import Link from 'next/link'` | `import { Link } from '@/i18n/navigation'` |
| `useRouter` from `'next/navigation'` | `useRouter` from `'@/i18n/navigation'` |
| `require('...')` | ES module `import` |

## Directive Rules

| File type | Directive |
|-----------|-----------|
| Client component | `'use client'` at line 1 |
| Server action | `'use server'` at line 1 |
| Server component (page) | No directive needed (default) |
| Shared types/utils | No directive needed |
