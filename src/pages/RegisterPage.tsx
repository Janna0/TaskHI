import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckSquare } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

export function RegisterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Name is required'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name.trim() } },
    })
    if (err) { setLoading(false); setError(err.message); return }
    // Insert profile row so the user appears in member search dropdowns
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email!,
        full_name: name.trim(),
        name: name.trim(),
      }, { onConflict: 'id' })
    }
    setLoading(false)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center">
            <CheckSquare size={18} className="text-white" />
          </div>
          <span className="font-bold text-slate-800 text-xl">TaskHI</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <h1 className="text-xl font-bold text-slate-800 mb-1">Create your account</h1>
          <p className="text-sm text-slate-500 mb-6">Start tracking your work for free</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full name"
              placeholder="Jane Smith"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              error={error}
              required
            />
            <Button type="submit" className="w-full" loading={loading}>Create account</Button>
          </form>

          <p className="mt-5 text-sm text-center text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
