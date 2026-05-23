'use client';
import { create } from 'zustand';
import type { Profile } from '@/lib/supabase/types';

interface AuthStore {
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
}));
