'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function ProfileSettingsPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1e293b]">Profile settings</h1>
        <p className="text-sm text-[#64748b] mt-0.5">Manage your account information.</p>
      </div>

      <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <Avatar name={name || 'User'} size="xl" />
          <div>
            <p className="text-sm font-medium text-[#334155]">Profile picture</p>
            <p className="text-xs text-[#94a3b8] mt-0.5">Auto-generated from your name</p>
          </div>
        </div>

        <div className="border-t border-[#f1f5f9]" />

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1.5">Full name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1.5">Email</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" size="sm">
              {saved ? '✓ Saved' : 'Save changes'}
            </Button>
          </div>
        </form>

        <div className="border-t border-[#f1f5f9] pt-4">
          <h3 className="text-sm font-semibold text-[#1e293b] mb-1">Danger zone</h3>
          <p className="text-xs text-[#64748b] mb-3">Actions here can&apos;t be undone.</p>
          <Button variant="danger" size="sm" onClick={handleLogout} className="gap-1.5">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
