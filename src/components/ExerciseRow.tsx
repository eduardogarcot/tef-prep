import Link from 'next/link'

interface ExerciseRowProps {
  id: string
  section: 'A' | 'B' | 'C'
  title: string
  score: number | null
  date: string
}

export function ExerciseRow({ id, section, title, score, date }: ExerciseRowProps) {
  return (
    <Link
      href={`/exercise/${id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-[#F8FAFC] transition-colors group"
    >
      <span
        className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
          section === 'A'
            ? 'bg-blue-100 text-blue-700'
            : section === 'B'
            ? 'bg-amber-100 text-amber-700'
            : 'bg-violet-100 text-violet-700'
        }`}
      >
        {section}
      </span>

      <span className="flex-1 text-sm text-[#0F172A] truncate">
        {title}
      </span>

      {score !== null ? (
        <span className="shrink-0 text-sm font-medium tabular-nums text-[#0F172A]">
          {score}<span className="text-[#94A3B8]">/12</span>
        </span>
      ) : (
        <span className="shrink-0 text-xs text-gray-400">No score</span>
      )}

      <span className="shrink-0 text-xs text-gray-400 w-16 text-right">{date}</span>
    </Link>
  )
}
