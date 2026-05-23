'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { asProfile } from '@/lib/supabase/query';
import type { Profile } from '@/lib/supabase/types';

export function AuthProvider({ children, initialProfile }: { children: React.ReactNode; initialProfile: Profile | null }) {
  const setProfile = useAuthStore((s) => s.setProfile);

  useEffect(() => {
    setProfile(initialProfile);

    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setProfile(null);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        setProfile(asProfile(data));
      }
    });

    return () => subscription.unsubscribe();
  }, [initialProfile, setProfile]);

  return <>{children}</>;
}
