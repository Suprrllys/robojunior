import { Link } from '@/i18n/navigation'

interface MissionProgress {
  status: string
  score?: number
}

interface MissionCardProps {
  num: number
  title: string
  desc: string
  progress?: MissionProgress | null
  isLocked: boolean
  isActive: boolean
  href: string
  timeEstimate: string
}

export default function MissionCard({
  num, title, desc, progress, isLocked, isActive, href, timeEstimate,
}: MissionCardProps) {
  const isCompleted = progress?.status === 'completed'

  const card = (
    <div
      className={`bg-brand-panel border rounded-2xl p-5 transition-all ${
        isLocked
          ? 'border-brand-border opacity-50 cursor-not-allowed'
          : isActive && !isCompleted
          ? 'border-brand-blue ring-1 ring-brand-blue/30'
          : isCompleted
          ? 'border-green-500/50 hover:border-green-400/70 cursor-pointer'
          : 'border-brand-border hover:border-brand-blue cursor-pointer'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <span className="text-xs font-bold text-gray-400 uppercase">Mission {num}</span>
        {isCompleted && <span className="text-green-400 text-sm font-bold">✓ {progress?.score}pts</span>}
        {isLocked && <span className="text-gray-500 text-xs">🔒 Locked</span>}
        {isActive && !isCompleted && !isLocked && (
          <span className="text-brand-blue text-xs font-bold">▶ Active</span>
        )}
      </div>
      <h3 className="font-bold text-white mb-1">{title}</h3>
      <p className="text-gray-400 text-sm mb-3">{desc}</p>
      <div className="flex gap-3 text-xs text-gray-500">
        <span>⏱ ~{timeEstimate} min</span>
        <span>⭐ +150 XP</span>
      </div>
    </div>
  )

  if (isLocked) return card

  return <Link href={href as '/missions/drone'}>{card}</Link>
}
