import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface AuthUser {
  id: string
  email?: string
  user_metadata?: Record<string, any>
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }: any) => {
      setUser(data?.session?.user ?? null)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_: any, session: any) => {
      setUser(session?.user ?? null)
    })

    return () => data?.subscription?.unsubscribe?.()
  }, [])

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut()
    setUser(null)
  }

  return { user, loading, signOut, isAuthenticated: !!user }
}
