import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ArrowLeft, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getInitials, PROJECT_COLORS } from '../lib/utils'

export function ProfilePage() {
  const { user, profile, updateProfile } = useAuth()
  const navigate = useNavigate()

  const emailFallback = profile?.email?.split('@')[0] ?? user?.email?.split('@')[0] ?? ''

  const [name, setName] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [passwordSent, setPasswordSent] = useState(false)

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '')
      setColor(profile.avatar_color ?? '#6366f1')
    }
  }, [profile?.id])

  const displayName = name.trim() || emailFallback || '?'

  async function saveProfile() {
    if (!user) return
    setSaving(true)
    setError(null)

    const trimmedName = name.trim()

    const { error: rpcErr } = await supabase.rpc('update_my_profile', {
      p_name: trimmedName,
      p_color: color,
    })

    if (rpcErr) {
      setError('Failed to save: ' + rpcErr.message)
      setSaving(false)
      return
    }

    updateProfile({ name: trimmedName, avatar_color: color })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function sendPasswordReset() {
    if (!user?.email) return
    await supabase.auth.resetPasswordForEmail(user.email)
    setPasswordSent(true)
  }

  return (
    <div className="max-w-lg mx-auto px-8 py-10">
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-8 transition-colors">
        <ArrowLeft size={14} /> Back
      </button>

      <h1 className="text-xl font-bold text-slate-900 mb-8">My profile</h1>

      <div className="flex items-center gap-6 mb-8 p-4 bg-slate-50 rounded-xl">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0 transition-colors"
          style={{ background: color }}
        >
          {getInitials(displayName)}
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Icon color</p>
          <div className="flex items-center gap-2 flex-wrap">
            {PROJECT_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                style={{ background: c }}
                title={c}
              >
                {color === c && <Check size={12} className="text-white" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Display name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && saveProfile()}
          placeholder={emailFallback || 'Your name'}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
        />
      </div>

      <div className="mb-8">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
        <input
          value={user?.email ?? ''}
          readOnly
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
        />
        <p className="text-xs text-slate-400 mt-1">Email cannot be changed here</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-4">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={saveProfile}
        disabled={saving}
        className="px-6 py-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 mb-12"
      >
        {saved ? <><Check size={14} /> Saved!</> : saving ? 'Saving…' : 'Save changes'}
      </button>

      <div className="border-t border-slate-100 pt-8">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Password</h2>
        <p className="text-sm text-slate-500 mb-4">We'll email you a link to reset your password.</p>
        {passwordSent ? (
          <p className="text-sm text-green-600 font-medium">Reset link sent to {user?.email}</p>
        ) : (
          <button
            onClick={sendPasswordReset}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium border border-primary-200 rounded-lg px-4 py-2 hover:bg-primary-50 transition-colors"
          >
            Send password reset email
          </button>
        )}
      </div>
    </div>
  )
}
