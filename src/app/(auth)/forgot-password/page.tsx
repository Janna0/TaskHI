'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setSent(true);
  }

  if (sent) {
    return (
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-[#22c55e] mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-[#1e293b] mb-2">Check your email</h1>
          <p className="text-sm text-[#64748b]">
            We sent a password reset link to <strong>{email}</strong>. Check your inbox.
          </p>
          <Link href="/login">
            <Button variant="secondary" className="mt-6 w-full">Back to sign in</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-8">
        <div className="mb-6 text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#6366f1] text-white font-bold text-lg mb-3">T</div>
          <h1 className="text-xl font-semibold text-[#1e293b]">Reset password</h1>
          <p className="text-sm text-[#64748b] mt-1">Enter your email and we&apos;ll send a reset link</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1.5">Email</label>
            <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <Button type="submit" loading={loading} className="w-full" size="lg">
            Send reset link
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-[#64748b]">
          Remember your password?{' '}
          <Link href="/login" className="text-[#6366f1] font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
