import { AppShell } from '@/components/layout/AppShell';
import { SearchOverlay } from '@/components/search/SearchOverlay';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { createClient } from '@/lib/supabase/server';
import { asProfile } from '@/lib/supabase/query';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    profile = asProfile(data);
  }

  return (
    <AuthProvider initialProfile={profile}>
      <AppShell>{children}</AppShell>
      <SearchOverlay />
    </AuthProvider>
  );
}
