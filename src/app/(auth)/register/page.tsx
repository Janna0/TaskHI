'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name || !email || !password) { setError('Please fill in all fields.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setAuth(
      { id: '1', email, name, createdAt: new Date().toISOString() },
      'mock-token'
    );
    router.push('/dashboard');
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-8">
        <div className="mb-6 text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#6366f1] text-white font-bold text-lg mb-3">T</div>
          <h1 className="text-xl font-semibold text-[#1e293b]">Create your account</h1>
          <p className="text-sm text-[#64748b] mt-1">Start managing projects in minutes</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1.5">Full name</label>
            <Input placeholder="Alex Johnson" value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1.5">Email</label>
            <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1.5">Password</label>
            <Input type="password" placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" error={!!error} />
          </div>

          {error && <p className="text-xs text-[#dc2626]">{error}</p>}

          <Button type="submit" loading={loading} className="w-full" size="lg">
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-[#64748b]">
          Already have an account?{' '}
          <Link href="/login" className="text-[#6366f1] font-medium hover:underline">Sign in</Link>
        </p>

        <p className="mt-3 text-center text-xs text-[#94a3b8]">
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
