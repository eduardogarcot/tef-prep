import Link from 'next/link'
import { createServerClient } from '@/lib/supabase-server'
import { MetricCard } from '@/components/MetricCard'
import { ScoreChart } from '@/components/ScoreChart'
import { ErrorTypeChart } from '@/components/ErrorTypeChart'
import { InterferenceChart } from '@/components/InterferenceChart'
import { SectionComparison } from '@/components/SectionComparison'
import { SeverityChart } from '@/components/SeverityChart'
import {
  aggregateErrors,
  buildInterferenceData,
  buildSeverityCounts,
  getCriterionRanking,
  getSectionStats,
  getInterferenceTrend,
  formatShortDate,
  type EvalRow,
} from '@/lib/analytics'
import type { Exercise, Evaluation } from '@/lib/database.types'

export default async function AnalyticsPage() {
  const supabase = await createServerClient()

  const [{ data: exercisesData }, { data: evaluationsData }] = await Promise.all([
    supabase.from('exercises').select('*').order('created_at', { ascending: true }),
    supabase.from('evaluations').select('*').order('created_at', { ascending: true }),
  ])

  const exercises: Exercise[] = exercisesData ?? []
  const evaluations: Evaluation[] = evaluationsData ?? []

  const evalMap = new Map(evaluations.map((ev) => [ev.exercise_id, ev as EvalRow]))
  const joined = exercises.map((ex) => ({ ...ex, evaluation: evalMap.get(ex.id) ?? null }))
  const evaluated = joined.filter((ex) => ex.evaluation !== null)
  const evals = evaluated.map((ex) => ex.evaluation!)

  // ── Empty state ──────────────────────────────────────────────────────────────

  if (exercises.length === 0) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
        <p className="text-4xl mb-4">📊</p>
        <h1 className="text-2xl font-semibold text-[#0F172A] mb-2">
          No data yet
        </h1>
        <p className="text-gray-500 mb-8 max-w-xs">
          Complete some exercises and your analytics will appear here.
        </p>
        <Link
          href="/practice"
          className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          Start practising →
        </Link>
      </main>
    )
  }

  // ── Computed data for components ─────────────────────────────────────────────

  const countA = exercises.filter((e) => e.section === 'A').length
  const countB = exercises.filter((e) => e.section === 'B').length
  const countC = exercises.filter((e) => e.section === 'C').length

  const { best, worst } = evals.length > 0 ? getCriterionRanking(evals) : { best: null, worst: null }

  const chartData = evaluated.map((ex) => ({
    date: formatShortDate(ex.created_at),
    title: ex.prompt_title,
    lexical: ex.evaluation!.lexical_score,
    grammar: ex.evaluation!.grammar_score,
    sociolinguistic: ex.evaluation!.sociolinguistic_score,
    argumentation: ex.evaluation!.argumentation_score,
  }))

  const errorAggregates = aggregateErrors(evals)

  const interferenceData = buildInterferenceData(
    evals,
    evaluated.map((ex) => ex.created_at),
  )
  const trend = getInterferenceTrend(evals)

  const evalsA = evaluated.filter((ex) => ex.section === 'A').map((ex) => ex.evaluation!)
  const evalsB = evaluated.filter((ex) => ex.section === 'B').map((ex) => ex.evaluation!)
  const evalsC = evaluated.filter((ex) => ex.section === 'C').map((ex) => ex.evaluation!)
  const sectionA = getSectionStats(evalsA)
  const sectionB = getSectionStats(evalsB)
  const sectionC = getSectionStats(evalsC)

  const severityData = buildSeverityCounts(evals)

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <main className="flex-1 px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">

        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A]">Analytics</h1>
          <p className="text-sm text-[#94A3B8] mt-0.5">Your performance patterns across all exercises</p>
        </div>

        {/* A) Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <MetricCard
            label="Total exercises"
            value={exercises.length}
            subtitle={` · ${countA}A · ${countB}B · ${countC}C`}
          />
          <MetricCard
            label="Best criterion"
            value={best ? best.name : '—'}
            subtitle={best ? ` · avg ${best.avg.toFixed(1)}/3` : undefined}
          />
          <MetricCard
            label="Weakest criterion"
            value={worst ? worst.name : '—'}
            subtitle={worst ? ` · avg ${worst.avg.toFixed(1)}/3` : undefined}
          />
        </div>

        {/* B) Score evolution — tall with dots, reference lines, tooltip */}
        <Section title="Score evolution">
          <ScoreChart
            data={chartData}
            height={320}
            showTooltip
            showReferenceLines
          />
        </Section>

        {/* C) Error types */}
        <Section title="Top error types">
          <ErrorTypeChart data={errorAggregates} />
        </Section>

        {/* D) Spanish interference */}
        <Section title="Spanish interference">
          <InterferenceChart data={interferenceData} trend={trend} />
        </Section>

        {/* E) Section A vs B vs C */}
        <Section title="Section A vs B vs C">
          <SectionComparison sectionA={sectionA} sectionB={sectionB} sectionC={sectionC} />
        </Section>

        {/* F) Error severity */}
        <Section title="Error severity distribution">
          <SeverityChart data={severityData} />
        </Section>

      </div>
    </main>
  )
}

// Small layout helper — keeps the page template clean
function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl bg-white border border-[#E2E8F0] p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-[#0F172A] mb-4">{title}</h2>
      {children}
    </div>
  )
}
