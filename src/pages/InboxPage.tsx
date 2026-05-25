import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, UserPlus, AtSign } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Notification } from '../types'
import { getInitials, cn } from '../lib/utils'

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function InboxPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('notifications')
      .select('*, actor:profiles!actor_id(name, avatar_color), task:tasks!task_id(title), project:projects!project_id(name, color)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(100)
    if (data) setNotifications(data as Notification[])
    setLoading(false)
    // Mark all unread as read silently
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user!.id).eq('is_read', false)
    window.dispatchEvent(new Event('taskhi:notifications-changed'))
  }

  async function markAllRead() {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user!.id)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    window.dispatchEvent(new Event('taskhi:notifications-changed'))
  }

  function handleClick(n: Notification) {
    if (n.project_id) navigate(`/projects/${n.project_id}`)
  }

  const hasUnread = notifications.some(n => !n.is_read)

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-800">Inbox</h1>
        {hasUnread && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <CheckCheck size={15} /> Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Loading…</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20">
          <Bell size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-medium">You're all caught up</p>
          <p className="text-slate-300 text-xs mt-1">You'll be notified when tasks are assigned to you or someone mentions you</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {notifications.map(n => {
            const actorName = n.actor?.name ?? 'Someone'
            const actorColor = n.actor?.avatar_color ?? '#94a3b8'
            const taskTitle = n.task?.title ?? 'a task'
            const projectName = n.project?.name

            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  'flex items-start gap-3 w-full px-4 py-3 rounded-xl text-left transition-colors',
                  n.is_read ? 'hover:bg-slate-50' : 'bg-primary-50/50 hover:bg-primary-50'
                )}
              >
                <div className="relative shrink-0 mt-0.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                    style={{ background: actorColor }}
                  >
                    {getInitials(actorName)}
                  </div>
                  <div className={cn(
                    'absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center',
                    n.type === 'task_assigned' ? 'bg-blue-500' : 'bg-violet-500'
                  )}>
                    {n.type === 'task_assigned'
                      ? <UserPlus size={8} className="text-white" />
                      : <AtSign size={8} className="text-white" />
                    }
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm leading-snug', n.is_read ? 'text-slate-600' : 'text-slate-800')}>
                    {n.type === 'task_assigned' ? (
                      <><span className="font-semibold">{actorName}</span> assigned you to <span className="font-semibold">"{taskTitle}"</span></>
                    ) : (
                      <><span className="font-semibold">{actorName}</span> mentioned you in <span className="font-semibold">"{taskTitle}"</span></>
                    )}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {projectName && <span className="text-xs text-slate-400">{projectName}</span>}
                    {projectName && <span className="text-xs text-slate-300">·</span>}
                    <span className="text-xs text-slate-400">{relativeTime(n.created_at)}</span>
                  </div>
                </div>

                {!n.is_read && (
                  <div className="w-2 h-2 rounded-full bg-primary-500 shrink-0 mt-2" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
