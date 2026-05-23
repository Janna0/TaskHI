import { cn, getInitials, hashColor } from '@/lib/utils';

const SIZE_CLASSES = {
  xs: 'h-5 w-5 text-[10px]',
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
  xl: 'h-14 w-14 text-xl',
};

interface AvatarProps {
  name: string;
  avatarUrl?: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

export function Avatar({ name, avatarUrl, size = 'md', className }: AvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={cn('rounded-full object-cover flex-shrink-0', SIZE_CLASSES[size], className)}
      />
    );
  }
  const color = hashColor(name);
  return (
    <span
      className={cn('rounded-full flex items-center justify-center font-medium text-white flex-shrink-0', SIZE_CLASSES[size], className)}
      style={{ backgroundColor: color }}
      title={name}
    >
      {getInitials(name)}
    </span>
  );
}

export function AvatarStack({ users, max = 3 }: { users: { name: string; avatarUrl?: string }[]; max?: number }) {
  const shown = users.slice(0, max);
  const overflow = users.length - max;
  return (
    <div className="flex -space-x-1">
      {shown.map((u, i) => (
        <Avatar key={i} name={u.name} avatarUrl={u.avatarUrl} size="sm"
          className="ring-2 ring-white" />
      ))}
      {overflow > 0 && (
        <span className="h-6 w-6 rounded-full bg-[#f1f5f9] border-2 border-white flex items-center justify-center text-[10px] font-medium text-[#475569]">
          +{overflow}
        </span>
      )}
    </div>
  );
}
