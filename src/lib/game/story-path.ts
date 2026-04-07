/**
 * Story Mode — "Твой первый техстартап"
 *
 * A curated 6-chapter path through existing missions that walks the player
 * through all 6 stages of the innovation process. Shares mission progress
 * with solo mode (Variant A) — completing a chapter's mission in Story Mode
 * counts the same as completing it in solo mode.
 *
 * Chapter unlock: chapter N is unlocked when the previous chapter's mission
 * has been completed in mission_progress.
 */

import type { Role } from '@/types/database'
import type { InnovationStageId } from './innovation-stages'

export interface StoryChapter {
  order: number                 // 1..6
  id: string                    // 'chapter1' etc — used for translation keys
  stage: InnovationStageId      // which innovation process stage this chapter covers
  mission: {
    role: Role
    missionNumber: number
  }
  mentor: 'QAMAR' | 'BANDAR' | 'RAWAAN'  // Character in the spotlight
}

/**
 * The 6 chapters of Story Mode, in order.
 *
 * Narrative arc: Лейла, 16, прилетает в Эр-Рияд на хакатон RobodexBRICS.
 * За 6 шагов она проходит полный цикл создания своего первого техстартапа —
 * от интервью с жителями города до первой тысячи пользователей.
 *
 * Mission choices:
 * - Entrepreneur-трек даёт 5 из 6 этапов (Research, Idea, Prototype, Pitch, Launch)
 * - Для этапа Test мы берём Drone M4 — логично продолжает тему «лётающий прототип»
 * - Прототип (Chapter 3) — тоже Drone M3, чтобы Chapter 4 (Test) был на том же объекте
 */
export const STORY_PATH: StoryChapter[] = [
  {
    order: 1,
    id: 'chapter1',
    stage: 'research',
    mission: { role: 'entrepreneur', missionNumber: 1 },
    mentor: 'QAMAR',
  },
  {
    order: 2,
    id: 'chapter2',
    stage: 'idea',
    mission: { role: 'entrepreneur', missionNumber: 2 },
    mentor: 'RAWAAN',
  },
  {
    order: 3,
    id: 'chapter3',
    stage: 'prototype',
    mission: { role: 'drone_programmer', missionNumber: 3 },
    mentor: 'BANDAR',
  },
  {
    order: 4,
    id: 'chapter4',
    stage: 'test',
    mission: { role: 'drone_programmer', missionNumber: 4 },
    mentor: 'QAMAR',
  },
  {
    order: 5,
    id: 'chapter5',
    stage: 'pitch',
    mission: { role: 'entrepreneur', missionNumber: 5 },
    mentor: 'RAWAAN',
  },
  {
    order: 6,
    id: 'chapter6',
    stage: 'launch',
    mission: { role: 'entrepreneur', missionNumber: 6 },
    mentor: 'RAWAAN',
  },
]

export const TOTAL_STORY_CHAPTERS = STORY_PATH.length

export function getStoryChapter(order: number): StoryChapter | undefined {
  return STORY_PATH.find(c => c.order === order)
}

/**
 * Internal: check whether a specific chapter's underlying mission is done in
 * the user's mission_progress (regardless of story chain).
 */
function hasMissionDone(
  chapter: StoryChapter,
  completedMissions: { role: string; mission_number: number; status: string }[],
): boolean {
  return completedMissions.some(
    p =>
      p.role === chapter.mission.role &&
      p.mission_number === chapter.mission.missionNumber &&
      p.status === 'completed',
  )
}

/**
 * Check whether a specific chapter is unlocked given the user's mission progress.
 *
 * STRICT SEQUENTIAL gating:
 * - Chapter 1 is always unlocked
 * - Chapter N (N > 1) is unlocked only when ALL previous chapters (1..N-1)
 *   are completed in the story chain. If any earlier chapter is locked or
 *   incomplete, this chapter is also locked — even if its underlying mission
 *   was already done in solo mode.
 */
export function isChapterUnlocked(
  chapterOrder: number,
  completedMissions: { role: string; mission_number: number; status: string }[],
): boolean {
  if (chapterOrder <= 1) return true
  // All previous chapters must have their missions done
  for (let i = 1; i < chapterOrder; i++) {
    const prev = STORY_PATH.find(c => c.order === i)
    if (!prev) return false
    if (!hasMissionDone(prev, completedMissions)) return false
  }
  return true
}

/**
 * Check whether a specific chapter has been completed in the story chain.
 *
 * A chapter counts as completed only if:
 * 1. It is unlocked (all previous chapters done), AND
 * 2. Its own mission is done.
 *
 * This means: if a player completed Entrepreneur M5 in solo before touching
 * Story Mode, chapter 5 is NOT marked completed until they actually reach it
 * through the story chain. This keeps the visual story progress honest.
 */
export function isChapterCompleted(
  chapterOrder: number,
  completedMissions: { role: string; mission_number: number; status: string }[],
): boolean {
  if (!isChapterUnlocked(chapterOrder, completedMissions)) return false
  const chapter = STORY_PATH.find(c => c.order === chapterOrder)
  if (!chapter) return false
  return hasMissionDone(chapter, completedMissions)
}

/**
 * Compute the overall story progress (how many chapters completed out of total).
 */
export function getStoryProgress(
  completedMissions: { role: string; mission_number: number; status: string }[],
): { completed: number; total: number } {
  const completed = STORY_PATH.filter(c => isChapterCompleted(c.order, completedMissions)).length
  return { completed, total: TOTAL_STORY_CHAPTERS }
}

/**
 * Get URL for a chapter's mission, including the story query parameter.
 */
export function getChapterMissionUrl(chapter: StoryChapter): string {
  const roleSlug =
    chapter.mission.role === 'drone_programmer' ? 'drone' :
    chapter.mission.role === 'robot_constructor' ? 'robot' : 'entrepreneur'
  return `/missions/${roleSlug}?mission=${chapter.mission.missionNumber}&story=${chapter.order}`
}
