import Link from 'next/link'
import { createServerClient } from '@/lib/supabase-server'
import { MetricCard } from '@/components/MetricCard'
import { ScoreChart } from '@/components/ScoreChart'
import { ExerciseRow } from '@/components/ExerciseRow'
import {
  calculateStreak,
  scoreToNCLC,
  formatRelativeDate,
  type EvalRow,
} from '@/lib/analytics'
import type { Exercise, Evaluation } from '@/lib/database.types'

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Parallel data fetch — RLS filters both tables to this user automatically
  const [{ data: exercisesData }, { data: evaluationsData }] = await Promise.all([
    supabase
      .from('exercises')
      .select('*')
      .order('created_at', { ascending: true }),
    supabase
      .from('evaluations')
      .select('*')
      .order('created_at', { ascending: true }),
  ])

  const exercises: Exercise[] = exercisesData ?? []
  const evaluations: Evaluation[] = evaluationsData ?? []

  // Join evaluations onto exercises by exercise_id
  const evalMap = new Map(evaluations.map((ev) => [ev.exercise_id, ev as EvalRow]))
  const joined = exercises.map((ex) => ({
    ...ex,
    evaluation: evalMap.get(ex.id) ?? null,
  }))
  const evaluated = joined.filter((ex) => ex.evaluation !== null)

  // ── Derived metrics ──────────────────────────────────────────────────────────

  const streak = calculateStreak(exercises.map((e) => e.created_at))

  const avgScore =
    evaluated.length > 0
      ? evaluated.reduce((s, ex) => s + ex.evaluation!.global_score, 0) / evaluated.length
      : null

  const latestEval = evaluated.at(-1)?.evaluation ?? null
  const nclc = latestEval ? scoreToNCLC(latestEval.global_score) : '—'

  // ── Chart data ───────────────────────────────────────────────────────────────

  const chartData = evaluated.map((ex) => ({
    date: new Date(ex.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    title: ex.prompt_title,
    lexical: ex.evaluation!.lexical_score,
    grammar: ex.evaluation!.grammar_score,
    sociolinguistic: ex.evaluation!.sociolinguistic_score,
    argumentation: ex.evaluation!.argumentation_score,
  }))

  // ── Recent exercises (last 5, newest first) ──────────────────────────────────

  const recent = [...joined].reverse().slice(0, 5)

  // ── User display name ────────────────────────────────────────────────────────

  const rawName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split('@')[0] ??
    'there'
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1)

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // ── Empty state (new user) ───────────────────────────────────────────────────

  if (exercises.length === 0) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
        <p className="text-4xl mb-4">✏️</p>
        <h1 className="text-2xl font-semibold text-[#0F172A] mb-2">
          Bonjour, {displayName}
        </h1>
        <p className="text-gray-500 mb-8 max-w-xs">
          You haven't done any exercises yet. Start your first practice session to see your progress here.
        </p>
        <Link
          href="/practice"
          className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          Start your first practice →
        </Link>
      </main>
    )
  }

  return (
    <main className="flex-1 px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* A) Welcome header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#0F172A]">
              Bonjour, {displayName}
            </h1>
            <p className="text-sm text-[#94A3B8] mt-0.5">{todayLabel}</p>
          </div>
          <Link
            href="/practice"
            className="shrink-0 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            Start practice →
          </Link>
        </div>

        {/* B) Metric cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Exercises done" value={exercises.length} />
          <MetricCard
            label="Average score"
            value={avgScore !== null ? avgScore.toFixed(1) : '—'}
            subtitle="/12"
          />
          <MetricCard label="Estimated NCLC" value={nclc} />
          <MetricCard
            label="Practice streak"
            value={streak}
            subtitle={streak === 1 ? ' day' : ' days'}
          />
        </div>

        {/* C) Score evolution */}
        <div className="rounded-xl bg-white border border-[#E2E8F0] p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#0F172A] mb-4">
            Score evolution
          </h2>
          <ScoreChart data={chartData} height={240} />
        </div>

        {/* D) Recent exercises */}
        <div className="rounded-xl bg-white border border-[#E2E8F0] overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-[#E2E8F0]">
            <h2 className="text-sm font-semibold text-[#0F172A]">
              Recent exercises
            </h2>
          </div>
          {recent.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[#94A3B8] text-center">No exercises yet</p>
          ) : (
            <ul className="divide-y divide-[#F1F5F9]">
              {recent.map((ex) => (
                <li key={ex.id}>
                  <ExerciseRow
                    id={ex.id}
                    section={ex.section}
                    title={ex.prompt_title}
                    score={ex.evaluation?.global_score ?? null}
                    date={formatRelativeDate(ex.created_at)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </main>
  )
}
