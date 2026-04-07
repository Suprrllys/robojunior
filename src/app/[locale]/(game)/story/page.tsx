import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  STORY_PATH,
  TOTAL_STORY_CHAPTERS,
  isChapterUnlocked,
  isChapterCompleted,
  getStoryProgress,
} from '@/lib/game/story-path'
import { STAGE_META } from '@/lib/game/innovation-stages'

export const dynamic = 'force-dynamic'

export default async function StoryPage() {
  const t = await getTranslations()
  const tStory = await getTranslations('story')
  const tStages = await getTranslations('dashboard.stages')

  let user = null
  let progress: { role: string; mission_number: number; status: string }[] = []

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    if (!error) user = data.user
    if (user) {
      const res = await supabase
        .from('mission_progress')
        .select('role, mission_number, status')
        .eq('user_id', user.id)
      progress = res.data || []
    }
  } catch { /* Supabase unreachable — proceed with empty progress */ }

  const { completed, total } = getStoryProgress(progress)
  const isFinished = completed === total

  return (
    <div className="space-y-6">
      {/* Back to home */}
      <div>
        <Link href="/roles" className="text-gray-400 hover:text-white text-sm transition-colors">
          &larr; {tStory('backToMenu')}
        </Link>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-br from-purple-900/40 via-indigo-900/30 to-blue-900/20 border border-purple-500/30 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">
              {tStory('label')}
            </div>
            <h1 className="text-3xl font-black text-white mb-2">{tStory('title')}</h1>
            <p className="text-gray-300 text-sm leading-relaxed max-w-2xl">{tStory('subtitle')}</p>
          </div>
          <div className="flex flex-col items-end shrink-0">
            <div className="text-3xl font-black text-white">
              {completed}<span className="text-gray-500">/{total}</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">{tStory('chaptersCompleted')}</div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-4 h-2 bg-brand-dark rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 rounded-full transition-all duration-700"
            style={{ width: `${(completed / total) * 100}%` }}
          />
        </div>
        {isFinished && (
          <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex items-center gap-3">
            <span className="text-3xl">{'\u{1F3C6}'}</span>
            <div>
              <div className="text-yellow-400 font-bold text-sm">{tStory('finishedTitle')}</div>
              <div className="text-gray-300 text-xs">{tStory('finishedDesc')}</div>
            </div>
          </div>
        )}
      </div>

      {/* Chapter list */}
      <div className="space-y-3">
        {STORY_PATH.map((chapter, idx) => {
          const unlocked = isChapterUnlocked(chapter.order, progress)
          const completedChapter = isChapterCompleted(chapter.order, progress)
          const meta = STAGE_META[chapter.stage]
          const isNext = unlocked && !completedChapter

          return (
            <ChapterCard
              key={chapter.id}
              order={chapter.order}
              chapterId={chapter.id}
              stageColor={meta.color}
              stageIcon={meta.icon}
              stageName={tStages(`${chapter.stage}Short`)}
              mentorName={chapter.mentor}
              chapterTitle={tStory(`${chapter.id}.title`)}
              chapterTeaser={tStory(`${chapter.id}.teaser`)}
              unlocked={unlocked}
              completed={completedChapter}
              isNext={isNext}
              isLast={idx === STORY_PATH.length - 1}
              cta={
                completedChapter
                  ? tStory('replay')
                  : unlocked
                  ? tStory('start')
                  : tStory('locked')
              }
            />
          )
        })}
      </div>

      {/* Hint footer */}
      <div className="bg-brand-panel border border-brand-border rounded-2xl p-4">
        <p className="text-xs text-gray-400 leading-relaxed">
          {tStory('progressHint')}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
function ChapterCard({
  order,
  chapterId,
  stageColor,
  stageIcon,
  stageName,
  mentorName,
  chapterTitle,
  chapterTeaser,
  unlocked,
  completed,
  isNext,
  isLast,
  cta,
}: {
  order: number
  chapterId: string
  stageColor: string
  stageIcon: string
  stageName: string
  mentorName: string
  chapterTitle: string
  chapterTeaser: string
  unlocked: boolean
  completed: boolean
  isNext: boolean
  isLast: boolean
  cta: string
}) {
  const inner = (
    <div
      className={`relative rounded-2xl p-5 border-2 transition-all ${
        completed
          ? 'bg-green-900/10 border-green-600/40 hover:border-green-500'
          : isNext
          ? 'bg-brand-panel border-purple-500/60 ring-2 ring-purple-500/20 hover:border-purple-400'
          : unlocked
          ? 'bg-brand-panel border-brand-border hover:border-gray-500'
          : 'bg-brand-dark/50 border-gray-800 opacity-50'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Number + stage icon */}
        <div className="flex flex-col items-center shrink-0">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-2"
            style={{
              backgroundColor: completed || isNext ? `${stageColor}22` : 'rgba(75,85,99,0.2)',
              border: `2px solid ${completed || isNext ? stageColor : '#4B5563'}`,
            }}
          >
            {unlocked ? stageIcon : '\u{1F512}'}
          </div>
          <div
            className="text-[10px] font-black uppercase tracking-wider"
            style={{ color: completed || isNext ? stageColor : '#6B7280' }}
          >
            {stageName}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-gray-500">
              {`\u041F\u0440\u043E\u043B\u043E\u0433 ${order}`}
            </span>
            <span className="text-xs text-gray-600">&middot;</span>
            <span className="text-xs text-gray-500 italic">{mentorName}</span>
            {completed && (
              <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-600/20 text-green-400 text-[10px] font-bold">
                {'\u2713'}
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-white mb-1">{chapterTitle}</h3>
          <p className="text-sm text-gray-400 leading-relaxed line-clamp-2">{chapterTeaser}</p>

          {/* CTA */}
          <div className="mt-3">
            <span
              className={`inline-block px-4 py-1.5 rounded-lg text-sm font-bold ${
                completed
                  ? 'bg-green-600/20 text-green-300'
                  : isNext
                  ? 'bg-purple-600 text-white'
                  : unlocked
                  ? 'bg-brand-border text-gray-300'
                  : 'bg-gray-800 text-gray-600'
              }`}
            >
              {cta} {unlocked && '\u2192'}
            </span>
          </div>
        </div>
      </div>

      {/* Connector line to next chapter */}
      {!isLast && (
        <div
          className="absolute left-[2.4rem] -bottom-3 w-0.5 h-3"
          style={{ backgroundColor: completed ? stageColor : '#374151' }}
        />
      )}
    </div>
  )

  // Locked: not clickable
  if (!unlocked) {
    return <div>{inner}</div>
  }

  return (
    <Link href={`/story/${chapterId}` as never} className="block">
      {inner}
    </Link>
  )
}
