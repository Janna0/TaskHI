'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/authStore';
import { createClient } from '@/lib/supabase/client';
import { LogOut } from 'lucide-react';

export default function ProfileSettingsPage() {
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const router = useRouter();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [jobTitle, setJobTitle] = useState(profile?.job_title ?? '');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('profiles')
      .update({ full_name: name, name, job_title: jobTitle })
      .eq('id', profile.id)
      .select()
      .single();
    if (data) setProfile(data);
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const displayName = profile?.full_name ?? profile?.name ?? 'User';

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1e293b]">Profile settings</h1>
        <p className="text-sm text-[#64748b] mt-0.5">Manage your account information.</p>
      </div>

      <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Avatar name={displayName} avatarUrl={profile?.avatar_url ?? undefined} size="xl" />
          <div>
            <p className="text-sm font-medium text-[#334155]">{displayName}</p>
            <p className="text-xs text-[#94a3b8] mt-0.5">{profile?.email}</p>
          </div>
        </div>

        <div className="border-t border-[#f1f5f9]" />

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1.5">Full name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1.5">Job title</label>
            <Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Product Manager" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1.5">Email</label>
            <Input value={profile?.email ?? ''} disabled className="cursor-not-allowed" />
            <p className="text-xs text-[#94a3b8] mt-1">Email cannot be changed here.</p>
          </div>
          <Button type="submit" loading={loading} size="sm">
            {saved ? '✓ Saved' : 'Save changes'}
          </Button>
        </form>

        <div className="border-t border-[#f1f5f9] pt-4">
          <h3 className="text-sm font-semibold text-[#1e293b] mb-1">Session</h3>
          <Button variant="danger" size="sm" onClick={handleLogout} className="gap-1.5">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
