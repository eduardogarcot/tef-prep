import type { Json } from './database.types'

// ─── Shared colour / label constants ─────────────────────────────────────────

export const CRITERION_COLORS = {
  lexical: '#2563EB',
  grammar: '#059669',
  sociolinguistic: '#DC2626',
  argumentation: '#7C3AED',
} as const

export const CRITERION_LABELS = {
  lexical: 'Lexical',
  grammar: 'Grammar',
  sociolinguistic: 'Sociolinguistic',
  argumentation: 'Argumentation',
} as const

export const SEVERITY_COLORS = {
  minor: '#EF9F27',
  major: '#D85A30',
  critical: '#E24B4A',
} as const

// ─── Runtime shapes of JSONB fields ──────────────────────────────────────────

export interface TEFError {
  type: 'lexical' | 'grammar' | 'sociolinguistic' | 'argumentation'
  severity: 'minor' | 'major' | 'critical'
  original: string
  correction: string
  explanation: string
  is_spanish_interference: boolean
}

// ─── Derived types for data passed to client components ───────────────────────

export interface ScoreChartPoint {
  date: string
  title: string
  lexical: number
  grammar: number
  sociolinguistic: number
  argumentation: number
}

export interface ErrorAggregate {
  type: string
  count: number
  color: string
}

export interface InterferencePoint {
  date: string
  count: number
}

export interface SeverityCount {
  name: string
  value: number
  color: string
}

export interface CriterionSummary {
  name: string
  key: keyof typeof CRITERION_LABELS
  avg: number
}

export interface SectionStats {
  count: number
  lexical: number
  grammar: number
  sociolinguistic: number
  argumentation: number
  global: number
}

// ─── Minimal eval row type (subset of Evaluation) ────────────────────────────

export interface EvalRow {
  id: string
  exercise_id: string
  global_score: number
  lexical_score: number
  grammar_score: number
  sociolinguistic_score: number
  argumentation_score: number
  errors: Json
  detailed_feedback: Json
  created_at: string
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function avg(nums: number[]): number {
  return nums.length === 0 ? 0 : nums.reduce((a, b) => a + b, 0) / nums.length
}

function errorsFrom(errorsJson: Json): TEFError[] {
  return Array.isArray(errorsJson) ? (errorsJson as unknown as TEFError[]) : []
}

// ─── Exported utilities ───────────────────────────────────────────────────────

/** Count consecutive days with at least one exercise, going back from today. */
export function calculateStreak(exerciseDates: string[]): number {
  if (exerciseDates.length === 0) return 0

  const uniqueDays = [
    ...new Set(exerciseDates.map((d) => d.slice(0, 10))),
  ].sort().reverse()

  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)

  // Streak must start from today or yesterday
  if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0

  let streak = 1
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1]).getTime()
    const curr = new Date(uniqueDays[i]).getTime()
    if (Math.round((prev - curr) / 86_400_000) === 1) {
      streak++
    } else {
      break
    }
  }
  return streak
}

/** Map a 0-12 global score to an NCLC level string. */
export function scoreToNCLC(globalScore: number): string {
  if (globalScore <= 3) return 'NCLC 4'
  if (globalScore <= 6) return 'NCLC 5-6'
  if (globalScore <= 9) return 'NCLC 7-8'
  if (globalScore <= 11) return 'NCLC 9-10'
  return 'NCLC 11-12'
}

/** Count errors by type across all evaluations. */
export function aggregateErrors(evals: EvalRow[]): ErrorAggregate[] {
  const counts: Record<string, number> = {}
  for (const ev of evals) {
    for (const err of errorsFrom(ev.errors)) {
      counts[err.type] = (counts[err.type] ?? 0) + 1
    }
  }
  return Object.entries(counts)
    .map(([type, count]) => ({
      type,
      count,
      color: CRITERION_COLORS[type as keyof typeof CRITERION_COLORS] ?? '#888',
    }))
    .sort((a, b) => b.count - a.count)
}

/** Compare first-half vs second-half average interference counts. */
export function getInterferenceTrend(
  evals: EvalRow[],
): 'increasing' | 'decreasing' | 'stable' {
  if (evals.length < 2) return 'stable'
  const counts = evals.map(
    (ev) => errorsFrom(ev.errors).filter((e) => e.is_spanish_interference).length,
  )
  const half = Math.floor(counts.length / 2)
  const first = avg(counts.slice(0, half))
  const second = avg(counts.slice(half))
  if (second < first * 0.9) return 'decreasing'
  if (second > first * 1.1) return 'increasing'
  return 'stable'
}

/** Return the criterion with the highest and lowest average score. */
export function getCriterionRanking(evals: EvalRow[]): {
  best: CriterionSummary
  worst: CriterionSummary
} {
  const keys = ['lexical', 'grammar', 'sociolinguistic', 'argumentation'] as const
  const ranked: CriterionSummary[] = keys.map((key) => ({
    name: CRITERION_LABELS[key],
    key,
    avg: avg(evals.map((e) => e[`${key}_score` as keyof EvalRow] as number)),
  }))
  ranked.sort((a, b) => b.avg - a.avg)
  return { best: ranked[0], worst: ranked[ranked.length - 1] }
}

/** Compute per-section criterion averages. Returns null if no exercises for that section. */
export function getSectionStats(evals: EvalRow[]): SectionStats | null {
  if (evals.length === 0) return null
  return {
    count: evals.length,
    lexical: avg(evals.map((e) => e.lexical_score)),
    grammar: avg(evals.map((e) => e.grammar_score)),
    sociolinguistic: avg(evals.map((e) => e.sociolinguistic_score)),
    argumentation: avg(evals.map((e) => e.argumentation_score)),
    global: avg(evals.map((e) => e.global_score)),
  }
}

/** Count interference errors per evaluation, returning chart points. */
export function buildInterferenceData(
  evals: EvalRow[],
  dates: string[],
): InterferencePoint[] {
  return evals.map((ev, i) => ({
    date: formatShortDate(dates[i] ?? ev.created_at),
    count: errorsFrom(ev.errors).filter((e) => e.is_spanish_interference).length,
  }))
}

/** Aggregate all errors by severity. */
export function buildSeverityCounts(evals: EvalRow[]): SeverityCount[] {
  const counts = { minor: 0, major: 0, critical: 0 }
  for (const ev of evals) {
    for (const err of errorsFrom(ev.errors)) {
      if (err.severity in counts) counts[err.severity]++
    }
  }
  const total = counts.minor + counts.major + counts.critical
  if (total === 0) return []
  return [
    { name: 'Minor', value: counts.minor, color: SEVERITY_COLORS.minor },
    { name: 'Major', value: counts.major, color: SEVERITY_COLORS.major },
    { name: 'Critical', value: counts.critical, color: SEVERITY_COLORS.critical },
  ].filter((s) => s.value > 0)
}

/** Format a date string as "Apr 8". */
export function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

/** Format a date string as "Today", "Yesterday", or "Apr 8". */
export function formatRelativeDate(dateStr: string): string {
  const target = new Date(dateStr).toISOString().slice(0, 10)
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  if (target === today) return 'Today'
  if (target === yesterday) return 'Yesterday'
  return formatShortDate(dateStr)
}
