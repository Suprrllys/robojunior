import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  STORY_PATH,
  isChapterUnlocked,
  isChapterCompleted,
  getChapterMissionUrl,
} from '@/lib/game/story-path'
import { STAGE_META } from '@/lib/game/innovation-stages'

export const dynamic = 'force-dynamic'

interface Props {
  params: { chapter: string; locale: string }
}

export default async function StoryChapterPage({ params }: Props) {
  const t = await getTranslations()
  const tStory = await getTranslations('story')
  const tStages = await getTranslations('dashboard.stages')

  // Find the chapter by id (e.g. 'chapter1')
  const chapter = STORY_PATH.find(c => c.id === params.chapter)
  if (!chapter) {
    redirect(`/${params.locale}/story`)
  }

  // Check unlock status — gracefully degrade if Supabase is unreachable
  let user = null
  let supabaseFailed = false
  let progress: { role: string; mission_number: number; status: string }[] = []

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    if (!error) user = data.user
    else supabaseFailed = true
    if (user) {
      const res = await supabase
        .from('mission_progress')
        .select('role, mission_number, status')
        .eq('user_id', user.id)
      progress = res.data || []
    }
  } catch {
    supabaseFailed = true
  }

  // Only enforce unlock when we successfully reached Supabase
  const unlocked = supabaseFailed || isChapterUnlocked(chapter.order, progress)
  if (!unlocked) {
    redirect(`/${params.locale}/story`)
  }

  const isReplay = isChapterCompleted(chapter.order, progress)
  const meta = STAGE_META[chapter.stage]
  const missionUrl = getChapterMissionUrl(chapter)

  const nextChapter = STORY_PATH.find(c => c.order === chapter.order + 1)

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/story" className="text-gray-400 hover:text-white text-sm transition-colors">
          &larr; {tStory('backToStoryMap')}
        </Link>
        <div className="text-xs text-gray-500">
          {tStory('chapterOf', { current: chapter.order, total: STORY_PATH.length })}
        </div>
      </div>

      <div className="flex-1 max-w-3xl mx-auto w-full">
        {/* Stage badge */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-2xl sm:text-3xl shrink-0"
            style={{
              backgroundColor: `${meta.color}22`,
              border: `2px solid ${meta.color}`,
            }}
          >
            {meta.icon}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black uppercase tracking-wider" style={{ color: meta.color }}>
              {tStages(`${chapter.stage}Short`)} &middot; {tStory('stageOfSix', { order: meta.order })}
            </div>
            <div className="text-xs sm:text-sm text-gray-500 italic mt-0.5">
              {tStory('mentorLabel', { mentor: chapter.mentor })}
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-2">
          {tStory(`${chapter.id}.title`)}
        </h1>
        <p className="text-base sm:text-lg text-gray-400 mb-6 sm:mb-8 italic">
          {tStory(`${chapter.id}.tagline`)}
        </p>

        {/* Narrative paragraphs */}
        <div className="bg-brand-panel border border-brand-border rounded-2xl p-4 sm:p-6 mb-6">
          <p className="text-sm sm:text-base text-gray-300 leading-relaxed mb-4 whitespace-pre-line">
            {tStory(`${chapter.id}.narrative`)}
          </p>
          <div className="border-l-2 pl-4 mt-6" style={{ borderColor: meta.color }}>
            <p className="text-xs sm:text-sm text-gray-400 italic mb-1">
              {tStory('mentorSays', { mentor: chapter.mentor })}
            </p>
            <p className="text-sm sm:text-base text-white font-medium">
              &laquo;{tStory(`${chapter.id}.mentorQuote`)}&raquo;
            </p>
          </div>
        </div>

        {/* Mission preview */}
        <div className="bg-brand-dark border border-brand-border rounded-xl p-4 mb-6">
          <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">
            {tStory('yourMission')}
          </div>
          <div className="text-white font-bold text-lg">
            {t(`missions.${chapter.mission.role === 'drone_programmer' ? 'drone' : chapter.mission.role === 'robot_constructor' ? 'robot' : 'entrepreneur'}.m${chapter.mission.missionNumber}.title`)}
          </div>
          {isReplay && (
            <div className="text-xs text-green-400 mt-2 flex items-center gap-1">
              {'\u2713'} {tStory('alreadyCompletedHint')}
            </div>
          )}
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={missionUrl as never}
            className="flex-1 px-6 py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-center transition-colors text-lg"
          >
            {isReplay ? tStory('replayMission') : tStory('startMission')} {'\u2192'}
          </Link>
          {nextChapter && isReplay && (
            <Link
              href={`/story/${nextChapter.id}` as never}
              className="px-6 py-4 rounded-xl bg-brand-border hover:bg-gray-700 text-gray-300 font-bold text-center transition-colors"
            >
              {tStory('skipToNext')}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
