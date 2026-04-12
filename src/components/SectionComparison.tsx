import Link from 'next/link'
import type { SectionStats } from '@/lib/analytics'

interface SectionComparisonProps {
  sectionA: SectionStats | null
  sectionB: SectionStats | null
  sectionC: SectionStats | null
}

const CRITERIA = [
  { key: 'lexical' as const, label: 'CL', full: 'Compétence lexicale' },
  { key: 'grammar' as const, label: 'CG', full: 'Compétence grammaticale' },
  { key: 'sociolinguistic' as const, label: 'CS', full: 'Compétence sociolinguistique' },
  { key: 'argumentation' as const, label: 'CA', full: 'Capacité à argumenter' },
]

const SECTION_STYLE: Record<'A' | 'B' | 'C', { accent: string; badge: string }> = {
  A: { accent: 'border-blue-200 bg-blue-50/40',   badge: 'bg-blue-100 text-blue-700' },
  B: { accent: 'border-amber-200 bg-amber-50/40', badge: 'bg-amber-100 text-amber-700' },
  C: { accent: 'border-violet-200 bg-violet-50/40', badge: 'bg-violet-100 text-violet-700' },
}

function CriterionBox({
  label,
  full,
  value,
}: {
  label: string
  full: string
  value: number
}) {
  const color =
    value >= 2.5
      ? 'bg-green-50 text-green-800 border-green-100'
      : value >= 1.5
      ? 'bg-yellow-50 text-yellow-800 border-yellow-100'
      : 'bg-red-50 text-red-800 border-red-100'

  return (
    <div className={`rounded-lg border p-3 text-center ${color}`} title={full}>
      <p className="text-xs font-semibold">{label}</p>
      <p className="text-lg font-bold mt-0.5 tabular-nums">{value.toFixed(1)}</p>
    </div>
  )
}

function SectionCard({
  section,
  stats,
  isStronger,
}: {
  section: 'A' | 'B' | 'C'
  stats: SectionStats | null
  isStronger: boolean
}) {
  const { accent, badge } = SECTION_STYLE[section]

  if (!stats) {
    return (
      <div className="flex-1 rounded-xl border border-dashed border-gray-200 p-5 flex flex-col items-center justify-center gap-2 text-center min-w-0">
        <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${badge}`}>
          Section {section}
        </span>
        <p className="text-sm text-gray-500">No exercises yet</p>
        <Link
          href="/practice"
          className="text-xs text-blue-600 hover:underline"
        >
          Try Section {section} →
        </Link>
      </div>
    )
  }

  return (
    <div className={`flex-1 rounded-xl border p-5 min-w-0 ${accent}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${badge}`}>
            Section {section}
          </span>
          <span className="text-xs text-gray-500">{stats.count} exercise{stats.count !== 1 ? 's' : ''}</span>
        </div>
        {isStronger && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            Stronger
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {CRITERIA.map(({ key, label, full }) => (
          <CriterionBox
            key={key}
            label={label}
            full={full}
            value={stats[key]}
          />
        ))}
      </div>

      <p className="mt-3 text-center text-sm font-semibold text-gray-700 tabular-nums">
        Avg {stats.global.toFixed(1)}/12
      </p>
    </div>
  )
}

export function SectionComparison({ sectionA, sectionB, sectionC }: SectionComparisonProps) {
  const globals = [sectionA?.global ?? 0, sectionB?.global ?? 0, sectionC?.global ?? 0]
  const maxGlobal = Math.max(...globals)

  const aIsStronger = (sectionA?.global ?? 0) === maxGlobal && maxGlobal > 0
  const bIsStronger = (sectionB?.global ?? 0) === maxGlobal && maxGlobal > 0
  const cIsStronger = (sectionC?.global ?? 0) === maxGlobal && maxGlobal > 0

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <SectionCard section="A" stats={sectionA} isStronger={aIsStronger} />
      <SectionCard section="B" stats={sectionB} isStronger={bIsStronger} />
      <SectionCard section="C" stats={sectionC} isStronger={cIsStronger} />
    </div>
  )
}
