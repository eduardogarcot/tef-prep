import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import type { Json } from '@/lib/database.types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScoreCriterion {
  score: number
  justification: string
}

interface WordCountCheck {
  submitted_words: number
  required_minimum: number
  required_maximum: number | null
  is_compliant: boolean
  penalty_applied: boolean
  penalty_detail: string | null
}

interface TEFError {
  type: string
  severity: 'minor' | 'major' | 'critical'
  original: string
  correction: string
  explanation: string
  is_spanish_interference: boolean
  interference_type: string | null
}

interface DetailedFeedback {
  scores: {
    lexical: ScoreCriterion
    grammar: ScoreCriterion
    sociolinguistic: ScoreCriterion
    argumentation: ScoreCriterion
  }
  strengths: string[]
  priority_improvements: string[]
  corrected_text: string
  model_expressions?: string[]
  word_count_check?: WordCountCheck
  estimated_nclc_level: string
  estimated_tef_score?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECTION_BADGE: Record<string, string> = {
  A: 'bg-blue-100 text-blue-700',
  B: 'bg-amber-100 text-amber-700',
  C: 'bg-violet-100 text-violet-700',
}

const SECTION_LABEL: Record<string, string> = {
  A: 'Fait divers',
  B: 'Rédaction formelle',
  C: 'Argumentation',
}

function ScoreBadge({ score, max = 3, label }: { score: number; max?: number; label: string }) {
  const pct = score / max
  const color =
    pct >= 0.67 ? 'bg-green-100 text-green-800 border-green-200' :
    pct >= 0.34 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                  'bg-red-100 text-red-800 border-red-200'
  return (
    <div className={`rounded-lg border p-3 ${color}`}>
      <div className="text-xs font-medium opacity-70 mb-1">{label}</div>
      <div className="text-2xl font-bold">
        {score}<span className="text-sm font-normal opacity-60">/{max}</span>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ExercisePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerClient()

  // Fetch exercise — RLS ensures the user can only read their own
  const { data: exercise, error: exError } = await supabase
    .from('exercises')
    .select('*')
    .eq('id', id)
    .single()

  if (exError || !exercise) notFound()

  // Fetch evaluation (may not exist if evaluation failed)
  const { data: evaluation } = await supabase
    .from('evaluations')
    .select('*')
    .eq('exercise_id', id)
    .maybeSingle()

  const detail = evaluation?.detailed_feedback as unknown as DetailedFeedback | null
  const errors = (evaluation?.errors ?? []) as unknown as TEFError[]

  const sectionBadge = SECTION_BADGE[exercise.section] ?? 'bg-gray-100 text-gray-700'
  const sectionLabel = SECTION_LABEL[exercise.section] ?? exercise.section

  const createdAt = new Date(exercise.created_at).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const timeSpentMin = Math.floor(exercise.time_spent_seconds / 60)
  const timeSpentSec = exercise.time_spent_seconds % 60

  return (
    <main className="min-h-screen bg-[#F8FAFC] py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── Back link ── */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          ← Back to dashboard
        </Link>

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${sectionBadge}`}>
                Section {exercise.section}
              </span>
              <span className="text-xs text-gray-400">{sectionLabel}</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">{exercise.prompt_title}</h1>
            <p className="text-xs text-gray-400 mt-1">{createdAt}</p>
          </div>
          <Link
            href="/practice"
            className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Practice again
          </Link>
        </div>

        {/* ── Prompt ── */}
        <div className="rounded-xl bg-white border border-[#E2E8F0] overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-[#F1F5F9] bg-slate-50">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prompt</h2>
          </div>
          <p className="px-5 py-4 text-sm text-gray-700 leading-relaxed">
            {exercise.prompt_description}
          </p>
        </div>

        {/* ── Your response ── */}
        <div className="rounded-xl bg-white border border-[#E2E8F0] overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-[#F1F5F9] bg-slate-50 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your response</h2>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span>{exercise.word_count} words</span>
              <span>·</span>
              <span>
                {timeSpentMin}m {timeSpentSec}s used / {Math.floor(exercise.time_limit_seconds / 60)}m limit
              </span>
            </div>
          </div>
          <p className="px-5 py-4 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
            {exercise.response_text}
          </p>
        </div>

        {/* ── No evaluation state ── */}
        {!evaluation && (
          <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-500">No evaluation available for this exercise.</p>
          </div>
        )}

        {/* ── Evaluation results ── */}
        {evaluation && detail && (
          <>
            {/* Word count check */}
            {detail.word_count_check && (
              <div className={`rounded-xl border px-4 py-3 text-sm ${
                detail.word_count_check.is_compliant
                  ? 'bg-green-50 border-green-100 text-green-800'
                  : 'bg-amber-50 border-amber-100 text-amber-800'
              }`}>
                <span className="font-medium">{detail.word_count_check.submitted_words} words submitted</span>
                {' · '}
                Target: {detail.word_count_check.required_minimum}
                {detail.word_count_check.required_maximum ? `–${detail.word_count_check.required_maximum}` : '+'} words
                {detail.word_count_check.penalty_applied && detail.word_count_check.penalty_detail && (
                  <span className="block mt-0.5 text-xs opacity-80">⚠ {detail.word_count_check.penalty_detail}</span>
                )}
              </div>
            )}

            {/* Global score */}
            <div className="rounded-xl bg-white border border-[#E2E8F0] p-6 text-center shadow-sm">
              <div className="text-5xl font-bold text-gray-900 mb-1">
                {evaluation.global_score}
                <span className="text-2xl font-normal text-gray-400">/12</span>
              </div>
              <div className="flex items-center justify-center gap-3 mt-1">
                <span className="text-sm font-medium text-blue-600">{detail.estimated_nclc_level}</span>
                {detail.estimated_tef_score !== undefined && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="text-sm text-gray-500">TEF ~{detail.estimated_tef_score}/699</span>
                  </>
                )}
              </div>
              <p className="mt-3 text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
                {evaluation.feedback_summary}
              </p>
            </div>

            {/* Criteria scores */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ScoreBadge score={evaluation.lexical_score} label="Lexical" />
              <ScoreBadge score={evaluation.grammar_score} label="Grammar" />
              <ScoreBadge score={evaluation.sociolinguistic_score} label="Sociolinguistic" />
              <ScoreBadge score={evaluation.argumentation_score} label="Argumentation" />
            </div>

            {/* Criteria justifications */}
            <div className="rounded-xl bg-white border border-[#E2E8F0] divide-y divide-[#F1F5F9] shadow-sm">
              {(
                [
                  ['Lexical & Orthographic', detail.scores.lexical],
                  ['Grammar', detail.scores.grammar],
                  ['Sociolinguistic', detail.scores.sociolinguistic],
                  ['Argumentation', detail.scores.argumentation],
                ] as [string, ScoreCriterion][]
              ).map(([label, criterion]) => (
                <div key={label} className="px-5 py-4 flex gap-3">
                  <span className="shrink-0 mt-0.5 text-sm font-bold text-gray-900 w-4">
                    {criterion.score}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{label}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{criterion.justification}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Strengths & Improvements */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl bg-green-50 border border-green-100 p-4">
                <h3 className="text-sm font-semibold text-green-800 mb-2">Strengths</h3>
                <ul className="space-y-1">
                  {detail.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-green-700 flex gap-2">
                      <span>✓</span><span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
                <h3 className="text-sm font-semibold text-amber-800 mb-2">Priority improvements</h3>
                <ul className="space-y-1">
                  {detail.priority_improvements.map((p, i) => (
                    <li key={i} className="text-sm text-amber-700 flex gap-2">
                      <span>{i + 1}.</span><span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Model expressions */}
            {detail.model_expressions && detail.model_expressions.length > 0 && (
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                <h3 className="text-sm font-semibold text-blue-800 mb-2">Useful expressions to remember</h3>
                <ul className="space-y-1">
                  {detail.model_expressions.map((expr, i) => (
                    <li key={i} className="text-sm text-blue-700 font-medium">«{expr}»</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Errors */}
            {errors.length > 0 && (
              <div className="rounded-xl bg-white border border-[#E2E8F0] overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-[#F1F5F9]">
                  <h3 className="text-sm font-semibold text-gray-900">Errors ({errors.length})</h3>
                </div>
                <ul className="divide-y divide-gray-100">
                  {errors.map((err, i) => (
                    <li key={i} className="px-5 py-4">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          err.severity === 'critical' ? 'bg-red-100 text-red-700'
                          : err.severity === 'major' ? 'bg-orange-100 text-orange-700'
                          : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {err.severity}
                        </span>
                        <span className="text-xs text-gray-500 capitalize">{err.type}</span>
                        {err.is_spanish_interference && (
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                            ES interference{err.interference_type ? ` · ${err.interference_type}` : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-start gap-2 text-sm mb-1">
                        <span className="text-red-600 line-through shrink-0">{err.original}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-green-700 font-medium">{err.correction}</span>
                      </div>
                      <p className="text-xs text-gray-500">{err.explanation}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Corrected text */}
            {detail.corrected_text && (
              <div className="rounded-xl bg-white border border-[#E2E8F0] overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-[#F1F5F9] bg-slate-50">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Corrected version
                  </h3>
                </div>
                <p className="px-5 py-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {detail.corrected_text}
                </p>
              </div>
            )}
          </>
        )}

      </div>
    </main>
  )
}
