'use client'

import { useCallback, useState } from 'react'
import { EXERCISES } from '@/lib/exercises'
import { SECTION_CONFIG } from '@/lib/prompts/tef-evaluator'
import { FrenchEditor } from '@/components/FrenchEditor'
import { useTimer } from '@/hooks/useTimer'
import { createBrowserClient } from '@/lib/supabase'
import type { TEFEvaluationResponse } from '@/lib/prompts/tef-evaluator'
import type { TEFExercise } from '@/lib/exercises'

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'setup' | 'writing' | 'submitting' | 'results'
type Section = 'A' | 'B' | 'C'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

const DEFAULT_MINUTES: Record<Section, number> = {
  A: SECTION_CONFIG.A.timeMinutes,
  B: SECTION_CONFIG.B.timeMinutes,
  C: SECTION_CONFIG.C.timeMinutes,
}

// Target word count shown in the writing bar (upper end of range, or min for C)
const TARGET_WORDS: Record<Section, number> = {
  A: SECTION_CONFIG.A.maxWords!,   // 120
  B: SECTION_CONFIG.B.maxWords!,   // 300
  C: SECTION_CONFIG.C.minWords,    // 200
}

// ─── Section card data ────────────────────────────────────────────────────────

const SECTION_CARDS = [
  {
    id: 'A' as Section,
    label: 'Section A',
    register: 'Journalistic register',
    formats: ['News article continuation', 'Fait divers', 'Press-style narrative'],
    words: '80–120 words',
    time: '25 min',
    accent: 'blue' as const,
  },
  {
    id: 'B' as Section,
    label: 'Section B',
    register: 'Formal register',
    formats: ['Formal letter', 'Official email', 'Complaint / request'],
    words: '200–300 words',
    time: '35 min',
    accent: 'amber' as const,
  },
  {
    id: 'C' as Section,
    label: 'Section C',
    register: 'Semi-formal register',
    formats: ['Opinion piece', 'Reader letter', 'Forum / blog post'],
    words: '200+ words',
    time: '35 min',
    accent: 'violet' as const,
  },
]

const ACCENT_SELECTED: Record<string, string> = {
  blue:   'border-blue-500 bg-white shadow-blue-100 shadow-md',
  amber:  'border-amber-500 bg-white shadow-amber-100 shadow-md',
  violet: 'border-violet-500 bg-white shadow-violet-100 shadow-md',
}
const ACCENT_CHECK: Record<string, string> = {
  blue:   'bg-blue-500',
  amber:  'bg-amber-500',
  violet: 'bg-violet-500',
}
const ACCENT_BADGE: Record<string, string> = {
  blue:   'bg-blue-500 text-white',
  amber:  'bg-amber-500 text-white',
  violet: 'bg-violet-500 text-white',
}
const ACCENT_BADGE_IDLE: Record<string, string> = {
  blue:   'text-blue-600',
  amber:  'text-amber-600',
  violet: 'text-violet-600',
}
const ACCENT_DOT: Record<string, string> = {
  blue:   'bg-blue-400',
  amber:  'bg-amber-400',
  violet: 'bg-violet-400',
}
const SECTION_BADGE: Record<Section, string> = {
  A: 'bg-blue-100 text-blue-700',
  B: 'bg-amber-100 text-amber-700',
  C: 'bg-violet-100 text-violet-700',
}

// ─── Score badge ──────────────────────────────────────────────────────────────

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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PracticePage() {
  // Phase
  const [phase, setPhase] = useState<Phase>('setup')

  // Setup state
  const [section, setSection] = useState<Section | null>(null)
  const [exercise, setExercise] = useState<TEFExercise | null>(null)
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(25)

  // Writing state
  const [text, setText] = useState('')

  // Results state
  const [evaluation, setEvaluation] = useState<TEFEvaluationResponse | null>(null)
  const [exerciseId, setExerciseId] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // ── Timer ──────────────────────────────────────────────────────────────────

  const handleExpire = useCallback(() => {
    void handleSubmit(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, section, exercise, timeLimitMinutes])

  const timer = useTimer(timeLimitMinutes * 60, handleExpire)
  const timeSpentSeconds = timeLimitMinutes * 60 - timer.secondsLeft

  // ── Handlers ───────────────────────────────────────────────────────────────

  function selectSection(s: Section) {
    setSection(s)
    setExercise(pickRandom(EXERCISES[s]))
    setTimeLimitMinutes(DEFAULT_MINUTES[s])
  }

  function startSession() {
    if (!section || !exercise) return
    setText('')
    setSubmitError(null)
    timer.reset(timeLimitMinutes * 60)
    setPhase('writing')
    setTimeout(() => timer.start(), 50)
  }

  async function handleSubmit(timerExpired = false) {
    if (!section || !exercise) return
    if (!timerExpired && text.trim() === '') return

    timer.pause()
    setPhase('submitting')
    setSubmitError(null)

    const spent = timerExpired ? timeLimitMinutes * 60 : timeSpentSeconds

    try {
      const supabase = createBrowserClient()
      const { data: saved, error: exerciseError } = await supabase
        .from('exercises')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user!.id,
          section,
          prompt_title: exercise.title,
          prompt_description: exercise.description,
          response_text: text,
          word_count: countWords(text),
          time_limit_seconds: timeLimitMinutes * 60,
          time_spent_seconds: spent,
        })
        .select('id')
        .single()

      if (exerciseError || !saved) {
        throw new Error(exerciseError?.message ?? 'Failed to save exercise')
      }

      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseId: saved.id }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Evaluation failed')
      }

      const data = await res.json() as { exerciseId: string; evaluation: TEFEvaluationResponse }
      setExerciseId(data.exerciseId)
      setEvaluation(data.evaluation)
      setPhase('results')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong')
      setPhase('writing')
      timer.start()
    }
  }

  function reset() {
    setPhase('setup')
    setSection(null)
    setExercise(null)
    setText('')
    setEvaluation(null)
    setExerciseId(null)
    setSubmitError(null)
    timer.reset()
  }

  // ── Word count ──────────────────────────────────────────────────────────────

  const wordCount = countWords(text)
  const targetWords = section ? TARGET_WORDS[section] : 200
  const wordCountColor =
    wordCount === 0 ? 'text-gray-400' :
    wordCount < targetWords * 0.85 ? 'text-yellow-600' :
    wordCount <= targetWords * 1.15 ? 'text-green-600' :
    'text-orange-600'

  // ── Render: setup ───────────────────────────────────────────────────────────

  if (phase === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col">

        {/* Top bar */}
        <div className="px-6 py-4 flex items-center justify-between">
          <span className="text-sm font-semibold tracking-tight text-slate-500">TEF Prep</span>
        </div>

        {/* Hero */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-12">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            <span className="text-xs font-medium text-blue-700">Expression Écrite</span>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 text-center">
            Choose your section
          </h1>
          <p className="mt-2 text-sm text-slate-500 text-center max-w-xs">
            Select the type of writing task you want to practise today.
          </p>

          {/* Section cards */}
          <div className="mt-10 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
            {SECTION_CARDS.map((card) => {
              const isSelected = section === card.id
              return (
                <button
                  key={card.id}
                  onClick={() => selectSection(card.id)}
                  className={`group relative flex flex-col rounded-2xl border-2 p-6 text-left transition-all duration-150 shadow-sm
                    ${isSelected
                      ? ACCENT_SELECTED[card.accent]
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                    }`}
                >
                  {/* Selected check */}
                  {isSelected && (
                    <span className={`absolute top-4 right-4 flex h-6 w-6 items-center justify-center rounded-full text-white text-xs font-bold ${ACCENT_CHECK[card.accent]}`}>
                      ✓
                    </span>
                  )}

                  {/* Letter badge */}
                  <span className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl text-xl font-black
                    ${isSelected
                      ? ACCENT_BADGE[card.accent]
                      : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                    }`}>
                    {card.id}
                  </span>

                  <p className="text-base font-semibold text-slate-900">{card.label}</p>
                  <p className={`mt-0.5 text-xs font-medium ${isSelected ? ACCENT_BADGE_IDLE[card.accent] : 'text-slate-400'}`}>
                    {card.register}
                  </p>

                  <ul className="mt-3 space-y-1">
                    {card.formats.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                        <span className={`h-1 w-1 rounded-full shrink-0 ${isSelected ? ACCENT_DOT[card.accent] : 'bg-slate-300'}`} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex items-center gap-3 pt-4 border-t border-slate-100">
                    <span className="text-xs text-slate-500">{card.words}</span>
                    <span className="text-slate-200">·</span>
                    <span className="text-xs text-slate-500">{card.time}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Prompt + timer panel */}
          {section && exercise && (
            <div className="mt-6 w-full max-w-3xl space-y-4">

              {/* Prompt card */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Your prompt
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SECTION_BADGE[section]}`}>
                      {exercise.title}
                    </span>
                  </div>
                  <button
                    onClick={() => setExercise(pickRandom(EXERCISES[section]))}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <span>↻</span> Shuffle
                  </button>
                </div>
                <p className="px-5 py-4 text-sm text-slate-700 leading-relaxed">
                  {exercise.description}
                </p>
              </div>

              {/* Timer row */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div>
                  <p className="text-sm font-medium text-slate-800">Time limit</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Recommended: {section === 'A' ? '25 min' : '35 min'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTimeLimitMinutes((m) => Math.max(5, m - 5))}
                    className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-lg leading-none transition-colors"
                  >
                    −
                  </button>
                  <span className="w-16 text-center text-sm font-semibold text-slate-900 tabular-nums">
                    {timeLimitMinutes} min
                  </span>
                  <button
                    onClick={() => setTimeLimitMinutes((m) => Math.min(90, m + 5))}
                    className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-lg leading-none transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Start button */}
              <button
                onClick={startSession}
                className="w-full rounded-2xl bg-blue-600 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 active:scale-[0.99] transition-all shadow-sm shadow-blue-200"
              >
                Start writing →
              </button>
            </div>
          )}

          {!section && (
            <p className="mt-8 text-xs text-slate-400">Select a section above to continue</p>
          )}
        </div>
      </div>
    )
  }

  // ── Render: writing ─────────────────────────────────────────────────────────

  if (phase === 'writing' && section && exercise) {
    const isLow = timer.secondsLeft <= 5 * 60 && timer.secondsLeft > 0
    const isExpired = timer.secondsLeft === 0

    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
        <header className="sticky top-14 z-20 bg-white border-b border-[#E2E8F0] px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${SECTION_BADGE[section]}`}>
              Section {section}
            </span>
            <span className="text-sm font-medium text-gray-700 truncate">{exercise.title}</span>
          </div>

          <div className={`shrink-0 font-mono text-xl font-semibold tabular-nums ${isLow || isExpired ? 'text-red-600' : 'text-gray-900'}`}>
            {timer.display}
          </div>
        </header>

        <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 flex flex-col gap-4">
          {/* Prompt */}
          <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
            <p className="text-sm text-blue-900 leading-relaxed">{exercise.description}</p>
          </div>

          {/* Error banner */}
          {submitError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          {/* Editor */}
          <FrenchEditor
            value={text}
            onChange={setText}
            placeholder="Commencez à écrire ici…"
          />

          {/* Footer bar */}
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${wordCountColor}`}>
              {wordCount} / {targetWords} words
            </span>

            <div className="flex items-center gap-3">
              <button
                onClick={reset}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmit(false)}
                disabled={text.trim() === ''}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ── Render: submitting ──────────────────────────────────────────────────────

  if (phase === 'submitting') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
        <p className="text-sm text-gray-600">Evaluating your text…</p>
        <p className="text-xs text-gray-400">This may take 15–30 seconds</p>
      </div>
    )
  }

  // ── Render: results ─────────────────────────────────────────────────────────

  if (phase === 'results' && evaluation && section && exercise) {
    const { scores, global_score, estimated_nclc_level, estimated_tef_score, feedback_summary, strengths, priority_improvements, errors, model_expressions, word_count_check } = evaluation

    return (
      <div className="min-h-screen bg-[#F8FAFC] py-10 px-4">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Evaluation Results</h2>
              <p className="text-sm text-gray-500 mt-0.5">Section {section} — {exercise.title}</p>
            </div>
            <button
              onClick={reset}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Practice again
            </button>
          </div>

          {/* Word count check */}
          {word_count_check && (
            <div className={`rounded-xl border px-4 py-3 text-sm ${word_count_check.is_compliant ? 'bg-green-50 border-green-100 text-green-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
              <span className="font-medium">{word_count_check.submitted_words} words</span>
              {' · '}
              Target: {word_count_check.required_minimum}
              {word_count_check.required_maximum ? `–${word_count_check.required_maximum}` : '+'} words
              {word_count_check.penalty_applied && word_count_check.penalty_detail && (
                <span className="block mt-0.5 text-xs opacity-80">⚠ {word_count_check.penalty_detail}</span>
              )}
            </div>
          )}

          {/* Global score */}
          <div className="rounded-xl bg-white border border-[#E2E8F0] p-6 text-center shadow-sm">
            <div className="text-5xl font-bold text-gray-900 mb-1">
              {global_score}<span className="text-2xl font-normal text-gray-400">/12</span>
            </div>
            <div className="flex items-center justify-center gap-3 mt-1">
              <span className="text-sm font-medium text-blue-600">{estimated_nclc_level}</span>
              {estimated_tef_score !== undefined && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-sm text-gray-500">TEF ~{estimated_tef_score}/699</span>
                </>
              )}
            </div>
            <p className="mt-3 text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
              {feedback_summary}
            </p>
          </div>

          {/* Criteria scores */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ScoreBadge score={scores.lexical.score} label="Lexical" />
            <ScoreBadge score={scores.grammar.score} label="Grammar" />
            <ScoreBadge score={scores.sociolinguistic.score} label="Sociolinguistic" />
            <ScoreBadge score={scores.argumentation.score} label="Argumentation" />
          </div>

          {/* Criteria justifications */}
          <div className="rounded-xl bg-white border border-[#E2E8F0] divide-y divide-[#F1F5F9] shadow-sm">
            {(
              [
                ['Lexical & Orthographic', scores.lexical],
                ['Grammar', scores.grammar],
                ['Sociolinguistic', scores.sociolinguistic],
                ['Argumentation', scores.argumentation],
              ] as const
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
                {strengths.map((s, i) => (
                  <li key={i} className="text-sm text-green-700 flex gap-2">
                    <span>✓</span><span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
              <h3 className="text-sm font-semibold text-amber-800 mb-2">Priority improvements</h3>
              <ul className="space-y-1">
                {priority_improvements.map((p, i) => (
                  <li key={i} className="text-sm text-amber-700 flex gap-2">
                    <span>{i + 1}.</span><span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Model expressions */}
          {model_expressions && model_expressions.length > 0 && (
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">Useful expressions to remember</h3>
              <ul className="space-y-1">
                {model_expressions.map((expr, i) => (
                  <li key={i} className="text-sm text-blue-700 font-medium">
                    «{expr}»
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="rounded-xl bg-white border border-[#E2E8F0] overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-[#F1F5F9] flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  Errors ({errors.length})
                </h3>
              </div>
              <ul className="divide-y divide-gray-100">
                {errors.map((err, i) => (
                  <li key={i} className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          err.severity === 'critical'
                            ? 'bg-red-100 text-red-700'
                            : err.severity === 'major'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {err.severity}
                      </span>
                      <span className="text-xs text-gray-500 capitalize">{err.type}</span>
                      {err.is_spanish_interference && (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                          ES interference
                          {err.interference_type ? ` · ${err.interference_type}` : ''}
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

          {exerciseId && (
            <p className="text-center text-xs text-gray-400">
              Exercise saved · ID: {exerciseId}
            </p>
          )}
        </div>
      </div>
    )
  }

  return null
}
