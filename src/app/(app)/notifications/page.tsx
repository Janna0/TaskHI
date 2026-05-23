'use client';
import { useState } from 'react';
import { Bell, CheckCircle2, MessageSquare, UserPlus, AlertTriangle } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const MOCK_NOTIFS = [
  { id: 'n1', type: 'assignment', read: false, user: 'Alex Rivera', avatar: undefined, message: 'assigned you to', target: 'Fix mobile nav bug', project: 'Website Redesign', time: '10 min ago' },
  { id: 'n2', type: 'comment', read: false, user: 'James Park', avatar: undefined, message: 'commented on', target: 'Email campaign brief', project: 'Q3 Marketing', time: '42 min ago' },
  { id: 'n3', type: 'mention', read: false, user: 'Maya Chen', avatar: undefined, message: 'mentioned you in', target: 'Wireframes v2', project: 'Website Redesign', time: '1h ago' },
  { id: 'n4', type: 'status', read: true, user: 'Alex Rivera', avatar: undefined, message: 'moved', target: 'Build navigation component', project: 'Website Redesign', time: '3h ago' },
  { id: 'n5', type: 'deadline', read: true, user: 'System', avatar: undefined, message: 'Deadline approaching for', target: 'Fix mobile nav bug', project: 'Website Redesign', time: '5h ago' },
  { id: 'n6', type: 'comment', read: true, user: 'James Park', avatar: undefined, message: 'replied to your comment on', target: 'Homepage copy', project: 'Website Redesign', time: 'Yesterday' },
];

const TYPE_ICON: Record<string, React.ElementType> = {
  assignment: UserPlus,
  comment: MessageSquare,
  mention: Bell,
  status: CheckCircle2,
  deadline: AlertTriangle,
};

const TYPE_COLOR: Record<string, string> = {
  assignment: 'text-[#6366f1]', comment: 'text-[#3b82f6]',
  mention: 'text-[#8b5cf6]', status: 'text-[#22c55e]', deadline: 'text-[#f59e0b]',
};

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState(MOCK_NOTIFS);
  const unreadCount = notifs.filter(n => !n.read).length;

  function markAllRead() {
    setNotifs(n => n.map(notif => ({ ...notif, read: true })));
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#1e293b]">Notifications</h1>
          {unreadCount > 0 && <p className="text-sm text-[#64748b] mt-0.5">{unreadCount} unread</p>}
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={markAllRead}>Mark all read</Button>
        )}
      </div>

      <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
        {notifs.map((notif, i) => {
          const Icon = TYPE_ICON[notif.type] || Bell;
          return (
            <div
              key={notif.id}
              onClick={() => setNotifs(n => n.map(x => x.id === notif.id ? { ...x, read: true } : x))}
              className={`flex gap-3 px-4 py-4 cursor-pointer hover:bg-[#f8fafc] transition-colors ${!notif.read ? 'bg-[#eef2ff]/40' : ''} ${i < notifs.length - 1 ? 'border-b border-[#f1f5f9]' : ''}`}
            >
              <div className="relative flex-shrink-0">
                <Avatar name={notif.user} size="sm" />
                <span className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-white flex items-center justify-center`}>
                  <Icon className={`h-2.5 w-2.5 ${TYPE_COLOR[notif.type]}`} />
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#334155] leading-snug">
                  <span className="font-medium">{notif.user}</span>
                  {' '}{notif.message}{' '}
                  <span className="font-medium text-[#6366f1]">{notif.target}</span>
                </p>
                <p className="text-xs text-[#94a3b8] mt-0.5">{notif.project} · {notif.time}</p>
              </div>
              {!notif.read && (
                <span className="h-2 w-2 rounded-full bg-[#6366f1] flex-shrink-0 mt-1.5" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
