# Prompt for Claude Code: Build Dashboard & Analytics

## Context
Read CLAUDE.md for full project context. This is a TEF Canada Expression Écrite prep app using Next.js + Supabase + Tailwind. The database has `exercises` and `evaluations` tables (schema in CLAUDE.md). Auth is already set up with Supabase.

## Task
Build two pages — Dashboard (`src/app/dashboard/page.tsx`) and Analytics (`src/app/analytics/page.tsx`) — plus all shared components they need. Both pages are protected (redirect to /login if not authenticated).

---

## 1. DASHBOARD (`/dashboard`)

This is the landing page after login. It gives the user a quick overview of their progress and fast access to start practicing.

### Layout (top to bottom):

**A) Welcome header**
- "Bonjour, {user_name}" with today's date
- A prominent "Start practice" button (links to /practice)

**B) Metric cards row** — 4 cards in a grid:
1. **Exercises done** — `COUNT(*)` from exercises for this user
2. **Average score** — `AVG(global_score)` from evaluations joined with exercises, displayed as `X.X/12`
3. **Estimated NCLC** — derived from the latest evaluation's global_score using this mapping:
   - 0-3 → NCLC 4
   - 4-6 → NCLC 5-6
   - 7-9 → NCLC 7-8
   - 10-11 → NCLC 9-10
   - 12 → NCLC 11-12
4. **Practice streak** — count consecutive days with at least one exercise (count backwards from today)

**C) Score evolution chart** — Line chart (use Recharts) showing the 4 TEF criteria scores over time:
- X axis: exercise dates (use exercise created_at)
- Y axis: 0 to 3 (the score scale per criterion)
- 4 lines: lexical_score, grammar_score, sociolinguistic_score, argumentation_score
- Colors: Blue (#3266ad) for Lexical, Teal (#1D9E75) for Grammar, Coral (#D85A30) for Sociolinguistic, Purple (#534AB7) for Argumentation
- Custom legend above the chart (not Recharts default)
- If less than 2 exercises, show an empty state: "Complete at least 2 exercises to see your progress"

**D) Recent exercises list** — Last 5 exercises, each row showing:
- Section badge (A = blue, B = amber)
- Prompt title
- Global score as `X/12`
- Date (relative: "Today", "Yesterday", or "Apr 8")
- Clicking a row navigates to `/exercise/{id}`

### Data fetching:
Use a server component. Fetch all data in parallel with Promise.all:
```typescript
const [exercises, evaluations, streak] = await Promise.all([
  supabase.from('exercises').select('*, evaluations(*)').eq('user_id', user.id).order('created_at', { ascending: true }),
  // streak calculation can be done in JS from the exercises dates
]);
```

---

## 2. ANALYTICS (`/analytics`)

Deeper analysis of the user's performance patterns. This page answers: "What are my weak spots and am I improving?"

### Layout (top to bottom):

**A) Summary metric cards** — 3 cards:
1. **Total exercises** with breakdown: "X Section A · Y Section B"
2. **Best criterion** — the criterion with the highest average score, show name + avg
3. **Weakest criterion** — the criterion with the lowest average score, show name + avg

**B) Score evolution chart** — Same as dashboard but LARGER (taller) and with more detail:
- Show individual data points (dots) on each line
- Add a tooltip on hover showing: date, exercise title, and all 4 scores
- Include a Recharts ReferenceLine at y=2 labeled "Intermédiaire" (dashed, gray)
- Include a Recharts ReferenceLine at y=3 labeled "Avancé" (dashed, gray)

**C) Top error types panel** — Horizontal bar chart showing the most common error types:
- Query: aggregate `errors` JSONB from evaluations. Each error has a `type` field ("lexical" | "grammar" | "sociolinguistic" | "argumentation") and a `severity` field
- Group by error type, count occurrences
- Sort descending by count
- Use Recharts BarChart (horizontal)
- Color bars by type using the same color scheme as the score chart

**D) Spanish interference tracker** — Bar chart showing count of errors where `is_spanish_interference === true` per exercise (or per week if many exercises):
- X axis: exercise date or week
- Y axis: count of interference errors
- Color: Coral (#D85A30)
- Show a trend indicator: "↓ Decreasing" (green) or "↑ Increasing" (red) based on comparing first half vs second half averages

**E) Section A vs Section B comparison** — Side-by-side display:
- For each section, show the average of each of the 4 criteria as small metric boxes
- Labels: CL (Compétence lexicale), CG (Compétence grammaticale), CS (Compétence sociolinguistique), CA (Capacité à argumenter)
- Highlight which section is stronger overall
- If user has only done one section type, show a message encouraging them to try the other

**F) Error severity distribution** — Donut or pie chart:
- 3 segments: minor, major, critical
- Colors: minor = Amber (#EF9F27), major = Coral (#D85A30), critical = Red (#E24B4A)
- Show percentages in the legend

---

## Shared Components to Create

### `src/components/MetricCard.tsx`
```typescript
interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string; // e.g. "/12" suffix or "days" suffix
}
```
Styling: bg-gray-50 dark:bg-gray-800/50, rounded-lg, p-4. Label is text-sm text-gray-500, value is text-2xl font-medium.

### `src/components/ScoreChart.tsx`
```typescript
interface ScoreChartProps {
  data: Array<{
    date: string;
    title?: string;
    lexical: number;
    grammar: number;
    sociolinguistic: number;
    argumentation: number;
  }>;
  height?: number; // default 250
  showTooltip?: boolean; // default false, true for analytics
  showReferenceLines?: boolean; // default false, true for analytics
}
```
Uses Recharts LineChart. Responsive container. Custom legend with colored squares + labels.

### `src/components/ExerciseRow.tsx`
```typescript
interface ExerciseRowProps {
  id: string;
  section: 'A' | 'B';
  title: string;
  score: number;
  date: string;
}
```
Clickable row, navigates to /exercise/[id]. Section badge colored by type.

### `src/components/ErrorTypeChart.tsx`
For the horizontal bar chart of error types.

### `src/components/InterferenceChart.tsx`
For the Spanish interference tracker bar chart.

### `src/components/SectionComparison.tsx`
For the Section A vs B side-by-side comparison.

---

## Data Processing Utilities

Create `src/lib/analytics.ts` with these helper functions:

```typescript
// Calculate practice streak (consecutive days with exercises)
export function calculateStreak(exerciseDates: string[]): number

// Map global score to estimated NCLC level
export function scoreToNCLC(globalScore: number): string

// Aggregate errors from evaluations JSONB
export function aggregateErrors(evaluations: Evaluation[]): ErrorAggregate[]

// Calculate interference trend
export function getInterferenceTrend(evaluations: Evaluation[]): 'increasing' | 'decreasing' | 'stable'

// Get best and worst criterion from evaluations
export function getCriterionRanking(evaluations: Evaluation[]): { best: CriterionSummary, worst: CriterionSummary }

// Format relative date
export function formatRelativeDate(date: string): string
```

---

## Styling Guidelines
- Use Tailwind CSS throughout. No custom CSS files.
- Responsive: on mobile, metric cards stack 2x2 instead of 4-across. Charts go full width.
- Dark mode support: use Tailwind dark: variants.
- The chart colors are hardcoded hex (not Tailwind classes) because Recharts needs raw values.
- Empty states: every section should handle the case of 0 exercises gracefully with a friendly message and a CTA to start practicing.
- Loading states: use a simple skeleton/pulse animation while data loads.

## Dependencies
Make sure Recharts is installed: `npm install recharts`

## Important
- Both pages are SERVER COMPONENTS for the initial data fetch. Charts are client components (add 'use client' to chart components only).
- All Supabase queries must filter by the authenticated user's ID.
- Parse the `errors` and `detailed_feedback` JSONB fields from evaluations — they contain the structured error data needed for analytics.
- Don't forget to handle the edge case where a user has 0 exercises (new account).
