import {
  Rocket,
  Gavel,
  Users,
  CalendarCheck,
  Smartphone,
  CalendarDays,
  Captions,
  SlidersHorizontal,
  FileText,
  Sparkles,
  Star,
  Network,
  Folder,
  DollarSign,
  Target,
  Map,
  BarChart3,
  TrendingUp,
  Database,
  Shield,
  Lock,
  ClipboardCheck,
  List,
  Calendar,
  Clock,
  LayoutDashboard,
  Copy,
  Zap,
  Check,
  CheckCircle,
  CheckSquare,
  X,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Settings,
  RefreshCw,
  Palette,
  Link,
  Eye,
  Pencil,
  Search,
  Bell,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react';

/**
 * Icon name → Lucide component map.
 *
 * Dashboard equivalents (MUI → Lucide):
 *   RocketLaunchOutlined → Rocket
 *   GavelOutlined        → Gavel
 *   GroupOutlined         → Users
 *   EventNoteOutlined    → CalendarCheck
 *   CalendarMonthOutlined→ CalendarDays
 *   TuneOutlined         → SlidersHorizontal
 *   DescriptionOutlined  → FileText
 *   StarOutlined         → Star
 *   AccountTreeOutlined  → Network
 *   FolderOutlined       → Folder
 */
const icons: Record<string, LucideIcon> = {
  // Feature icons (matching dashboard nav)
  rocket: Rocket,
  gavel: Gavel,
  users: Users,
  'calendar-check': CalendarCheck,
  smartphone: Smartphone,
  'calendar-days': CalendarDays,
  captions: Captions,
  'sliders-horizontal': SlidersHorizontal,
  'file-text': FileText,
  sparkles: Sparkles,
  star: Star,
  network: Network,
  folder: Folder,
  'dollar-sign': DollarSign,
  target: Target,
  map: Map,

  // General-purpose icons
  'chart-bar': BarChart3,
  'trending-up': TrendingUp,
  database: Database,
  shield: Shield,
  lock: Lock,
  'clipboard-check': ClipboardCheck,
  list: List,
  calendar: Calendar,
  clock: Clock,
  layout: LayoutDashboard,
  copy: Copy,
  zap: Zap,
  check: Check,
  'check-circle': CheckCircle,
  'check-square': CheckSquare,
  x: X,
  'arrow-right': ArrowRight,
  'chevron-down': ChevronDown,
  'chevron-right': ChevronRight,
  settings: Settings,
  'refresh-cw': RefreshCw,
  palette: Palette,
  link: Link,
  eye: Eye,
  edit: Pencil,
  search: Search,
  bell: Bell,
  'message-circle': MessageCircle,
};

interface IconProps {
  name: string;
  className?: string;
  size?: number;
}

export function Icon({ name, className = '', size = 24 }: IconProps) {
  const LucideComponent = icons[name];

  if (!LucideComponent) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[Icon] Unknown icon name: "${name}"`);
    }
    return null;
  }

  return (
    <LucideComponent
      size={size}
      className={className}
      strokeWidth={1.5}
      aria-hidden="true"
    />
  );
}
