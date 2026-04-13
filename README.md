# TEF Prep ✍️

A personal web app for practising the **TEF Canada Expression Écrite** exam. Simulates real writing test conditions — timed sessions, section-specific prompts, and instant AI-powered evaluation using Claude.

Built for Spanish/English speakers targeting **NCLC 7+ (Express Entry)**.

---

## Features

- **Three writing sections** matching TEF Canada practice format

  | Section | Type | Words | Time |
  |---------|------|-------|------|
  | A | Fait divers — continue a news article | 80–120 | 25 min |
  | B | Rédaction formelle — formal letter or email | 200–300 | 35 min |
  | C | Argumentation — opinion piece on a social topic | 200+ | 35 min |

- **271 exercise prompts** (97 A · 80 B · 94 C), randomly drawn each session
- **Live countdown timer** with configurable limits
- **Live word count** updated as you type
- **French character toolbar** — insert é, è, ê, à, ç, œ, «», Ç, É, etc. with one click
- **AI evaluation** via Claude (`claude-sonnet-4-6`) scoring 4 official criteria (0–3 each):
  - Lexical & Orthographic competence
  - Grammatical competence
  - Sociolinguistic competence
  - Argumentation competence
- **Spanish interference detection** — flags lexical false friends, syntactic calques, gender errors, conjugation confusion, and orthographic interference
- **Full exercise review page** — scores, justifications, corrected text, model expressions, error breakdown
- **Analytics dashboard** — score evolution chart, error type analysis, Spanish interference trend, severity breakdown, section comparison
- **Secure auth** — Supabase email/password login, Row Level Security (each user sees only their own data)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.3 (App Router, TypeScript, React 19) |
| Styling | Tailwind CSS v4 |
| Database & Auth | Supabase (PostgreSQL + RLS) |
| AI Evaluation | Anthropic Claude API (`claude-sonnet-4-6`) |
| Charts | Recharts v3 |
| Deployment | Vercel |

---

## Project Structure

```
src/
├── app/
│   ├── (app)/                  # Auth-protected pages
│   │   ├── dashboard/          # Metrics, score chart, recent exercises
│   │   ├── practice/           # Writing session (setup → write → results)
│   │   ├── analytics/          # Score evolution & error analysis
│   │   └── exercise/[id]/      # Full review of a past exercise
│   ├── api/evaluate/           # POST — calls Claude, saves to Supabase
│   └── login/                  # Email + password auth
├── components/                 # FrenchEditor, ScoreChart, ExerciseRow, etc.
├── lib/
│   ├── supabase.ts             # Browser client
│   ├── supabase-server.ts      # Server client
│   ├── analytics.ts            # Pure analytics helpers
│   └── database.types.ts       # Generated Supabase types
└── hooks/
    ├── useTimer.ts
    └── useAuth.ts
tef-evaluator.ts                # AI evaluation prompt + response types (source of truth)
tef-exercises.ts                # Static exercise bank (271 prompts)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- An [Anthropic API](https://console.anthropic.com) key

### 1. Clone & install

```bash
git clone https://github.com/eduardogarcot/tef-prep.git
cd tef-prep
npm install
```

### 2. Set up environment variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Set up the database

Run the following SQL in your Supabase **SQL Editor**:

```sql
create table exercises (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  section text check (section in ('A', 'B', 'C')) not null,
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

-- Row Level Security
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

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment (Vercel)

1. Push to GitHub and import the repo at [vercel.com/new](https://vercel.com/new)
2. Add the four environment variables in the Vercel project settings
3. Deploy — Vercel auto-detects Next.js, no extra config needed
4. In **Supabase → Authentication → URL Configuration**, set:
   - **Site URL**: `https://your-app.vercel.app`
   - **Redirect URLs**: `https://your-app.vercel.app/**`

Every merge to `master` triggers an automatic redeploy. Every PR gets its own preview URL.

---

## How Scoring Works

Each exercise is scored across four criteria on a **0–3 scale** (max 12 points total):

| Score | Level |
|-------|-------|
| 0 | Compétence non atteinte |
| 1 | Compétence élémentaire |
| 2 | Compétence intermédiaire |
| 3 | Compétence avancée |

The global score maps to an estimated **NCLC level** and **TEF Canada score (0–699)**. NCLC 7 — the Express Entry target — requires approximately 393/699.

---

## License

Private — personal use only.
