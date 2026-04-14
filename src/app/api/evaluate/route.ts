import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@/lib/supabase-server'
import {
  getSystemPromptForSection,
  buildEvaluationMessage,
} from '@/lib/prompts/tef-evaluator'
import type { TEFEvaluationResponse } from '@/lib/prompts/tef-evaluator'
import type { Json } from '@/lib/database.types'
import { sendEvaluationNotification } from '@/lib/notifications'

// Extend Vercel function timeout to 5 min (Pro) / 60s (Hobby).
// Claude claude-sonnet-4-6 typically responds in 15–30s; 60s covers 99% of cases.
export const maxDuration = 300

export async function POST(request: NextRequest) {
  // 1. Authenticate
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse body — only needs the exercise ID
  const body: { exerciseId: string } = await request.json()
  const { exerciseId } = body

  if (!exerciseId) {
    return NextResponse.json({ error: 'exerciseId is required' }, { status: 400 })
  }

  // 3. Fetch the exercise and verify ownership via RLS
  const { data: exercise, error: fetchError } = await supabase
    .from('exercises')
    .select('*')
    .eq('id', exerciseId)
    .single()

  if (fetchError || !exercise) {
    return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })
  }

  // 4. Guard against re-evaluating the same exercise
  const { data: existing } = await supabase
    .from('evaluations')
    .select('id')
    .eq('exercise_id', exerciseId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'Exercise has already been evaluated' },
      { status: 409 },
    )
  }

  // 5. Build the message and call Claude
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const userMessage = buildEvaluationMessage(
    exercise.section as 'A' | 'B' | 'C',
    `${exercise.prompt_title}\n\n${exercise.prompt_description}`,
    exercise.response_text,
    exercise.word_count,
    exercise.time_spent_seconds,
  )

  let evaluation: TEFEvaluationResponse
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: getSystemPromptForSection(exercise.section as 'A' | 'B' | 'C'),
      messages: [{ role: 'user', content: userMessage }],
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type from Claude')

    // Strip markdown fences in case Claude wraps JSON despite the prompt instruction
    let jsonText = content.text.trim()
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    evaluation = JSON.parse(jsonText) as TEFEvaluationResponse
  } catch (err) {
    console.error('Claude evaluation failed:', err)
    return NextResponse.json({ error: 'Evaluation failed' }, { status: 500 })
  }

  // 6. Persist the evaluation
  const { data: savedEvaluation, error: evalError } = await supabase
    .from('evaluations')
    .insert({
      exercise_id: exercise.id,
      lexical_score: evaluation.scores.lexical.score,
      grammar_score: evaluation.scores.grammar.score,
      sociolinguistic_score: evaluation.scores.sociolinguistic.score,
      argumentation_score: evaluation.scores.argumentation.score,
      global_score: evaluation.global_score,
      errors: evaluation.errors as unknown as Json,
      feedback_summary: evaluation.feedback_summary,
      detailed_feedback: {
        scores: evaluation.scores,
        strengths: evaluation.strengths,
        priority_improvements: evaluation.priority_improvements,
        corrected_text: evaluation.corrected_text,
        model_expressions: evaluation.model_expressions,
        word_count_check: evaluation.word_count_check,
        estimated_nclc_level: evaluation.estimated_nclc_level,
        estimated_tef_score: evaluation.estimated_tef_score,
      } as unknown as Json,
    })
    .select()
    .single()

  if (evalError) {
    console.error('Failed to save evaluation:', evalError)
    return NextResponse.json({ error: 'Failed to save evaluation' }, { status: 500 })
  }

  // 7. Send email notification (non-fatal — never block the response)
  if (user.email) {
    try {
      await sendEvaluationNotification({
        toEmail: user.email,
        section: exercise.section,
        title: exercise.prompt_title,
        globalScore: evaluation.global_score,
        nclcLevel: evaluation.estimated_nclc_level,
        estimatedTefScore: evaluation.estimated_tef_score,
        exerciseId: exercise.id,
      })
    } catch (err) {
      console.error('Email notification failed (non-fatal):', err)
    }
  }

  return NextResponse.json({
    exerciseId: exercise.id,
    evaluationId: savedEvaluation.id,
    evaluation,
  })
}
