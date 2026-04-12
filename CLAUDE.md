# TEF Prep — Project Context for Claude Code

## Overview
Web app for TEF Canada Expression Écrite exam preparation. 2-3 users (personal use). Simulates real TEF writing test conditions with AI-powered evaluation using Claude API.

## Stack
- **Framework**: Next.js 16.2.3 (App Router, TypeScript, React 19)
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/postcss` — no `tailwind.config.js`)
- **Backend/DB**: Supabase (PostgreSQL + Auth + Row Level Security) — client via `@supabase/ssr`
- **AI Evaluation**: Anthropic Claude API (`claude-sonnet-4-6`, server-side only via /api routes)
- **Deployment**: Vercel (free tier)
- **Charts**: Recharts v3 for analytics dashboard

## Project Structure
```
src/
├── app/
│   ├── layout.tsx                  # Root layout (fonts, globals.css)
│   ├── page.tsx                    # Redirects to /dashboard
│   ├── globals.css                 # Tailwind v4 @import
│   ├── login/
│   │   └── page.tsx                # Email+password auth page (client)
│   ├── (app)/                      # Auth-protected route group
│   │   ├── layout.tsx              # Checks session → redirect /login; renders Navbar
│   │   ├── dashboard/
│   │   │   └── page.tsx            # Main dashboard: metrics, chart, recent exercises (server)
│   │   ├── practice/
│   │   │   └── page.tsx            # Writing session: setup → writing → results (client, ~580 lines)
│   │   └── analytics/
│   │       └── page.tsx            # Score evolution & error analysis (server, ~170 lines)
│   └── api/
│       └── evaluate/
│           └── route.ts            # POST — calls Claude, saves evaluation to Supabase
├── components/
│   ├── Navbar.tsx                  # Top nav: Dashboard / Practice / Analytics + sign out
│   ├── MetricCard.tsx              # KPI card (label + value + optional subtitle)
│   ├── ScoreChart.tsx              # Multi-line Recharts chart (4 criteria over time)
│   ├── ExerciseRow.tsx             # Row for recent exercise list (section badge + score)
│   ├── FrenchEditor.tsx            # Textarea + French character toolbar (é,è,ê,à,ç,œ…)
│   ├── ErrorTypeChart.tsx          # Horizontal bar chart: error counts by type
│   ├── InterferenceChart.tsx       # Bar chart: Spanish interference errors over time
│   ├── SectionComparison.tsx       # A vs B criterion comparison (needs update for C)
│   └── SeverityChart.tsx           # Pie chart: minor / major / critical error breakdown
├── lib/
│   ├── supabase.ts                 # createBrowserClient() for Client Components
│   ├── supabase-server.ts          # createServerClient() for Server Components / API routes
│   ├── database.types.ts           # Generated Supabase types (Exercise, Evaluation, Json)
│   ├── analytics.ts                # Pure functions: streak, scoreToNCLC, aggregateErrors, etc.
│   └── prompts/
│       └── tef-evaluator.ts        # ⚠️ OLD 2-section version — must be replaced with root version
├── hooks/
│   ├── useAuth.ts                  # Supabase user subscription hook
│   └── useTimer.ts                 # Countdown timer hook
middleware.ts                       # Session refresh + route protection (/login redirect)
tef-evaluator.ts                    # ✅ NEW 3-section version (A/B/C) — source of truth
tef-exercises.ts                    # Static exercise bank: 271 exercises (97A + 80B + 94C)
```

## Database Schema (Supabase/PostgreSQL)
```sql
-- Users managed by Supabase Auth

create table exercises (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  section text check (section in ('A', 'B', 'C')) not null,  -- ⚠️ DB needs migration to add 'C'
  prompt_title text not null,
  prompt_description text not null,
  response_text text not null,
  word_count integer not null,
  time_limit_seconds integer not null,
  time_spent_seconds integer not null,
  created_at timestamptz default now()
);

create table evaluations (
  id uuid default gen_random_uuid() primary key,
  exercise_id uuid references exercises(id) not null,
  lexical_score integer check (lexical_score between 0 and 3) not null,
  grammar_score integer check (grammar_score between 0 and 3) not null,
  sociolinguistic_score integer check (sociolinguistic_score between 0 and 3) not null,
  argumentation_score integer check (argumentation_score between 0 and 3) not null,
  global_score numeric(3,1) not null,
  errors jsonb not null default '[]',
  feedback_summary text not null,
  detailed_feedback jsonb not null default '{}',
  created_at timestamptz default now()
);

-- RLS policies: users can only access their own data
alter table exercises enable row level security;
alter table evaluations enable row level security;

create policy "Users read own exercises"
  on exercises for select using (auth.uid() = user_id);
create policy "Users insert own exercises"
  on exercises for insert with check (auth.uid() = user_id);

create policy "Users read own evaluations"
  on evaluations for select using (
    exercise_id in (select id from exercises where user_id = auth.uid())
  );
create policy "Users insert own evaluations"
  on evaluations for insert with check (
    exercise_id in (select id from exercises where user_id = auth.uid())
  );
```

## TEF Expression Écrite Structure

Three practice sections (training platform — not the exact real exam format):

| Section | Type | Word count | Time |
|---------|------|-----------|------|
| A | Fait divers — continuation d'un article de presse | 80–120 mots | 25 min |
| B | Rédaction formelle — lettre ou courriel formel | 200–300 mots | 35 min |
| C | Argumentation — prise de position sur un sujet de société | 200+ mots | 35 min |

- **Section A register**: Journalistique / informatif
- **Section B register**: Formel / administratif (réclamation, demande, plainte, candidature)
- **Section C register**: Semi-formel à formel (blog, forum, courrier des lecteurs)
- **Scoring criteria** (0–3 each, max 12): Lexical/Orthographic (CL), Grammatical (CG), Sociolinguistic (CS), Argumentation (CA)
- **TEF Canada score range**: 0–699 — NCLC 7 (Express Entry target) requires 393+

## Exercise Bank

`tef-exercises.ts` (project root) — static exercise bank, **271 total**:
- Section A: 97 exercises (fait divers)
- Section B: 80 exercises (rédaction formelle)
- Section C: 94 exercises (argumentation)

Exported as `EXERCISES: Record<'A' | 'B' | 'C', TEFExercise[]>` where `TEFExercise = { id: number, title: string, description: string }`.

## Evaluation Response Shape

`tef-evaluator.ts` (project root) exports `TEFEvaluationResponse`:
```ts
{
  section: "A" | "B" | "C";
  word_count_check: { submitted_words, required_minimum, required_maximum, is_compliant, penalty_applied, penalty_detail };
  scores: {
    lexical: { score: 0-3, justification }
    grammar: { score: 0-3, justification }
    sociolinguistic: { score: 0-3, justification }
    argumentation: { score: 0-3, justification }
  };
  global_score: number;          // 0–12
  estimated_nclc_level: string;  // e.g. "NCLC 7"
  estimated_tef_score: number;   // 0–699
  feedback_summary: string;
  errors: TEFEvaluationError[];  // includes is_spanish_interference + interference_type
  strengths: string[];
  priority_improvements: string[];
  corrected_text: string;
  model_expressions: string[];
}
```

`interference_type`: `"lexical" | "syntactic" | "gender" | "conjugation" | "orthographic" | null`

## Key Conventions
- All API calls to Claude MUST be server-side only (API routes). Never expose API key to client.
- Use Supabase RLS for data isolation between users.
- Supabase client: `createBrowserClient()` in Client Components, `createServerClient()` in Server Components / API routes. Both live in `src/lib/`.
- French character support is critical: é è ê ë, à â, ù û ü, ô, î ï, ç, œ, æ, «», and accented capitals (À, É, È, Ê, Ç, etc.). Handled by `FrenchEditor.tsx`.
- **Source of truth for evaluator**: `tef-evaluator.ts` at project root. The copy at `src/lib/prompts/tef-evaluator.ts` is outdated and must be replaced.
- Timer logic is in the `useTimer` hook (`src/hooks/useTimer.ts`), not a standalone component.
- Word count must update live as user types (handled in practice page).
- All UI text can be in English (users are **Spanish/English speakers** learning French — the evaluator actively detects Spanish interference: lexical false friends, syntactic calques, gender errors, conjugation confusion, orthographic issues).
- The `(app)` route group (`src/app/(app)/`) handles auth protection in its layout — no need to check auth in individual pages.
- Middleware (`middleware.ts`) refreshes sessions and redirects unauthenticated users to `/login`.

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
```

## Development Commands
```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # ESLint
```
