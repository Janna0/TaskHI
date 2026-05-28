import {
  Briefcase, Target, Rocket, Calendar,
  Mountain, Compass, Globe, Leaf,
  Palette, Music, Camera, Sparkles,
  Heart, Coffee, PartyPopper, Smile,
  Zap, Flame, Trophy, Crown,
  Code, MessageCircle, Megaphone, Shield,
  Dumbbell, Bike, Plane, Anchor,
  Gem, Star, Lightbulb, Sun,
  type LucideIcon,
} from 'lucide-react'
import { Project } from '../../types'

const ICON_MAP: Record<string, LucideIcon> = {
  Briefcase, Target, Rocket, Calendar,
  Mountain, Compass, Globe, Leaf,
  Palette, Music, Camera, Sparkles,
  Heart, Coffee, PartyPopper, Smile,
  Zap, Flame, Trophy, Crown,
  Code, MessageCircle, Megaphone, Shield,
  Dumbbell, Bike, Plane, Anchor,
  Gem, Star, Lightbulb, Sun,
}

function isImageUrl(icon: string | null | undefined): boolean {
  return !!icon && (icon.startsWith('http') || icon.startsWith('data:'))
}

interface Props {
  project: Project
  /** 'sm' = sidebar (20px), 'md' = default (24px), 'lg' = header (32px) */
  size?: 'sm' | 'md' | 'lg'
}

const SIZE = {
  sm: { box: 'w-5 h-5 rounded',    icon: 10, text: 'text-[11px]' },
  md: { box: 'w-6 h-6 rounded-md', icon: 12, text: 'text-[12px]' },
  lg: { box: 'w-8 h-8 rounded-lg', icon: 16, text: 'text-[14px]' },
}

export function ProjectIconBadge({ project, size = 'md' }: Props) {
  const { box, icon: iconSize, text } = SIZE[size]
  const isImg = isImageUrl(project.icon)
  const Icon = !isImg && project.icon ? ICON_MAP[project.icon] : undefined

  return (
    <span
      className={`${box} flex items-center justify-center shrink-0 overflow-hidden text-white`}
      style={{ background: project.color }}
    >
      {isImg
        ? <img src={project.icon!} alt="" className="w-full h-full object-cover" />
        : Icon
          ? <Icon size={iconSize} strokeWidth={2.5} />
          : <span className={`${text} font-bold leading-none`}>{project.name[0]?.toUpperCase()}</span>
      }
    </span>
  )
}
