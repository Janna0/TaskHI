import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Profile } from '../types'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  updateProfile: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(authUser: User) {
    const { data } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()
    if (data) {
      setProfile(data)
      setLoading(false)
      return
    }
    // Profile row missing — create it from auth metadata.
    // This handles users who registered before the profile-insert fix.
    const displayName = authUser.user_metadata?.name || authUser.email?.split('@')[0] || ''
    await supabase.from('profiles').upsert({
      id: authUser.id,
      email: authUser.email!,
      full_name: displayName,
      name: displayName,
    }, { onConflict: 'id' })
    const { data: created } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()
    setProfile(created)
    setLoading(false)
  }

  async function refreshProfile() {
    if (user) await loadProfile(user)
  }

  function updateProfile(updates: Partial<Profile>) {
    setProfile(prev => prev ? { ...prev, ...updates } : prev)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
