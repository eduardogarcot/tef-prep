/**
 * TEF Canada Expression Écrite — AI Evaluator Prompts (section-specific)
 *
 * SOURCE OF TRUTH — mirrors src/lib/prompts/tef-evaluator.ts exactly.
 * This file is NOT in the import graph; it is kept here as project-level
 * documentation per CLAUDE.md. The API route imports from src/lib/prompts/.
 *
 * One system prompt per section — avoids sending irrelevant criteria to Claude
 * and allows targeted calibration examples per section.
 *
 * Sections:
 *   A — Fait divers (continuation d'un article de presse) — 80-120 mots, 25 min
 *   B — Rédaction formelle (lettre/courriel formel) — 200-300 mots, 35 min
 *   C — Argumentation (prise de position sur un sujet de société) — 200+ mots, 35 min
 *
 * Scoring scale per criterion: 0-3 (max 12 points total)
 * Official TEF Canada Expression Écrite score range: 0-699
 * NCLC 7 (target for Express Entry) requires 393+
 *
 * Token savings vs old monolithic prompt (~3,100 tokens per call):
 *   Section A: ~1,950 tokens  (-37%)
 *   Section B: ~2,010 tokens  (-35%)
 *   Section C: ~1,970 tokens  (-37%)
 */

// Re-export everything from the authoritative lib source for convenience
export {
  TEF_SYSTEM_PROMPT_A,
  TEF_SYSTEM_PROMPT_B,
  TEF_SYSTEM_PROMPT_C,
  getSystemPromptForSection,
  TEF_EVALUATOR_SYSTEM_PROMPT,
  buildEvaluationMessage,
  SECTION_CONFIG,
} from './src/lib/prompts/tef-evaluator'

export type {
  InterferenceType,
  TEFEvaluationError,
  TEFScoreCriterion,
  WordCountCheck,
  TEFEvaluationResponse,
} from './src/lib/prompts/tef-evaluator'
