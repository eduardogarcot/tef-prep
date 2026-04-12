'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createBrowserClient } from '@/lib/supabase'

interface AuthState {
  user: User | null
  loading: boolean
}

/**
 * Returns the current Supabase user and a loading flag.
 * Subscribes to auth state changes so it stays in sync across tabs.
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true })

  useEffect(() => {
    const supabase = createBrowserClient()

    // Get the current session on mount
    supabase.auth.getUser().then(({ data: { user } }) => {
      setState({ user, loading: false })
    })

    // Keep in sync with sign-in / sign-out events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, loading: false })
    })

    return () => subscription.unsubscribe()
  }, [])

  return state
}
