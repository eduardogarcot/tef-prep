export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      exercises: {
        Relationships: []
        Row: {
          id: string
          user_id: string
          section: 'A' | 'B' | 'C'
          prompt_title: string
          prompt_description: string
          response_text: string
          word_count: number
          time_limit_seconds: number
          time_spent_seconds: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          section: 'A' | 'B' | 'C'
          prompt_title: string
          prompt_description: string
          response_text: string
          word_count: number
          time_limit_seconds: number
          time_spent_seconds: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          section?: 'A' | 'B' | 'C'
          prompt_title?: string
          prompt_description?: string
          response_text?: string
          word_count?: number
          time_limit_seconds?: number
          time_spent_seconds?: number
          created_at?: string
        }
      }
      evaluations: {
        Relationships: []
        Row: {
          id: string
          exercise_id: string
          lexical_score: number
          grammar_score: number
          sociolinguistic_score: number
          argumentation_score: number
          global_score: number
          errors: Json
          feedback_summary: string
          detailed_feedback: Json
          created_at: string
        }
        Insert: {
          id?: string
          exercise_id: string
          lexical_score: number
          grammar_score: number
          sociolinguistic_score: number
          argumentation_score: number
          global_score: number
          errors?: Json
          feedback_summary: string
          detailed_feedback?: Json
          created_at?: string
        }
        Update: {
          id?: string
          exercise_id?: string
          lexical_score?: number
          grammar_score?: number
          sociolinguistic_score?: number
          argumentation_score?: number
          global_score?: number
          errors?: Json
          feedback_summary?: string
          detailed_feedback?: Json
          created_at?: string
        }
      }
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}

/** Convenience row types */
export type Exercise = Database['public']['Tables']['exercises']['Row']
export type ExerciseInsert = Database['public']['Tables']['exercises']['Insert']
export type Evaluation = Database['public']['Tables']['evaluations']['Row']
export type EvaluationInsert = Database['public']['Tables']['evaluations']['Insert']
